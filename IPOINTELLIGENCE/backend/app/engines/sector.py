"""Sector analytics — IPO activity, GMP reliability, and simple alphas by sector."""
from __future__ import annotations

from typing import Any

import pandas as pd

from .formulas import _f
from .gmp import reliability_table


def sector_table(df: pd.DataFrame) -> list[dict[str, Any]]:
    rows = []
    for col in ["listing_return", "gmp_pct", "sub_total", "pe_premium", "ret_30d", "ret_90d", "ret_1y", "alpha_1y"]:
        if col not in df.columns:
            df = df.copy()
            df[col] = None
    for sector, g in df.groupby("sector"):
        gmp_rows = [
            {
                "expected_listing_return": _f(r.get("gmp_pct")),
                "actual_listing_return": _f(r.get("listing_return")),
                "prediction_error": _f(r.get("gmp_error")),
            }
            for _, r in g.iterrows()
        ]
        rel = reliability_table(gmp_rows)
        rows.append(
            {
                "sector": sector,
                "n": int(len(g)),
                "avg_listing": _mean(g["listing_return"]),
                "med_listing": _med(g["listing_return"]),
                "avg_gmp": _mean(g["gmp_pct"]),
                "gmp_mae": rel.get("mae"),
                "gmp_dir_acc": rel.get("directional_accuracy"),
                "avg_sub": _mean(g["sub_total"]),
                "avg_pe_premium": _mean(g["pe_premium"]),
                "avg_30d": _mean(g["ret_30d"]),
                "avg_90d": _mean(g["ret_90d"]),
                "avg_1y": _mean(g["ret_1y"]),
                "avg_alpha_1y": _mean(g["alpha_1y"]),
            }
        )
    rows.sort(key=lambda z: z["n"], reverse=True)
    return rows


def _mean(s) -> float | None:
    v = pd.to_numeric(s, errors="coerce").dropna()
    return float(v.mean()) if len(v) else None


def _med(s) -> float | None:
    v = pd.to_numeric(s, errors="coerce").dropna()
    return float(v.median()) if len(v) else None
