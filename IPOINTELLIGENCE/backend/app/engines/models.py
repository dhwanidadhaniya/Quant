"""Expected-performance models with a time-based split.

Training uses IPOs listed before a cutoff; testing uses later listings.
Random K-fold would leak future IPO waves into the past — we refuse that.

Targets: listing return, 30D, 90D, 180D, 1Y market alpha.
Features are pre-listing observables only.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import accuracy_score, mean_absolute_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

FEATURES = [
    "gmp_pct",
    "sub_total",
    "sub_qib",
    "sub_nii",
    "sub_retail",
    "pe",
    "pe_premium",
    "ev_sales",
    "rev_growth",
    "pat_growth",
    "roe",
    "de_ratio",
    "issue_size_cr",
    "nifty_m",
    "vix_level",
]


def _xy(df: pd.DataFrame, target: str) -> tuple[pd.DataFrame, pd.Series, pd.Series]:
    cols = [c for c in FEATURES if c in df.columns]
    work = df.dropna(subset=["listing_date"]).copy()
    work = work.sort_values("listing_date")
    y = pd.to_numeric(work[target], errors="coerce") if target in work.columns else pd.Series(dtype=float)
    X = work[cols].apply(pd.to_numeric, errors="coerce")
    mask = y.notna()
    return X.loc[mask], y.loc[mask], work.loc[mask, "listing_date"]


def time_split(dates: pd.Series, frac: float = 0.75) -> tuple[np.ndarray, np.ndarray]:
    n = len(dates)
    cut = max(int(n * frac), 10)
    idx = np.arange(n)
    return idx[:cut], idx[cut:]


def train_models(df: pd.DataFrame, target: str = "listing_return") -> dict[str, Any]:
    X, y, dates = _xy(df, target)
    n = len(y)
    if n < 40:
        return {"status": "insufficient", "n": n, "target": target}

    tr, te = time_split(dates)
    Xtr, Xte = X.iloc[tr], X.iloc[te]
    ytr, yte = y.iloc[tr], y.iloc[te]

    def pipe(est):
        return Pipeline(
            [
                ("impute", SimpleImputer(strategy="median")),
                ("scale", StandardScaler()),
                ("est", est),
            ]
        )

    models = {
        "ols": pipe(LinearRegression()),
        "random_forest": pipe(RandomForestRegressor(n_estimators=250, min_samples_leaf=8, random_state=7, max_depth=6)),
        "gbrt": pipe(GradientBoostingRegressor(n_estimators=120, max_depth=2, learning_rate=0.05, random_state=7)),
    }
    reports = {}
    for name, model in models.items():
        model.fit(Xtr, ytr)
        pred_tr = model.predict(Xtr)
        pred_te = model.predict(Xte)
        est = model.named_steps["est"]
        importance = None
        if hasattr(est, "feature_importances_"):
            importance = dict(zip(X.columns, [float(v) for v in est.feature_importances_]))
        elif hasattr(est, "coef_"):
            importance = dict(zip(X.columns, [float(v) for v in np.abs(est.coef_)]))
        reports[name] = {
            "train_r2": float(r2_score(ytr, pred_tr)),
            "test_r2": float(r2_score(yte, pred_te)) if len(yte) > 2 else None,
            "train_mae": float(mean_absolute_error(ytr, pred_tr)),
            "test_mae": float(mean_absolute_error(yte, pred_te)) if len(yte) else None,
            "feature_importance": importance,
            "n_train": int(len(ytr)),
            "n_test": int(len(yte)),
            "overfit_gap": float(r2_score(ytr, pred_tr) - (r2_score(yte, pred_te) if len(yte) > 2 else 0)),
        }

    # logistic: listing pop sign
    ybin = (y > 0).astype(int)
    ybtr, ybte = ybin.iloc[tr], ybin.iloc[te]
    logit = pipe(LogisticRegression(max_iter=400))
    logit.fit(Xtr, ybtr)
    acc_tr = float(accuracy_score(ybtr, logit.predict(Xtr)))
    acc_te = float(accuracy_score(ybte, logit.predict(Xte))) if len(ybte) else None

    return {
        "status": "ok",
        "target": target,
        "features": list(X.columns),
        "split": "chronological 75/25 by listing date — later IPOs are out of sample",
        "models": reports,
        "logistic_up_listing": {"train_acc": acc_tr, "test_acc": acc_te},
        "leakage_controls": [
            "No post-listing return is used as a feature.",
            "Split is by listing date, not random rows.",
            "Imputation medians are fit on the training fold only (via pipeline).",
            "Tree depth and min_samples_leaf are constrained to reduce memorising IPO waves.",
        ],
        "interpretation": (
            "If test R² collapses while train R² is high, the model overfit the IPO cycle. "
            "Feature importance is associative. Economic significance still requires a backtest with allotment and costs."
        ),
    }


def predict_one(df: pd.DataFrame, ipo_id: str, target: str = "listing_return") -> dict[str, Any]:
    fitted = train_models(df, target)
    if fitted.get("status") != "ok":
        return fitted
    row = df[df["id"] == ipo_id]
    if row.empty:
        return {"status": "missing"}
    X, y, dates = _xy(df, target)
    tr, te = time_split(dates)
    model = Pipeline(
        [
            ("impute", SimpleImputer(strategy="median")),
            ("scale", StandardScaler()),
            ("est", LinearRegression()),
        ]
    )
    model.fit(X.iloc[tr], y.iloc[tr])
    cols = list(X.columns)
    x = row[cols].apply(pd.to_numeric, errors="coerce")
    pred = float(model.predict(x)[0])
    return {"status": "ok", "target": target, "predicted": pred, "model": "ols_oos_pipeline", "data_type": "MODEL OUTPUT"}
