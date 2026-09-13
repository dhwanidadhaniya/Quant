from __future__ import annotations

import numpy as np
import pandas as pd

TRADING_DAYS = 252
RF = 0.042


def to_returns(prices: pd.Series) -> pd.Series:
    return prices.pct_change().dropna()


def cagr(prices: pd.Series, periods: int = TRADING_DAYS) -> float:
    if len(prices) < 2 or prices.iloc[0] <= 0:
        return 0.0
    n = len(prices) / periods
    return float((prices.iloc[-1] / prices.iloc[0]) ** (1 / max(n, 1e-9)) - 1)


def ann_vol(returns: pd.Series, periods: int = TRADING_DAYS) -> float:
    if returns.empty:
        return 0.0
    return float(returns.std() * np.sqrt(periods))


def sharpe(returns: pd.Series, rf: float = RF, periods: int = TRADING_DAYS) -> float:
    v = ann_vol(returns, periods)
    if v == 0:
        return 0.0
    return float((returns.mean() * periods - rf) / v)


def sortino(returns: pd.Series, rf: float = RF, periods: int = TRADING_DAYS) -> float:
    downside = returns[returns < 0]
    dd = float(downside.std() * np.sqrt(periods)) if len(downside) else 0.0
    if dd == 0:
        return 0.0
    return float((returns.mean() * periods - rf) / dd)


def max_drawdown(prices: pd.Series) -> float:
    if prices.empty:
        return 0.0
    eq = prices / prices.iloc[0]
    return float((eq / eq.cummax() - 1).min())


def beta_alpha(port: pd.Series, bench: pd.Series, rf: float = RF, periods: int = TRADING_DAYS):
    df = pd.concat([port.rename("p"), bench.rename("b")], axis=1).dropna()
    if len(df) < 20:
        return 1.0, 0.0
    cov = np.cov(df["p"], df["b"])[0, 1]
    var = np.var(df["b"])
    b = float(cov / var) if var else 1.0
    rp = df["p"].mean() * periods
    rm = df["b"].mean() * periods
    a = rp - (rf + b * (rm - rf))
    return b, float(a)


def treynor(returns: pd.Series, beta: float, rf: float = RF, periods: int = TRADING_DAYS) -> float:
    if not beta:
        return 0.0
    return float((returns.mean() * periods - rf) / beta)


def tracking_error(port: pd.Series, bench: pd.Series, periods: int = TRADING_DAYS) -> float:
    df = pd.concat([port.rename("p"), bench.rename("b")], axis=1).dropna()
    if df.empty:
        return 0.0
    return float((df["p"] - df["b"]).std() * np.sqrt(periods))


def information_ratio(port: pd.Series, bench: pd.Series, periods: int = TRADING_DAYS) -> float:
    te = tracking_error(port, bench, periods)
    if te == 0:
        return 0.0
    df = pd.concat([port.rename("p"), bench.rename("b")], axis=1).dropna()
    return float(((df["p"] - df["b"]).mean() * periods) / te)


def var_cvar(returns: pd.Series, level: float = 0.95):
    if returns.empty:
        return 0.0, 0.0
    q = float(returns.quantile(1 - level))
    tail = returns[returns <= q]
    cvar = float(tail.mean()) if len(tail) else q
    return q, cvar


def win_rate(returns: pd.Series) -> float:
    if returns.empty:
        return 0.0
    return float((returns > 0).mean())


def summarise_equity(prices: pd.Series, bench: pd.Series | None = None, rf: float = RF) -> dict:
    rets = to_returns(prices)
    b_rets = to_returns(bench) if bench is not None and len(bench) else None
    b, a = beta_alpha(rets, b_rets, rf) if b_rets is not None else (None, None)
    te = tracking_error(rets, b_rets) if b_rets is not None else None
    ir = information_ratio(rets, b_rets) if b_rets is not None else None
    v, cv = var_cvar(rets)
    return {
        "cagr": cagr(prices),
        "volatility": ann_vol(rets),
        "sharpe": sharpe(rets, rf),
        "sortino": sortino(rets, rf),
        "max_drawdown": max_drawdown(prices),
        "beta": b,
        "alpha": a,
        "treynor": treynor(rets, b) if b else None,
        "tracking_error": te,
        "information_ratio": ir,
        "var_95": v,
        "cvar_95": cv,
        "win_rate": win_rate(rets),
        "total_return": float(prices.iloc[-1] / prices.iloc[0] - 1) if len(prices) > 1 else 0.0,
    }
