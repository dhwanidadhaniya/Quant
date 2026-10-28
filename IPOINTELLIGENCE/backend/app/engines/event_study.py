"""IPO event-study framework.

IPOs have no pre-event return series, so a market-model beta cannot be estimated
on a clean estimation window. Default expected return is the contemporaneous
benchmark return (market-adjusted, beta = 1). That assumption is stated, not hidden.
"""
from __future__ import annotations

from typing import Any, Optional

from .formulas import _f, abnormal_return


WINDOWS = {
    "listing": "listing_return",
    "+1D": "ret_1d",
    "+5D": "ret_5d",
    "+30D": "ret_30d",
    "+90D": "ret_90d",
    "+180D": "ret_180d",
    "+365D": "ret_1y",
}


def event_row(ipo: dict[str, Any]) -> dict[str, Any]:
    nifty = {
        "listing": _f(ipo.get("nifty_listing")),
        "+1D": _f(ipo.get("nifty_1d")),
        "+5D": _f(ipo.get("nifty_5d")),
        "+30D": _f(ipo.get("nifty_30d")),
        "+90D": _f(ipo.get("nifty_90d")),
        "+180D": _f(ipo.get("nifty_180d")),
        "+365D": _f(ipo.get("nifty_1y")),
    }
    out = {}
    car = 0.0
    car_ok = True
    for label, field in WINDOWS.items():
        r = _f(ipo.get(field))
        b = nifty.get(label)
        ar = abnormal_return(r, b) if r is not None and b is not None else None
        out[label] = {
            "raw_return": r,
            "benchmark_return": b,
            "ar_market_adjusted": ar,
        }
        if ar is None:
            car_ok = False
        else:
            car += ar
    return {
        "windows": out,
        "car_listing_to_1y_if_complete": car if car_ok else None,
        "method": "market-adjusted AR_it = R_it − R_nifty over the same calendar span",
        "limitations": [
            "Beta is assumed 1. Newly listed names often have unstable betas.",
            "Listing-day R uses listing open vs issue price, which is not a traded close-to-close return.",
            "Missing Yahoo prices drop that window rather than being imputed.",
        ],
    }


def cohort_event_study(ipos: list[dict[str, Any]]) -> dict[str, Any]:
    summary = {}
    for label in WINDOWS:
        ars = []
        for ipo in ipos:
            er = event_row(ipo)
            ar = er["windows"][label]["ar_market_adjusted"]
            if ar is not None:
                ars.append(ar)
        if not ars:
            summary[label] = {"n": 0}
            continue
        import numpy as np

        arr = np.array(ars, dtype=float)
        se = float(arr.std(ddof=1) / np.sqrt(len(arr))) if len(arr) > 1 else None
        tstat = float(arr.mean() / se) if se else None
        summary[label] = {
            "n": len(arr),
            "mean_ar": float(arr.mean()),
            "median_ar": float(np.median(arr)),
            "se": se,
            "t_stat": tstat,
            "pct_positive": float((arr > 0).mean()),
        }
    return {
        "method": "Cross-sectional mean of market-adjusted AR. t-stat is conventional and ignores cross-correlation of same-week IPOs.",
        "windows": summary,
    }
