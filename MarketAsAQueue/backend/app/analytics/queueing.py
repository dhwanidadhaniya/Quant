"""Classical queueing formulae with explicit LOB caveats.

M/M/1  Poisson arrivals, exponential service, single server, infinite buffer.

    ρ = λ / μ
    P_n = (1 − ρ) ρ^n          n = 0,1,2,...   (requires ρ < 1)
    L = ρ / (1 − ρ)
    W = 1 / (μ − λ)

Little's law (distribution-free, applies in the long run whenever the
limits exist):

    L = λ W

Educational simplification
    A limit-order book is not an M/M/1 queue. It has many prices, FIFO
    plus price priority, cancellations, strategic placement, and
    self-exciting flow. ρ > 1 does NOT mean the market 'explodes';
    cancellations and price moves regulate queue length.
"""

from __future__ import annotations

import math


def traffic_intensity(lam: float, mu: float) -> float:
    if mu <= 0:
        return float("inf")
    return lam / mu


def mm1_pn(n: int, rho: float) -> float:
    if rho >= 1 or rho < 0:
        return float("nan")
    return (1 - rho) * (rho**n)


def mm1_distribution(rho: float, n_max: int = 40) -> list[dict]:
    return [{"n": n, "p": mm1_pn(n, rho)} for n in range(n_max + 1)]


def mm1_L(rho: float) -> float:
    if rho >= 1 or rho < 0:
        return float("inf")
    return rho / (1 - rho)


def mm1_W(lam: float, mu: float) -> float:
    if mu <= lam:
        return float("inf")
    return 1.0 / (mu - lam)


def mm1_Wq(lam: float, mu: float) -> float:
    if mu <= lam:
        return float("inf")
    return lam / (mu * (mu - lam))


def littles_law(L: float | None = None, lam: float | None = None, W: float | None = None) -> dict:
    known = [x is not None for x in (L, lam, W)]
    if sum(known) < 2:
        raise ValueError("Little's law needs any two of L, λ, W")
    if L is None:
        L = lam * W  # type: ignore
    elif lam is None:
        lam = L / W if W else float("inf")  # type: ignore
    else:
        W = L / lam if lam else float("inf")
    return {
        "L": L,
        "lambda": lam,
        "W": W,
        "formula": "L = λ W",
        "interpretation": (
            "If 50 orders arrive per second and each spends 2 seconds in the "
            "system, the modeled system holds L = 100 orders on average."
        ),
    }


def poisson_pmf(k: int, lam: float) -> float:
    if k < 0:
        return 0.0
    return math.exp(-lam) * lam**k / math.factorial(k)


def poisson_cdf(k: int, lam: float) -> float:
    return sum(poisson_pmf(i, lam) for i in range(k + 1))


def exponential_pdf(t: float, mu: float) -> float:
    if t < 0:
        return 0.0
    return mu * math.exp(-mu * t)


def exponential_cdf(t: float, mu: float) -> float:
    if t < 0:
        return 0.0
    return 1.0 - math.exp(-mu * t)


def geometric_pmf(k: int, p: float) -> float:
    """P(K=k) for k = 0,1,... failures before first success."""
    if k < 0:
        return 0.0
    return ((1 - p) ** k) * p


def normal_pdf(x: float, mu: float = 0.0, sigma: float = 1.0) -> float:
    if sigma <= 0:
        return 0.0
    z = (x - mu) / sigma
    return math.exp(-0.5 * z * z) / (sigma * math.sqrt(2 * math.pi))


def birth_death_stationary(lam: float, mu: float, n_max: int = 20) -> list[dict]:
    """M/M/1 truncated as a birth-death chain on {0,...,n_max}."""
    rho = traffic_intensity(lam, mu)
    if rho >= 1:
        # Truncated finite buffer: normalize ρ^n
        weights = [rho**n for n in range(n_max + 1)]
        z = sum(weights) or 1.0
        return [{"n": n, "pi": w / z, "birth": lam, "death": mu if n > 0 else 0.0} for n, w in enumerate(weights)]
    return [{"n": n, "pi": mm1_pn(n, rho), "birth": lam, "death": mu if n > 0 else 0.0} for n in range(n_max + 1)]


def markov_queue_matrix(lam: float, mu: float, n_states: int = 5) -> dict:
    """Coarse liquidity states: empty, low, normal, deep, very deep.

    Transition rates are a didactic mapping from (λ, μ), not estimated
    from a live tape.
    """
    labels = ["EMPTY", "LOW", "NORMAL", "DEEP", "VERY_DEEP"]
    n = min(n_states, 5)
    labels = labels[:n]
    P = [[0.0] * n for _ in range(n)]
    p_up = min(0.85, lam / (lam + mu + 1e-9))
    p_dn = 1.0 - p_up
    for i in range(n):
        if i == 0:
            P[i][i] = 1 - p_up
            P[i][i + 1] = p_up
        elif i == n - 1:
            P[i][i] = 1 - p_dn
            P[i][i - 1] = p_dn
        else:
            P[i][i] = 0.2
            P[i][i + 1] = 0.8 * p_up
            P[i][i - 1] = 0.8 * p_dn
            s = sum(P[i])
            P[i] = [x / s for x in P[i]]
    pi = _stationary(P)
    return {"labels": labels, "P": P, "pi": pi, "assumption": "Markov: next state depends on current state only."}


def _stationary(P: list[list[float]], iters: int = 200) -> list[float]:
    n = len(P)
    pi = [1.0 / n] * n
    for _ in range(iters):
        nxt = [0.0] * n
        for j in range(n):
            nxt[j] = sum(pi[i] * P[i][j] for i in range(n))
        s = sum(nxt) or 1.0
        pi = [x / s for x in nxt]
    return pi


def mm1_bundle(lam: float, mu: float) -> dict:
    rho = traffic_intensity(lam, mu)
    stable = rho < 1
    return {
        "lambda": lam,
        "mu": mu,
        "rho": rho,
        "stable_under_mm1": stable,
        "L": mm1_L(rho) if stable else None,
        "W": mm1_W(lam, mu) if stable else None,
        "Wq": mm1_Wq(lam, mu) if stable else None,
        "P0": (1 - rho) if stable else None,
        "distribution": mm1_distribution(rho) if stable else [],
        "caveat": (
            "Do not read ρ>1 as 'the order book is unstable'. M/M/1 assumes a "
            "single server, no cancellations, and infinite patience. Real books "
            "regulate via cancels, price moves, and multi-level routing."
        ),
        "educational": True,
    }
