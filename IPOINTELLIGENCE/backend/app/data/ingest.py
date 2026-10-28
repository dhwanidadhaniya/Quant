"""
Build the research universe from sourced extracts.

Sources (see docs/DATA_SOURCES.md):
- Ghosh et al. (2024) Indian IPO mainboard extract (Chittorgarh-linked RHP fields)
- Investorgain GMP clean file bundled in the same Hugging Face dataset
- Yahoo Finance adjusted closes for post-listing horizons (optional, cached)

Nothing in this module invents a price, GMP, or subscription print.
"""
from __future__ import annotations

import json
import math
import re
import warnings
from datetime import datetime, timezone
from typing import Any, Optional

import numpy as np
import pandas as pd

from ..config import DATA_PROC, GMP_XLSX, MAINLINE, RESEARCH, UNIVERSE, YF_CACHE
from ..engines.formulas import _f, actual_listing_return, expected_listing_return, gmp_prediction_error
from ..engines.gmp import (
    bucket_gmp,
    bucket_qib,
    bucket_regime,
    bucket_size,
    bucket_sub,
    reliability_table,
    signal_quality,
)
from ..engines.sector import sector_table
from ..engines.statistics import correlation_matrix, demand_relationships
from ..engines.subscription import build_curve
from ..engines.valuation import valuation_pack

warnings.filterwarnings("ignore")


def _num(x) -> Optional[float]:
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return None
    if isinstance(x, (int, float, np.integer, np.floating)):
        v = float(x)
        return None if math.isnan(v) else v
    s = str(x).strip().replace(",", "").replace("%", "")
    if s in {"", "-", "nan", "NaN", "[.]", "NA", "None"}:
        return None
    m = re.search(r"-?\d+(?:\.\d+)?", s)
    if not m:
        return None
    return float(m.group())


def _pct(x) -> Optional[float]:
    v = _num(x)
    if v is None:
        return None
    if abs(v) > 1.5:  # 66.79 vs 0.6679
        return v / 100.0
    return v


def _parse_cr_from_text(text) -> Optional[float]:
    if text is None or (isinstance(text, float) and math.isnan(text)):
        return None
    if isinstance(text, (int, float, np.floating, np.integer)):
        return float(text)
    s = str(text)
    m = re.search(r"aggregating up to\s*([\d,\.]+)\s*Cr", s, re.I)
    if m:
        return float(m.group(1).replace(",", ""))
    m = re.search(r"([\d,\.]+)\s*Cr", s, re.I)
    if m:
        return float(m.group(1).replace(",", ""))
    return _num(s)


def _parse_shares(text) -> Optional[float]:
    if text is None or (isinstance(text, float) and math.isnan(text)):
        return None
    s = str(text)
    if s.strip().startswith("[.]"):
        return None
    m = re.search(r"([\d,]+)\s*shares", s, re.I)
    if not m:
        return None
    try:
        return float(m.group(1).replace(",", ""))
    except ValueError:
        return None


def _parse_band(text) -> tuple[Optional[float], Optional[float]]:
    if text is None or (isinstance(text, float) and math.isnan(text)):
        return None, None
    s = str(text).replace(",", "")
    nums = re.findall(r"\d+(?:\.\d+)?", s)
    if len(nums) >= 2:
        return float(nums[0]), float(nums[1])
    if len(nums) == 1:
        v = float(nums[0])
        return v, v
    return None, None


def _parse_date(x) -> Optional[pd.Timestamp]:
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return None
    if isinstance(x, pd.Timestamp):
        return x
    if isinstance(x, datetime):
        return pd.Timestamp(x)
    s = str(x).strip()
    for fmt in ("%b %d, %Y", "%d-%b-%Y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            return pd.Timestamp(datetime.strptime(s, fmt))
        except ValueError:
            continue
    try:
        return pd.to_datetime(s, errors="coerce")
    except Exception:
        return None


def _fin_years(row: pd.Series) -> list[dict[str, Optional[float]]]:
    years = []
    for i in range(5, -1, -1):
        rec = {
            "idx": i,
            "revenue": _num(row.get(f"{i}_revenue")),
            "pat": _num(row.get(f"{i}_profit after tax")),
            "book": _num(row.get(f"{i}_net worth")),
            "debt": _num(row.get(f"{i}_total borrowing")),
            "assets": _num(row.get(f"{i}_assets")),
            "income": _num(row.get(f"{i}_total income")),
        }
        if any(rec[k] is not None for k in ("revenue", "pat", "book", "assets")):
            years.append(rec)
    return years


def _sane_margin(rev, pat) -> bool:
    if rev is None or pat is None or rev <= 0:
        return False
    m = pat / rev
    return -1.5 < m < 0.8


def _pick_financials(years: list[dict[str, Optional[float]]]) -> dict[str, Any]:
    """
    Choose two internally consistent years. Flag unit chaos.

    Index 0 in the extract is often a stub or a different unit. We prefer
    consecutive years with sane PAT/revenue.
    """
    sane = [y for y in years if _sane_margin(y["revenue"], y["pat"])]
    quality = "HIGH"
    notes = []
    if not sane:
        # try scaling revenue if it looks like millions vs crore
        scaled = []
        for y in years:
            rec = dict(y)
            if rec["revenue"] and rec["pat"] and rec["revenue"] > 5000 and abs(rec["pat"]) < rec["revenue"] / 2:
                rec["revenue"] = rec["revenue"] / 10.0
                rec["_scaled"] = True
            if _sane_margin(rec["revenue"], rec["pat"]):
                scaled.append(rec)
        if scaled:
            sane = scaled
            quality = "MEDIUM"
            notes.append("Revenue scaled by 1/10 on some years to restore a plausible margin — ESTIMATED unit repair.")
        else:
            quality = "LOW"
            notes.append("Could not find a year with a plausible PAT/revenue pair. Fundamentals are sparse or inconsistent.")
            latest = years[0] if years else {}
            return {"latest": latest, "prior": None, "quality": quality, "notes": notes}

    candidates = [y for y in sane if y.get("revenue")]
    if not candidates:
        latest = sane[0]
        prior = None
    else:
        latest = max(candidates, key=lambda z: z["revenue"] or 0)
        rest = [y for y in candidates if y["idx"] != latest["idx"] and (y["revenue"] or 0) < latest["revenue"]]
        prior = max(rest, key=lambda z: z["revenue"] or 0) if rest else None
        notes.append("Latest RHP year chosen as the sane year with the largest revenue (not the spreadsheet index).")

    if latest.get("revenue") and prior and prior.get("revenue"):
        if latest["revenue"] > 8 * prior["revenue"] or prior["revenue"] > 8 * latest["revenue"]:
            quality = "LOW"
            notes.append("YoY revenue ratio > 8× — likely mixed units. Growth metrics withheld.")
            return {"latest": latest, "prior": None, "quality": quality, "notes": notes}

    if quality == "HIGH" and notes:
        quality = "MEDIUM"
    return {"latest": latest, "prior": prior, "quality": quality, "notes": notes}


def _extract_gmp_ticker(text: str) -> Optional[str]:
    m = re.search(r"\(([A-Z0-9.&-]+),", str(text))
    if m and m.group(1) not in {"TBD", "NA"}:
        return m.group(1)
    return None


def _norm_name(s: str) -> str:
    s = str(s).lower()
    s = re.sub(r"\bipo\b", " ", s)
    s = re.sub(r"\blimited\b|\bltd\b|\bllc\b", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def load_gmp() -> pd.DataFrame:
    g = pd.read_excel(GMP_XLSX)
    g["gmp_ticker"] = g["IPO"].map(_extract_gmp_ticker)
    g["gmp_name"] = g["IPO"].map(_norm_name)
    g["gmp_list_dt"] = g["Listing Date"].map(_parse_date)
    g["gmp_val"] = pd.to_numeric(g["GMP"], errors="coerce")
    g["gmp_issue"] = pd.to_numeric(g["IPO Issue Price"], errors="coerce")
    g["gmp_list_px"] = pd.to_numeric(g["IPO Listing Price"], errors="coerce")
    return g


def join_gmp(row: dict[str, Any], gmp_df: pd.DataFrame) -> Optional[dict[str, Any]]:
    ticker = (row.get("ticker") or "").upper()
    hit = pd.DataFrame()
    if ticker:
        hit = gmp_df[gmp_df["gmp_ticker"].astype(str).str.upper() == ticker]
    if hit.empty:
        nm = _norm_name(row.get("name") or "")
        if nm:
            hit = gmp_df[gmp_df["gmp_name"].str.contains(nm[:18], na=False)]
    if hit.empty:
        # listing date ± 3 days and issue price match
        dt = _parse_date(row.get("listing_date"))
        px = _f(row.get("issue_price"))
        if dt is not None and px:
            cand = gmp_df.dropna(subset=["gmp_list_dt", "gmp_issue"])
            cand = cand[(cand["gmp_issue"] - px).abs() < 1.0]
            cand = cand[(cand["gmp_list_dt"] - dt).abs() <= pd.Timedelta(days=4)]
            hit = cand
    if hit.empty:
        return None
    r = hit.iloc[0]
    return {
        "gmp": _f(r["gmp_val"]),
        "gmp_source": "Investorgain via Ghosh et al. 2024 HuggingFace extract",
        "gmp_list_px_source": _f(r["gmp_list_px"]),
        "data_type": "ACTUAL",
    }


def post_issue_shares(issue_shares: Optional[float], issue_cr: Optional[float], price: Optional[float],
                      pre_prom: Optional[float], post_prom: Optional[float]) -> tuple[Optional[float], str]:
    """
    Offer share count is NOT post-issue equity.

    When promoter pre/post stakes exist, implied post-issue shares ≈
    offer_shares / (pre − post). Assumes the offer accounts for the increase
    in public float. Labelled ESTIMATED.
    """
    if issue_shares:
        offer = issue_shares
    elif price and issue_cr:
        offer = issue_cr * 1e7 / price
    else:
        offer = None
    if offer is None:
        return None, "missing"
    if pre_prom and post_prom and pre_prom > post_prom + 0.005:
        delta = pre_prom - post_prom
        return offer / delta, "ESTIMATED_from_promoter_float"
    return offer, "offer_shares_only_not_post_issue"


def build_universe(fetch_yahoo: bool = True) -> pd.DataFrame:
    DATA_PROC.mkdir(parents=True, exist_ok=True)
    raw = pd.read_excel(MAINLINE, sheet_name="data_ordered")
    gmp_df = load_gmp()
    records = []
    for _, r in raw.iterrows():
        ticker = str(r.get("NSE_symbol") or "").strip().upper()
        if not ticker or ticker in {"NAN", "NONE"}:
            continue
        issue_price = _num(r.get("Final_Issue_Price"))
        if not issue_price or issue_price <= 0:
            continue
        list_open = _num(r.get("NSE_Open"))
        list_close = _num(r.get("NSE_Last_Trade"))
        list_high = _num(r.get("NSE_High"))
        listing_dt = _parse_date(r.get("Listing Date"))
        close_dt = _parse_date(r.get("Close Date"))
        open_dt = _parse_date(r.get("Open Date"))
        issue_cr = _num(r.get("Issue Size (Rs Cr.)")) or _parse_cr_from_text(r.get("Total Issue Size"))
        fresh_cr = _parse_cr_from_text(r.get("Fresh Issue"))
        ofs_cr = _parse_cr_from_text(r.get("Offer for Sale"))
        offer_shares = _parse_shares(r.get("Total Issue Size"))
        band_lo, band_hi = _parse_band(r.get("Price Band"))
        fins = _pick_financials(_fin_years(r))
        latest, prior = fins["latest"], fins["prior"]
        pre_p = _pct(r.get("Share Holding Pre Issue"))
        post_p = _pct(r.get("Share Holding Post Issue"))
        shares, shares_basis = post_issue_shares(offer_shares, issue_cr, issue_price, pre_p, post_p)

        rec: dict[str, Any] = {
            "id": ticker.lower(),
            "name": str(r.get("Issuer Company") or r.get("Company Name") or ticker).replace(" IPO", "").strip(),
            "short_name": str(r.get("Company Name") or ticker).strip(),
            "ticker": ticker,
            "sector": str(r.get("Sector") or "Unknown").strip(),
            "industry": str(r.get("Industry") or "").strip(),
            "ipo_type": str(r.get("Issue Type") or "Book Building"),
            "exchange": str(r.get("Exchange") or "NSE"),
            "open_date": None if open_dt is None or pd.isna(open_dt) else str(open_dt.date()),
            "close_date": None if close_dt is None or pd.isna(close_dt) else str(close_dt.date()),
            "listing_date": None if listing_dt is None or pd.isna(listing_dt) else str(listing_dt.date()),
            "listing_dt": listing_dt,
            "issue_price": issue_price,
            "face_value": _num(r.get("Face Value per share")),
            "price_band_lo": band_lo,
            "price_band_hi": band_hi,
            "issue_size_cr": issue_cr,
            "fresh_issue_cr": fresh_cr,
            "ofs_cr": ofs_cr,
            "offer_shares": offer_shares,
            "post_issue_shares": shares,
            "shares_basis": shares_basis,
            "promoter_pre": pre_p,
            "promoter_post": post_p,
            "dilution": (pre_p - post_p) if pre_p is not None and post_p is not None else None,
            "lot_size": _num(r.get("Lot Size")),
            "sub_total": _num(r.get("Total_subscriptions")),
            "listing_open": list_open,
            "listing_high": list_high,
            "listing_close": list_close,
            "listing_return": actual_listing_return(list_open, issue_price),
            "listing_return_close": actual_listing_return(list_close, issue_price),
            "listing_intraday": actual_listing_return(list_close, list_open),
            "nifty_d": _num(r.get("Chg%_nifty50_daily")),
            "nifty_w": _num(r.get("Chg%_nifty50_weekly")),
            "nifty_m": _num(r.get("Chg%_nifty50_monthly")),
            "vix_level": _num(r.get("Price_vix_daily")),
            "vix_d": _num(r.get("Chg%_vix_daily")),
            "nifty_px": _num(r.get("Price_nifty50_daily")),
            "source_url": r.get("url"),
            "fund_quality": fins["quality"],
            "fund_notes": fins["notes"],
            "revenue": latest.get("revenue") if latest else None,
            "pat": latest.get("pat") if latest else None,
            "book": latest.get("book") if latest else None,
            "debt": latest.get("debt") if latest else None,
            "assets": latest.get("assets") if latest else None,
            "revenue_prior": prior.get("revenue") if prior else None,
            "pat_prior": prior.get("pat") if prior else None,
            "data_labels": {
                "identity": "ACTUAL",
                "subscription_final": "ACTUAL",
                "subscription_daily": "ACTUAL",
                "listing": "ACTUAL",
                "gmp": "UNAVAILABLE",
                "fundamentals": "ACTUAL" if fins["quality"] != "LOW" else "UNRELIABLE",
                "post_listing": "UNAVAILABLE",
            },
        }
        # nifty chg in extract appears to be decimal already (0.01) or percent? Check later via sample
        if rec["nifty_m"] is not None and abs(rec["nifty_m"]) > 1:
            rec["nifty_m"] = rec["nifty_m"] / 100.0
            rec["nifty_d"] = rec["nifty_d"] / 100.0 if rec["nifty_d"] is not None and abs(rec["nifty_d"]) > 1 else rec["nifty_d"]
            rec["nifty_w"] = rec["nifty_w"] / 100.0 if rec["nifty_w"] is not None and abs(rec["nifty_w"]) > 1 else rec["nifty_w"]

        rec["market_regime"] = bucket_regime(rec["nifty_m"])
        rec["size_bucket"] = bucket_size(issue_cr)
        rec["sub_bucket"] = bucket_sub(rec["sub_total"])

        if rec["revenue"] and rec["revenue_prior"] and rec["revenue_prior"] > 0:
            rec["rev_growth"] = rec["revenue"] / rec["revenue_prior"] - 1.0
        else:
            rec["rev_growth"] = None
        if rec["pat"] and rec["pat_prior"] and rec["pat_prior"] > 0 and rec["pat"] > 0:
            rec["pat_growth"] = rec["pat"] / rec["pat_prior"] - 1.0
        else:
            rec["pat_growth"] = None
        if rec["pat"] is not None and rec["revenue"]:
            rec["pat_margin"] = rec["pat"] / rec["revenue"] if rec["revenue"] > 0 else None
        else:
            rec["pat_margin"] = None
        rec["roe"] = (rec["pat"] / rec["book"]) if rec["pat"] is not None and rec["book"] and rec["book"] > 0 else None
        rec["de_ratio"] = (rec["debt"] / rec["book"]) if rec["debt"] is not None and rec["book"] and rec["book"] > 0 else None

        for d in range(1, 7):
            rec[f"day_{d}_qib"] = _num(r.get(f"day_{d}_qib"))
            rec[f"day_{d}_nii"] = _num(r.get(f"day_{d}_nii"))
            rec[f"day_{d}_retail"] = _num(r.get(f"day_{d}_retail"))
            rec[f"day_{d}_total"] = _num(r.get(f"day_{d}_total"))

        # last available category snapshot
        for d in range(6, 0, -1):
            if rec.get(f"day_{d}_qib") is not None:
                rec["sub_qib"] = rec[f"day_{d}_qib"]
                rec["sub_nii"] = rec[f"day_{d}_nii"]
                rec["sub_retail"] = rec[f"day_{d}_retail"]
                rec["qib_is_final"] = False
                rec["data_labels"]["subscription_category"] = "ACTUAL_INTRADAY_SNAPSHOT"
                break
        else:
            rec["sub_qib"] = rec["sub_nii"] = rec["sub_retail"] = None

        rec["qib_bucket"] = bucket_qib(rec.get("sub_qib"))

        gmp_join = join_gmp(rec, gmp_df)
        if gmp_join:
            rec.update(gmp_join)
            rec["data_labels"]["gmp"] = "ACTUAL"
            rec["gmp_pct"] = expected_listing_return(issue_price, rec["gmp"])
            rec["gmp_error"] = gmp_prediction_error(rec["listing_return"], rec["gmp_pct"])
            rec["gmp_bucket"] = bucket_gmp(rec["gmp_pct"])
        else:
            rec["gmp"] = rec["gmp_pct"] = rec["gmp_error"] = rec["gmp_bucket"] = None

        records.append(rec)

    df = pd.DataFrame(records).drop_duplicates("ticker")

    # peer medians: prior 36 months same sector IPO P/E (transaction comps, no look-ahead)
    df = _attach_peers(df)
    val_rows = []
    for _, rec in df.iterrows():
        pack = valuation_pack(
            ipo_price=rec["issue_price"],
            post_issue_shares=rec["post_issue_shares"],
            pat_cr=rec["pat"],
            revenue_cr=rec["revenue"],
            book_cr=rec["book"],
            debt_cr=rec["debt"],
            cash_cr=None,
            ebitda_cr=None,
            pat_growth=rec["pat_growth"],
            peer_pe=rec.get("peer_pe"),
            peer_evs=rec.get("peer_ev_sales"),
            peer_pb=rec.get("peer_pb"),
            cash_estimated=True,
        )
        val_rows.append(pack)
    val_df = pd.DataFrame(val_rows)
    for c in val_df.columns:
        df[c] = val_df[c].values
    # Do not publish multiples built on offer size masquerading as market cap
    mask = df["shares_basis"] != "ESTIMATED_from_promoter_float"
    for c in ["market_cap_cr", "market_cap_rs", "pe", "pb", "ev_cr", "ev_sales", "ev_ebitda", "peg", "pe_premium", "evs_premium", "pb_premium", "eps", "bvps"]:
        if c in df.columns:
            df.loc[mask, c] = None

    if fetch_yahoo:
        df = _attach_yahoo(df)

    for col in [
        "ret_1d", "ret_5d", "ret_30d", "ret_90d", "ret_180d", "ret_1y", "ret_2y",
        "nifty_1d", "nifty_5d", "nifty_30d", "nifty_90d", "nifty_180d", "nifty_1y",
        "vol_1y", "mdd_1y", "beta_1y",
    ]:
        if col not in df.columns:
            df[col] = None

    df["alpha_30d"] = df.apply(lambda x: _minus(x.get("ret_30d"), x.get("nifty_30d")), axis=1)
    df["alpha_90d"] = df.apply(lambda x: _minus(x.get("ret_90d"), x.get("nifty_90d")), axis=1)
    df["alpha_1y"] = df.apply(lambda x: _minus(x.get("ret_1y"), x.get("nifty_1y")), axis=1)
    df["nifty_listing"] = df["nifty_d"]  # crude same-day tape; replaced if yahoo exists

    df["signal"] = df.apply(lambda x: signal_quality(x.to_dict()), axis=1)
    df["weather"] = df.apply(lambda x: build_curve(x.to_dict())["weather"], axis=1)

    _write_research(df)
    out = df.copy()
    for col in ("data_labels", "signal", "weather", "flags", "fund_notes"):
        if col in out.columns:
            out[col] = out[col].apply(lambda x: json.dumps(x, default=str) if not isinstance(x, str) else x)
    if "listing_dt" in out.columns:
        out["listing_dt"] = pd.to_datetime(out["listing_dt"], errors="coerce")
    out.to_parquet(UNIVERSE, index=False)
    return df


def _minus(a, b):
    a, b = _f(a), _f(b)
    if a is None or b is None:
        return None
    return a - b


def _attach_peers(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values("listing_dt")
    peer_pe, peer_evs, peer_pb = [], [], []
    for i, row in df.iterrows():
        window_start = row["listing_dt"] - pd.Timedelta(days=365 * 3) if pd.notna(row["listing_dt"]) else None
        pool = df[(df["sector"] == row["sector"]) & (df["listing_dt"] < row["listing_dt"])]
        pool = pool[pool["shares_basis"] == "ESTIMATED_from_promoter_float"]
        if window_start is not None:
            pool = pool[pool["listing_dt"] >= window_start]
        # temporary P/E using this row's method — we compute after valuation. Use PAT/mcap crude
        def _tmp_pe(r):
            if r.get("shares_basis") != "ESTIMATED_from_promoter_float":
                return np.nan
            if _f(r["pat"]) and _f(r["pat"]) > 0 and _f(r["issue_price"]) and _f(r["post_issue_shares"]):
                mcap_cr = r["issue_price"] * r["post_issue_shares"] / 1e7
                return mcap_cr / r["pat"]
            return np.nan

        pes = pool.apply(_tmp_pe, axis=1).replace([np.inf, -np.inf], np.nan).dropna()
        evs = []
        pbs = []
        for _, p in pool.iterrows():
            if _f(p["revenue"]) and p["revenue"] > 0 and _f(p["issue_price"]) and _f(p["post_issue_shares"]):
                mcap_cr = p["issue_price"] * p["post_issue_shares"] / 1e7
                evs.append(mcap_cr / p["revenue"])
            if _f(p["book"]) and p["book"] > 0 and _f(p["issue_price"]) and _f(p["post_issue_shares"]):
                mcap_cr = p["issue_price"] * p["post_issue_shares"] / 1e7
                pbs.append(mcap_cr / p["book"])
        peer_pe.append(float(pes.median()) if len(pes) >= 3 else None)
        peer_evs.append(float(np.median(evs)) if len(evs) >= 3 else None)
        peer_pb.append(float(np.median(pbs)) if len(pbs) >= 3 else None)
    df["peer_pe"] = peer_pe
    df["peer_ev_sales"] = peer_evs
    df["peer_pb"] = peer_pb
    return df


def _attach_yahoo(df: pd.DataFrame) -> pd.DataFrame:
    try:
        import yfinance as yf
    except Exception:
        return df
    tickers = sorted({f"{t}.NS" for t in df["ticker"].dropna().unique()})
    tickers += ["^NSEI"]
    try:
        if YF_CACHE.exists():
            px = pd.read_parquet(YF_CACHE)
        else:
            data = yf.download(
                tickers,
                start="2009-01-01",
                auto_adjust=True,
                progress=False,
                threads=True,
                group_by="ticker",
            )
            # flatten to close panel
            closes = {}
            if isinstance(data.columns, pd.MultiIndex):
                for t in tickers:
                    try:
                        closes[t] = data[t]["Close"]
                    except Exception:
                        continue
            else:
                closes["^NSEI"] = data["Close"]
            px = pd.DataFrame(closes)
            px.to_parquet(YF_CACHE)
    except Exception as e:
        print("Yahoo download failed:", e)
        return df

    nifty = px["^NSEI"] if "^NSEI" in px.columns else None
    ret_fields = {k: [] for k in [
        "ret_1d", "ret_5d", "ret_30d", "ret_90d", "ret_180d", "ret_1y", "ret_2y",
        "nifty_1d", "nifty_5d", "nifty_30d", "nifty_90d", "nifty_180d", "nifty_1y",
        "vol_1y", "mdd_1y", "beta_1y",
    ]}
    horizons = {"ret_1d": 1, "ret_5d": 5, "ret_30d": 21, "ret_90d": 63, "ret_180d": 126, "ret_1y": 252, "ret_2y": 504}

    for _, row in df.iterrows():
        col = f"{row['ticker']}.NS"
        start = row["listing_dt"]
        series = px[col].dropna() if col in px.columns else pd.Series(dtype=float)
        if start is None or pd.isna(start) or series.empty:
            for k in ret_fields:
                ret_fields[k].append(None)
            continue
        series = series[series.index >= pd.Timestamp(start) - pd.Timedelta(days=3)]
        if series.empty:
            for k in ret_fields:
                ret_fields[k].append(None)
            continue
        p0 = float(series.iloc[0])
        n = len(series)
        for key, h in horizons.items():
            if n > h:
                ret_fields[key].append(float(series.iloc[h] / p0 - 1.0))
            else:
                ret_fields[key].append(None)
        def bench(h):
            if nifty is None or start is None:
                return None
            ns = nifty.dropna()
            ns = ns[ns.index >= pd.Timestamp(start) - pd.Timedelta(days=3)]
            if len(ns) > h:
                return float(ns.iloc[h] / ns.iloc[0] - 1.0)
            return None
        ret_fields["nifty_1d"].append(bench(1))
        ret_fields["nifty_5d"].append(bench(5))
        ret_fields["nifty_30d"].append(bench(21))
        ret_fields["nifty_90d"].append(bench(63))
        ret_fields["nifty_180d"].append(bench(126))
        ret_fields["nifty_1y"].append(bench(252))
        if n > 30:
            rets = series.pct_change().dropna()
            ret_fields["vol_1y"].append(float(rets.std() * math.sqrt(252)) if len(rets) else None)
            peak = series.cummax()
            dd = (series / peak - 1.0).min()
            ret_fields["mdd_1y"].append(float(dd))
            if nifty is not None:
                aligned = pd.concat([rets, nifty.pct_change()], axis=1, join="inner").dropna()
                aligned.columns = ["a", "m"]
                if len(aligned) > 20 and aligned["m"].var() > 0:
                    ret_fields["beta_1y"].append(float(aligned.cov().iloc[0, 1] / aligned["m"].var()))
                else:
                    ret_fields["beta_1y"].append(None)
            else:
                ret_fields["beta_1y"].append(None)
        else:
            ret_fields["vol_1y"].append(None)
            ret_fields["mdd_1y"].append(None)
            ret_fields["beta_1y"].append(None)

        if any(ret_fields["ret_30d"][-1] is not None for _ in [0]):
            pass
    for k, v in ret_fields.items():
        df[k] = v
        if k.startswith("ret_") and any(x is not None for x in v):
            df.loc[df[k].notna(), "data_labels"] = df.loc[df[k].notna(), "data_labels"]
    df.loc[df["ret_30d"].notna(), "data_labels"] = df.loc[df["ret_30d"].notna(), "data_labels"].apply(
        lambda d: {**d, "post_listing": "ACTUAL"} if isinstance(d, dict) else d
    )
    return df


def _write_research(df: pd.DataFrame) -> None:
    gmp_rows = df[df["gmp_pct"].notna() & df["listing_return"].notna()]
    overall = reliability_table(
        [
            {
                "expected_listing_return": r.gmp_pct,
                "actual_listing_return": r.listing_return,
                "prediction_error": r.gmp_error,
            }
            for r in gmp_rows.itertuples()
        ]
    )
    segments = {}
    for col, name in [
        ("size_bucket", "IPO SIZE"),
        ("gmp_bucket", "GMP"),
        ("sub_bucket", "SUBSCRIPTION"),
        ("qib_bucket", "QIB"),
        ("market_regime", "MARKET REGIME"),
        ("sector", "SECTOR"),
    ]:
        segments[name] = {}
        for key, g in df.groupby(col):
            if key is None or (isinstance(key, float) and math.isnan(key)):
                continue
            segments[name][str(key)] = reliability_table(
                [
                    {
                        "expected_listing_return": _f(r.get("gmp_pct")),
                        "actual_listing_return": _f(r.get("listing_return")),
                        "prediction_error": _f(r.get("gmp_error")),
                    }
                    for _, r in g.iterrows()
                ]
            )

    num_cols = [
        "gmp_pct", "listing_return", "sub_total", "sub_qib", "sub_nii", "sub_retail",
        "pe", "pe_premium", "ev_sales", "rev_growth", "pat_growth", "roe", "de_ratio",
        "issue_size_cr", "ret_30d", "ret_90d", "ret_1y", "alpha_1y", "nifty_m", "vix_level",
    ]
    payload = {
        "built_at": datetime.now(timezone.utc).isoformat(),
        "n": int(len(df)),
        "n_gmp": int(gmp_rows.shape[0]),
        "gmp_overall": overall,
        "segments": segments,
        "sectors": sector_table(df),
        "correlation": correlation_matrix(df, num_cols),
        "demand": demand_relationships(df),
        "disclaimer": "Historical research extract. GMP is unofficial. Correlation is not causation.",
    }
    RESEARCH.write_text(json.dumps(payload, default=str))


if __name__ == "__main__":
    import argparse

    p = argparse.ArgumentParser()
    p.add_argument("--no-yahoo", action="store_true")
    args = p.parse_args()
    df = build_universe(fetch_yahoo=not args.no_yahoo)
    print(f"universe n={len(df)} gmp={df['gmp'].notna().sum()} listed={df['listing_return'].notna().sum()}")
    print(f"wrote {UNIVERSE}")
