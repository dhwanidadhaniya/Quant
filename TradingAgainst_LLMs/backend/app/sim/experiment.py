from __future__ import annotations

import asyncio
import hashlib
import json
import uuid
from datetime import datetime, timezone

import numpy as np

from app import ENGINE_VERSION
from app.config import Settings
from app.mathutil import clean, mix_seed
from app.providers.http_providers import OllamaProvider, OpenAICompatProvider
from app.providers.mock import MockProvider
from app.research.analyses import analyze_sessions, prompt_sensitivity, round_number_anchoring
from app.research.analyses import _accepted_quotes
from app.research.performance import performance_block
from app.schemas import ExperimentConfig, FalsifyRequest
from app.sim.session import llm_agent_count, run_session
from app.storage.db import Database
from app.strategy.exploit import StrategyParams, variant_grid

DISCLAIMER = (
    "Controlled simulation. The research system knows the hidden ground truth and the agents do not, "
    "except in an explicitly labeled oracle run. Terminal PnL is a simulation accounting identity marked "
    "to that hidden value. It is not an estimate of real-world trading alpha."
)

FALSIFICATION_CELLS = [
    {"id": "seed_shift", "label": "Different seed", "overrides": {}},
    {"id": "temperature_0.8", "label": "Temperature 0.8", "overrides": {"temperature": 0.8}},
    {"id": "model_rational", "label": "mock-rational-v1", "overrides": {"model": "mock-rational-v1"}},
    {"id": "model_herd", "label": "mock-herd-v1", "overrides": {"model": "mock-herd-v1"}},
    {"id": "bias_warning", "label": "Prompt: Beware of round-number anchoring.", "overrides": {"prompt_version": "v1-debias"}},
    {"id": "signal_noise_10", "label": "Signal noise 10", "overrides": {"signal_noise": 10.0}},
    {"id": "transaction_cost", "label": "Transaction cost 2.0 per unit", "overrides": {"transaction_cost": 2.0}},
    {"id": "tight_position_limit", "label": "Position limit 4", "overrides": {"position_limit": 4.0}},
    {"id": "few_agents", "label": "3 agents", "overrides": {"agents": 3}},
    {"id": "many_agents", "label": "10 agents", "overrides": {"agents": 10}},
]


class ExperimentError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


def make_provider(name: str, settings: Settings, model: str, signal_noise: float):
    if name == "mock":
        return MockProvider(model, signal_noise)
    if name == "openai":
        if not settings.openai_api_key:
            raise ExperimentError("OPENAI_API_KEY is not set. Refusing to start a live-model run.")
        live_model = None if model.startswith("mock") else model
        return OpenAICompatProvider(settings, live_model)
    if name == "ollama":
        live_model = None if model.startswith("mock") else model
        return OllamaProvider(settings, live_model)
    raise ExperimentError(f"Unknown provider '{name}'.")


def config_hash(payload: dict) -> str:
    blob = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(blob.encode()).hexdigest()[:24]


def split_seeds(config: ExperimentConfig) -> tuple[list[int], list[int], list[int]]:
    rng = np.random.default_rng(config.seed)
    need = config.train_sessions + config.test_sessions + config.prompt_sensitivity_sessions
    pool: list[int] = []
    seen: set[int] = set()
    while len(pool) < need:
        draw = int(rng.integers(1, 2**31 - 1))
        if draw not in seen:
            seen.add(draw)
            pool.append(draw)
    train = pool[: config.train_sessions]
    test = pool[config.train_sessions : config.train_sessions + config.test_sessions]
    prompt = pool[config.train_sessions + config.test_sessions :]
    if set(train) & set(test):
        raise ExperimentError("Train and test seeds overlapped. Refusing to run.")
    return train, test, prompt


def _call_estimate(config: ExperimentConfig, variants: int, extra_sessions: int = 0) -> int:
    return (config.train_sessions * variants + config.test_sessions + extra_sessions) * config.rounds * llm_agent_count(config)


def _guard_cost(config: ExperimentConfig, provider_name: str, estimate: int) -> None:
    if provider_name == "mock" or estimate == 0:
        return
    if estimate > 24 and not config.confirm_llm_cost:
        raise ExperimentError(
            f"Refusing live-model run: about {estimate} model calls. "
            "Set confirm_llm_cost to true after checking the provider, model, and session size."
        )


async def _run_many(config, provider, seeds, split, params, prompt_version, include_strategy, keep_prompts=True):
    sessions = []
    for seed in seeds:
        sessions.append(
            await run_session(
                config=config,
                provider=provider,
                session_seed=int(seed),
                split=split,
                params=params,
                prompt_version=prompt_version,
                include_strategy=include_strategy,
                keep_prompts=keep_prompts,
            )
        )
    return sessions


def session_summary(session: dict) -> dict:
    path = []
    rule_counts: dict[str, int] = {}
    for rnd in session["rounds"]:
        book = rnd["book"]
        path.append(
            {
                "round": rnd["round"],
                "true_value": rnd["true_value"],
                "midpoint": book["midpoint"],
                "best_bid": book["best_bid"],
                "best_ask": book["best_ask"],
                "spread": book["spread"],
                "news_event": rnd["news_event"],
                "news_magnitude": rnd["news_magnitude"],
                "volume": float(sum(trade["quantity"] for trade in rnd["trades"])),
            }
        )
        decision = rnd.get("strategy") or {}
        rule = decision.get("rule_triggered")
        if rule:
            rule_counts[rule] = rule_counts.get(rule, 0) + 1
    return {
        "id": session["id"],
        "split": session["split"],
        "seed": session["seed"],
        "strategy_pnl_vs_truth": session["strategy_terminal_pnl"],
        "strategy_pnl_vs_mid": session["strategy_terminal_pnl_vs_mid"],
        "max_drawdown": session["strategy_max_drawdown"],
        "terminal_true_value": session["terminal_true_value"],
        "initial_true_value": session["initial_true_value"],
        "final_mid": session["final_mid"],
        "n_trades": session["n_trades"],
        "n_news": session["n_news"],
        "parse_failures": session["parse_failures"],
        "curve": session["strategy_curve"],
        "path": path,
        "rule_counts": rule_counts,
        "agent_terminal": session["agent_terminal"],
    }


async def execute_experiment(config: ExperimentConfig, settings: Settings, db: Database) -> dict:
    provider_name = (config.provider or settings.provider or "mock").lower()
    executed = config.model_copy(update={"provider": provider_name})
    variants = [StrategyParams(name="full")] if executed.variant_mode == "fixed_full" else variant_grid()
    extra = executed.prompt_sensitivity_sessions * 2 if executed.run_prompt_sensitivity and llm_agent_count(executed) else 0
    estimate = _call_estimate(executed, len(variants), extra)
    _guard_cost(executed, provider_name, estimate)
    hashed_body = executed.model_dump()
    hashed_body.pop("name", None)
    hashed_body.pop("ignore_cache", None)
    hashed_body["engine_version"] = ENGINE_VERSION
    digest = config_hash(hashed_body)
    if provider_name == "mock" and not executed.ignore_cache:
        cached = db.find_by_hash(digest)
        if cached is not None:
            return clean(cached)

    provider = make_provider(provider_name, settings, executed.model, executed.signal_noise)
    if hasattr(provider, "bind_semaphore"):
        provider.bind_semaphore(asyncio.Semaphore(settings.max_concurrency))

    train_seeds, test_seeds, prompt_seeds = split_seeds(executed)
    scores = []
    best_params = variants[0]
    best_score = -1e300
    best_sessions = None
    for variant in variants:
        sessions = await _run_many(
            executed, provider, train_seeds, "train", variant, executed.prompt_version, True
        )
        score = float(np.mean([session["strategy_terminal_pnl"] for session in sessions]))
        scores.append({"name": variant.name, "mean_pnl": score, "params": variant.as_dict()})
        if score > best_score:
            best_score = score
            best_params = variant
            best_sessions = sessions
    assert best_sessions is not None
    test_sessions = await _run_many(
        executed, provider, test_seeds, "test", best_params, executed.prompt_version, True
    )
    sensitivity = None
    if executed.run_prompt_sensitivity and llm_agent_count(executed) and executed.prompt_sensitivity_sessions:
        pairs = []
        for seed in prompt_seeds:
            left = await run_session(
                config=executed,
                provider=provider,
                session_seed=int(seed),
                split="prompt_v1",
                params=None,
                prompt_version="v1",
                include_strategy=False,
            )
            right = await run_session(
                config=executed.model_copy(update={"prompt_version": "v1-debias"}),
                provider=provider,
                session_seed=int(seed),
                split="prompt_debias",
                params=None,
                prompt_version="v1-debias",
                include_strategy=False,
            )
            pairs.append((left, right))
        sensitivity = prompt_sensitivity(pairs)

    rng = np.random.default_rng(mix_seed("perf", executed.seed))
    created = datetime.now(timezone.utc).isoformat()
    experiment_id = f"exp_{uuid.uuid4().hex[:12]}"
    result = {
        "id": experiment_id,
        "name": executed.name,
        "created_at": created,
        "engine_version": ENGINE_VERSION,
        "cached": False,
        "estimated_model_calls": estimate if provider_name != "mock" else 0,
        "config": executed.model_dump(),
        "disclaimer": DISCLAIMER,
        "protocol": {
            "train_seeds": train_seeds,
            "test_seeds": test_seeds,
            "prompt_seeds": prompt_seeds if sensitivity else [],
            "selection_metric": "Mean terminal PnL marked to hidden ground truth, train sessions only",
            "variants": scores,
            "frozen_variant": best_params.name,
            "frozen_params": best_params.as_dict(),
            "test_used_for_selection": False,
            "provider": provider_name,
            "model": executed.model,
            "oracle": executed.oracle,
            "engine_version": ENGINE_VERSION,
        },
        "performance": {
            "train": performance_block(best_sessions, "train", rng),
            "test": performance_block(test_sessions, "test", np.random.default_rng(mix_seed("perf-test", executed.seed))),
        },
        "biases": {
            "train": analyze_sessions(best_sessions),
            "test": analyze_sessions(test_sessions),
        },
        "prompt_sensitivity": sensitivity,
        "sessions": [session_summary(session) for session in [*best_sessions, *test_sessions]],
    }
    result = clean(result)
    db.save_experiment(
        experiment_id=experiment_id,
        name=executed.name,
        config_hash=digest,
        config=executed.model_dump(),
        result=result,
        sessions=[*best_sessions, *test_sessions],
        provider=provider_name,
        engine_version=ENGINE_VERSION,
    )
    return result


def run_experiment_blocking(config: ExperimentConfig, settings: Settings, db: Database) -> dict:
    return asyncio.run(execute_experiment(config, settings, db))


async def execute_falsification(experiment_id: str, request: FalsifyRequest, settings: Settings, db: Database) -> dict:
    record = db.get_record(experiment_id)
    if record is None:
        raise ExperimentError("Experiment not found.", 404)
    if record.get("falsification_json") and not request.rerun:
        return json.loads(record["falsification_json"])
    stored = json.loads(record["config_json"])
    base = ExperimentConfig(**stored)
    result = json.loads(record["result_json"])
    frozen = StrategyParams(**result["protocol"]["frozen_params"])
    provider_name = result["protocol"]["provider"]
    probe = base.model_copy(update={"train_sessions": request.sessions, "test_sessions": 0, "rounds": request.rounds})
    estimate = len(FALSIFICATION_CELLS) * request.sessions * request.rounds * llm_agent_count(probe)
    if provider_name != "mock" and estimate > 24 and not request.confirm_llm_cost:
        raise ExperimentError(
            f"Refusing live-model falsification: about {estimate} model calls. Set confirm_llm_cost to true."
        )
    provider = make_provider(provider_name, settings, base.model, base.signal_noise)
    if hasattr(provider, "bind_semaphore"):
        provider.bind_semaphore(asyncio.Semaphore(settings.max_concurrency))
    cells = []
    stored_sessions = []
    for index, cell in enumerate(FALSIFICATION_CELLS):
        cfg = base.model_copy(update={**cell["overrides"], "oracle": False, "rounds": request.rounds})
        if cell["id"] == "model_rational" or cell["id"] == "model_herd":
            cfg = cfg.model_copy(update={"provider": provider_name})
        cell_provider = provider
        if cfg.model != base.model or cfg.signal_noise != base.signal_noise:
            cell_provider = make_provider(provider_name, settings, cfg.model, cfg.signal_noise)
            if hasattr(cell_provider, "bind_semaphore"):
                cell_provider.bind_semaphore(asyncio.Semaphore(settings.max_concurrency))
        seed_rng = np.random.default_rng(mix_seed(base.seed, "falsify", cell["id"], index))
        seeds = [int(value) for value in seed_rng.integers(1, 2**31 - 1, size=request.sessions)]
        sessions = await _run_many(
            cfg,
            cell_provider,
            seeds,
            f"robustness:{cell['id']}",
            frozen,
            cfg.prompt_version,
            True,
            keep_prompts=False,
        )
        stored_sessions.extend(sessions)
        perf_rng = np.random.default_rng(mix_seed("falsify-perf", base.seed, cell["id"]))
        performance = performance_block(sessions, "robustness", perf_rng)
        anchoring = round_number_anchoring(_accepted_quotes(sessions))
        ci = performance["bootstrap_ci95"]
        pnl_survives = bool(ci["low"] is not None and ci["mean"] is not None and ci["low"] > 0 and ci["mean"] > 0)
        effect = anchoring.get("ci95", {}).get("estimate")
        bias_survives = bool(
            not anchoring.get("insufficient_data")
            and anchoring.get("p_value") is not None
            and anchoring["p_value"] < 0.05
            and effect is not None
            and effect > 0
        )
        if pnl_survives:
            pnl_text = "Held-out bootstrap interval for mean simulation PnL lies entirely above zero."
        elif ci["low"] is None:
            pnl_text = "Not enough sessions for a bootstrap interval."
        else:
            pnl_text = "The bootstrap interval for mean simulation PnL does not lie entirely above zero. The edge does not survive this cell."
        if anchoring.get("insufficient_data"):
            bias_text = "Anchoring test was not identified in this cell."
        elif bias_survives:
            bias_text = "Quotes remain closer to multiples of 5 than private signals, at the 5% level."
        else:
            bias_text = "The round-number excess does not clear the 5% bar in this cell."
        cells.append(
            {
                "id": cell["id"],
                "label": cell["label"],
                "overrides": cell["overrides"],
                "n_sessions": request.sessions,
                "rounds": request.rounds,
                "seeds": seeds,
                "retuned": False,
                "mean_pnl": performance["mean_pnl"],
                "median_pnl": performance["median_pnl"],
                "total_pnl": performance["total_pnl"],
                "win_rate": performance["win_rate"],
                "bootstrap_ci95": ci,
                "student_ci95": performance["student_ci95"],
                "max_drawdown_worst_session": performance["max_drawdown_worst_session"],
                "histogram": performance["histogram"],
                "anchoring_p_value": anchoring.get("p_value"),
                "anchoring_effect": effect,
                "anchoring_statistic": anchoring.get("statistic"),
                "anchoring_n": anchoring.get("n"),
                "pnl_survives": pnl_survives,
                "bias_survives": bias_survives,
                "interpretation": f"{pnl_text} {bias_text}",
            }
        )
    payload = {
        "experiment_id": experiment_id,
        "retuned": False,
        "frozen_variant": result["protocol"]["frozen_variant"],
        "frozen_params": result["protocol"]["frozen_params"],
        "baseline_test": result["performance"]["test"],
        "disclaimer": (
            "Each cell replays the frozen rule set. Rules are not re-selected. "
            "A cell that fails is a result."
        ),
        "cells": cells,
    }
    payload = clean(payload)
    db.add_sessions(experiment_id, stored_sessions)
    db.save_falsification(experiment_id, payload)
    return payload


def run_falsification_blocking(experiment_id: str, request: FalsifyRequest, settings: Settings, db: Database) -> dict:
    return asyncio.run(execute_falsification(experiment_id, request, settings, db))
