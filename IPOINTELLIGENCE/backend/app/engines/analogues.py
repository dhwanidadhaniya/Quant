"""Historical analogue engine.

Similarity is a weighted distance over pre-listing observables.
Analogue outcomes are history, not a forecast.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from .formulas import _f

KEYS = [
    ("issue_size_cr", 0.12, True),
    ("rev_growth", 0.12, True),
    ("pat_margin", 0.10, True),
    ("pe", 0.12, True),
    ("ev_sales", 0.08, True),
    ("gmp_pct", 0.14, True),
    ("sub_total", 0.14, True),
    ("nifty_m", 0.08, True),
]


def analogues(df: pd.DataFrame, ipo_id: str, k: int = 8) -> dict[str, Any]:
    if "id" not in df.columns:
        return {"matches": []}
    row = df[df["id"] == ipo_id]
    if row.empty:
        return {"matches": []}
    target = row.iloc[0]
    pool = df[df["id"] != ipo_id].copy()
    # no look-ahead: only IPOs that listed earlier
    if pd.notna(target.get("listing_date")):
        pool = pool[pd.to_datetime(pool["listing_date"], errors="coerce") < pd.to_datetime(target["listing_date"], errors="coerce")]
    same_sector = pool[pool["sector"] == target.get("sector")]
    use = same_sector if len(same_sector) >= 5 else pool

    scores = []
    for _, other in use.iterrows():
        dist = 0.0
        wsum = 0.0
        if other.get("sector") == target.get("sector"):
            dist -= 0.15  # bonus
        if other.get("market_regime") == target.get("market_regime") and target.get("market_regime"):
            dist -= 0.05
        for key, w, numeric in KEYS:
            a, b = _f(target.get(key)), _f(other.get(key))
            if a is None or b is None:
                continue
            scale = np.nanmedian(np.abs(pd.to_numeric(use[key], errors="coerce"))) or 1.0
            if scale == 0:
                scale = 1.0
            dist += w * abs(a - b) / scale
            wsum += w
        if wsum == 0:
            continue
        scores.append((dist, other))
    scores.sort(key=lambda z: z[0])
    matches = []
    for dist, other in scores[:k]:
        matches.append(
            {
                "id": other.get("id"),
                "name": other.get("name"),
                "ticker": other.get("ticker"),
                "sector": other.get("sector"),
                "listing_date": str(other.get("listing_date"))[:10],
                "distance": float(dist),
                "gmp_pct": _f(other.get("gmp_pct")),
                "sub_total": _f(other.get("sub_total")),
                "listing_return": _f(other.get("listing_return")),
                "ret_30d": _f(other.get("ret_30d")),
                "ret_90d": _f(other.get("ret_90d")),
                "ret_1y": _f(other.get("ret_1y")),
                "alpha_1y": _f(other.get("alpha_1y")),
            }
        )
    return {
        "ipo_id": ipo_id,
        "matches": matches,
        "disclaimer": "Historical analogues are not a guaranteed forecast. Small n in a sector makes distances noisy.",
    }
