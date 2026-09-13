from __future__ import annotations

import pandas as pd
from sqlalchemy.orm import Session

from .. import models
from .backtest_engine import load_price_panel
from .risk_engine import to_returns


REGIMES = ("Bull", "Bear", "High Volatility", "Low Volatility", "Recovery", "Sideways")

# Hand-labelled windows a student would actually write in a notebook.
# The dates line up with shocks baked into the seed process.
WINDOWS = [
    ("2020-01-02", "2020-02-19", "Bull", "Late-cycle grind into Feb 2020."),
    ("2020-02-20", "2020-03-23", "High Volatility", "COVID air-pocket. Liquidity vanished; momentum typically fails here."),
    ("2020-03-24", "2020-08-31", "Recovery", "Policy-driven bounce. Duration and growth led."),
    ("2020-09-01", "2021-12-31", "Bull", "Broad risk-on. Crowded quality/growth worked until it didn't."),
    ("2022-01-03", "2022-10-14", "Bear", "Hiking cycle. Value and energy held up better than long-duration growth."),
    ("2022-10-17", "2023-03-31", "Sideways", "Chop after the 2022 trough. Factor leadership rotated quickly."),
    ("2023-04-03", "2024-06-28", "Recovery", "Narrow leadership in US megacap growth; India remained bid."),
    ("2024-07-01", "2025-03-31", "Bull", "Sample late-period expansion. Crowding risk is the footnote."),
    ("2025-04-01", "2025-12-31", "Low Volatility", "Calmer realised vol in the sample tail — defensive factors look sleepy."),
]


def classify(db: Session) -> list[dict]:
    return [
        {"start": a, "end": b, "regime": r, "note": n}
        for a, b, r, n in WINDOWS
    ]


def factor_by_regime(db: Session) -> dict:
    """Long-short-ish factor sleeves: top-third minus equal-weight book, by window."""
    panel = load_price_panel(db)
    panel.index = pd.to_datetime(panel.index)
    rets = panel.pct_change()

    from .backtest_engine import _scores_clean
    scores = _scores_clean(db).set_index("ticker")
    factors = ["value", "momentum", "quality", "size", "growth", "low_vol"]

    table = []
    detail = {}
    for start, end, regime, note in WINDOWS:
        slice_r = rets.loc[start:end]
        if slice_r.empty:
            continue
        row = {"regime": regime, "start": start, "end": end, "note": note}
        for f in factors:
            top = scores[f].nlargest(15).index
            names = [t for t in top if t in slice_r.columns]
            if not names:
                row[f] = 0.0
                continue
            # cumulative sleeve return over the window
            sleeve = (1 + slice_r[names].mean(axis=1)).prod() - 1
            row[f] = float(sleeve)
        table.append(row)
        detail.setdefault(regime, []).append(row)

    # collapse repeated regime labels into a mean so the heatmap is readable
    agg = []
    for r in ["Bull", "Bear", "High Volatility", "Low Volatility", "Recovery", "Sideways"]:
        bits = [x for x in table if x["regime"] == r]
        if not bits:
            continue
        rec = {"regime": r, "windows": len(bits)}
        for f in factors:
            rec[f] = float(pd.Series([x[f] for x in bits]).mean())
        rec["note"] = bits[0]["note"]
        agg.append(rec)
    return {"windows": table, "heatmap": agg}
