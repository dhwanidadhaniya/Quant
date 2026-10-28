"""Monte Carlo paths of a reduced queue-position process.

We do not resimulate the entire book thousands of times on every
request (that would stall the live engine). Instead we simulate the
touch queue ahead of a resting order as a birth-death / competing-risk
process:

    dQ_ahead :  −MarketSize  or  −CancelAhead  or  +0 (new orders join BEHIND under FIFO)

FIFO implication
    At a fixed price, new limit orders arrive behind you. They do not
    increase Q_ahead. Price improvements can, however, strand you.

Each path yields a fill time or a right-censor at T_max.
"""

from __future__ import annotations

import math
import random
from typing import Optional


def simulate_paths(
    queue_ahead: float,
    qty: float,
    lambda_m: float,
    mean_mkt_size: float,
    cancel_rate: float,
    kappa_adverse: float,
    n: int = 400,
    t_max: float = 60.0,
    seed: int = 3,
) -> dict:
    rng = random.Random(seed)
    fills: list[float] = []
    censored = 0
    paths: list[list[dict]] = []
    keep_paths = min(48, n)
    for i in range(n):
        qa = max(queue_ahead, 0.0)
        t = 0.0
        path = [{"t": 0.0, "qa": qa}]
        filled_at: Optional[float] = None
        while t < t_max:
            rate_m = max(lambda_m, 1e-6)
            rate_c = max(cancel_rate * 0.02 * max(qa, 1.0) / 80.0, 1e-6)
            rate_a = max(kappa_adverse, 1e-6)
            total = rate_m + rate_c + rate_a
            t += rng.expovariate(total)
            if t >= t_max:
                break
            u = rng.random() * total
            if u < rate_m:
                take = max(10.0, rng.expovariate(1.0 / max(mean_mkt_size, 1.0)))
                qa = max(0.0, qa - take)
                if qa <= 0:
                    filled_at = t
                    path.append({"t": t, "qa": 0.0})
                    break
            elif u < rate_m + rate_c:
                qa = max(0.0, qa - max(10.0, rng.expovariate(1.0 / 40.0)))
                if qa <= 0:
                    filled_at = t
                    path.append({"t": t, "qa": 0.0})
                    break
            else:
                # Adverse move: order stranded at this price
                break
            if i < keep_paths and rng.random() < 0.35:
                path.append({"t": t, "qa": qa})
        if filled_at is not None:
            fills.append(filled_at)
        else:
            censored += 1
        if i < keep_paths:
            paths.append(path)
    fills.sort()
    nf = len(fills)
    def pct(p: float) -> Optional[float]:
        if not fills:
            return None
        idx = min(len(fills) - 1, max(0, int(p * (len(fills) - 1))))
        return fills[idx]
    # Empirical CDF on a grid
    grid = [i * 0.5 for i in range(0, 121)]
    cdf = []
    for t in grid:
        cdf.append(sum(1 for x in fills if x <= t) / n)
    mean = sum(fills) / nf if nf else None
    return {
        "n": n,
        "n_filled": nf,
        "n_censored": censored,
        "p_fill": nf / n,
        "mean": mean,
        "median": pct(0.5),
        "p10": pct(0.1),
        "p25": pct(0.25),
        "p75": pct(0.75),
        "p90": pct(0.9),
        "cdf": [{"t": t, "F": f} for t, f in zip(grid, cdf)],
        "paths": paths,
        "fills": fills[:200],
    }


def compare_theory_mc(theory_e: float, theory_p: float, mc: dict) -> dict:
    sim_e = mc.get("mean")
    err = None
    if sim_e is not None and theory_e and math.isfinite(theory_e):
        err = abs(sim_e - theory_e) / max(abs(theory_e), 1e-6)
    return {
        "theoretical_E_T": theory_e,
        "simulated_E_T": sim_e,
        "error_pct": None if err is None else err * 100,
        "theoretical_P_fill": theory_p,
        "simulated_P_fill": mc.get("p_fill"),
        "why_discrepancy": (
            "The closed form uses a constant-rate competing-risk approximation. "
            "Monte Carlo draws random market sizes and an adverse-move clock. "
            "Discrepancy is expected and is a feature of the model-check panel, "
            "not a bug."
        ),
    }
