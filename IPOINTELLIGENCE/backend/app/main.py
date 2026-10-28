"""IPO Alpha Intelligence API."""
from __future__ import annotations

from typing import Any, Optional

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .engines import analogues as analogues_eng
from .engines import backtest as backtest_eng
from .engines import dcf as dcf_eng
from .engines import event_study as event_eng
from .engines import formulas as F
from .engines import gmp as gmp_eng
from .engines import models as models_eng
from .engines import risk as risk_eng
from .engines import statistics as stats_eng
from .engines import subscription as sub_eng
from .store import get_ipo, ipo_public, load_df, load_research

app = FastAPI(
    title="IPO Alpha Intelligence",
    description="Quantitative IPO valuation, GMP, demand and post-listing research API. Historical extract — not live prices.",
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class BacktestIn(BaseModel):
    preset: Optional[str] = None
    rule: Optional[dict[str, Any]] = None
    fill: str = "listing_open"
    horizon: str = "ret_90d"
    cost_bps: float = 20.0


@app.get("/health")
def health():
    df = load_df()
    return {"ok": True, "n": int(len(df)), "mode": "HISTORICAL_EXTRACT"}


@app.get("/ipos")
def list_ipos(
    sector: Optional[str] = None,
    q: Optional[str] = None,
    gmp_min: Optional[float] = None,
    qib_min: Optional[float] = None,
    limit: int = Query(400, le=500),
):
    df = load_df()
    if sector:
        df = df[df["sector"] == sector]
    if q:
        qq = q.lower()
        df = df[
            df["name"].str.lower().str.contains(qq, na=False)
            | df["ticker"].str.lower().str.contains(qq, na=False)
        ]
    if gmp_min is not None:
        df = df[pd.to_numeric(df["gmp_pct"], errors="coerce") > gmp_min]
    if qib_min is not None:
        df = df[pd.to_numeric(df["sub_qib"], errors="coerce") > qib_min]
    cols = [
        "id", "name", "ticker", "sector", "industry", "listing_date", "issue_price",
        "issue_size_cr", "gmp", "gmp_pct", "gmp_error", "sub_total", "sub_qib",
        "sub_nii", "sub_retail", "listing_return", "ret_30d", "ret_90d", "ret_1y",
        "alpha_1y", "pe", "pe_premium", "market_regime", "signal", "weather",
        "fund_quality", "data_labels",
    ]
    use = [c for c in cols if c in df.columns]
    rows = [ipo_public(r) for _, r in df[use].head(limit).iterrows()]
    return {"n": int(len(df)), "items": rows, "data_mode": "HISTORICAL"}


@app.get("/ipos/{ipo_id}")
def ipo_detail(ipo_id: str):
    row = get_ipo(ipo_id)
    if not row:
        raise HTTPException(404, "IPO not in historical universe")
    return row


@app.get("/ipos/{ipo_id}/valuation")
def ipo_valuation(ipo_id: str):
    row = get_ipo(ipo_id)
    if not row:
        raise HTTPException(404, "not found")
    dcf = dcf_eng.run_dcf(
        revenue0=row.get("revenue"),
        pat0=row.get("pat"),
        net_debt=row.get("debt"),
        post_issue_shares=row.get("post_issue_shares"),
        ipo_price=row.get("issue_price"),
    )
    return {
        "ipo": ipo_id,
        "multiples": {
            "pe": row.get("pe"),
            "pb": row.get("pb"),
            "ev_sales": row.get("ev_sales"),
            "ev_ebitda": row.get("ev_ebitda"),
            "peg": row.get("peg"),
            "market_cap_cr": row.get("market_cap_cr"),
            "ev_cr": row.get("ev_cr"),
            "pe_premium": row.get("pe_premium"),
            "evs_premium": row.get("evs_premium"),
            "peer_pe": row.get("peer_pe"),
            "peer_ev_sales": row.get("peer_ev_sales"),
            "flags": row.get("flags"),
        },
        "dcf": dcf,
        "theory": F.FORMULAS["pe"],
    }


@app.get("/ipos/{ipo_id}/fundamentals")
def ipo_fundamentals(ipo_id: str):
    row = get_ipo(ipo_id)
    if not row:
        raise HTTPException(404, "not found")
    return {
        "quality": row.get("fund_quality"),
        "notes": row.get("fund_notes"),
        "revenue": row.get("revenue"),
        "revenue_prior": row.get("revenue_prior"),
        "rev_growth": row.get("rev_growth"),
        "pat": row.get("pat"),
        "pat_prior": row.get("pat_prior"),
        "pat_growth": row.get("pat_growth"),
        "pat_margin": row.get("pat_margin"),
        "book": row.get("book"),
        "roe": row.get("roe"),
        "debt": row.get("debt"),
        "de_ratio": row.get("de_ratio"),
        "assets": row.get("assets"),
        "units": "₹ crore unless noted",
        "data_type": (row.get("data_labels") or {}).get("fundamentals"),
    }


@app.get("/ipos/{ipo_id}/gmp")
def ipo_gmp(ipo_id: str):
    row = get_ipo(ipo_id)
    if not row:
        raise HTTPException(404, "not found")
    block = gmp_eng.gmp_block(row.get("issue_price"), row.get("gmp"), row.get("listing_open"))
    block["signal"] = row.get("signal")
    block["trajectory"] = [
        {"t": "T_last", "gmp": row.get("gmp"), "implied_price": block["expected_listing_price"], "data_type": "ACTUAL" if row.get("gmp") is not None else None},
        {"t": "LISTING_OPEN", "gmp": None, "implied_price": row.get("listing_open"), "data_type": "ACTUAL"},
    ]
    block["trajectory_note"] = "T-10…T-1 path is not in the sourced extract. Only last GMP and listing open are shown."
    return block


@app.get("/ipos/{ipo_id}/subscription")
def ipo_sub(ipo_id: str):
    row = get_ipo(ipo_id)
    if not row:
        raise HTTPException(404, "not found")
    return sub_eng.build_curve(row)


@app.get("/ipos/{ipo_id}/sector")
def ipo_sector(ipo_id: str):
    row = get_ipo(ipo_id)
    if not row:
        raise HTTPException(404, "not found")
    research = load_research()
    sector = next((s for s in research["sectors"] if s["sector"] == row.get("sector")), None)
    return {"ipo": row.get("sector"), "sector_stats": sector}


@app.get("/ipos/{ipo_id}/performance")
def ipo_perf(ipo_id: str):
    row = get_ipo(ipo_id)
    if not row:
        raise HTTPException(404, "not found")
    return {
        "listing_return": row.get("listing_return"),
        "listing_return_close": row.get("listing_return_close"),
        "ret_1d": row.get("ret_1d"),
        "ret_5d": row.get("ret_5d"),
        "ret_30d": row.get("ret_30d"),
        "ret_90d": row.get("ret_90d"),
        "ret_180d": row.get("ret_180d"),
        "ret_1y": row.get("ret_1y"),
        "ret_2y": row.get("ret_2y"),
        "alpha_30d": row.get("alpha_30d"),
        "alpha_90d": row.get("alpha_90d"),
        "alpha_1y": row.get("alpha_1y"),
        "vol_1y": row.get("vol_1y"),
        "mdd_1y": row.get("mdd_1y"),
        "beta_1y": row.get("beta_1y"),
        "event_study": event_eng.event_row(row),
        "data_type": (row.get("data_labels") or {}).get("post_listing"),
    }


@app.get("/ipos/{ipo_id}/risk")
def ipo_risk(ipo_id: str):
    row = get_ipo(ipo_id)
    if not row:
        raise HTTPException(404, "not found")
    return risk_eng.assess(row)


@app.get("/ipos/{ipo_id}/analogues")
def ipo_analogues(ipo_id: str):
    df = load_df()
    return analogues_eng.analogues(df, ipo_id.lower())


@app.get("/ipos/{ipo_id}/peers")
def ipo_peers(ipo_id: str):
    row = get_ipo(ipo_id)
    if not row:
        raise HTTPException(404, "not found")
    df = load_df()
    peers = df[(df["sector"] == row["sector"]) & (df["id"] != row["id"])].copy()
    peers = peers.sort_values("listing_date", ascending=False).head(12)
    cols = ["id", "name", "ticker", "listing_date", "issue_size_cr", "rev_growth", "pat_margin", "roe", "de_ratio", "pe", "ev_sales", "pb", "listing_return"]
    use = [c for c in cols if c in peers.columns]
    return {
        "peer_definition": "Other IPOs in the same sector (transaction comps), not live trading multiples.",
        "peer_pe": row.get("peer_pe"),
        "items": [ipo_public(r) for _, r in peers[use].iterrows()],
    }


@app.get("/research/gmp-reliability")
def gmp_reliability():
    return load_research()


@app.get("/research/event-study")
def research_event():
    df = load_df()
    rows = [ipo_public(r) for _, r in df.iterrows()]
    return event_eng.cohort_event_study(rows)


@app.get("/research/correlation")
def research_corr():
    return load_research().get("correlation")


@app.get("/research/regression")
def research_reg(x: str = "gmp_pct", y: str = "listing_return"):
    df = load_df()
    if x not in df.columns or y not in df.columns:
        raise HTTPException(400, "unknown field")
    return stats_eng.ols_univariate(df[x].tolist(), df[y].tolist(), x, y)


@app.get("/research/models")
def research_models(target: str = "listing_return"):
    df = load_df()
    return models_eng.train_models(df, target)


@app.get("/research/demand")
def research_demand():
    return load_research().get("demand")


@app.get("/research/formulas")
def formulas():
    return F.FORMULAS


@app.post("/backtest")
def backtest(body: BacktestIn):
    df = load_df()
    rule = body.rule
    if body.preset:
        rule = backtest_eng.PRESETS.get(body.preset.upper())
        if not rule:
            raise HTTPException(400, "unknown preset")
    if not rule:
        raise HTTPException(400, "preset or rule required")
    try:
        return backtest_eng.run_backtest(df, rule, fill=body.fill, horizon=body.horizon, cost_bps=body.cost_bps)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.get("/backtest/presets")
def backtest_presets():
    return backtest_eng.PRESETS


@app.get("/benchmarks")
def benchmarks():
    df = load_df()
    return {
        "nifty_source": "Yahoo ^NSEI when post-listing module ran; otherwise Ghosh extract Nifty % changes at issue close",
        "n_with_1y": int(pd.to_numeric(df.get("ret_1y"), errors="coerce").notna().sum()) if "ret_1y" in df.columns else 0,
        "n_with_gmp": int(pd.to_numeric(df.get("gmp"), errors="coerce").notna().sum()),
    }


@app.get("/query")
def structured_query(q: str):
    """Tiny command parser — not an LLM."""
    df = load_df()
    text = q.lower()
    research = load_research()
    if "gmp reliability" in text or "gmp work" in text:
        return {"type": "gmp-reliability", "data": research["gmp_overall"], "segments": research["segments"]}
    if "tech" in text and "gmp" in text:
        tech = df[df["sector"].str.contains("Technology", case=False, na=False)]
        rows = [
            {"expected_listing_return": r.gmp_pct, "actual_listing_return": r.listing_return, "prediction_error": r.gmp_error}
            for r in tech.itertuples()
        ]
        return {"type": "gmp-reliability", "universe": "Technology*", "data": gmp_eng.reliability_table(rows)}
    # gmp > x and qib > y
    import re

    gmp_m = re.search(r"gmp\s*>\s*([\d.]+)", text)
    qib_m = re.search(r"qib\s*>\s*([\d.]+)", text)
    work = df
    if gmp_m:
        thr = float(gmp_m.group(1))
        if thr > 1:
            thr /= 100.0
        work = work[pd.to_numeric(work["gmp_pct"], errors="coerce") > thr]
    if qib_m:
        work = work[pd.to_numeric(work["sub_qib"], errors="coerce") > float(qib_m.group(1))]
    cols = ["id", "name", "ticker", "gmp_pct", "sub_qib", "sub_total", "listing_return", "sector"]
    use = [c for c in cols if c in work.columns]
    return {"type": "filter", "n": int(len(work)), "items": [ipo_public(r) for _, r in work[use].head(80).iterrows()]}
