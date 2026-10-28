import asyncio
import json

from app.agents import Observation, BookView, build_prompt, parse_llm_quote
from app.config import get_settings
from app.schemas import ExperimentConfig
from app.sim.experiment import run_experiment_blocking
from app.sim.session import run_session
from app.providers.mock import MockProvider
from app.storage.db import Database
from app.strategy.exploit import StrategyParams


def _obs() -> Observation:
    return Observation(
        round_idx=1,
        private_signal=51.2,
        book=BookView(None, None, None, None, 0, 0),
        recent_trades=[],
        inventory=0,
        cash=10_000,
        pnl_vs_mid=None,
        news_event="NO_NEWS",
        news_magnitude=0,
        prev_midpoint=50,
        opening_midpoint=49.5,
        price_min=0,
        price_max=150,
        max_order_size=4,
        decision_seed=7,
    )


def test_parser_and_prompt_do_not_leak_truth():
    parsed, err = parse_llm_quote('note {"bid": 10, "ask": 11, "size": 1}')
    assert err is None and parsed["bid"] == 10
    assert parse_llm_quote("no numbers here")[1] == "no_json"
    assert parse_llm_quote("")[1] == "empty_response"
    hidden = build_prompt(_obs(), "cautious-mm", "v1", None)
    blob = json.dumps(hidden)
    assert "true_value" not in blob
    assert "ORACLE CONTROL" not in blob
    oracle = build_prompt(_obs(), "cautious-mm", "v1", 47.531)
    oracle_blob = json.dumps(oracle)
    assert "ORACLE CONTROL" in oracle_blob
    assert "47.531000" in oracle_blob
    debias = json.dumps(build_prompt(_obs(), "cautious-mm", "v1-debias", None))
    assert "Beware of round-number anchoring" in debias


def test_broken_model_does_not_crash_and_strategy_cannot_see_truth():
    config = ExperimentConfig(
        rounds=5,
        agents=3,
        model="mock-broken",
        news_probability=0.5,
        seed=3,
        run_prompt_sensitivity=False,
    )
    session = asyncio.run(
        run_session(
            config=config,
            provider=MockProvider("mock-broken", config.signal_noise),
            session_seed=3,
            split="train",
            params=StrategyParams(),
        )
    )
    assert session["parse_failures"] == config.rounds * config.agents
    assert session["n_trades"] == 0
    for rnd in session["rounds"]:
        state = rnd["strategy"]["input_state"]
        assert "true_value" not in state
        assert "private_signal" not in state
        for quote in rnd["quotes"]:
            if quote["prompt"]:
                assert "true_value" not in json.dumps(quote["prompt"])


def test_train_selection_does_not_use_test_and_pnl_adds_up(tmp_path):
    db = Database(tmp_path / "research.sqlite")
    config = ExperimentConfig(
        train_sessions=2,
        test_sessions=2,
        rounds=8,
        agents=4,
        variant_mode="fixed_full",
        run_prompt_sensitivity=False,
        seed=15,
        news_probability=0.35,
        name="integrity",
    )
    result = run_experiment_blocking(config, get_settings(), db)
    assert result["protocol"]["test_used_for_selection"] is False
    assert set(result["protocol"]["train_seeds"]).isdisjoint(result["protocol"]["test_seeds"])
    assert result["protocol"]["frozen_variant"] == "full"
    assert {s["split"] for s in result["sessions"]} == {"train", "test"}
    for summary in result["sessions"]:
        session = db.get_session(summary["id"])
        realized = sum(rnd["strategy"]["realized_pnl"] for rnd in session["rounds"])
        assert abs(realized - session["strategy_terminal_pnl"]) < 1e-6
        for rnd in session["rounds"]:
            assert "true_value" not in rnd["strategy"]["input_state"]
    db.close()
