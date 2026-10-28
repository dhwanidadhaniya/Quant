from __future__ import annotations

import numpy as np
from scipy import stats


def max_drawdown(curve: list[float]) -> float:
    peak = -1e300
    worst = 0.0
    seen = False
    for value in curve:
        if value is None:
            continue
        seen = True
        peak = max(peak, float(value))
        worst = max(worst, peak - float(value))
    return float(worst if seen else 0.0)


def bootstrap_mean_ci(values: np.ndarray, rng: np.random.Generator, n_boot: int = 2000, alpha: float = 0.05) -> dict:
    x = np.asarray(values, dtype=float)
    x = x[np.isfinite(x)]
    if len(x) == 0:
        return {"mean": None, "low": None, "high": None, "n": 0}
    mean = float(x.mean())
    if len(x) < 2:
        return {"mean": mean, "low": None, "high": None, "n": int(len(x))}
    idx = rng.integers(0, len(x), size=(n_boot, len(x)))
    means = x[idx].mean(axis=1)
    low, high = np.quantile(means, [alpha / 2, 1 - alpha / 2])
    return {"mean": mean, "low": float(low), "high": float(high), "n": int(len(x))}


def student_mean_ci(values: np.ndarray, alpha: float = 0.05) -> dict:
    x = np.asarray(values, dtype=float)
    x = x[np.isfinite(x)]
    n = int(len(x))
    if n == 0:
        return {"mean": None, "low": None, "high": None, "n": 0}
    mean = float(x.mean())
    if n < 2:
        return {"mean": mean, "low": None, "high": None, "n": n}
    se = float(stats.sem(x))
    if se == 0:
        return {"mean": mean, "low": mean, "high": mean, "n": n}
    low, high = stats.t.interval(1 - alpha, n - 1, loc=mean, scale=se)
    return {"mean": mean, "low": float(low), "high": float(high), "n": n}


def performance_block(sessions: list[dict], split: str, rng: np.random.Generator) -> dict:
    pnls = np.array([float(s["strategy_terminal_pnl"]) for s in sessions], dtype=float)
    drawdowns = np.array([float(s["strategy_max_drawdown"]) for s in sessions], dtype=float)
    wins = int(np.sum(pnls > 1e-9))
    losses = int(np.sum(pnls < -1e-9))
    flats = int(len(pnls) - wins - losses)
    hist_bins = int(min(12, max(4, len(pnls)))) if len(pnls) else 1
    if len(pnls):
        counts, edges = np.histogram(pnls, bins=hist_bins)
        histogram = {"counts": [int(c) for c in counts], "edges": [float(e) for e in edges]}
    else:
        histogram = {"counts": [], "edges": []}
    return {
        "split": split,
        "label": "Terminal simulation PnL marked to hidden ground truth, in cash units",
        "n_sessions": int(len(pnls)),
        "total_pnl": float(pnls.sum()) if len(pnls) else 0.0,
        "mean_pnl": float(pnls.mean()) if len(pnls) else None,
        "median_pnl": float(np.median(pnls)) if len(pnls) else None,
        "win_rate": float(wins / len(pnls)) if len(pnls) else None,
        "loss_rate": float(losses / len(pnls)) if len(pnls) else None,
        "win_rate_definition": "Fraction of sessions with positive terminal PnL marked to ground truth",
        "profitable_sessions": wins,
        "losing_sessions": losses,
        "flat_sessions": flats,
        "max_drawdown_worst_session": float(drawdowns.max()) if len(drawdowns) else None,
        "mean_session_max_drawdown": float(drawdowns.mean()) if len(drawdowns) else None,
        "drawdown_definition": "Peak-to-trough decline of within-session mark-to-ground-truth PnL",
        "student_ci95": student_mean_ci(pnls),
        "bootstrap_ci95": bootstrap_mean_ci(pnls, rng),
        "histogram": histogram,
        "session_pnls": [
            {
                "id": s["id"],
                "seed": s["seed"],
                "split": s["split"],
                "pnl": s["strategy_terminal_pnl"],
                "max_drawdown": s["strategy_max_drawdown"],
            }
            for s in sessions
        ],
    }
