"""Queue imbalance as a short-horizon informational statistic.

    QI_t = (Q_bid − Q_ask) / (Q_bid + Q_ask)   ∈ [−1, 1]

Microstructure reading
    QI > 0 : more displayed size on the bid (buy pressure in the queues)
    QI < 0 : more size on the ask

This is a *state variable*, not automatically a trading signal. Any
association with future mid-returns must be measured, not assumed.
In this platform the association is computed on SIMULATED paths, where
we deliberately inject a mild imbalance-conditioned market-order bias
so the scatter is educationally visible. That is not evidence of alpha
in real markets.
"""

from __future__ import annotations


def queue_imbalance(q_bid: float, q_ask: float) -> float:
    tot = q_bid + q_ask
    if tot <= 0:
        return 0.0
    return (q_bid - q_ask) / tot


def imbalance_vs_return(imbalance_hist: list[dict], mid_hist: list[dict], horizon: float = 1.0) -> dict:
    if len(imbalance_hist) < 10 or len(mid_hist) < 10:
        return {"n": 0, "corr": None, "points": [], "hit_rate": None, "conditional": []}
    mids = [(row["t"], row["mid"]) for row in mid_hist if row.get("mid")]
    points = []
    for row in imbalance_hist:
        t0, qi = row["t"], row.get("qi")
        if qi is None:
            continue
        target = t0 + horizon
        m0 = _mid_at(mids, t0)
        m1 = _mid_at(mids, target)
        if m0 is None or m1 is None or m0 <= 0:
            continue
        r = (m1 - m0) / m0
        points.append({"qi": qi, "r": r})
    n = len(points)
    if n < 5:
        return {"n": n, "corr": None, "points": points, "hit_rate": None, "conditional": []}
    mx = sum(p["qi"] for p in points) / n
    my = sum(p["r"] for p in points) / n
    cov = sum((p["qi"] - mx) * (p["r"] - my) for p in points) / n
    vx = sum((p["qi"] - mx) ** 2 for p in points) / n
    vy = sum((p["r"] - my) ** 2 for p in points) / n
    corr = cov / ((vx * vy) ** 0.5) if vx > 0 and vy > 0 else 0.0
    hits = sum(1 for p in points if p["qi"] * p["r"] > 0)
    # Conditional mean return in QI buckets
    buckets = [(-1, -0.4), (-0.4, -0.1), (-0.1, 0.1), (0.1, 0.4), (0.4, 1.01)]
    cond = []
    for a, b in buckets:
        sl = [p["r"] for p in points if a <= p["qi"] < b]
        cond.append(
            {
                "lo": a,
                "hi": b,
                "n": len(sl),
                "mean_r": (sum(sl) / len(sl)) if sl else None,
            }
        )
    return {
        "n": n,
        "corr": corr,
        "hit_rate": hits / n,
        "points": points[-300:],
        "conditional": cond,
        "horizon": horizon,
        "disclaimer": "Computed on SIMULATED data with an injected imbalance→flow coupling. Not a claim of live-market predictability.",
    }


def _mid_at(mids: list[tuple[float, float]], t: float) -> float | None:
    best = None
    for ts, m in mids:
        if ts <= t:
            best = m
        else:
            break
    return best
