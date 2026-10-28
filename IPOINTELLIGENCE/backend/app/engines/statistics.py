"""Statistical research engine.

Pearson, Spearman, OLS with robust HC3 errors, residual diagnostics.
Correlation is not causation. Statistical significance is not economic significance.
"""
from __future__ import annotations

from typing import Any, Optional

import numpy as np
import pandas as pd
import statsmodels.api as sm

from .formulas import _f
from .gmp import spearman as spearman_arr


def pearson(x: list, y: list) -> Optional[float]:
    pairs = [(_f(a), _f(b)) for a, b in zip(x, y)]
    pairs = [(a, b) for a, b in pairs if a is not None and b is not None]
    if len(pairs) < 5:
        return None
    ax = np.array([p[0] for p in pairs])
    ay = np.array([p[1] for p in pairs])
    if np.std(ax) == 0 or np.std(ay) == 0:
        return None
    return float(np.corrcoef(ax, ay)[0, 1])


def spearman(x: list, y: list) -> Optional[float]:
    pairs = [(_f(a), _f(b)) for a, b in zip(x, y)]
    pairs = [(a, b) for a, b in pairs if a is not None and b is not None]
    if len(pairs) < 5:
        return None
    return spearman_arr(np.array([p[0] for p in pairs]), np.array([p[1] for p in pairs]))


def ols_univariate(x: list, y: list, x_name: str, y_name: str) -> dict[str, Any]:
    df = pd.DataFrame({"x": x, "y": y}).dropna()
    n = len(df)
    if n < 8:
        return {"status": "insufficient", "n": n, "x": x_name, "y": y_name}
    X = sm.add_constant(df["x"].astype(float))
    model = sm.OLS(df["y"].astype(float), X).fit(cov_type="HC3")
    resid = model.resid
    return {
        "status": "ok",
        "n": n,
        "x": x_name,
        "y": y_name,
        "alpha": float(model.params.iloc[0]),
        "beta": float(model.params.iloc[1]),
        "se_alpha": float(model.bse.iloc[0]),
        "se_beta": float(model.bse.iloc[1]),
        "p_alpha": float(model.pvalues.iloc[0]),
        "p_beta": float(model.pvalues.iloc[1]),
        "r2": float(model.rsquared),
        "adj_r2": float(model.rsquared_adj),
        "ci_beta": [float(model.conf_int().iloc[1, 0]), float(model.conf_int().iloc[1, 1])],
        "residuals_mean": float(resid.mean()),
        "residuals_std": float(resid.std()),
        "interpretation": _interpret_ols(x_name, y_name, float(model.params.iloc[1]), float(model.pvalues.iloc[1]), float(model.rsquared), n),
        "caveats": [
            "HC3 robust standard errors relax homoskedasticity; they do not create identification.",
            "A low p-value does not imply a tradable edge after costs, allotment and multiple testing.",
            "Cross-sectional IPO OLS has clustered time effects (IPO waves).",
        ],
    }


def _interpret_ols(x: str, y: str, beta: float, p: float, r2: float, n: int) -> str:
    sig = "is statistically distinguishable from zero at 5%" if p < 0.05 else "is not statistically distinguishable from zero at 5%"
    return (
        f"A 1-unit increase in {x} is associated with a {beta:.4f} change in {y} "
        f"(n={n}, R²={r2:.3f}). The slope {sig}. This is an association, not a causal claim."
    )


def correlation_matrix(df: pd.DataFrame, cols: list[str]) -> dict[str, Any]:
    use = [c for c in cols if c in df.columns]
    sub = df[use].apply(pd.to_numeric, errors="coerce")
    pear = sub.corr(method="pearson")
    spear = sub.corr(method="spearman")
    return {
        "columns": use,
        "pearson": pear.replace({np.nan: None}).to_dict(),
        "spearman": spear.replace({np.nan: None}).to_dict(),
        "n_pairwise": {c: int(sub[c].notna().sum()) for c in use},
        "note": "Pairwise complete observations. Correlation ≠ causation.",
    }


def demand_relationships(df: pd.DataFrame) -> dict[str, Any]:
    """Which investor book relates to GMP, listing, 30D, 90D, 1Y alpha? Test, don't assume QIB is superior."""
    targets = ["gmp_pct", "listing_return", "ret_30d", "ret_90d", "alpha_1y"]
    features = ["sub_qib", "sub_nii", "sub_retail", "sub_total"]
    out = {}
    for t in targets:
        out[t] = {}
        for f in features:
            if t not in df.columns or f not in df.columns:
                continue
            out[t][f] = {
                "pearson": pearson(df[f].tolist(), df[t].tolist()),
                "spearman": spearman(df[f].tolist(), df[t].tolist()),
                "ols": ols_univariate(df[f].tolist(), df[t].tolist(), f, t),
            }
    return {
        "results": out,
        "interpretation": (
            "Do not assume QIB demand is automatically the smart-money signal. "
            "Compare coefficients and R² across QIB, NII and retail for each horizon. "
            "Last-day QIB prints are often missing, which can mechanically weaken the QIB column."
        ),
    }
