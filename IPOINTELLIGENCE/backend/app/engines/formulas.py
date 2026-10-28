"""
Central formula library.

Every metric used by the terminal is defined here with:
meaning, formula, variables, interpretation, limitations, and a pure function.

No function invents a number when inputs are missing or economically undefined.
"""
from __future__ import annotations

import math
from typing import Any, Optional

import numpy as np

NA = None


def _f(x: Any) -> Optional[float]:
    if x is None:
        return None
    try:
        if isinstance(x, (float, np.floating)) and (math.isnan(x) or math.isinf(x)):
            return None
        v = float(x)
        if math.isnan(v) or math.isinf(v):
            return None
        return v
    except (TypeError, ValueError):
        return None


def safe_div(n: Any, d: Any) -> Optional[float]:
    n_, d_ = _f(n), _f(d)
    if n_ is None or d_ is None or d_ == 0:
        return None
    return n_ / d_


def pct_change(new: Any, old: Any) -> Optional[float]:
    """Simple return (new - old) / old. Dimensionless, not percent."""
    return safe_div(_f(new) - _f(old) if _f(new) is not None and _f(old) is not None else None, old)


def cagr(end: Any, start: Any, years: Any) -> Optional[float]:
    e, s, y = _f(end), _f(start), _f(years)
    if e is None or s is None or y is None or s <= 0 or e <= 0 or y <= 0:
        return None
    return (e / s) ** (1.0 / y) - 1.0


# ---------------------------------------------------------------------------
# Valuation
# ---------------------------------------------------------------------------

def market_cap(ipo_price: Any, post_issue_shares: Any) -> Optional[float]:
    """Equity value at the IPO price: Price × post-issue shares."""
    p, s = _f(ipo_price), _f(post_issue_shares)
    if p is None or s is None:
        return None
    return p * s


def pe_ratio(price: Any, eps: Any) -> Optional[float]:
    """P/E. Undefined for non-positive earnings."""
    e = _f(eps)
    if e is None or e <= 0:
        return None
    return safe_div(price, e)


def pb_ratio(price: Any, book_value_ps: Any) -> Optional[float]:
    """P/B. Undefined for non-positive book."""
    b = _f(book_value_ps)
    if b is None or b <= 0:
        return None
    return safe_div(price, b)


def enterprise_value(equity: Any, debt: Any, cash: Any) -> Optional[float]:
    """EV = equity + debt - cash. Cash defaults to 0 if unknown (flag upstream)."""
    eq, d = _f(equity), _f(debt)
    c = _f(cash)
    if eq is None:
        return None
    return eq + (d or 0.0) - (c or 0.0)


def ev_ebitda(ev: Any, ebitda: Any) -> Optional[float]:
    e = _f(ebitda)
    if e is None or e <= 0:
        return None
    return safe_div(ev, e)


def ev_sales(ev: Any, sales: Any) -> Optional[float]:
    s = _f(sales)
    if s is None or s <= 0:
        return None
    return safe_div(ev, s)


def peg(pe: Any, earnings_growth: Any) -> Optional[float]:
    """PEG = P/E / growth. Growth as decimal (0.20 = 20%). Undefined if growth <= 0."""
    g = _f(earnings_growth)
    if g is None or g <= 0:
        return None
    return safe_div(pe, g * 100.0)  # conventional PEG uses growth in percent points


def peg_decimal(pe: Any, earnings_growth: Any) -> Optional[float]:
    """PEG using growth as a decimal, not percent. Prefer this internally."""
    g = _f(earnings_growth)
    if g is None or g <= 0:
        return None
    return safe_div(pe, g)


def premium_to_median(multiple: Any, peer_median: Any) -> Optional[float]:
    """(IPO multiple / peer median - 1). Not a quality judgement."""
    return pct_change(multiple, peer_median)


def roe(pat: Any, book_equity: Any) -> Optional[float]:
    b = _f(book_equity)
    if b is None or b <= 0:
        return None
    return safe_div(pat, b)


def roce(ebit: Any, capital_employed: Any) -> Optional[float]:
    c = _f(capital_employed)
    if c is None or c <= 0:
        return None
    return safe_div(ebit, c)


def debt_equity(debt: Any, equity: Any) -> Optional[float]:
    e = _f(equity)
    if e is None or e <= 0:
        return None
    d = _f(debt)
    if d is None:
        return None
    return d / e


def ebitda_margin(ebitda: Any, revenue: Any) -> Optional[float]:
    r = _f(revenue)
    if r is None or r <= 0:
        return None
    return safe_div(ebitda, r)


def pat_margin(pat: Any, revenue: Any) -> Optional[float]:
    r = _f(revenue)
    if r is None or r <= 0:
        return None
    return safe_div(pat, r)


def asset_turnover(revenue: Any, assets: Any) -> Optional[float]:
    a = _f(assets)
    if a is None or a <= 0:
        return None
    return safe_div(revenue, a)


def dilution(pre_promoter: Any, post_promoter: Any) -> Optional[float]:
    """Decline in promoter stake. Not the same as primary share issuance."""
    pre, post = _f(pre_promoter), _f(post_promoter)
    if pre is None or post is None:
        return None
    return pre - post


# ---------------------------------------------------------------------------
# GMP
# ---------------------------------------------------------------------------

def expected_listing_price(ipo_price: Any, gmp: Any) -> Optional[float]:
    p, g = _f(ipo_price), _f(gmp)
    if p is None or g is None:
        return None
    return p + g


def expected_listing_return(ipo_price: Any, gmp: Any) -> Optional[float]:
    """GMP / IPO price. Grey market implied simple return."""
    return safe_div(gmp, ipo_price)


def actual_listing_return(listing_price: Any, ipo_price: Any) -> Optional[float]:
    return pct_change(listing_price, ipo_price)


def gmp_prediction_error(actual_return: Any, gmp_implied_return: Any) -> Optional[float]:
    a, e = _f(actual_return), _f(gmp_implied_return)
    if a is None or e is None:
        return None
    return a - e


def mae(errors: list[float]) -> Optional[float]:
    xs = [x for x in errors if x is not None and not math.isnan(x)]
    if not xs:
        return None
    return float(np.mean(np.abs(xs)))


def rmse(errors: list[float]) -> Optional[float]:
    xs = [x for x in errors if x is not None and not math.isnan(x)]
    if not xs:
        return None
    return float(np.sqrt(np.mean(np.square(xs))))


def directional_accuracy(predicted: list, actual: list) -> Optional[float]:
    """Share of cases where sign(pred) == sign(actual). Zero is treated as non-positive."""
    n = 0
    hit = 0
    for p, a in zip(predicted, actual):
        p_, a_ = _f(p), _f(a)
        if p_ is None or a_ is None:
            continue
        n += 1
        if (p_ > 0 and a_ > 0) or (p_ <= 0 and a_ <= 0):
            hit += 1
    if n == 0:
        return None
    return hit / n


# ---------------------------------------------------------------------------
# Subscription microstructure
# ---------------------------------------------------------------------------

def velocity(current: Any, previous: Any) -> Optional[float]:
    c, p = _f(current), _f(previous)
    if c is None or p is None:
        return None
    return c - p


def acceleration(vel_t: Any, vel_t1: Any) -> Optional[float]:
    return velocity(vel_t, vel_t1)


def demand_concentration(qib: Any, nii: Any, retail: Any) -> Optional[dict]:
    q, n, r = _f(qib), _f(nii), _f(retail)
    parts = [x for x in (q, n, r) if x is not None and x > 0]
    if not parts:
        return None
    total = sum(parts)
    if total <= 0:
        return None
    return {
        "qib_share": (q or 0.0) / total,
        "nii_share": (n or 0.0) / total,
        "retail_share": (r or 0.0) / total,
        "hhi": sum(((x / total) ** 2) for x in parts),
    }


# ---------------------------------------------------------------------------
# Returns, risk, event study
# ---------------------------------------------------------------------------

def simple_return(end: Any, start: Any) -> Optional[float]:
    return pct_change(end, start)


def abnormal_return(r_i: Any, r_benchmark: Any) -> Optional[float]:
    """Market-adjusted AR_it = R_it - R_mt. Not a market-model residual unless beta=1."""
    ri, rb = _f(r_i), _f(r_benchmark)
    if ri is None or rb is None:
        return None
    return ri - rb


def car(abnormal_returns: list[float]) -> Optional[float]:
    xs = [_f(x) for x in abnormal_returns]
    if any(x is None for x in xs) or not xs:
        return None
    return float(sum(xs))  # type: ignore[arg-type]


def max_drawdown(prices: list[float]) -> Optional[float]:
    xs = [_f(p) for p in prices]
    if any(x is None for x in xs) or len(xs) < 2:
        return None
    peak = xs[0]
    mdd = 0.0
    for p in xs:
        peak = max(peak, p)  # type: ignore[arg-type]
        if peak and peak > 0:
            mdd = min(mdd, (p - peak) / peak)  # type: ignore[operator]
    return float(mdd)


def volatility(returns: list[float], annualize: int = 252) -> Optional[float]:
    xs = [_f(r) for r in returns]
    xs = [x for x in xs if x is not None]
    if len(xs) < 2:
        return None
    return float(np.std(xs, ddof=1) * math.sqrt(annualize))


def sharpe(returns: list[float], rf: float = 0.0, annualize: int = 252) -> Optional[float]:
    xs = [_f(r) for r in returns]
    xs = [x - rf / annualize for x in xs if x is not None]
    if len(xs) < 2:
        return None
    mu = float(np.mean(xs))
    sd = float(np.std(xs, ddof=1))
    if sd == 0:
        return None
    return (mu / sd) * math.sqrt(annualize)


def sortino(returns: list[float], rf: float = 0.0, annualize: int = 252) -> Optional[float]:
    xs = [_f(r) for r in returns]
    xs = [x - rf / annualize for x in xs if x is not None]
    if len(xs) < 2:
        return None
    mu = float(np.mean(xs))
    downside = [min(x, 0.0) for x in xs]
    dd = float(np.sqrt(np.mean(np.square(downside))))
    if dd == 0:
        return None
    return (mu / dd) * math.sqrt(annualize)


def beta_ols(asset_returns: list[float], market_returns: list[float]) -> Optional[float]:
    a = np.array([_f(x) for x in asset_returns], dtype=float)
    m = np.array([_f(x) for x in market_returns], dtype=float)
    mask = np.isfinite(a) & np.isfinite(m)
    if mask.sum() < 10:
        return None
    a, m = a[mask], m[mask]
    var_m = float(np.var(m, ddof=1))
    if var_m == 0:
        return None
    return float(np.cov(a, m, ddof=1)[0, 1] / var_m)


def wacc(cost_equity: Any, cost_debt: Any, equity_weight: Any, debt_weight: Any, tax: Any) -> Optional[float]:
    ke, kd, we, wd, t = _f(cost_equity), _f(cost_debt), _f(equity_weight), _f(debt_weight), _f(tax)
    if None in (ke, kd, we, wd, t):
        return None
    return we * ke + wd * kd * (1.0 - t)


def terminal_value_gordon(fcf_n1: Any, wacc: Any, g: Any) -> Optional[float]:
    f, w, g_ = _f(fcf_n1), _f(wacc), _f(g)
    if f is None or w is None or g_ is None:
        return None
    if w <= g_:
        return None
    return f / (w - g_)


def dcf_ev(fcfs: list[float], wacc_rate: Any, tv: Any) -> Optional[float]:
    w = _f(wacc_rate)
    t = _f(tv)
    if w is None or t is None or w <= -1:
        return None
    total = 0.0
    for i, f in enumerate(fcfs, start=1):
        fv = _f(f)
        if fv is None:
            return None
        total += fv / ((1.0 + w) ** i)
    n = len(fcfs)
    total += t / ((1.0 + w) ** n)
    return total


def fcf_from_components(
    nopat: Any, da: Any, capex: Any, delta_nwc: Any
) -> Optional[float]:
    """FCF = NOPAT + D&A - Capex - ΔNWC."""
    n, d, c, w = _f(nopat), _f(da), _f(capex), _f(delta_nwc)
    if n is None:
        return None
    return n + (d or 0.0) - (c or 0.0) - (w or 0.0)


FORMULAS: dict[str, dict[str, str]] = {
    "market_cap": {
        "name": "IPO implied equity value",
        "what": "The market capitalisation implied by applying the IPO price to post-issue shares.",
        "formula": "MarketCap = IPO Price × Post-Issue Shares",
        "why": "This is the equity value investors are asked to underwrite. It is not enterprise value.",
        "interpretation": "A high implied market cap is neither good nor bad; it must be judged against earnings, growth, capital intensity and listed peers.",
        "limitations": "Requires an accurate post-issue share count. OFS does not change post-issue shares the way a fresh issue does; mixing the two distorts dilution analysis.",
        "relationship": "Feeds P/E, P/B and the equity side of EV.",
    },
    "pe": {
        "name": "Price / Earnings",
        "what": "How many rupees of equity value are paid per rupee of current earnings.",
        "formula": "P/E = Price / EPS = MarketCap / PAT",
        "why": "Earnings-based valuation. Embeds growth, risk and payout expectations.",
        "interpretation": "A premium P/E can be compensation for higher expected growth or lower risk — or simply an expensive issue. Never interpret the multiple in isolation.",
        "limitations": "Undefined or misleading for losses, near-zero earnings, cyclical peaks, and accounting distortions. Trailing RHP earnings may not be run-rate.",
        "relationship": "PEG residualises growth. EV/EBITDA is more comparable across capital structures.",
    },
    "ev": {
        "name": "Enterprise value",
        "what": "Value of core operations, independent of how they are financed.",
        "formula": "EV = Equity Value + Debt − Cash",
        "why": "Needed for EV/EBITDA and EV/Sales. Makes levered and unlevered firms more comparable.",
        "interpretation": "EV is the theoretical takeover price of operations. Cash is subtracted because it is a non-operating asset.",
        "limitations": "RHP cash is often incomplete; leases, minority interest and pension deficits are frequently omitted here. Missing cash biases EV up.",
        "relationship": "Equity value is residual after net debt.",
    },
    "ev_ebitda": {
        "name": "EV / EBITDA",
        "what": "Operating value paid per unit of cash-like operating profit before depreciation.",
        "formula": "EV/EBITDA = EV / EBITDA",
        "why": "Standard for capital-intensive and M&A comps. Less distorted by depreciation policy than P/E.",
        "interpretation": "Useful when earnings are positive after D&A differences. Still a function of growth, margin and risk.",
        "limitations": "EBITDA is not cash. Ignores capex, working capital and tax. Distorted for financials and negative EBITDA issuers.",
        "relationship": "Complement to P/E; better across differing leverage.",
    },
    "pb": {
        "name": "Price / Book",
        "what": "Equity value relative to accounting net worth.",
        "formula": "P/B = Market Price / Book Value Per Share",
        "why": "Especially informative for banks, NBFCs and insurers, where book is closer to economic capital.",
        "interpretation": "P/B > 1 can mean expected ROE above cost of equity. For asset-light tech, book is often a weak value anchor.",
        "limitations": "Historical cost accounting, intangibles, and write-ups make book a noisy measure outside financials.",
        "relationship": "Justified P/B ≈ (ROE − g) / (r − g) in a simple residual-income model.",
    },
    "ev_sales": {
        "name": "EV / Sales",
        "what": "Operating value paid per unit of revenue.",
        "formula": "EV/Sales = EV / Revenue",
        "why": "Used when earnings are negative or early-stage, or when comparing high-growth low-margin businesses.",
        "interpretation": "A high EV/Sales requires a credible path to margins. Revenue quality (repeatable vs. one-off) matters.",
        "limitations": "Ignores profitability entirely. Inflated by channel stuffing or low-quality GMV.",
        "relationship": "EV/Sales × margin ≈ a crude EV/EBITDA if margins mean-revert.",
    },
    "peg": {
        "name": "PEG ratio",
        "what": "Growth-adjusted P/E.",
        "formula": "PEG = (P/E) / Earnings Growth",
        "why": "A mechanical attempt to not punish high-growth firms with high P/E.",
        "interpretation": "PEG near 1 is a heuristic, not a law. Growth must be sustainable and already not fully priced.",
        "limitations": "Sensitive to the growth window. Negative or tiny growth makes PEG undefined. Growth is not risk-free.",
        "relationship": "Does not replace DCF or a residual-income model.",
    },
    "gmp_expected_return": {
        "name": "GMP-implied listing return",
        "what": "The unofficial grey-market premium expressed as a simple return on issue price.",
        "formula": "Expected Listing Return = GMP / IPO Price",
        "why": "GMP is a price-discovery rumour mill. This converts the rupee premium into a return comparable with listing outcomes.",
        "interpretation": "It is an implied forecast, not a guaranteed listing price. Use only with error statistics.",
        "limitations": "Unofficial, thin, and possibly noisy. Trajectory (T-10…T-1) is often unpublished. Not a SEBI-regulated market.",
        "relationship": "Error = actual listing return − GMP-implied return. Directional accuracy is a separate question from magnitude.",
    },
    "gmp_error": {
        "name": "GMP prediction error",
        "what": "How far the grey-market implied return missed the realised listing return.",
        "formula": "Error = Actual Listing Return − GMP / IPO Price",
        "why": "Separates ‘GMP was high’ from ‘GMP was informative’.",
        "interpretation": "Positive error: listed above grey-market implication. Negative: listed cheaper than GMP. MAE/RMSE summarise magnitude; they are not manipulation tests.",
        "limitations": "Listing open vs close choice changes the error. Does not prove distortion.",
        "relationship": "Conditioning error on size, sector, regime and subscription is the research question.",
    },
    "subscription_velocity": {
        "name": "Subscription velocity",
        "what": "Day-to-day change in times subscribed.",
        "formula": "Velocity_t = Subscription_t − Subscription_(t−1)",
        "why": "Level of oversubscription is a stock; velocity is the flow of demand.",
        "interpretation": "Late QIB acceleration is a different economic event from early retail filling.",
        "limitations": "Indian books often fill explosively on the last day; missing day-3 prints bias velocity down.",
        "relationship": "Acceleration = Δ velocity. Test whether it predicts listing and post-listing returns — do not assume it.",
    },
    "ar": {
        "name": "Abnormal return",
        "what": "Return beyond a chosen expected-return model.",
        "formula": "AR_it = R_it − E(R_it); market-adjusted: R_it − R_mt",
        "why": "Listing pop is not alpha until a benchmark is subtracted.",
        "interpretation": "Market-adjusted AR assumes beta = 1. A market model with estimated beta is richer but needs a pre-event window IPOs do not have.",
        "limitations": "No pre-IPO return series exists, so beta is estimated post-listing (look-ahead if used on listing day). Sector indices are preferred when available.",
        "relationship": "CAR sums AR over a window. Alpha in a time-series regression is the intercept, not a one-day AR.",
    },
    "car": {
        "name": "Cumulative abnormal return",
        "what": "Sum of abnormal returns over an event window.",
        "formula": "CAR = Σ AR_it",
        "why": "Captures drift after listing, not just the first print.",
        "interpretation": "A positive listing-day AR that reverses in 30 days is a different story from persistent CAR.",
        "limitations": "Overlapping events, thin trading, and lock-up expiry contaminate windows. Survivorship if delisted names are dropped.",
        "relationship": "BHAR (buy-and-hold abnormal return) compounds rather than sums; both are shown when prices exist.",
    },
    "alpha": {
        "name": "Market / sector alpha",
        "what": "Simple excess return versus a benchmark over a holding period.",
        "formula": "Sector Alpha = R_company − R_sector; Market Alpha = R_company − R_nifty",
        "why": "IPO performance in a bull market is not skill.",
        "interpretation": "This is a subtractive alpha, not Jensen's alpha from a time-series regression, unless labelled as such.",
        "limitations": "Wrong sector map, missing index, and beta ≠ 1 all bias the number.",
        "relationship": "Beta scales expected market return in a market model.",
    },
    "sharpe": {
        "name": "Sharpe ratio",
        "what": "Excess return per unit of total volatility.",
        "formula": "Sharpe = √252 × mean(R − rf) / σ(R)",
        "why": "Compares strategies with different volatility.",
        "interpretation": "Sensitive to outliers and to the listing pop if the pop is inside the sample.",
        "limitations": "Assumes σ is the right risk. IPO strategies have jump risk and allotment risk that Sharpe ignores.",
        "relationship": "Sortino uses downside deviation instead of σ.",
    },
    "sortino": {
        "name": "Sortino ratio",
        "what": "Excess return per unit of downside deviation.",
        "formula": "Sortino = √252 × mean(R − rf) / downside deviation",
        "why": "IPO long strategies care more about left-tail listing flops than upside volatility.",
        "limitations": "Still a sample statistic. Sparse daily series after listing make it noisy.",
        "relationship": "Pair with maximum drawdown.",
    },
    "mdd": {
        "name": "Maximum drawdown",
        "what": "Worst peak-to-trough decline.",
        "formula": "MDD = min_t (P_t / max_{s≤t} P_s − 1)",
        "why": "Path risk, not just average return.",
        "limitations": "Depends on sampling frequency and the peak chosen. One IPO's MDD is not a portfolio MDD.",
        "relationship": "Used in the backtest lab with CAGR and hit rate.",
    },
    "dcf": {
        "name": "Discounted cash flow enterprise value",
        "what": "Present value of expected free cash flows plus terminal value.",
        "formula": "EV = Σ_t FCF_t / (1+WACC)^t + TV / (1+WACC)^n,  TV = FCF_{n+1} / (WACC − g)",
        "why": "The theoretically coherent way to ask what cash the business can return to capital providers.",
        "interpretation": "Output is only as good as FCF, WACC and g. With RHP-limited cash-flow detail, this terminal's DCF is a scenario laboratory, not an appraisal.",
        "limitations": "WACC ≤ g explodes TV. FCF often estimated from PAT when CFO/capex are missing — labelled MODEL OUTPUT. Terminal value usually dominates.",
        "relationship": "Equity value = EV − net debt. Fair value per share = equity / post-issue shares.",
    },
    "wacc": {
        "name": "Weighted average cost of capital",
        "what": "Blended required return on operating capital.",
        "formula": "WACC = we·ke + wd·kd·(1−t)",
        "why": "Discount rate for unlevered FCF.",
        "limitations": "IPO ke is not observed; we use a stated assumption (CAPM-like) and a sensitivity matrix. kd is not the coupon.",
        "relationship": "Higher WACC lowers DCF value non-linearly near the terminal growth gap.",
    },
    "correlation": {
        "name": "Pearson / Spearman association",
        "what": "Linear (Pearson) or rank (Spearman) co-movement.",
        "formula": "ρ = Cov(X,Y) / (σx σy); Spearman uses ranks",
        "why": "First look at whether GMP, subscription or valuation move with listing returns.",
        "interpretation": "Correlation is not causation. A significant ρ can be economically tiny.",
        "limitations": "Outliers, non-linearity, and regime mixing. Pairwise deletion changes the sample.",
        "relationship": "R² from a univariate OLS is Pearson ρ squared.",
    },
}
