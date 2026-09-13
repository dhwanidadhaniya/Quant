from __future__ import annotations

import pandas as pd
from sqlalchemy.orm import Session

from .. import models
from .alpha_engine import alpha_score, normalise, why_ranked
from .backtest_engine import load_price_panel, _scores_clean
from .risk_engine import ann_vol, to_returns


def company_snapshot(db: Session, ticker: str, weights: dict | None = None) -> dict | None:
    c = db.query(models.Company).filter(models.Company.ticker == ticker).first()
    if not c:
        return None
    fin = db.query(models.Financial).filter(models.Financial.company_id == c.id).first()
    sc = db.query(models.FactorScore).filter(models.FactorScore.company_id == c.id).first()
    px = (
        db.query(models.Price)
        .filter(models.Price.company_id == c.id)
        .order_by(models.Price.date.desc())
        .limit(260)
        .all()
    )
    px = list(reversed(px))
    last = px[-1].close if px else None
    prev = px[-2].close if len(px) > 1 else last
    chg = (last / prev - 1) if last and prev else 0
    closes = pd.Series({p.date: p.close for p in px})
    rets = to_returns(closes)
    vol = ann_vol(rets) if len(rets) else None
    eq = closes / closes.iloc[0] if len(closes) else closes
    dd = float((eq / eq.cummax() - 1).min()) if len(eq) else 0
    mom = float(closes.iloc[-1] / closes.iloc[0] - 1) if len(closes) > 2 else 0
    row = {
        "value": sc.value if sc else 0,
        "momentum": sc.momentum if sc else 0,
        "quality": sc.quality if sc else 0,
        "size": sc.size if sc else 0,
        "growth": sc.growth if sc else 0,
        "low_vol": sc.low_vol if sc else 0,
    }
    w = normalise(weights or {})
    a = alpha_score(row, w)
    row["alpha_score"] = a
    return {
        "ticker": c.ticker,
        "name": c.name,
        "sector": c.sector,
        "industry": c.industry,
        "country": c.country,
        "exchange": c.exchange,
        "description": c.description,
        "price": last,
        "change": chg,
        "financials": {
            "market_cap": fin.market_cap,
            "pe": fin.pe, "pb": fin.pb, "ev_ebitda": fin.ev_ebitda, "peg": fin.peg,
            "earnings_yield": fin.earnings_yield,
            "roe": fin.roe, "roa": fin.roa,
            "operating_margin": fin.operating_margin, "net_margin": fin.net_margin,
            "revenue_growth": fin.revenue_growth, "eps_growth": fin.eps_growth,
            "earnings_cagr": fin.earnings_cagr,
            "debt_equity": fin.debt_equity, "interest_coverage": fin.interest_coverage,
            "current_ratio": fin.current_ratio, "dividend_yield": fin.dividend_yield,
        } if fin else {},
        "factors": {**row, "alpha_score": a},
        "weights": w,
        "why": why_ranked(row, w),
        "market": {"volatility": vol, "drawdown": dd, "momentum": mom, "beta_hint": None},
        "spark": [{"date": p.date.isoformat(), "close": p.close} for p in px[::2]],
    }


def landscape(db: Session, weights: dict | None = None) -> list[dict]:
    scores = _scores_clean(db)
    panel = load_price_panel(db)
    panel.index = pd.to_datetime(panel.index)
    rets = panel.pct_change().iloc[-252:]
    vol = rets.std() * (252 ** 0.5)
    ret = (1 + rets).prod() - 1
    w = normalise(weights or {})
    out = []
    for _, r in scores.iterrows():
        row = r.to_dict()
        a = alpha_score(row, w)
        out.append({
            **{k: row.get(k) for k in ["ticker", "name", "sector", "market_cap",
                                       "value", "momentum", "quality", "size", "growth", "low_vol"]},
            "alpha_score": a,
            "risk": float(vol.get(r.ticker, 0.2) or 0.2),
            "return": float(ret.get(r.ticker, 0) or 0),
            "why": why_ranked({**row, "alpha_score": a}, w),
        })
    return out
