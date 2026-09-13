from __future__ import annotations

import json
from datetime import date, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import DATA_DISCLAIMER, REPORTS
from ..database import get_db
from .. import models
from ..services.backtest_engine import run_backtest, load_price_panel
from ..services.regime_engine import classify, factor_by_regime
from ..services.research import landscape
from ..services.alpha_engine import normalise
from ..services.risk_engine import summarise_equity
import pandas as pd

router = APIRouter(prefix="/api", tags=["studio"])


class HoldingIn(BaseModel):
    ticker: str
    weight: float


class PortfolioIn(BaseModel):
    name: str = "Student book"
    method: str = "equal"
    holdings: list[HoldingIn]
    notes: str | None = None


class BacktestIn(BaseModel):
    strategy: str = "Multi-Factor"
    start: str = "2020-01-02"
    end: str = "2025-12-31"
    benchmark: str = "^GSPC"
    rebalance: str = "quarterly"
    transaction_cost: float = 0.001
    initial_capital: float = 1_000_000
    n_holdings: int = 15
    tickers: list[str] | None = None


class NoteIn(BaseModel):
    title: str
    body: str
    attached_type: str = "chart"
    attached_id: str = ""


@router.post("/portfolios")
def save_portfolio(body: PortfolioIn, db: Session = Depends(get_db)):
    p = models.Portfolio(name=body.name, method=body.method, notes=body.notes)
    db.add(p)
    db.flush()
    cmap = {c.ticker: c.id for c in db.query(models.Company).all()}
    for h in body.holdings:
        cid = cmap.get(h.ticker)
        if cid:
            db.add(models.Holding(portfolio_id=p.id, company_id=cid, weight=h.weight))
    db.commit()
    return {"id": p.id, "name": p.name}


@router.get("/portfolios")
def list_portfolios(db: Session = Depends(get_db)):
    rows = db.query(models.Portfolio).all()
    return [{"id": p.id, "name": p.name, "method": p.method, "created_at": str(p.created_at)} for p in rows]


@router.post("/portfolios/analytics")
def analytics(body: PortfolioIn, db: Session = Depends(get_db)):
    w = {h.ticker: h.weight for h in body.holdings}
    s = sum(w.values()) or 1
    w = {k: v / s for k, v in w.items()}
    panel = load_price_panel(db, list(w))
    panel.index = pd.to_datetime(panel.index)
    rets = panel.pct_change().dropna()
    common = [t for t in w if t in rets.columns]
    if not common:
        raise HTTPException(400, "None of those tickers are in the sample.")
    ww = pd.Series({t: w[t] for t in common})
    ww = ww / ww.sum()
    pr = (rets[common] * ww.values).sum(axis=1)
    eq = (1 + pr).cumprod() * 1_000_000
    from ..services.backtest_engine import load_benchmark
    bench = load_benchmark(db, "^GSPC").reindex(eq.index).ffill()
    br = bench.pct_change().fillna(0)
    beq = 1_000_000 * (1 + br).cumprod()
    stats = summarise_equity(eq, beq)
    pts = {x["ticker"]: x for x in landscape(db)}
    exp = {f: 0.0 for f in ["value", "momentum", "quality", "size", "growth", "low_vol"]}
    sectors = {}
    for t, wt in ww.items():
        row = pts.get(t)
        if not row:
            continue
        for f in exp:
            exp[f] += wt * float(row[f])
        sectors[row["sector"]] = sectors.get(row["sector"], 0) + wt
    # diversification: 1 - HHI
    hhi = float((ww ** 2).sum())
    return {
        "disclaimer": DATA_DISCLAIMER,
        "metrics": stats,
        "factor_exposure": exp,
        "sector_exposure": sectors,
        "diversification": 1 - hhi,
        "hhi": hhi,
        "n": len(common),
        "expected_return": stats["cagr"],
        "curve": [{"date": d.date().isoformat(), "value": float(eq.loc[d])} for d in eq.index[::5]],
    }


@router.post("/backtests/run")
def backtest(body: BacktestIn, db: Session = Depends(get_db)):
    result = run_backtest(
        db,
        strategy=body.strategy,
        start=body.start,
        end=body.end,
        benchmark=body.benchmark,
        rebalance=body.rebalance,
        transaction_cost=body.transaction_cost,
        initial_capital=body.initial_capital,
        n_holdings=body.n_holdings,
        tickers=body.tickers,
    )
    rec = models.Backtest(
        name=f"{body.strategy} {body.start[:4]}-{body.end[:4]}",
        strategy=body.strategy,
        start_date=date.fromisoformat(body.start[:10]),
        end_date=date.fromisoformat(body.end[:10]),
        benchmark=body.benchmark,
        rebalance=body.rebalance,
        transaction_cost=body.transaction_cost,
        initial_capital=body.initial_capital,
        result_json=json.dumps({k: result[k] for k in result if k != "curve"}),
    )
    db.add(rec)
    db.commit()
    result["id"] = rec.id
    result["disclaimer"] = DATA_DISCLAIMER
    return result


@router.get("/regimes")
def regimes(db: Session = Depends(get_db)):
    return {
        "disclaimer": DATA_DISCLAIMER,
        "map": classify(db),
        "factors": factor_by_regime(db),
    }


@router.get("/notes")
def notes(db: Session = Depends(get_db)):
    rows = db.query(models.ResearchNote).order_by(models.ResearchNote.created_at.desc()).all()
    return [
        {
            "id": n.id, "title": n.title, "body": n.body,
            "attached_type": n.attached_type, "attached_id": n.attached_id,
            "created_at": str(n.created_at),
        }
        for n in rows
    ]


@router.post("/notes")
def add_note(body: NoteIn, db: Session = Depends(get_db)):
    n = models.ResearchNote(**body.model_dump())
    db.add(n)
    db.commit()
    return {"id": n.id}


@router.delete("/notes/{nid}")
def del_note(nid: int, db: Session = Depends(get_db)):
    n = db.get(models.ResearchNote, nid)
    if n:
        db.delete(n)
        db.commit()
    return {"ok": True}


@router.post("/reports/generate")
def report(body: BacktestIn, db: Session = Depends(get_db)):
    result = run_backtest(db, **body.model_dump())
    REPORTS.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M")
    md_path = REPORTS / f"factor-report-{stamp}.md"
    csv_path = REPORTS / f"factor-holdings-{stamp}.csv"
    m = result["metrics"]
    md = f"""# Equity Factor Research Report
*Educational sample — not a live market study. Generated {stamp}.*

## Strategy overview
Strategy: **{body.strategy}**. Window: {body.start} → {body.end}. Benchmark: {body.benchmark}.
Rebalance: {body.rebalance}. Transaction cost assumption: {body.transaction_cost:.2%}. Initial capital: {body.initial_capital:,.0f}.

## Investment thesis
The book is a transparent factor sleeve, not a forecast. Names are ranked on cross-sectional scores
(Value, Momentum, Quality, Growth, Size, Low Volatility). High rank means high *exposure* to the
chosen characteristics. It does not mean the next twelve months are owed to us.

## Factor methodology
Scores are 0–100 percentile ranks in the sample universe. Default multi-factor weights:
25% Value / 20% Momentum / 20% Quality / 15% Growth / 10% Size / 10% Low Vol.
{result['look_ahead_warning']}

## Portfolio composition
"""
    for h in result["holdings"]:
        md += f"- {h['ticker']} — {h.get('name','')} ({h.get('sector','')}), score {h.get('score', 0):.1f}\n"
    md += f"""
## Historical performance (sample path)
- CAGR: {m['cagr']:.2%}
- Volatility: {m['volatility']:.2%}
- Sharpe: {m['sharpe']:.2f}
- Sortino: {m['sortino']:.2f}
- Max drawdown: {m['max_drawdown']:.2%}
- Alpha (vs benchmark): {m.get('alpha') or 0:.2%}
- Beta: {m.get('beta') or 0:.2f}
- Information ratio: {m.get('information_ratio') or 0:.2f}

## Benchmark comparison
A backtest is not a promise. Compare the sleeve with the benchmark, an equal-weight book and a
cap-weight book before arguing that 'the factor worked'.

## Risk analysis
VaR 95% (daily): {m['var_95']:.2%}. CVaR 95%: {m['cvar_95']:.2%}. Win rate: {m['win_rate']:.1%}.
Turnover across rebalances: {result['turnover']:.1%}.

## Limitations
Survivorship is baked into a fixed 75-name universe. Scores use full-sample information (look-ahead).
Transaction costs are a flat assumption. Factor premiums crowd, fade, and change with the regime.
Do not ship this as a live allocation.

## Conclusion
Use the numbers to *ask better questions* — crowding, regime dependence, implementation cost —
not to declare alpha found.
"""
    md_path.write_text(md, encoding="utf-8")
    import csv
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        wri = csv.DictWriter(f, fieldnames=list(result["holdings"][0].keys()) if result["holdings"] else ["ticker"])
        wri.writeheader()
        wri.writerows(result["holdings"])
    result["report_md"] = md
    result["files"] = {"markdown": str(md_path.name), "csv": str(csv_path.name)}
    result["disclaimer"] = DATA_DISCLAIMER
    return result


@router.get("/reports/files/{name}")
def download(name: str):
    path = REPORTS / name
    if not path.exists():
        raise HTTPException(404)
    return FileResponse(path)
