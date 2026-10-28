"""Valuation multiples from IPO price and RHP-scale financials."""
from __future__ import annotations

from typing import Any, Optional

from .formulas import (
    _f,
    asset_turnover,
    debt_equity,
    enterprise_value,
    ev_ebitda,
    ev_sales,
    market_cap,
    pat_margin,
    pb_ratio,
    pe_ratio,
    peg as peg_ratio,
    premium_to_median,
    roe,
)


def valuation_pack(
    *,
    ipo_price: Optional[float],
    post_issue_shares: Optional[float],
    pat_cr: Optional[float],
    revenue_cr: Optional[float],
    book_cr: Optional[float],
    debt_cr: Optional[float],
    cash_cr: Optional[float],
    ebitda_cr: Optional[float],
    pat_growth: Optional[float],
    peer_pe: Optional[float],
    peer_evs: Optional[float],
    peer_pb: Optional[float],
    cash_estimated: bool,
) -> dict[str, Any]:
    """
    Financials are in ₹ crore. Shares are whole shares.
    PAT_cr * 1e7 / shares = EPS in ₹ if PAT is crore.
    """
    mcap = market_cap(ipo_price, post_issue_shares)  # ₹
    mcap_cr = mcap / 1e7 if mcap is not None else None
    eps = None
    bvps = None
    if post_issue_shares and post_issue_shares > 0:
        if pat_cr is not None:
            eps = (pat_cr * 1e7) / post_issue_shares
        if book_cr is not None:
            bvps = (book_cr * 1e7) / post_issue_shares

    pe = pe_ratio(ipo_price, eps)
    pb = pb_ratio(ipo_price, bvps)
    ev = None
    if mcap_cr is not None:
        ev = enterprise_value(mcap_cr, debt_cr, cash_cr if cash_cr is not None else 0.0)
    eveb = ev_ebitda(ev, ebitda_cr) if ebitda_cr else None
    evs = ev_sales(ev, revenue_cr)
    peg_v = peg_ratio(pe, pat_growth)

    flags = []
    if cash_cr is None:
        flags.append("Cash assumed 0 in EV — EV is biased upward. Labelled ESTIMATED.")
    if ebitda_cr is None:
        flags.append("EBITDA not in extract — EV/EBITDA withheld rather than reverse-engineered from PAT.")
    if eps is not None and eps <= 0:
        flags.append("Non-positive EPS — P/E undefined.")

    return {
        "market_cap_rs": mcap,
        "market_cap_cr": mcap_cr,
        "eps": eps,
        "bvps": bvps,
        "pe": pe,
        "pb": pb,
        "ev_cr": ev,
        "ev_ebitda": eveb,
        "ev_sales": evs,
        "peg": peg_v,
        "pat_margin": pat_margin(pat_cr, revenue_cr),
        "roe": roe(pat_cr, book_cr),
        "de_ratio": debt_equity(debt_cr, book_cr),
        "asset_turnover": asset_turnover(revenue_cr, None),
        "pe_premium": premium_to_median(pe, peer_pe),
        "evs_premium": premium_to_median(evs, peer_evs),
        "pb_premium": premium_to_median(pb, peer_pb),
        "peer_pe": peer_pe,
        "peer_ev_sales": peer_evs,
        "peer_pb": peer_pb,
        "flags": flags,
        "cash_policy": "ESTIMATED=0" if cash_estimated or cash_cr is None else "ACTUAL",
    }
