"""DCF laboratory — scenario engine, not an appraisal.

Theory
------
Enterprise value is the present value of expected free cash flows to the firm,
discounted at WACC, plus a terminal value. Equity value is EV minus net debt.

Because RHP extracts in this dataset rarely include a full CFO / capex / NWC
bridge, the default FCF path is a *stated* conversion of PAT:

    FCF_t ≈ PAT_t × (1 − reinvestment_rate)

This is MODEL OUTPUT. It is useful for asking how sensitive price is to growth,
margin and WACC — not for claiming a precise intrinsic value.
"""
from __future__ import annotations

from typing import Any, Optional

from .formulas import _f, dcf_ev, terminal_value_gordon, wacc as wacc_fn


SCENARIOS = {
    "BEAR": {
        "growth": 0.04,
        "reinvestment": 0.55,
        "wacc": 0.14,
        "terminal_g": 0.03,
        "pat_margin_delta": -0.02,
    },
    "BASE": {
        "growth": 0.10,
        "reinvestment": 0.40,
        "wacc": 0.12,
        "terminal_g": 0.04,
        "pat_margin_delta": 0.0,
    },
    "BULL": {
        "growth": 0.18,
        "reinvestment": 0.28,
        "wacc": 0.10,
        "terminal_g": 0.05,
        "pat_margin_delta": 0.02,
    },
}


def project_pat(pat0: float, growth: float, years: int = 5) -> list[float]:
    out = []
    level = pat0
    for _ in range(years):
        level = level * (1.0 + growth)
        out.append(level)
    return out


def run_dcf(
    *,
    revenue0: Optional[float],
    pat0: Optional[float],
    net_debt: Optional[float],
    post_issue_shares: Optional[float],
    ipo_price: Optional[float],
    horizon: int = 5,
    overrides: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Build BULL/BASE/BEAR DCF plus WACC×g and growth×margin matrices."""
    r0, p0 = _f(revenue0), _f(pat0)
    notes = [
        "FCF is modelled as PAT × (1 − reinvestment). This is not a reported cash-flow statement.",
        "WACC and terminal growth are assumptions, not estimated costs of capital.",
        "If PAT ≤ 0, DCF is not computed — a loss-making IPO needs an explicit revenue-to-margin path the RHP extract does not provide.",
    ]
    if p0 is None or p0 <= 0:
        return {
            "status": "undefined",
            "reason": "Non-positive PAT — DCF from earnings conversion is not economically defined.",
            "notes": notes,
            "scenarios": {},
            "wacc_g_matrix": [],
            "growth_margin_matrix": [],
        }

    margin0 = (p0 / r0) if (r0 and r0 > 0) else None
    scenarios_out = {}
    for name, cfg in SCENARIOS.items():
        c = dict(cfg)
        if overrides and name == "BASE":
            c.update({k: v for k, v in overrides.items() if v is not None})
        pats = project_pat(p0, c["growth"], horizon)
        if margin0 is not None:
            # apply margin delta on a revenue path growing at the same rate
            revs = project_pat(r0, c["growth"], horizon) if r0 and r0 > 0 else None
            if revs:
                pats = [max(rev * (margin0 + c["pat_margin_delta"]), -abs(p0) * 4) for rev in revs]
        fcfs = [pat * (1.0 - c["reinvestment"]) for pat in pats]
        fcf_n1 = fcfs[-1] * (1.0 + c["terminal_g"])
        tv = terminal_value_gordon(fcf_n1, c["wacc"], c["terminal_g"])
        ev = dcf_ev(fcfs, c["wacc"], tv) if tv is not None else None
        equity = None if ev is None else ev - (net_debt or 0.0)
        fvps = None
        if equity is not None and post_issue_shares and post_issue_shares > 0:
            fvps = (equity * 1e7) / post_issue_shares
        upside = None
        if fvps is not None and ipo_price:
            upside = fvps / ipo_price - 1.0
        scenarios_out[name] = {
            "growth": c["growth"],
            "reinvestment": c["reinvestment"],
            "wacc": c["wacc"],
            "terminal_g": c["terminal_g"],
            "pat_path": pats,
            "fcf_path": fcfs,
            "terminal_value": tv,
            "enterprise_value": ev,
            "equity_value": equity,
            "fair_value_per_share": fvps,
            "implied_upside_vs_ipo": upside,
            "data_type": "MODEL OUTPUT",
        }

    wacc_grid = [0.09, 0.10, 0.11, 0.12, 0.13, 0.14, 0.15]
    g_grid = [0.02, 0.03, 0.04, 0.05, 0.06]
    matrix = []
    base_fcfs = scenarios_out["BASE"]["fcf_path"]
    for w in wacc_grid:
        row = []
        for g in g_grid:
            tv = terminal_value_gordon(base_fcfs[-1] * (1 + g), w, g)
            ev = dcf_ev(base_fcfs, w, tv) if tv is not None else None
            fvps = None
            if ev is not None and post_issue_shares and post_issue_shares > 0:
                fvps = ((ev - (net_debt or 0.0)) * 1e7) / post_issue_shares
            row.append({"wacc": w, "g": g, "fvps": fvps})
        matrix.append(row)

    gm = []
    growths = [0.04, 0.08, 0.12, 0.16, 0.20]
    margin_deltas = [-0.03, -0.01, 0.0, 0.01, 0.03]
    base_w = SCENARIOS["BASE"]["wacc"]
    base_g = SCENARIOS["BASE"]["terminal_g"]
    base_re = SCENARIOS["BASE"]["reinvestment"]
    for gr in growths:
        row = []
        for md in margin_deltas:
            if r0 and r0 > 0 and margin0 is not None:
                revs = project_pat(r0, gr, horizon)
                pats = [rev * (margin0 + md) for rev in revs]
            else:
                pats = project_pat(p0, gr, horizon)
            fcfs = [pat * (1 - base_re) for pat in pats]
            tv = terminal_value_gordon(fcfs[-1] * (1 + base_g), base_w, base_g)
            ev = dcf_ev(fcfs, base_w, tv) if tv is not None else None
            fvps = None
            if ev is not None and post_issue_shares and post_issue_shares > 0:
                fvps = ((ev - (net_debt or 0.0)) * 1e7) / post_issue_shares
            row.append({"growth": gr, "margin_delta": md, "fvps": fvps})
        gm.append(row)

    return {
        "status": "ok",
        "notes": notes,
        "pat0": p0,
        "revenue0": r0,
        "margin0": margin0,
        "net_debt": net_debt,
        "scenarios": scenarios_out,
        "wacc_g_matrix": matrix,
        "growth_margin_matrix": gm,
        "data_type": "MODEL OUTPUT",
    }
