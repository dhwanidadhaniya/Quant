"""Subscription dynamics — levels, velocity, acceleration.

Indian IPO books typically run 3 days. This dataset often has day-1 and day-2
prints plus a final total. Day-3 category prints are frequently missing.
Velocity/acceleration are therefore computed on the available path and labelled.
"""
from __future__ import annotations

from typing import Any, Optional

from .formulas import _f, acceleration, demand_concentration, velocity


def build_curve(row: dict[str, Any]) -> dict[str, Any]:
    days = []
    prev_total = 0.0
    prev_vel = None
    last_cat = {}
    for d in range(1, 7):
        tot = _f(row.get(f"day_{d}_total"))
        if tot is None:
            continue
        q = _f(row.get(f"day_{d}_qib"))
        n = _f(row.get(f"day_{d}_nii"))
        r = _f(row.get(f"day_{d}_retail"))
        vel = tot - prev_total
        acc = None if prev_vel is None else vel - prev_vel
        days.append(
            {
                "day": d,
                "qib": q,
                "nii": n,
                "retail": r,
                "total": tot,
                "velocity": vel,
                "acceleration": acc,
            }
        )
        last_cat = {"qib": q, "nii": n, "retail": r, "total": tot}
        prev_vel = vel
        prev_total = tot

    final = _f(row.get("sub_total"))
    path_incomplete = False
    if final is not None and last_cat.get("total") is not None and last_cat["total"] > 0:
        if last_cat["total"] < 0.5 * final:
            path_incomplete = True

    conc = demand_concentration(last_cat.get("qib"), last_cat.get("nii"), last_cat.get("retail"))
    weather = ipo_weather(
        gmp_pct=_f(row.get("gmp_pct")),
        sub_final=final,
        velocity=days[-1]["velocity"] if days else None,
        vix=_f(row.get("vix_level")),
        pe_premium=_f(row.get("pe_premium")),
        regime=row.get("market_regime"),
    )
    return {
        "days": days,
        "final_total": final,
        "final_qib": last_cat.get("qib"),
        "final_nii": last_cat.get("nii"),
        "final_retail": last_cat.get("retail"),
        "path_incomplete": path_incomplete,
        "concentration": conc,
        "weather": weather,
        "notes": [
            "Category prints are last available intra-issue snapshots, not always the SEBI final basis of allotment.",
            "If path_incomplete is true, last daily total is far below final total — typically missing last-day QIB.",
        ],
    }


def ipo_weather(
    *,
    gmp_pct: Optional[float],
    sub_final: Optional[float],
    velocity: Optional[float],
    vix: Optional[float],
    pe_premium: Optional[float],
    regime: Optional[str],
) -> dict[str, Any]:
    """Derived state from observables — not a meteorological joke for its own sake."""
    if sub_final is not None and sub_final < 1.0:
        code, label = "cold", "Weak Demand"
    elif velocity is not None and velocity > 20:
        code, label = "storm", "Rapid Subscription"
    elif sub_final is not None and sub_final > 20:
        code, label = "hot", "High Demand"
    elif (vix is not None and vix > 22) or (gmp_pct is not None and pe_premium is not None and abs((gmp_pct or 0) - max(pe_premium, 0)) > 0.4):
        code, label = "volatile", "High Uncertainty"
    else:
        code, label = "stable", "Stable"

    if regime == "Bear" and code == "stable":
        code, label = "volatile", "High Uncertainty"

    return {
        "code": code,
        "label": label,
        "inputs": {
            "gmp_pct": gmp_pct,
            "sub_final": sub_final,
            "velocity": velocity,
            "vix": vix,
            "pe_premium": pe_premium,
            "regime": regime,
        },
    }
