"""Risk engine — qualitative scores from observables, plus BULL/BASE/BEAR paths."""
from __future__ import annotations

from typing import Any, Optional

from .formulas import _f


def _band(x: Optional[float], lo: float, hi: float, invert: bool = False) -> float:
    if x is None:
        return 50.0
    t = (x - lo) / (hi - lo) if hi != lo else 0.5
    t = min(max(t, 0.0), 1.0)
    score = t * 100
    return 100 - score if invert else score


def assess(ipo: dict[str, Any]) -> dict[str, Any]:
    pe_p = _f(ipo.get("pe_premium"))
    de = _f(ipo.get("de_ratio"))
    gmp_err = _f(ipo.get("gmp_error"))
    sub = _f(ipo.get("sub_total"))
    vix = _f(ipo.get("vix_level"))
    issue = _f(ipo.get("issue_size_cr"))
    listing = _f(ipo.get("listing_return"))
    gmp = _f(ipo.get("gmp_pct"))

    factors = {
        "valuation": {
            "score": _band(pe_p if pe_p is not None else 0.0, -0.3, 0.8),
            "note": "Higher = richer vs recent sector IPO median P/E. Rich is a risk, not a verdict.",
        },
        "market": {
            "score": _band(vix, 10, 28),
            "note": "India VIX at issue close. Elevated vol makes listing outcomes noisier.",
        },
        "sector": {
            "score": 55.0 if ipo.get("market_regime") == "Bear" else 35.0 if ipo.get("market_regime") == "Neutral" else 25.0,
            "note": "Coarse. Uses market regime plus whether the sector's recent IPO median listing was negative.",
        },
        "leverage": {
            "score": _band(de if de is not None else 0.3, 0.0, 2.5),
            "note": "Debt/book from RHP extract. Missing debt is not zero debt — score is muted.",
        },
        "liquidity": {
            "score": _band(issue if issue is not None else 1000, 200, 8000, invert=True),
            "note": "Smaller issues often have wider listing and post-list spreads.",
        },
        "gmp": {
            "score": _band(abs(gmp_err) if gmp_err is not None else abs(gmp or 0), 0.0, 0.4),
            "note": "Uses |GMP error| when listing is known; otherwise |GMP|. Large values mean noisy grey-market signal.",
        },
        "demand": {
            "score": 70.0 if (sub is not None and sub < 1.2) else 25.0 if (sub is not None and sub > 10) else 45.0,
            "note": "Weak books are a demand risk. Super-hot books are a crowding / allotment risk, scored separately in execution.",
        },
        "execution": {
            "score": 65.0 if (sub is not None and sub > 40) else 40.0,
            "note": "Retail allotment probability collapses in frenzy. Secondary purchase at open is the realistic alternative.",
        },
    }
    overall = sum(f["score"] for f in factors.values()) / len(factors)
    if overall >= 62:
        band = "BEAR"
    elif overall >= 42:
        band = "BASE"
    else:
        band = "BULL"
    return {
        "factors": factors,
        "overall": overall,
        "scenario_bias": band,
        "disclaimer": "Scores are ordinal research overlays, not probabilities of loss and not ratings.",
    }
