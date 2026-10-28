"""GMP intelligence.

GMP is an unofficial, over-the-counter indication. This module never claims
manipulation. It measures forecast error, directional accuracy, and observable
inconsistencies versus subscription and fundamentals.

The Ghosh / Investorgain extract supplies a *last published* GMP, not a T-10…T-1
path. Trajectories are therefore sparse: one pre-listing point plus listing.
"""
from __future__ import annotations

from typing import Any, Optional

import numpy as np

from .formulas import (
    actual_listing_return,
    directional_accuracy,
    expected_listing_price,
    expected_listing_return,
    gmp_prediction_error,
    mae,
    rmse,
    _f,
)


def gmp_block(ipo_price: Any, gmp: Any, listing_price: Any) -> dict[str, Any]:
    exp_px = expected_listing_price(ipo_price, gmp)
    exp_ret = expected_listing_return(ipo_price, gmp)
    act_ret = actual_listing_return(listing_price, ipo_price)
    err = gmp_prediction_error(act_ret, exp_ret)
    return {
        "gmp": _f(gmp),
        "gmp_pct": exp_ret,
        "expected_listing_price": exp_px,
        "expected_listing_return": exp_ret,
        "actual_listing_return": act_ret,
        "prediction_error": err,
        "data_type": "CALCULATED" if gmp is not None else None,
        "source_note": "Last published GMP from Investorgain extract (Ghosh et al. 2024), not a full T-10 path.",
    }


def reliability_table(rows: list[dict[str, Any]]) -> dict[str, Any]:
    pred = [r.get("expected_listing_return") for r in rows]
    act = [r.get("actual_listing_return") for r in rows]
    err = [r.get("prediction_error") for r in rows]
    err_f = [e for e in err if e is not None]
    pairs = [(p, a) for p, a in zip(pred, act) if p is not None and a is not None]
    if len(pairs) >= 3:
        px = np.array([p for p, _ in pairs], dtype=float)
        ax = np.array([a for _, a in pairs], dtype=float)
        pearson = float(np.corrcoef(px, ax)[0, 1]) if np.std(px) and np.std(ax) else None
        sp = spearman(px, ax)
        ss_tot = float(np.sum((ax - ax.mean()) ** 2))
        ss_res = float(np.sum((ax - px) ** 2))
        r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else None
    else:
        pearson = sp = r2 = None
    return {
        "n": len(pairs),
        "mae": mae(err_f),
        "rmse": rmse(err_f),
        "directional_accuracy": directional_accuracy(pred, act),
        "pearson": pearson,
        "spearman": sp,
        "r2_vs_identity": r2,
        "mean_listing_return": float(np.mean([a for _, a in pairs])) if pairs else None,
        "median_listing_return": float(np.median([a for _, a in pairs])) if pairs else None,
        "mean_gmp_implied": float(np.mean([p for p, _ in pairs])) if pairs else None,
        "note": "r2_vs_identity is 1 - SSE(actual, gmp_implied) / SST(actual). It is not an OLS R².",
    }


def spearman(x: np.ndarray, y: np.ndarray) -> Optional[float]:
    if len(x) < 3 or np.std(x) == 0 or np.std(y) == 0:
        return None
    rx = rankdata(x)
    ry = rankdata(y)
    return float(np.corrcoef(rx, ry)[0, 1])


def rankdata(x: np.ndarray) -> np.ndarray:
    order = np.argsort(x)
    ranks = np.empty_like(order, dtype=float)
    ranks[order] = np.arange(1, len(x) + 1)
    return ranks


def signal_quality(row: dict[str, Any]) -> dict[str, Any]:
    """
    Observable consistency score. NOT a manipulation detector.

    Uses: |GMP error|, GMP vs subscription divergence, GMP vs valuation
    divergence, and market vol if present.
    """
    reasons: list[str] = []
    score = 0.0  # higher = more inconsistent

    err = _f(row.get("gmp_error"))
    gmp_ret = _f(row.get("gmp_pct"))
    sub = _f(row.get("sub_total"))
    listing = _f(row.get("listing_return"))
    pe_prem = _f(row.get("pe_premium"))
    vix = _f(row.get("vix_level"))

    if err is None or gmp_ret is None:
        return {
            "label": "INSUFFICIENT DATA",
            "score": None,
            "reasons": ["No sourced GMP and listing pair."],
            "disclaimer": DISCLAIMER,
        }

    abs_err = abs(err)
    if abs_err > 0.25:
        score += 2.0
        reasons.append(f"Large GMP magnitude error (|e|={abs_err:.1%}).")
    elif abs_err > 0.10:
        score += 1.0
        reasons.append(f"Material GMP magnitude error (|e|={abs_err:.1%}).")
    else:
        reasons.append(f"GMP magnitude error is contained (|e|={abs_err:.1%}).")

    # Direction
    if listing is not None and ((gmp_ret > 0 and listing < 0) or (gmp_ret < 0 and listing > 0)):
        score += 1.5
        reasons.append("GMP sign disagreed with listing return.")

    # Subscription divergence: high GMP with weak book, or negative GMP with frenzy
    if sub is not None:
        if gmp_ret > 0.20 and sub < 2:
            score += 1.5
            reasons.append("High GMP with weak final subscription — demand and grey market disagree.")
        elif gmp_ret < 0.02 and sub > 25:
            score += 1.0
            reasons.append("Hot book with near-zero/negative GMP — unusual but possible if GMP lagged.")
        else:
            reasons.append("GMP level is not obviously inconsistent with subscription.")

    if pe_prem is not None and gmp_ret is not None:
        if pe_prem > 0.5 and gmp_ret > 0.35:
            reasons.append("Rich IPO multiple coincided with a large GMP — crowding, not proof of distortion.")
        if pe_prem < -0.2 and gmp_ret < 0:
            reasons.append("Discount multiple with negative GMP — internally consistent cheapness signal.")

    if vix is not None and vix > 20:
        score += 0.4
        reasons.append("Elevated India VIX at issue close — noisier price discovery environment.")

    if score >= 3.5:
        label = "POTENTIALLY DISTORTED / NOISY"
    elif score >= 2.0:
        label = "LOW CONSISTENCY"
    elif score >= 1.0:
        label = "MODERATE CONSISTENCY"
    else:
        label = "HIGH CONSISTENCY"

    return {
        "label": label,
        "score": score,
        "reasons": reasons,
        "disclaimer": DISCLAIMER,
    }


DISCLAIMER = (
    "This classification identifies unusual or inconsistent observable behaviour; "
    "it does NOT prove manipulation, rumours, or illegal activity."
)


def bucket_gmp(gmp_pct: Optional[float]) -> Optional[str]:
    if gmp_pct is None:
        return None
    if gmp_pct < 0:
        return "Negative"
    if gmp_pct < 0.10:
        return "0–10%"
    if gmp_pct < 0.20:
        return "10–20%"
    if gmp_pct < 0.35:
        return "20–35%"
    return "35%+"


def bucket_sub(sub: Optional[float]) -> Optional[str]:
    if sub is None:
        return None
    if sub < 2:
        return "<2×"
    if sub < 5:
        return "2–5×"
    if sub < 10:
        return "5–10×"
    if sub < 25:
        return "10–25×"
    return "25×+"


def bucket_size(issue_cr: Optional[float]) -> Optional[str]:
    if issue_cr is None:
        return None
    if issue_cr < 500:
        return "Small"
    if issue_cr < 2000:
        return "Medium"
    return "Large"


def bucket_qib(qib: Optional[float]) -> Optional[str]:
    if qib is None:
        return None
    if qib < 5:
        return "Low"
    if qib < 30:
        return "Medium"
    return "High"


def bucket_regime(nifty_m: Optional[float]) -> Optional[str]:
    """Prior-month Nifty return → crude bull/neutral/bear. Not an official regime model."""
    if nifty_m is None:
        return None
    if nifty_m > 0.03:
        return "Bull"
    if nifty_m < -0.03:
        return "Bear"
    return "Neutral"
