from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from typing import Any

import numpy as np

from app.engine.orderbook import OrderBook
from app.mathutil import mix_seed, tick
from app.providers import ModelProvider


def parse_llm_quote(text: str | None) -> tuple[dict | None, str | None]:
    if text is None or not str(text).strip():
        return None, "empty_response"
    raw = str(text)
    start = raw.find("{")
    end = raw.rfind("}")
    if start < 0 or end <= start:
        return None, "no_json"
    try:
        data = json.loads(raw[start : end + 1])
        bid = float(data["bid"])
        ask = float(data["ask"])
        size = float(data["size"])
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        return None, "parse_failure"
    if not all(math.isfinite(v) for v in (bid, ask, size)):
        return None, "non_finite"
    return {"bid": bid, "ask": ask, "size": size}, None


@dataclass
class BookView:
    best_bid: float | None
    best_ask: float | None
    midpoint: float | None
    spread: float | None
    best_bid_size: float
    best_ask_size: float
    bids: list[dict] = field(default_factory=list)
    asks: list[dict] = field(default_factory=list)

    @classmethod
    def from_snapshot(cls, snap: dict) -> "BookView":
        return cls(
            best_bid=snap.get("best_bid"),
            best_ask=snap.get("best_ask"),
            midpoint=snap.get("midpoint"),
            spread=snap.get("spread"),
            best_bid_size=float(snap.get("best_bid_size") or 0),
            best_ask_size=float(snap.get("best_ask_size") or 0),
            bids=list(snap.get("bids") or []),
            asks=list(snap.get("asks") or []),
        )


@dataclass
class Observation:
    """Information an agent is allowed to see. No hidden true value."""

    round_idx: int
    private_signal: float
    book: BookView
    recent_trades: list[dict]
    inventory: float
    cash: float
    pnl_vs_mid: float | None
    news_event: str
    news_magnitude: float
    prev_midpoint: float | None
    opening_midpoint: float | None
    price_min: float
    price_max: float
    max_order_size: float
    decision_seed: int

    def public_dict(self) -> dict[str, Any]:
        return {
            "round": self.round_idx,
            "private_signal": self.private_signal,
            "best_bid": self.book.best_bid,
            "best_ask": self.book.best_ask,
            "midpoint": self.book.midpoint,
            "spread": self.book.spread,
            "recent_trades": self.recent_trades[-6:],
            "inventory": self.inventory,
            "cash": self.cash,
            "pnl": self.pnl_vs_mid,
            "news_event": self.news_event,
            "news_magnitude": self.news_magnitude,
            "prev_midpoint": self.prev_midpoint,
            "opening_midpoint": self.opening_midpoint,
            "price_min": self.price_min,
            "price_max": self.price_max,
            "max_order_size": self.max_order_size,
        }


@dataclass
class AgentOutput:
    raw_response: str | None
    parsed: dict | None
    error: str | None
    prompt_messages: list[dict[str, str]] | None
    model: str
    temperature: float
    persona: str
    prompt_version: str


class BaseAgent:
    agent_id: str
    persona: str
    model: str
    temperature: float
    prompt_version: str

    def produce(self, obs: Observation) -> AgentOutput:
        raise NotImplementedError


def _clamp_quote(bid: float, ask: float, size: float, obs: Observation) -> dict[str, float]:
    spread = max(0.2, ask - bid)
    mid = (bid + ask) / 2
    lo = obs.price_min + 0.5
    hi = obs.price_max - 0.5
    mid = min(max(mid, lo + spread / 2), hi - spread / 2)
    bid_v = tick(mid - spread / 2)
    ask_v = tick(mid + spread / 2)
    if bid_v >= ask_v:
        ask_v = tick(bid_v + 0.2)
    size_v = float(min(max(size, 0.5), obs.max_order_size))
    return {"bid": bid_v, "ask": ask_v, "size": size_v}


class RandomAgent(BaseAgent):
    def __init__(self, agent_id: str, persona: str = "random"):
        self.agent_id = agent_id
        self.persona = persona
        self.model = "rule/random"
        self.temperature = 0.0
        self.prompt_version = "rule"

    def produce(self, obs: Observation) -> AgentOutput:
        rng = np.random.default_rng(obs.decision_seed)
        fair = obs.private_signal + float(rng.normal(0, 2.0))
        spread = float(rng.uniform(1.0, 3.0))
        parsed = _clamp_quote(fair - spread / 2, fair + spread / 2, 1.0, obs)
        return AgentOutput(json.dumps(parsed), parsed, None, None, self.model, 0.0, self.persona, self.prompt_version)


class NoiseTrader(BaseAgent):
    def __init__(self, agent_id: str, persona: str = "noise"):
        self.agent_id = agent_id
        self.persona = persona
        self.model = "rule/noise"
        self.temperature = 0.0
        self.prompt_version = "rule"

    def produce(self, obs: Observation) -> AgentOutput:
        rng = np.random.default_rng(obs.decision_seed)
        if rng.random() < 0.45 and obs.book.best_ask is not None and rng.random() < 0.5:
            bid = obs.book.best_ask
            ask = bid + 8
        elif rng.random() < 0.45 and obs.book.best_bid is not None:
            ask = obs.book.best_bid
            bid = ask - 8
        else:
            fair = obs.private_signal + float(rng.normal(0, 3))
            bid, ask = fair - 2, fair + 2
        parsed = _clamp_quote(bid, ask, 1.0, obs)
        return AgentOutput(json.dumps(parsed), parsed, None, None, self.model, 0.0, self.persona, self.prompt_version)


class MomentumAgent(BaseAgent):
    def __init__(self, agent_id: str, persona: str = "momentum"):
        self.agent_id = agent_id
        self.persona = persona
        self.model = "rule/momentum"
        self.temperature = 0.0
        self.prompt_version = "rule"
        self.prev_prev: float | None = None
        self.prev: float | None = None

    def produce(self, obs: Observation) -> AgentOutput:
        fair = obs.private_signal
        if obs.prev_midpoint is not None and self.prev is not None:
            fair = obs.private_signal + 0.8 * (obs.prev_midpoint - self.prev)
        if obs.prev_midpoint is not None:
            self.prev_prev = self.prev
            self.prev = obs.prev_midpoint
        parsed = _clamp_quote(fair - 0.75, fair + 0.75, 1.0, obs)
        return AgentOutput(json.dumps(parsed), parsed, None, None, self.model, 0.0, self.persona, self.prompt_version)


class MarketMakerAgent(BaseAgent):
    def __init__(self, agent_id: str, persona: str = "market-maker"):
        self.agent_id = agent_id
        self.persona = persona
        self.model = "rule/market-maker"
        self.temperature = 0.0
        self.prompt_version = "rule"

    def produce(self, obs: Observation) -> AgentOutput:
        fair = obs.private_signal - 0.15 * obs.inventory
        parsed = _clamp_quote(fair - 0.7, fair + 0.7, 2.0, obs)
        return AgentOutput(json.dumps(parsed), parsed, None, None, self.model, 0.0, self.persona, self.prompt_version)


def build_prompt(obs: Observation, persona: str, prompt_version: str, oracle_true_value: float | None) -> list[dict[str, str]]:
    warning = ""
    if prompt_version == "v1-debias":
        warning = " Beware of round-number anchoring. Do not snap quotes to multiples of 5 or 10."
    oracle = ""
    if oracle_true_value is not None:
        oracle = (
            f" ORACLE CONTROL: the hidden true value is {oracle_true_value:.6f}. "
            "This label means the agent is in an explicitly labeled oracle experiment."
        )
    system = (
        "You are a trader in a controlled simulation. You do not know the true asset value. "
        'Reply with JSON only: {"bid": number, "ask": number, "size": number}. '
        f"Constraints: bid < ask, size > 0, prices between {obs.price_min} and {obs.price_max}, "
        f"size at most {obs.max_order_size}.{warning}{oracle}"
    )
    user = json.dumps(
        {
            "persona": persona,
            "prompt_version": prompt_version,
            "observation": obs.public_dict(),
        },
        ensure_ascii=True,
    )
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


class LLMAgent(BaseAgent):
    def __init__(
        self,
        agent_id: str,
        provider: ModelProvider,
        model: str,
        temperature: float,
        persona: str,
        prompt_version: str,
        oracle: bool,
        signal_noise: float,
    ):
        self.agent_id = agent_id
        self.provider = provider
        self.model = model
        self.temperature = temperature
        self.persona = persona
        self.prompt_version = prompt_version
        self.oracle = oracle
        self.signal_noise = signal_noise
        self._oracle_value: float | None = None

    def set_oracle_value(self, value: float | None) -> None:
        """Only called when the session is an explicitly labeled oracle experiment."""
        self._oracle_value = value if self.oracle else None

    async def produce(self, obs: Observation) -> AgentOutput:
        messages = build_prompt(obs, self.persona, self.prompt_version, self._oracle_value if self.oracle else None)
        context = obs.public_dict()
        context.update(
            {
                "persona": self.persona,
                "prompt_version": self.prompt_version,
                "model": self.model,
                "decision_seed": obs.decision_seed,
                "max_order_size": obs.max_order_size,
                "inventory": obs.inventory,
                "private_signal": obs.private_signal,
                "prev_midpoint": obs.prev_midpoint,
                "opening_midpoint": obs.opening_midpoint,
            }
        )
        if self.oracle and self._oracle_value is not None:
            context["oracle_control"] = True
            context["true_value"] = self._oracle_value
        try:
            raw = await self.provider.complete(messages, temperature=self.temperature, context=context)
            parsed, error = parse_llm_quote(raw)
            return AgentOutput(raw, parsed, error, messages, self.model, self.temperature, self.persona, self.prompt_version)
        except Exception as exc:
            return AgentOutput(None, None, f"provider_error:{exc}", messages, self.model, self.temperature, self.persona, self.prompt_version)


def agent_decision_seed(session_seed: int, round_idx: int, agent_id: str) -> int:
    return mix_seed("decision", session_seed, round_idx, agent_id)
