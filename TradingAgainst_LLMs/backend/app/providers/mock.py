from __future__ import annotations

import json
from typing import Any

import numpy as np

from app.mathutil import pull_to_multiple
from app.providers import ModelProvider


PERSONA_MOD = {
    "cautious-mm": {"signal": 0.08, "anchor": -0.08, "spread": 0.35},
    "signal-chaser": {"signal": 0.18, "anchor": -0.12, "spread": 0.05},
    "round-anchor": {"signal": -0.06, "anchor": 0.12, "spread": -0.08},
    "herd-follower": {"signal": -0.12, "anchor": 0.02, "spread": 0.0},
}

MODEL_SPEC = {
    "mock-anchor-v1": {"signal_w": 0.22, "anchor": 0.84, "spread": 0.55, "skew": 0.0, "first": 0.22},
    "mock-herd-v1": {"signal_w": 0.12, "anchor": 0.05, "spread": 1.15, "skew": 0.0, "first": 0.35},
    "mock-rational-v1": {"signal_w": 1.0, "anchor": 0.0, "spread_from_noise": 0.9, "skew": 0.14, "first": 0.0},
}


class MockProvider(ModelProvider):
    """Deterministic stand-in for an LLM trader.

    Behavioral parameters are explicit. This is not a claim about any production model.
    """

    name = "mock"

    def __init__(self, model: str, signal_noise: float):
        self.model = model
        self.signal_noise = float(signal_noise)

    async def complete(self, messages, *, temperature: float, context: dict[str, Any]) -> str:
        del messages
        if self.model == "mock-broken":
            return "I think it is probably around fifty, not sure."
        if "true_value" in context and not context.get("oracle_control"):
            raise RuntimeError("mock provider refused hidden true_value outside an oracle control")
        quote = self._quote(context, temperature)
        return json.dumps(quote)

    def _quote(self, context: dict[str, Any], temperature: float) -> dict[str, float]:
        if context.get("oracle_control") and context.get("true_value") is not None:
            belief = float(context["true_value"])
            spread = 0.4
            size = min(1.0, float(context.get("max_order_size") or 1.0))
            return {"bid": belief - spread / 2, "ask": belief + spread / 2, "size": size}
        spec = MODEL_SPEC.get(self.model, MODEL_SPEC["mock-anchor-v1"])
        persona = PERSONA_MOD.get(str(context.get("persona")), {"signal": 0.0, "anchor": 0.0, "spread": 0.0})
        signal_w = min(1.0, max(0.0, spec["signal_w"] + persona["signal"]))
        anchor = min(1.0, max(0.0, spec["anchor"] + persona["anchor"]))
        if context.get("prompt_version") == "v1-debias":
            anchor *= 0.08
        signal = float(context["private_signal"])
        stale = context.get("prev_midpoint")
        stale_f = float(stale) if stale is not None else signal
        belief = signal_w * signal + (1.0 - signal_w) * stale_f
        opening = context.get("opening_midpoint")
        if opening is not None and spec.get("first", 0):
            belief = (1.0 - spec["first"]) * belief + spec["first"] * float(opening)
        belief -= float(spec.get("skew", 0.0)) * float(context.get("inventory") or 0.0)
        belief = pull_to_multiple(belief, anchor, 5.0)
        rng = np.random.default_rng(int(context["decision_seed"]))
        belief += float(rng.normal(0.0, 1.15 * float(temperature)))
        if "spread_from_noise" in spec:
            spread = float(spec["spread_from_noise"]) * self.signal_noise
        else:
            spread = float(spec["spread"]) + float(persona["spread"])
        spread *= 1.0 + 0.35 * float(temperature)
        spread = max(0.2, spread)
        size = 2.0 if context.get("persona") == "cautious-mm" else 1.0
        size = min(size, float(context.get("max_order_size") or size))
        bid = belief - spread / 2
        ask = belief + spread / 2
        return {"bid": bid, "ask": ask, "size": size}
