"""Backtesting lab.

Decision time is the listing date. Only information knowable before the first
trade is allowed in the rule. Two fill assumptions:

- allotment: fill at issue price (optimistic; ignores rationing)
- listing_open: fill at NSE open (executable for secondary buyers)

We do not allow a rule that uses 30D return, post-listing alpha, or same-day
close if the rule could not have known it.
"""
from __future__ import annotations

from typing import Any, Callable, Optional

import numpy as np
import pandas as pd

from .formulas import _f, max_drawdown, sharpe, sortino


FORBIDDEN = {"ret_1d", "ret_5d", "ret_30d", "ret_90d", "ret_180d", "ret_1y", "alpha_30d", "alpha_1y", "listing_return"}


def _eval_rule(row: pd.Series, rule: dict[str, Any]) -> bool:
    """AND of simple predicates. Rejects forbidden fields."""
    for pred in rule.get("all", []):
        field = pred["field"]
        if field in FORBIDDEN:
            raise ValueError(f"Look-ahead field rejected: {field}")
        op = pred["op"]
        val = pred["value"]
        x = row.get(field)
        x = _f(x) if not isinstance(x, str) else x
        if x is None:
            return False
        if op == ">" and not (x > val):
            return False
        if op == ">=" and not (x >= val):
            return False
        if op == "<" and not (x < val):
            return False
        if op == "<=" and not (x <= val):
            return False
        if op == "==" and not (x == val):
            return False
        if op == "in" and x not in val:
            return False
    return True


PRESETS = {
    "A": {
        "name": "GMP > 20%",
        "all": [{"field": "gmp_pct", "op": ">", "value": 0.20}],
        "note": "Pure grey-market momentum. Ignores valuation and books.",
    },
    "B": {
        "name": "GMP > 15% AND QIB snapshot > 5×",
        "all": [
            {"field": "gmp_pct", "op": ">", "value": 0.15},
            {"field": "sub_qib", "op": ">", "value": 5},
        ],
        "note": "Requires both grey market and institutional book heat. QIB snapshot may not be the final QIB.",
    },
    "C": {
        "name": "GMP > 10% AND IPO P/E below peer median",
        "all": [
            {"field": "gmp_pct", "op": ">", "value": 0.10},
            {"field": "pe_premium", "op": "<", "value": 0.0},
        ],
        "note": "Grey market positive while the issue is not a multiple premium to recent sector IPOs.",
    },
    "D": {
        "name": "High QIB, not rich, constructive tape",
        "all": [
            {"field": "sub_qib", "op": ">", "value": 10},
            {"field": "pe_premium", "op": "<", "value": 0.25},
            {"field": "nifty_m", "op": ">", "value": 0.0},
        ],
        "note": "Institutional demand + valuation not stretched + prior-month Nifty positive.",
    },
}


def run_backtest(
    df: pd.DataFrame,
    rule: dict[str, Any],
    fill: str = "listing_open",
    horizon: str = "ret_90d",
    cost_bps: float = 20.0,
) -> dict[str, Any]:
    if horizon in {"gmp_pct", "sub_total", "pe"}:
        raise ValueError("Horizon must be a holding-period return, not a feature.")
    work = df.copy()
    work["listing_date"] = pd.to_datetime(work["listing_date"], errors="coerce")
    work = work.dropna(subset=["listing_date"]).sort_values("listing_date")

    selected = []
    for _, row in work.iterrows():
        try:
            ok = _eval_rule(row, rule)
        except ValueError as e:
            return {"status": "rejected", "reason": str(e)}
        if ok:
            selected.append(row)

    if not selected:
        return {"status": "empty", "n": 0, "rule": rule}

    rets = []
    dates = []
    names = []
    for row in selected:
        if fill == "allotment":
            r = _f(row.get(horizon))
            # allotment earns listing pop + subsequent; approximate by chaining
            # listing_return and residual horizon if both exist
            lr = _f(row.get("listing_return"))
            rest = _f(row.get(horizon))
            if lr is not None and rest is not None and horizon != "listing_return":
                # rest is issue->horizon if we stored it that way; we store listing-open based horizons.
                # Conservative: allotment return ≈ (1+listing_open_ret)*(1+open_to_horizon)-1
                # We only have issue->horizon if we stored ret_* from issue? We store from listing open.
                r = (1 + lr) * (1 + rest) - 1 if rest is not None else lr
            elif horizon == "listing_return":
                r = lr
        else:
            r = _f(row.get(horizon if horizon != "listing_return" else "listing_return"))
            if horizon == "listing_return":
                r = _f(row.get("listing_return"))
        if r is None:
            continue
        r = r - cost_bps / 10000.0
        rets.append(r)
        dates.append(row["listing_date"])
        names.append(row.get("name"))

    if not rets:
        return {"status": "empty", "n": 0, "reason": "Selected names lack the horizon return (Yahoo gap)."}

    arr = np.array(rets, dtype=float)
    # equity curve: equal-weight each IPO held for the horizon, plotted in event time
    wealth = np.cumprod(1 + arr)
    nifty = []
    for row in selected:
        bmap = {
            "listing_return": row.get("nifty_listing"),
            "ret_30d": row.get("nifty_30d"),
            "ret_90d": row.get("nifty_90d"),
            "ret_180d": row.get("nifty_180d"),
            "ret_1y": row.get("nifty_1y"),
        }
        b = _f(bmap.get(horizon))
        if b is not None:
            nifty.append(b)
    alpha = float(arr.mean() - np.mean(nifty)) if nifty and len(nifty) == len(arr) else None

    return {
        "status": "ok",
        "rule": rule,
        "fill": fill,
        "horizon": horizon,
        "cost_bps": cost_bps,
        "n": int(len(arr)),
        "hit_rate": float((arr > 0).mean()),
        "mean_return": float(arr.mean()),
        "median_return": float(np.median(arr)),
        "cagr_naive": float(arr.mean()),  # event-time mean, not calendar CAGR
        "vol": float(arr.std(ddof=1)) if len(arr) > 1 else None,
        "sharpe_event": sharpe(list(arr), annualize=1) if len(arr) > 2 else None,
        "sortino_event": sortino(list(arr), annualize=1) if len(arr) > 2 else None,
        "max_drawdown_event": max_drawdown(list(wealth)),
        "alpha_vs_nifty_same_window": alpha,
        "names": names[:80],
        "returns": [float(x) for x in arr[:80]],
        "wealth": [float(x) for x in wealth[:80]],
        "warnings": [
            "This is an event-time study of selected IPOs, not a calendar-time portfolio with overlapping holdings.",
            "Naive mean is not a CAGR unless each holding is sequential and non-overlapping.",
            "Allotment fill assumes you received stock at issue price — historically false for oversubscribed retail.",
            "cost_bps is a flat haircut, not a full market-impact model.",
            "Multiple testing: four presets were specified before looking; more rules require a haircut.",
            "Survivorship: Yahoo-missing names drop out of the return sample.",
            "GMP is unofficial. A rule using GMP would not have been a SEBI-clean input.",
        ],
    }
