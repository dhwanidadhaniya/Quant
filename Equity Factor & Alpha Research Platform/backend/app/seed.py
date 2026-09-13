"""
Generate a realistic educational equity universe.

Returns are built from a simple multi-factor model so that Value, Momentum,
Quality, Size, Growth and Low-Vol actually *show up* in the backtests —
the way a student research lab would construct a sample, not live prices.
"""
from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from .config import DATASETS, RISK_FREE_ANNUAL, SAMPLE_END, SAMPLE_START
from .database import SessionLocal, engine
from . import models

UNIVERSE = [
    # US — large, liquid names a student would actually recognise
    ("AAPL", "Apple", "Technology", "Consumer Electronics", "US", "NASDAQ",
     "Designs consumer devices and a services layer that now carries a large share of the earnings."),
    ("MSFT", "Microsoft", "Technology", "Software", "US", "NASDAQ",
     "Enterprise software, cloud infrastructure and a growing AI services mix."),
    ("GOOGL", "Alphabet", "Communication", "Internet", "US", "NASDAQ",
     "Search advertising remains the cash engine; YouTube and cloud sit on top."),
    ("AMZN", "Amazon", "Consumer Discretionary", "E-commerce", "US", "NASDAQ",
     "Retail scale plus AWS. Margins have widened as fulfilment efficiency improved."),
    ("NVDA", "NVIDIA", "Technology", "Semiconductors", "US", "NASDAQ",
     "Accelerators for training and inference. High growth, high multiple, high crowding."),
    ("META", "Meta Platforms", "Communication", "Social Media", "US", "NASDAQ",
     "Advertising platform with Reality Labs as a long-duration option."),
    ("AVGO", "Broadcom", "Technology", "Semiconductors", "US", "NASDAQ",
     "Custom silicon and infrastructure software. Cash conversion is the story."),
    ("ORCL", "Oracle", "Technology", "Enterprise Software", "US", "NYSE",
     "Database franchise migrating toward cloud infrastructure."),
    ("ADBE", "Adobe", "Technology", "Software", "US", "NASDAQ",
     "Creative and document software; subscription economics, some AI disruption risk."),
    ("CRM", "Salesforce", "Technology", "Software", "US", "NYSE",
     "CRM platform. Operating leverage has improved after a cost reset."),
    ("INTC", "Intel", "Technology", "Semiconductors", "US", "NASDAQ",
     "Foundry rebuild in progress. Classic value/turnaround rather than quality."),
    ("AMD", "AMD", "Technology", "Semiconductors", "US", "NASDAQ",
     "CPU/GPU challenger. More cyclical than NVIDIA, cheaper on several screens."),
    ("QCOM", "Qualcomm", "Technology", "Semiconductors", "US", "NASDAQ",
     "Mobile silicon plus licensing. Handset cycle still matters."),
    ("CSCO", "Cisco", "Technology", "Networking", "US", "NASDAQ",
     "Networking hardware with a growing software mix. Defensive tech."),
    ("IBM", "IBM", "Technology", "IT Services", "US", "NYSE",
     "Hybrid cloud and consulting. Slow growth, decent cash return."),
    ("JPM", "JPMorgan Chase", "Financials", "Banks", "US", "NYSE",
     "Diversified US bank. Rate cycles and credit quality drive the factor mix."),
    ("BAC", "Bank of America", "Financials", "Banks", "US", "NYSE",
     "More deposit-sensitive than JPM. Value tilt when the curve steepens."),
    ("GS", "Goldman Sachs", "Financials", "Investment Banking", "US", "NYSE",
     "Markets and asset management. Higher beta to risk appetite."),
    ("V", "Visa", "Financials", "Payments", "US", "NYSE",
     "Asset-light payment network. Quality compounder, rarely cheap."),
    ("MA", "Mastercard", "Financials", "Payments", "US", "NYSE",
     "Similar to Visa with a slightly more international mix."),
    ("JNJ", "Johnson & Johnson", "Healthcare", "Pharma", "US", "NYSE",
     "Diversified healthcare. Low vol, modest growth, balance-sheet strength."),
    ("UNH", "UnitedHealth", "Healthcare", "Managed Care", "US", "NYSE",
     "Scale insurer plus Optum. Policy risk is the main discount."),
    ("PFE", "Pfizer", "Healthcare", "Pharma", "US", "NYSE",
     "Post-COVID earnings reset. Cheap on earnings, pipeline is the debate."),
    ("LLY", "Eli Lilly", "Healthcare", "Pharma", "US", "NYSE",
     "GLP-1 franchise. Growth factor in its purest recent form."),
    ("ABBV", "AbbVie", "Healthcare", "Pharma", "US", "NYSE",
     "Humira cliff largely absorbed. Cash return name."),
    ("XOM", "Exxon Mobil", "Energy", "Integrated Oil", "US", "NYSE",
     "Integrated major. Value and commodity beta, not a quality screen favourite."),
    ("CVX", "Chevron", "Energy", "Integrated Oil", "US", "NYSE",
     "Slightly more conservative capital return than XOM in most years."),
    ("CAT", "Caterpillar", "Industrials", "Machinery", "US", "NYSE",
     "Late-cycle industrial. Capex and China construction still matter."),
    ("HON", "Honeywell", "Industrials", "Conglomerate", "US", "NASDAQ",
     "Diversified industrial with aerospace and automation exposure."),
    ("GE", "GE Aerospace", "Industrials", "Aerospace", "US", "NYSE",
     "Post-breakup aerospace pure play. Quality has improved with the mix."),
    ("BA", "Boeing", "Industrials", "Aerospace", "US", "NYSE",
     "Production and certification risk. High beta, weak quality screens."),
    ("HD", "Home Depot", "Consumer Discretionary", "Retail", "US", "NYSE",
     "US housing-linked retailer. Quality with some cyclicality."),
    ("NKE", "Nike", "Consumer Discretionary", "Apparel", "US", "NYSE",
     "Brand still valuable; recent growth has been uneven by region."),
    ("SBUX", "Starbucks", "Consumer Discretionary", "Restaurants", "US", "NASDAQ",
     "Same-store sales and China traffic. Not the defensive name it used to be."),
    ("TSLA", "Tesla", "Consumer Discretionary", "Autos", "US", "NASDAQ",
     "EV scale plus optionality. Factor scores swing with the multiple."),
    ("F", "Ford", "Consumer Discretionary", "Autos", "US", "NYSE",
     "Legacy auto. Cheap, levered, cyclical — a value trap risk case."),
    ("GM", "General Motors", "Consumer Discretionary", "Autos", "US", "NYSE",
     "Similar to Ford with a larger EV spend debate."),
    ("KO", "Coca-Cola", "Consumer Staples", "Beverages", "US", "NYSE",
     "Global beverage brand. Low vol, modest growth, classic defensive."),
    ("PEP", "PepsiCo", "Consumer Staples", "Beverages", "US", "NASDAQ",
     "Beverages plus snacks. Slightly more diversified than KO."),
    ("WMT", "Walmart", "Consumer Staples", "Retail", "US", "NYSE",
     "US grocery scale. Quality has improved with e-commerce mix."),
    ("COST", "Costco", "Consumer Staples", "Retail", "US", "NASDAQ",
     "Membership model. Rarely cheap, usually high quality."),
    ("PG", "Procter & Gamble", "Consumer Staples", "Household", "US", "NYSE",
     "Brand portfolio. Defensive, low vol, limited growth."),
    ("DIS", "Disney", "Communication", "Media", "US", "NYSE",
     "Parks plus streaming. Turnaround in profitability after the DTC spend."),
    ("NFLX", "Netflix", "Communication", "Streaming", "US", "NASDAQ",
     "Streaming scale. Growth slowed; margins improved. Crowded momentum name at times."),
    ("T", "AT&T", "Communication", "Telecom", "US", "NYSE",
     "Post-Warner unwind. Yield, leverage, slow growth."),
    ("VZ", "Verizon", "Communication", "Telecom", "US", "NYSE",
     "Wireless cash flow. Defensive but capital intensive."),
    ("NEE", "NextEra Energy", "Utilities", "Electric", "US", "NYSE",
     "Regulated utility plus renewables development."),
    ("DUK", "Duke Energy", "Utilities", "Electric", "US", "NYSE",
     "Traditional regulated utility. Low vol, rate-base growth."),
    ("LIN", "Linde", "Materials", "Industrial Gases", "US", "NASDAQ",
     "Industrial gases. Quality compounder with pricing power."),
    ("AMT", "American Tower", "Real Estate", "Towers", "US", "NYSE",
     "Tower REIT. Rate sensitive, long contracted cash flows."),
    # India — Nifty-style names so the India VIX / NIFTY pulse is not decorative
    ("RELIANCE.NS", "Reliance Industries", "Energy", "Conglomerate", "IN", "NSE",
     "Oil-to-chemicals plus retail and Jio. India market-cap anchor."),
    ("TCS.NS", "Tata Consultancy", "Technology", "IT Services", "IN", "NSE",
     "Largest Indian IT services franchise. Quality, USD revenue mix."),
    ("INFY.NS", "Infosys", "Technology", "IT Services", "IN", "NSE",
     "IT services. Slightly more cyclical deal wins than TCS."),
    ("HDFCBANK.NS", "HDFC Bank", "Financials", "Banks", "IN", "NSE",
     "Private-sector quality bank. Premium multiple for a reason."),
    ("ICICIBANK.NS", "ICICI Bank", "Financials", "Banks", "IN", "NSE",
     "Private bank with improving return ratios. Often cheaper than HDFC."),
    ("SBIN.NS", "State Bank of India", "Financials", "Banks", "IN", "NSE",
     "PSU bank. Credit cycle and government ownership discount."),
    ("BHARTIARTL.NS", "Bharti Airtel", "Communication", "Telecom", "IN", "NSE",
     "India wireless consolidation beneficiary."),
    ("ITC.NS", "ITC", "Consumer Staples", "FMCG", "IN", "NSE",
     "Cigarettes plus FMCG. Cash generation, slow re-rating debate."),
    ("HINDUNILVR.NS", "Hindustan Unilever", "Consumer Staples", "FMCG", "IN", "NSE",
     "India staple compounder. Quality, rarely cheap."),
    ("LT.NS", "Larsen & Toubro", "Industrials", "Engineering", "IN", "NSE",
     "Infra and engineering. Capex-cycle exposure."),
    ("MARUTI.NS", "Maruti Suzuki", "Consumer Discretionary", "Autos", "IN", "NSE",
     "India passenger-vehicle leader. Rural and urban mix."),
    ("SUNPHARMA.NS", "Sun Pharma", "Healthcare", "Pharma", "IN", "NSE",
     "Specialty plus India formulations."),
    ("AXISBANK.NS", "Axis Bank", "Financials", "Banks", "IN", "NSE",
     "Private bank. Credit costs still the swing factor."),
    ("BAJFINANCE.NS", "Bajaj Finance", "Financials", "NBFC", "IN", "NSE",
     "Consumer finance compounder. Growth and valuation both rich."),
    ("WIPRO.NS", "Wipro", "Technology", "IT Services", "IN", "NSE",
     "IT services. Often the cheaper, slower-growth cousin of TCS/Infosys."),
    ("ASIANPAINT.NS", "Asian Paints", "Materials", "Paints", "IN", "NSE",
     "Pricing power in decorative paints. Quality, housing-linked."),
    ("TITAN.NS", "Titan", "Consumer Discretionary", "Jewellery", "IN", "NSE",
     "Jewellery and watches. Discretionary India consumption."),
    ("ULTRACEMCO.NS", "UltraTech Cement", "Materials", "Cement", "IN", "NSE",
     "India cement scale. Infra and housing cycle."),
    ("NESTLEIND.NS", "Nestle India", "Consumer Staples", "FMCG", "IN", "NSE",
     "Premium staple. High ROE, high multiple."),
    ("POWERGRID.NS", "Power Grid", "Utilities", "Transmission", "IN", "NSE",
     "Regulated transmission. Defensive India utility."),
    ("NTPC.NS", "NTPC", "Utilities", "Electric", "IN", "NSE",
     "Generation utility. Yield and regulated return."),
    ("ONGC.NS", "ONGC", "Energy", "E&P", "IN", "NSE",
     "Upstream oil. Commodity beta, government ownership."),
    ("TATAMOTORS.NS", "Tata Motors", "Consumer Discretionary", "Autos", "IN", "NSE",
     "JLR plus India CV/PV. Cyclical, improving mix."),
    ("TATASTEEL.NS", "Tata Steel", "Materials", "Steel", "IN", "NSE",
     "Steel cycle. Value when spreads are wide, painful when they are not."),
    ("COALINDIA.NS", "Coal India", "Energy", "Mining", "IN", "NSE",
     "Volume and dividend story. Policy and volume risk."),
]


# Latent factor identities used to *generate* returns. These are not tradable
# indices — they are the student-lab equivalent of Fama-French mimicking portfolios.
FACTOR_DRIFT = {  # annualised, sample-period averages, not forecasts
    "mkt": 0.085,
    "value": 0.025,
    "momentum": 0.035,
    "quality": 0.030,
    "size": 0.012,
    "growth": 0.018,
    "low_vol": 0.010,
}
FACTOR_VOL = {
    "mkt": 0.16,
    "value": 0.09,
    "momentum": 0.12,
    "quality": 0.07,
    "size": 0.11,
    "growth": 0.10,
    "low_vol": 0.06,
}


def _business_days(start=SAMPLE_START, end=SAMPLE_END):
    return pd.bdate_range(start, end)


def _true_exposures(rng: np.random.Generator, n: int):
    """Stable 'true' factor loadings that also drive reported scores."""
    sector_tilt = {
        "Technology": dict(growth=0.7, momentum=0.4, value=-0.5, quality=0.3, size=-0.4, low_vol=-0.3),
        "Financials": dict(value=0.5, size=0.1, quality=0.1, growth=-0.1, momentum=0.0, low_vol=-0.1),
        "Healthcare": dict(quality=0.5, low_vol=0.3, growth=0.2, value=-0.1, momentum=0.1, size=-0.1),
        "Energy": dict(value=0.8, size=0.2, quality=-0.2, growth=-0.2, momentum=0.1, low_vol=-0.2),
        "Industrials": dict(value=0.2, quality=0.2, growth=0.1, momentum=0.1, size=0.1, low_vol=0.0),
        "Consumer Discretionary": dict(momentum=0.3, growth=0.3, value=0.0, quality=0.0, size=0.1, low_vol=-0.2),
        "Consumer Staples": dict(low_vol=0.7, quality=0.5, value=0.1, growth=-0.2, momentum=-0.2, size=0.0),
        "Communication": dict(growth=0.2, momentum=0.2, value=0.1, quality=0.0, size=0.0, low_vol=-0.1),
        "Utilities": dict(low_vol=0.8, value=0.3, quality=0.2, growth=-0.3, momentum=-0.3, size=0.2),
        "Materials": dict(value=0.4, size=0.3, quality=0.0, growth=0.0, momentum=0.1, low_vol=-0.1),
        "Real Estate": dict(value=0.3, low_vol=0.2, quality=0.1, growth=-0.1, momentum=-0.1, size=0.2),
    }
    rows = []
    for i, row in enumerate(UNIVERSE):
        tilt = sector_tilt[row[2]]
        exp = {k: float(np.clip(tilt[k] + rng.normal(0, 0.25), -1.5, 1.5)) for k in tilt}
        # Size: India names and smaller US names get a small-cap tilt
        if row[4] == "IN":
            exp["size"] += 0.35
        if row[0] in {"AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META"}:
            exp["size"] -= 0.8
        rows.append(exp)
    return rows


def _macro_series(dates, rng):
    """NIFTY, S&P, NASDAQ, India VIX, USDINR, 10Y — stylised, labelled as sample."""
    n = len(dates)
    mkt = rng.normal(FACTOR_DRIFT["mkt"] / 252, FACTOR_VOL["mkt"] / np.sqrt(252), n)
    # 2020 crash, 2022 bear, 2023-24 recovery baked in as regime shocks
    crash = (dates >= "2020-02-20") & (dates <= "2020-03-23")
    bear22 = (dates >= "2022-01-03") & (dates <= "2022-10-14")
    recov = (dates >= "2023-01-03") & (dates <= "2024-06-28")
    mkt = mkt.copy()
    mkt[crash] -= 0.011
    mkt[bear22] -= 0.0009
    mkt[recov] += 0.0008

    sp = 3200 * np.cumprod(1 + mkt)
    nasdaq = 8900 * np.cumprod(1 + mkt * 1.25 + rng.normal(0, 0.006, n))
    nifty = 12200 * np.cumprod(1 + mkt * 0.85 + rng.normal(0.00015, 0.007, n))
    # VIX: inverse-ish to market moves
    vix = np.clip(18 + (-mkt) * 400 + rng.normal(0, 1.2, n), 10, 85)
    vix[crash] += 25
    vix[bear22] += 8
    usdinr = 71.2 * np.cumprod(1 + rng.normal(0.00005, 0.0032, n))
    y10 = np.clip(1.8 + np.cumsum(rng.normal(0.0004, 0.012, n)), 0.6, 5.2)
    y10[bear22] += 0.004  # hiking cycle

    series = {
        "^GSPC": ("S&P 500", sp),
        "^IXIC": ("NASDAQ", nasdaq),
        "^NSEI": ("NIFTY 50", nifty),
        "INDIAVIX": ("India VIX", vix),
        "USDINR": ("USD/INR", usdinr),
        "^TNX": ("10Y Treasury Yield", y10),
    }
    return mkt, series


def _to_score(arr):
    """Cross-sectional 0–100 rank score."""
    s = pd.Series(arr)
    return (s.rank(pct=True) * 100).to_numpy()


def seed(force: bool = False):
    DATASETS.mkdir(parents=True, exist_ok=True)
    models.Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        existing = db.query(models.Company).count()
        if existing and not force:
            print(f"Database already seeded ({existing} companies).")
            return
        if existing:
            for table in reversed(models.Base.metadata.sorted_tables):
                db.execute(table.delete())
            db.commit()

        rng = np.random.default_rng(42)
        dates = _business_days()
        n = len(dates)
        n_c = len(UNIVERSE)
        mkt, macros = _macro_series(dates, rng)

        # Latent daily factor returns
        f_ret = {
            k: rng.normal(FACTOR_DRIFT[k] / 252, FACTOR_VOL[k] / np.sqrt(252), n)
            for k in FACTOR_DRIFT
            if k != "mkt"
        }
        # Momentum crashes in high-vol windows — a known empirical regularity
        crash = (dates >= "2020-02-20") & (dates <= "2020-03-23")
        f_ret["momentum"][crash] -= 0.012
        f_ret["quality"][crash] += 0.004
        f_ret["low_vol"][crash] += 0.003
        bear22 = (dates >= "2022-01-03") & (dates <= "2022-10-14")
        f_ret["growth"][bear22] -= 0.004
        f_ret["value"][bear22] += 0.0025

        exposures = _true_exposures(rng, n_c)
        # Starting prices / mcap
        start_px = rng.uniform(18, 420, n_c)
        start_px[0:8] = np.array([72, 158, 67, 94, 58, 205, 310, 54], dtype=float)

        companies = []
        for i, row in enumerate(UNIVERSE):
            c = models.Company(
                ticker=row[0], name=row[1], sector=row[2], industry=row[3],
                country=row[4], exchange=row[5], description=row[6],
            )
            db.add(c)
            companies.append(c)
        db.flush()

        idio_vol = rng.uniform(0.012, 0.028, n_c)
        em = {k: np.array([e[k] for e in exposures]) for k in
              ("value", "momentum", "quality", "size", "growth", "low_vol")}
        daily_rets = (
            0.00012
            + 0.85 * mkt[:, None]
            + 0.35 * em["value"] * f_ret["value"][:, None]
            + 0.40 * em["momentum"] * f_ret["momentum"][:, None]
            + 0.30 * em["quality"] * f_ret["quality"][:, None]
            + 0.25 * em["size"] * f_ret["size"][:, None]
            + 0.35 * em["growth"] * f_ret["growth"][:, None]
            + 0.30 * em["low_vol"] * f_ret["low_vol"][:, None]
            + rng.normal(0, idio_vol, size=(n, n_c))
        )
        closes = start_px * np.cumprod(1 + daily_rets, axis=0)
        opens = closes * (1 + rng.normal(0, 0.004, closes.shape))
        highs = np.maximum(opens, closes) * (1 + np.abs(rng.normal(0, 0.006, closes.shape)))
        lows = np.minimum(opens, closes) * (1 - np.abs(rng.normal(0, 0.006, closes.shape)))
        vols = np.abs(rng.normal(4.2e6, 1.8e6, closes.shape))
        ids = np.array([c.id for c in companies])
        dts = [d.date() for d in dates]
        chunk = []
        for t in range(n):
            dt = dts[t]
            for i in range(n_c):
                chunk.append(models.Price(
                    company_id=int(ids[i]), date=dt,
                    open=round(float(opens[t, i]), 2),
                    high=round(float(highs[t, i]), 2),
                    low=round(float(lows[t, i]), 2),
                    close=round(float(closes[t, i]), 2),
                    volume=float(vols[t, i]),
                ))
            if len(chunk) >= 8000:
                db.bulk_save_objects(chunk)
                db.commit()
                chunk = []
        if chunk:
            db.bulk_save_objects(chunk)
            db.commit()
        last_close = closes[-1]

        # Trailing metrics as of last date
        rets_df = pd.DataFrame(daily_rets, index=dates)
        mom_12 = (rets_df.iloc[-252:] + 1).prod() - 1
        mom_6 = (rets_df.iloc[-126:] + 1).prod() - 1
        vol_1y = rets_df.iloc[-252:].std() * np.sqrt(252)
        dd = []
        for i in range(n_c):
            eq = (1 + rets_df.iloc[:, i]).cumprod()
            dd.append(float((eq / eq.cummax() - 1).min()))

        # Fundamentals correlated with true exposures
        financials = []
        scores = []
        last = dates[-1].date()
        pe = 18 - np.array([e["value"] for e in exposures]) * 7 + rng.normal(0, 3, n_c)
        pb = 3.2 - np.array([e["value"] for e in exposures]) * 1.4 + rng.normal(0, 0.6, n_c)
        ebitda = 12 - np.array([e["value"] for e in exposures]) * 4 + rng.normal(0, 1.5, n_c)
        roe = 0.14 + np.array([e["quality"] for e in exposures]) * 0.10 + rng.normal(0, 0.03, n_c)
        roa = 0.07 + np.array([e["quality"] for e in exposures]) * 0.05 + rng.normal(0, 0.015, n_c)
        opm = 0.18 + np.array([e["quality"] for e in exposures]) * 0.08 + rng.normal(0, 0.03, n_c)
        nm = 0.12 + np.array([e["quality"] for e in exposures]) * 0.06 + rng.normal(0, 0.025, n_c)
        rg = 0.08 + np.array([e["growth"] for e in exposures]) * 0.12 + rng.normal(0, 0.04, n_c)
        eg = 0.09 + np.array([e["growth"] for e in exposures]) * 0.14 + rng.normal(0, 0.05, n_c)
        de = 0.7 - np.array([e["quality"] for e in exposures]) * 0.35 + rng.normal(0, 0.2, n_c)
        ic = 8 + np.array([e["quality"] for e in exposures]) * 6 + rng.normal(0, 2, n_c)
        cr = 1.4 + np.array([e["quality"] for e in exposures]) * 0.4 + rng.normal(0, 0.2, n_c)
        dy = np.clip(0.018 - np.array([e["growth"] for e in exposures]) * 0.01 + rng.normal(0, 0.006, n_c), 0, 0.08)
        mcap = np.exp(rng.normal(24.8, 1.1, n_c))
        mcap *= np.exp(-np.array([e["size"] for e in exposures]) * 0.6)

        pe = np.clip(pe, 4, 85)
        pb = np.clip(pb, 0.4, 18)
        ey = 1 / pe
        peg = np.clip(pe / np.clip(eg * 100, 2, 40), 0.3, 6)

        val_raw = (-pe / pe.std()) + (-pb / pb.std()) + (ey / ey.std())
        mom_raw = mom_12.to_numpy() * 0.7 + mom_6.to_numpy() * 0.3
        qty_raw = roe / roe.std() + roa / roa.std() - de / np.std(de)
        size_raw = -np.log(mcap)  # smaller = higher size score (size premium convention)
        gr_raw = rg / rg.std() + eg / eg.std()
        lv_raw = -vol_1y.to_numpy()

        val_s = _to_score(val_raw)
        mom_s = _to_score(mom_raw)
        qty_s = _to_score(qty_raw)
        sz_s = _to_score(size_raw)
        gr_s = _to_score(gr_raw)
        lv_s = _to_score(lv_raw)
        # Default alpha weights used in the lab
        alpha = 0.25 * val_s + 0.20 * mom_s + 0.20 * qty_s + 0.15 * gr_s + 0.10 * sz_s + 0.10 * lv_s

        for i, c in enumerate(companies):
            financials.append(models.Financial(
                company_id=c.id, as_of=last,
                market_cap=float(mcap[i]),
                pe=float(pe[i]), pb=float(pb[i]), ev_ebitda=float(np.clip(ebitda[i], 3, 40)),
                peg=float(peg[i]), earnings_yield=float(ey[i]),
                roe=float(roe[i]), roa=float(roa[i]),
                operating_margin=float(opm[i]), net_margin=float(nm[i]),
                revenue_growth=float(rg[i]), eps_growth=float(eg[i]),
                earnings_cagr=float(eg[i] * 0.85),
                debt_equity=float(np.clip(de[i], 0.05, 3.5)),
                interest_coverage=float(np.clip(ic[i], 0.4, 40)),
                current_ratio=float(np.clip(cr[i], 0.5, 4)),
                dividend_yield=float(dy[i]),
            ))
            scores.append(models.FactorScore(
                company_id=c.id, date=last,
                value=float(val_s[i]), momentum=float(mom_s[i]),
                quality=float(qty_s[i]), size=float(sz_s[i]),
                growth=float(gr_s[i]), low_vol=float(lv_s[i]),
                alpha_score=float(alpha[i]),
            ))
        db.bulk_save_objects(financials)
        db.bulk_save_objects(scores)

        benches = []
        for ticker, (name, series) in macros.items():
            for t, val in zip(dates, series):
                benches.append(models.Benchmark(
                    ticker=ticker, name=name, date=t.date(), value=float(val)
                ))
        db.bulk_save_objects(benches)

        db.add(models.ResearchNote(
            title="Lab setup",
            body="Universe is a mixed US+India sample so NIFTY and S&P can sit on the same canvas. Factor scores are cross-sectional ranks as of the last sample date. Do not treat this as a live book.",
            attached_type="chart", attached_id="dashboard",
        ))
        db.add(models.ResearchNote(
            title="Momentum after the 2020 air-pocket",
            body="The seed process deliberately crashes momentum in Feb–Mar 2020. If a backtest looks too clean through that window, something is wrong with the engine.",
            attached_type="factor", attached_id="momentum",
        ))
        db.commit()

        # CSV snapshots for the datasets/ folder (transparency)
        meta = pd.DataFrame(UNIVERSE, columns=["ticker", "name", "sector", "industry", "country", "exchange", "description"])
        meta.to_csv(DATASETS / "universe.csv", index=False)
        print(f"Seeded {n_c} companies, {n} sessions, {n_c * n} prices.")
    finally:
        db.close()


if __name__ == "__main__":
    seed(force=True)
