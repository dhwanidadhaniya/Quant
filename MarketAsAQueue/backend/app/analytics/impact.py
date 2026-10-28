"""Market impact, depth walk, and opportunity-cost helpers.

Impact is not a universal constant. In a queueing book it is the price
change produced when an aggressive quantity Q consumes displayed
liquidity L, possibly in a more volatile state σ:

    Impact ≈ f(Q, L, σ)

Educational square-root / depth-walk hybrid:

    Temporary impact  ≈  spread/2  +  σ · √(Q / V) · sign
    plus a mechanical walk of the displayed book (exact in the simulator).

Neither is 'the' market-impact law. Square-root impact is an empirical
regularity in some equities; the depth walk is exact only for displayed
quantity with no hidden liquidity and no concurrent cancels.
"""

from __future__ import annotations

import math


def square_root_impact(qty: float, daily_volume: float, sigma: float, spread: float) -> float:
    adv = max(daily_volume, 1.0)
    return 0.5 * spread + sigma * math.sqrt(max(qty, 0.0) / adv)


def walk_book(levels: list[dict], qty: int) -> dict:
    """Consume displayed levels in price-time order (already sorted)."""
    remaining = qty
    filled = 0
    notional = 0.0
    consumed = []
    for lvl in levels:
        take = min(remaining, int(lvl["volume"]))
        if take <= 0:
            break
        remaining -= take
        filled += take
        notional += take * float(lvl["price"])
        consumed.append({"price": lvl["price"], "take": take, "left": int(lvl["volume"]) - take})
        if remaining == 0:
            break
    vwap = notional / filled if filled else None
    last = consumed[-1]["price"] if consumed else None
    first = levels[0]["price"] if levels else None
    impact_px = (last - first) if (last is not None and first is not None) else 0.0
    return {
        "requested": qty,
        "filled": filled,
        "unfilled": remaining,
        "vwap": vwap,
        "arrival": first,
        "terminal": last,
        "impact_ticks_proxy": impact_px,
        "levels": consumed,
    }


def opportunity_cost(spread: float, mid: float, p_fill: float, e_wait: float, sigma: float, side: str = "bid") -> dict:
    """Waiting vs crossing vs cancelling vs repricing.

    Crossing cost ≈ half-spread (plus impact, omitted here).
    Waiting cost  ≈ (1 − P_fill) · half-spread  +  P_fill · 0
                    + inventory/vol cost σ √t
    These are accounting identities of the model, not a recommendation.
    """
    half = 0.5 * spread
    cross = half
    wait_unfilled = (1 - p_fill) * half
    wait_vol = sigma * mid * math.sqrt(max(e_wait, 0) / (252 * 6.5 * 3600)) if mid else 0.0
    wait = wait_unfilled + 0.5 * wait_vol
    cancel = half  # you still may need to cross later
    reprice = 0.5 * half + 0.3 * wait_vol
    return {
        "cross_spread": cross,
        "wait": wait,
        "cancel": cancel,
        "reprice": reprice,
        "p_fill": p_fill,
        "e_wait": e_wait,
        "note": "Opportunity cost is model-defined. No strategy is universally best.",
    }


def decision_engine(pos: dict | None, snap: dict, fill: dict, vol: float, rates: dict) -> dict:
    qa = (pos or {}).get("queue_ahead", snap.get("best_bid_queue") or 0)
    p10 = fill.get("horizons", [{}, {}, {"fill": 0.4}])[2].get("fill", 0.4)
    e_t = fill.get("E_T_fill", 8.0)
    spread = snap.get("spread") or 0.02
    qi = snap.get("imbalance") or 0.0
    pressure = "BUY" if qi > 0.15 else "SELL" if qi < -0.15 else "BALANCED"
    # Transparent rule set — not an opaque 'AI' call.
    reasons = []
    action = "PATIENT LIMIT ORDER"
    if p10 < 0.22 and spread <= 0.03 and vol > 0.4:
        action = "MARKET ORDER"
        reasons.append("Low 10s fill probability with elevated volatility: waiting risks an adverse move larger than the spread.")
    elif p10 < 0.35 and abs(qi) > 0.25 and ((qi < 0 and (pos or {}).get("side") == "bid") or (qi > 0 and (pos or {}).get("side") == "ask")):
        action = "AGGRESSIVE LIMIT ORDER"
        reasons.append("Queue imbalance is running against the resting side; improving the price raises queue priority.")
    elif qa > 1500 and p10 > 0.5:
        action = "PATIENT LIMIT ORDER"
        reasons.append("Fill odds are acceptable; paying the spread is optional, not required.")
    elif p10 > 0.7 and e_t < 4:
        action = "LIMIT ORDER"
        reasons.append("Short expected wait at the touch. Capture spread, accept queue risk.")
    else:
        reasons.append("Default: rest at the touch. Crossing is reserved for when waiting cost exceeds half-spread plus adverse-selection risk.")
    if rates.get("cancel", 0) > 40:
        reasons.append("High cancellation intensity: displayed depth is fragile; treat Q_ahead as an upper bound on true executable liquidity.")
    return {
        "action": action,
        "reasons": reasons,
        "state": {
            "queue_ahead": qa,
            "fill_probability_10s": p10,
            "wait_time": e_t,
            "spread": spread,
            "volatility": vol,
            "imbalance": qi,
            "market_pressure": pressure,
        },
        "disclaimer": "Rule-based educational engine. Not a trading recommendation.",
    }
