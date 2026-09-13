from __future__ import annotations

from datetime import date

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from .. import models
from .risk_engine import TRADING_DAYS, summarise_equity, to_returns


REBALANCE_DAYS = {"monthly": 21, "quarterly": 63, "annual": 252, "none": 10**9}


def load_price_panel(db: Session, tickers: list[str] | None = None) -> pd.DataFrame:
    q = db.query(models.Price.date, models.Company.ticker, models.Price.close).join(models.Company)
    if tickers:
        q = q.filter(models.Company.ticker.in_(tickers))
    rows = q.all()
    df = pd.DataFrame(rows, columns=["date", "ticker", "close"])
    if df.empty:
        return df
    return df.pivot(index="date", columns="ticker", values="close").sort_index()


def load_benchmark(db: Session, ticker: str = "^GSPC") -> pd.Series:
    rows = db.query(models.Benchmark.date, models.Benchmark.value).filter(
        models.Benchmark.ticker == ticker
    ).all()
    s = pd.Series({r[0]: r[1] for r in rows}, name=ticker).sort_index()
    s.index = pd.to_datetime(s.index)
    return s


def load_scores(db: Session) -> pd.DataFrame:
    rows = (
        db.query(
            models.Company.ticker,
            models.Company.sector,
            models.Company.market_cap if False else models.Company.name,
            models.FactorScore.value,
            models.FactorScore.momentum,
            models.FactorScore.quality,
            models.FactorScore.size,
            models.FactorScore.growth,
            models.FactorScore.low_vol,
            models.FactorScore.alpha_score,
            models.Financial.market_cap,
        )
        .join(models.FactorScore)
        .join(models.Financial)
        .all()
    )
    # query above is messy because of the False trick — do it cleanly
    return _scores_clean(db)


def _scores_clean(db: Session) -> pd.DataFrame:
    rows = (
        db.query(
            models.Company.ticker,
            models.Company.name,
            models.Company.sector,
            models.FactorScore.value,
            models.FactorScore.momentum,
            models.FactorScore.quality,
            models.FactorScore.size,
            models.FactorScore.growth,
            models.FactorScore.low_vol,
            models.FactorScore.alpha_score,
            models.Financial.market_cap,
        )
        .join(models.FactorScore, models.FactorScore.company_id == models.Company.id)
        .join(models.Financial, models.Financial.company_id == models.Company.id)
        .all()
    )
    return pd.DataFrame(rows, columns=[
        "ticker", "name", "sector", "value", "momentum", "quality", "size",
        "growth", "low_vol", "alpha_score", "market_cap",
    ])


def factor_portfolio(scores: pd.DataFrame, factor: str, n: int = 15, long_only: bool = True):
    col = "alpha_score" if factor in ("multi", "alpha", "custom") else factor
    ranked = scores.sort_values(col, ascending=False)
    picks = ranked.head(n).copy()
    picks["weight"] = 1 / len(picks)
    return picks


def run_backtest(
    db: Session,
    strategy: str = "multi",
    start: str | date = "2020-01-02",
    end: str | date = "2025-12-31",
    benchmark: str = "^GSPC",
    rebalance: str = "quarterly",
    transaction_cost: float = 0.001,
    initial_capital: float = 1_000_000,
    n_holdings: int = 15,
    tickers: list[str] | None = None,
) -> dict:
    panel = load_price_panel(db, tickers)
    panel.index = pd.to_datetime(panel.index)
    panel = panel.loc[str(start):str(end)].dropna(axis=1, how="all").ffill()
    scores = _scores_clean(db)
    if tickers:
        scores = scores[scores.ticker.isin(tickers)]
    factor = {
        "Value": "value", "Momentum": "momentum", "Quality": "quality",
        "Size": "size", "Growth": "growth", "Low Volatility": "low_vol",
        "Multi-Factor": "alpha_score", "Custom Factor Strategy": "alpha_score",
        "value": "value", "momentum": "momentum", "quality": "quality",
        "size": "size", "growth": "growth", "low_vol": "low_vol",
        "multi": "alpha_score", "custom": "alpha_score",
    }.get(strategy, "alpha_score")

    picks = scores.sort_values(factor, ascending=False).head(n_holdings)
    names = [t for t in picks.ticker if t in panel.columns]
    if not names:
        names = list(panel.columns)[:n_holdings]
    sub = panel[names].dropna(how="all")
    rets = sub.pct_change().fillna(0.0)

    step = REBALANCE_DAYS.get(rebalance, 63)
    weights = pd.Series(1 / len(names), index=names)
    port = []
    events = []
    turnover_acc = 0.0
    equity = initial_capital
    prev_w = weights.copy()

    for i, dt in enumerate(rets.index):
        if i % step == 0:
            # equal-weight the current top names (scores are point-in-time as-of sample end —
            # this is a known look-ahead limitation, labelled in the UI)
            weights = pd.Series(1 / len(names), index=names)
            to = float((weights - prev_w.reindex(weights.index).fillna(0)).abs().sum() / 2)
            turnover_acc += to
            equity *= (1 - transaction_cost * to)
            events.append({
                "date": dt.date().isoformat(),
                "type": "rebalance",
                "label": f"Rebalanced {len(names)} names, turnover {to:.1%}",
            })
            prev_w = weights.copy()
        r = float((rets.iloc[i].reindex(weights.index).fillna(0) * weights).sum())
        equity *= (1 + r)
        port.append({"date": dt.date().isoformat(), "value": equity, "return": r})

    eq = pd.Series({p["date"]: p["value"] for p in port}, dtype=float)
    eq.index = pd.to_datetime(eq.index)
    bench = load_benchmark(db, benchmark).reindex(eq.index).ffill()
    # rebuild bench as an equity curve from 1.0
    if bench.notna().sum() > 2:
        br = bench.pct_change().fillna(0)
        bench_eq = initial_capital * (1 + br).cumprod()
    else:
        bench_eq = pd.Series(initial_capital, index=eq.index)

    # equal-weight and cap-weight book for comparison
    ew = (1 + rets[names].mean(axis=1)).cumprod() * initial_capital
    mcap = scores.set_index("ticker")["market_cap"]
    cw = mcap.reindex(names).fillna(mcap.median())
    cw = cw / cw.sum()
    cap_r = (rets[names] * cw.reindex(names).values).sum(axis=1)
    cap_eq = (1 + cap_r).cumprod() * initial_capital

    stats = summarise_equity(eq, bench_eq)
    stats_ew = summarise_equity(ew, bench_eq)
    stats_cap = summarise_equity(cap_eq, bench_eq)
    stats_b = summarise_equity(bench_eq)

    # drawdown events
    dd = eq / eq.cummax() - 1
    if dd.min() < -0.12:
        trough = dd.idxmin()
        events.append({
            "date": trough.date().isoformat(),
            "type": "drawdown",
            "label": f"Peak-to-trough {dd.min():.1%} — largest drawdown in the window",
        })

    # regime markers
    events.append({"date": "2020-03-23", "type": "regime", "label": "COVID air-pocket / high-vol regime"})
    events.append({"date": "2022-10-14", "type": "regime", "label": "2022 bear trough — growth factor under pressure"})
    events.append({"date": "2023-11-02", "type": "regime", "label": "Recovery / risk-on stretch"})

    curve = [{"date": d.date().isoformat(), "strategy": float(eq.loc[d]),
              "benchmark": float(bench_eq.reindex([d]).ffill().iloc[0]) if d in bench_eq.index else None,
              "equal_weight": float(ew.reindex([d]).ffill().iloc[0]) if len(ew) else None,
              "cap_weight": float(cap_eq.reindex([d]).ffill().iloc[0]) if len(cap_eq) else None}
             for d in eq.index[::3]]  # thin the payload

    return {
        "strategy": strategy,
        "factor": factor,
        "holdings": picks[["ticker", "name", "sector", factor]].head(n_holdings).rename(columns={factor: "score"}).to_dict("records"),
        "metrics": stats,
        "benchmark_metrics": stats_b,
        "equal_weight_metrics": stats_ew,
        "cap_weight_metrics": stats_cap,
        "curve": curve,
        "events": sorted(events, key=lambda x: x["date"]),
        "turnover": turnover_acc,
        "look_ahead_warning": (
            "Holdings are ranked on full-sample factor scores. That is a look-ahead bias. "
            "Treat the path as an illustration of factor behaviour, not a tradable track record."
        ),
        "n_holdings": len(names),
        "rebalance": rebalance,
        "transaction_cost": transaction_cost,
        "initial_capital": initial_capital,
        "start": str(start),
        "end": str(end),
        "benchmark": benchmark,
    }
