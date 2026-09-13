from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..config import DATA_DISCLAIMER
from ..database import get_db
from .. import models
from ..services.research import company_snapshot, landscape
from ..services.alpha_engine import DEFAULT_WEIGHTS, alpha_score, normalise, why_ranked
from ..services.backtest_engine import _scores_clean, load_price_panel
from ..services.risk_engine import ann_vol

router = APIRouter(prefix="/api", tags=["research"])


def _weights(value: float, momentum: float, quality: float, growth: float, size: float, low_vol: float):
    return normalise({
        "value": value, "momentum": momentum, "quality": quality,
        "growth": growth, "size": size, "low_vol": low_vol,
    })


@router.get("/companies")
def companies(
    sector: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    scores = _scores_clean(db)
    if sector and sector != "All":
        scores = scores[scores.sector == sector]
    if q:
        ql = q.lower()
        scores = scores[scores.ticker.str.lower().str.contains(ql) | scores.name.str.lower().str.contains(ql)]
    from sqlalchemy import func
    last = db.query(func.max(models.Price.date)).scalar()
    px = {
        c.ticker: p.close
        for p, c in db.query(models.Price, models.Company)
        .join(models.Company)
        .filter(models.Price.date == last)
        .all()
    }
    fins = {c.ticker: f for c, f in db.query(models.Company, models.Financial).join(models.Financial).all()}
    out = []
    for _, r in scores.iterrows():
        fin = fins.get(r.ticker)
        out.append({
            **r.to_dict(),
            "price": px.get(r.ticker),
            "pe": getattr(fin, "pe", None),
            "pb": getattr(fin, "pb", None),
            "roe": getattr(fin, "roe", None),
            "roa": getattr(fin, "roa", None),
            "eps_growth": getattr(fin, "eps_growth", None),
            "revenue_growth": getattr(fin, "revenue_growth", None),
            "debt_equity": getattr(fin, "debt_equity", None),
            "dividend_yield": getattr(fin, "dividend_yield", None),
        })
    return {"disclaimer": DATA_DISCLAIMER, "items": out}


@router.get("/companies/{ticker}")
def company(ticker: str, db: Session = Depends(get_db)):
    snap = company_snapshot(db, ticker.upper() if "." not in ticker else ticker)
    if not snap:
        # try original
        snap = company_snapshot(db, ticker)
    if not snap:
        from fastapi import HTTPException
        raise HTTPException(404, "Unknown ticker in the sample universe.")
    snap["disclaimer"] = DATA_DISCLAIMER
    return snap


@router.get("/landscape")
def alpha_landscape(
    value: float = 0.25, momentum: float = 0.20, quality: float = 0.20,
    growth: float = 0.15, size: float = 0.10, low_vol: float = 0.10,
    db: Session = Depends(get_db),
):
    w = _weights(value, momentum, quality, growth, size, low_vol)
    return {"disclaimer": DATA_DISCLAIMER, "weights": w, "points": landscape(db, w)}


@router.get("/alpha/rankings")
def rankings(
    value: float = 0.25, momentum: float = 0.20, quality: float = 0.20,
    growth: float = 0.15, size: float = 0.10, low_vol: float = 0.10,
    db: Session = Depends(get_db),
):
    w = _weights(value, momentum, quality, growth, size, low_vol)
    pts = sorted(landscape(db, w), key=lambda x: -x["alpha_score"])
    return {"disclaimer": DATA_DISCLAIMER, "weights": w, "items": pts}


@router.get("/factors/overview")
def factors(db: Session = Depends(get_db)):
    scores = _scores_clean(db)
    factors = ["value", "momentum", "quality", "size", "growth", "low_vol"]
    corr = scores[factors].corr().round(3).to_dict()
    tops = {f: scores.nlargest(8, f)[["ticker", "name", "sector", f]].rename(columns={f: "score"}).to_dict("records") for f in factors}
    bottoms = {f: scores.nsmallest(8, f)[["ticker", "name", "sector", f]].rename(columns={f: "score"}).to_dict("records") for f in factors}
    sector = scores.groupby("sector")[factors].mean().round(1).reset_index().to_dict("records")
    return {
        "disclaimer": DATA_DISCLAIMER,
        "correlation": corr,
        "tops": tops,
        "bottoms": bottoms,
        "sector_exposure": sector,
        "default_weights": DEFAULT_WEIGHTS,
    }


@router.get("/factors/constellation")
def constellation(db: Session = Depends(get_db)):
    scores = _scores_clean(db)
    factors = ["value", "momentum", "quality", "size", "growth", "low_vol"]
    nodes = [{"id": f, "type": "factor"} for f in factors]
    companies = []
    for _, r in scores.iterrows():
        vec = {f: float(r[f]) / 100 for f in factors}
        companies.append({
            "ticker": r.ticker, "name": r.name, "sector": r.sector,
            "alpha": float(r.alpha_score),
            "exposures": vec,
        })
    return {"disclaimer": DATA_DISCLAIMER, "factors": nodes, "companies": companies}


@router.get("/sectors")
def sectors(db: Session = Depends(get_db)):
    from ..services.research import landscape
    pts = landscape(db)
    import pandas as pd
    df = pd.DataFrame(pts)
    g = df.groupby("sector").agg(
        n=("ticker", "count"),
        alpha=("alpha_score", "mean"),
        risk=("risk", "mean"),
        ret=("return", "mean"),
        value=("value", "mean"),
        momentum=("momentum", "mean"),
        quality=("quality", "mean"),
        growth=("growth", "mean"),
        size=("size", "mean"),
        low_vol=("low_vol", "mean"),
        mcap=("market_cap", "sum"),
    ).reset_index()
    return {"disclaimer": DATA_DISCLAIMER, "sectors": g.to_dict("records"), "names": df.to_dict("records")}
