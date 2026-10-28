"""Hawkes self-exciting intensity (advanced extension, not the foundation).

    λ(t) = μ + Σ_{t_i < t} α exp(−β (t − t_i))

Unlike a Poisson process, intensity depends on the past. That lets the
model capture clustering in order flow. It is still a reduced-form
model: it does not explain *why* traders cluster (information, latency
arbitrage, copycat algorithms).
"""

from __future__ import annotations

import math


def hawkes_intensity(t: float, events: list[float], mu: float, alpha: float, beta: float) -> float:
    s = mu
    for ti in events:
        if ti < t:
            s += alpha * math.exp(-beta * (t - ti))
    return s


def hawkes_path(mu: float, alpha: float, beta: float, t_max: float = 10.0, dt: float = 0.05) -> dict:
    """Ogata thinning for a univariate Hawkes, plus a sampled intensity path."""
    import random

    rng = random.Random(21)
    times: list[float] = []
    t = 0.0
    # Branching-ratio warning
    n_ratio = alpha / beta if beta else float("inf")
    while t < t_max:
        lam_star = hawkes_intensity(t, times, mu, alpha, beta) + 1e-9
        t += rng.expovariate(lam_star)
        if t > t_max:
            break
        lam_t = hawkes_intensity(t, times, mu, alpha, beta)
        if rng.random() <= lam_t / lam_star:
            times.append(t)
    grid = []
    u = 0.0
    while u <= t_max:
        grid.append({"t": u, "lambda": hawkes_intensity(u, times, mu, alpha, beta)})
        u += dt
    return {
        "events": times,
        "intensity": grid,
        "n": len(times),
        "branching_ratio": n_ratio,
        "stable": n_ratio < 1,
        "formula": "λ(t) = μ + Σ α e^{-β(t-t_i)}",
        "note": "Advanced extension. Foundation of the live book remains a (possibly time-varying) Poisson stream.",
    }
