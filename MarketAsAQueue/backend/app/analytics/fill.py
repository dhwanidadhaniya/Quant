"""Execution / fill probability for a resting limit order.

Question
    Given X_t = (queue ahead, order flow, spread, vol), what is
    P(fill by horizon h) and E[T_fill]?

Model (competing risks, educational)
    Queue ahead Q_a depletes at rate
        δ = λ_M · s̄ + θ · Q_a
    where λ_M is opposite-side market-order intensity, s̄ mean size,
    θ a cancellation rate on the shares ahead.

    Survival of remaining unfilled:
        S(t) = P(T_fill > t) ≈ exp(− (δ / (Q_a + q)) t )  ·  S_adverse(t)

    Hazard
        h(t) = f(t) / S(t)

    Adverse-price jump is modeled as an independent exponential clock
    with rate κ(σ, spread) — if the touch moves away, the order is
    stranded (fill probability collapses at that price).

This is an EDUCATIONAL SIMPLIFICATION. It ignores queue jumping on
other venues, hidden liquidity, and strategic cancellations correlated
with your own placement.
"""

from __future__ import annotations

import math
from typing import Optional


HORIZONS = [1.0, 5.0, 10.0, 30.0, 60.0]


def depletion_rate(queue_ahead: float, lambda_m: float, mean_size: float, cancel_intensity: float) -> float:
    return max(1e-6, lambda_m * max(mean_size, 1.0) + cancel_intensity * max(queue_ahead, 0.0) * 0.15)


def adverse_rate(vol: float, spread: float, imbalance: float, side: str) -> float:
    """Rate at which the touch runs away before you fill.

    Buys are more stranded when imbalance is negative (sell pressure).
    """
    signed = imbalance if side == "bid" else -imbalance
    pressure = max(0.0, -signed)
    return max(0.01, 0.08 * vol * 4 + 0.5 * pressure + 0.15 / max(spread, 0.01))


def survival(t: float, qa: float, qty: float, delta: float, kappa: float) -> float:
    work = max(qa + 0.5 * qty, 1.0)
    # Probability the depletion clock hasn't eaten through the work,
    # times probability the price hasn't moved away.
    return math.exp(-delta * t / work) * math.exp(-kappa * t)


def fill_curve(qa: float, qty: float, lambda_m: float, mean_size: float, cancel: float, vol: float, spread: float, imbalance: float, side: str = "bid") -> dict:
    delta = depletion_rate(qa, lambda_m, mean_size, cancel)
    kappa = adverse_rate(vol, spread, imbalance, side)
    points = []
    for h in HORIZONS:
        s = survival(h, qa, qty, delta, kappa)
        points.append({"t": h, "survival": s, "fill": 1.0 - s})
    # Density via finite difference of CDF
    grid = [i * 0.5 for i in range(0, 121)]
    surv = [survival(t, qa, qty, delta, kappa) for t in grid]
    cdf = [1 - s for s in surv]
    pdf = [0.0]
    for i in range(1, len(grid)):
        pdf.append(max(0.0, cdf[i] - cdf[i - 1]) / 0.5)
    hazard = []
    for i, t in enumerate(grid):
        h = pdf[i] / surv[i] if surv[i] > 1e-9 else 0.0
        hazard.append({"t": t, "h": h, "S": surv[i], "F": cdf[i], "f": pdf[i]})
    # Expected fill time on [0, Tmax] with mass at Tmax for unfilled
    tmax = 60.0
    e_fill = 0.0
    for i in range(1, len(grid)):
        if grid[i] <= tmax:
            e_fill += grid[i] * pdf[i] * 0.5
    p_fill_60 = 1 - survival(60, qa, qty, delta, kappa)
    # Conditional expectation given fill by 60s, plus tail penalty
    e_t = 0.0
    mass = 0.0
    for i in range(1, len(grid)):
        e_t += grid[i] * pdf[i] * 0.5
        mass += pdf[i] * 0.5
    leftover = max(0.0, 1 - mass)
    e_uncond = e_t + leftover * 90.0
    return {
        "horizons": points,
        "curve": hazard,
        "delta": delta,
        "kappa": kappa,
        "E_T_fill": e_uncond,
        "P_fill_60": p_fill_60,
        "mean_size": mean_size,
    }


def drivers_from_change(prev: Optional[dict], curr: dict) -> list[dict]:
    if not prev:
        return []
    keys = [
        ("queue_ahead", "Queue Ahead"),
        ("market_orders", "Market Orders"),
        ("cancellations", "Cancellations"),
        ("volatility", "Volatility"),
        ("spread", "Spread"),
    ]
    out = []
    for k, label in keys:
        a, b = prev.get(k, 0), curr.get(k, 0)
        out.append({"name": label, "previous": a, "current": b, "delta": b - a})
    return out


def fill_module(sim, pos: Optional[dict]) -> dict:
    rates = sim.rates()
    snap = sim.book.snapshot(1)
    vol = sim._realized_vol()
    spread = snap["spread"] or 0.02
    qi = snap["imbalance"] or 0.0
    if pos and pos.get("queue_ahead") is not None:
        qa = float(pos["queue_ahead"])
        qty = float(pos.get("qty") or 100)
        side = pos.get("side") or "bid"
    else:
        qa = float(snap["best_bid_queue"] or 800)
        qty = 100.0
        side = "bid"
    curve = fill_curve(
        qa,
        qty,
        lambda_m=rates["market"],
        mean_size=sim.params.mean_market_size,
        cancel=rates["cancel"],
        vol=vol,
        spread=spread,
        imbalance=qi,
        side=side,
    )
    inputs = {
        "queue_ahead": qa,
        "market_orders": rates["market"],
        "cancellations": rates["cancel"],
        "volatility": vol,
        "spread": spread,
        "imbalance": qi,
        "side": side,
        "qty": qty,
    }
    prev = getattr(sim, "_prev_fill_inputs", None)
    why = []
    if prev:
        p0 = fill_curve(prev["queue_ahead"], prev["qty"], prev["market_orders"], sim.params.mean_market_size, prev["cancellations"], prev["volatility"], prev["spread"], prev["imbalance"], prev["side"])
        p1 = curve["horizons"][2]["fill"]  # 10s
        p0h = p0["horizons"][2]["fill"]
        # Finite-difference attribution
        for key, label, bump in [
            ("queue_ahead", "Queue Ahead", qa - prev["queue_ahead"]),
            ("market_orders", "Market Orders", rates["market"] - prev["market_orders"]),
            ("cancellations", "Cancellations", rates["cancel"] - prev["cancellations"]),
            ("volatility", "Volatility", vol - prev["volatility"]),
            ("spread", "Spread", spread - prev["spread"]),
        ]:
            trial = dict(prev)
            trial[key] = inputs[key]
            c = fill_curve(trial["queue_ahead"], trial["qty"], trial["market_orders"], sim.params.mean_market_size, trial["cancellations"], trial["volatility"], trial["spread"], trial["imbalance"], trial["side"])
            why.append(
                {
                    "name": label,
                    "contrib": (c["horizons"][2]["fill"] - p0h) * 100,
                    "raw_delta": bump,
                }
            )
        curve["why"] = {
            "previous": p0h,
            "current": p1,
            "drivers": why,
        }
        sim._prev_fill_inputs = inputs
        curve["curve"] = curve["curve"][::2]
        curve["inputs"] = inputs
        return curve
