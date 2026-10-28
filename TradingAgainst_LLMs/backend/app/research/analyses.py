from __future__ import annotations

import numpy as np
import statsmodels.api as sm
from scipy import stats

from app.mathutil import dist_to_multiple


def _finite(values) -> np.ndarray:
    x = np.asarray(list(values), dtype=float)
    return x[np.isfinite(x)]


def _pack(
    *,
    test_id: str,
    title: str,
    null_hypothesis: str,
    alternative: str,
    n: int,
    statistic_name: str | None,
    statistic: float | None,
    p_value: float | None,
    effect_size_name: str | None,
    effect_size: float | None,
    estimate_name: str | None,
    estimate: float | None,
    ci_low: float | None,
    ci_high: float | None,
    insufficient_data: bool,
    interpretation: str,
    series: dict | None = None,
    extra: dict | None = None,
) -> dict:
    payload = {
        "id": test_id,
        "title": title,
        "null_hypothesis": null_hypothesis,
        "alternative": alternative,
        "n": int(n),
        "statistic_name": statistic_name,
        "statistic": statistic,
        "p_value": p_value,
        "effect_size_name": effect_size_name,
        "effect_size": effect_size,
        "ci95": {
            "estimate_name": estimate_name,
            "estimate": estimate,
            "low": ci_low,
            "high": ci_high,
        },
        "insufficient_data": insufficient_data,
        "interpretation": interpretation,
        "series": series or {},
    }
    if extra:
        payload["extra"] = extra
    return payload


def _mean_ci(x: np.ndarray) -> tuple[float, float, float, float]:
    mean = float(x.mean())
    if len(x) < 2:
        return mean, 0.0, mean, mean
    se = float(stats.sem(x))
    if se == 0:
        return mean, 0.0, mean, mean
    tcrit = float(stats.t.ppf(0.975, len(x) - 1))
    return mean, se, mean - tcrit * se, mean + tcrit * se


def _accepted_quotes(sessions: list[dict]):
    rows = []
    for session in sessions:
        prev_mid = None
        opening = None
        for rnd in session["rounds"]:
            if rnd["round"] == 0:
                opening_here = None
            else:
                opening_here = opening
            for quote in rnd["quotes"]:
                if not quote.get("accepted"):
                    continue
                if quote.get("bid") is None or quote.get("ask") is None:
                    continue
                rows.append(
                    {
                        "session_id": session["id"],
                        "round": rnd["round"],
                        "true_value": rnd["true_value"],
                        "news_event": rnd["news_event"],
                        "news_magnitude": rnd["news_magnitude"],
                        "mid": (quote["bid"] + quote["ask"]) / 2,
                        "spread": quote["ask"] - quote["bid"],
                        "signal": quote["private_signal"],
                        "inventory": quote["inventory"],
                        "agent_id": quote["agent_id"],
                        "prev_mid": quote.get("prev_midpoint"),
                        "last_trade": quote.get("last_trade"),
                        "opening": quote.get("opening_midpoint", opening_here),
                    }
                )
            book_mid = rnd["book"]["midpoint"]
            if rnd["round"] == 0 and book_mid is not None:
                opening = book_mid
            prev_mid = book_mid if book_mid is not None else prev_mid
    return rows


def _hist(values: np.ndarray, bins: int = 21) -> dict:
    if len(values) == 0:
        return {"counts": [], "edges": []}
    counts, edges = np.histogram(values, bins=bins)
    return {"counts": [int(c) for c in counts], "edges": [float(e) for e in edges]}


def round_number_anchoring(rows: list[dict], multiple: float = 5.0) -> dict:
    if len(rows) < 30:
        return _pack(
            test_id="round_number_anchoring",
            title="Round-number anchoring",
            null_hypothesis="Quote midpoints are no closer to round numbers than the private signals that produced them.",
            alternative="Quote midpoints sit closer to multiples of 5 than their private signals.",
            n=len(rows),
            statistic_name=None,
            statistic=None,
            p_value=None,
            effect_size_name=None,
            effect_size=None,
            estimate_name="mean excess proximity",
            estimate=None,
            ci_low=None,
            ci_high=None,
            insufficient_data=True,
            interpretation="Fewer than 30 accepted quotes. The anchoring tests are not reported.",
        )
    d_quote = np.array([dist_to_multiple(r["mid"], multiple) for r in rows])
    d_signal = np.array([dist_to_multiple(r["signal"], multiple) for r in rows])
    excess = d_signal - d_quote
    mean, se, lo, hi = _mean_ci(excess)
    std = float(excess.std(ddof=1))
    if std < 1e-12:
        t_stat = None
        p_value = None
        cohen = None
        interpretation = "Excess proximity has no sample variance, so the t-test is undefined."
    else:
        t_stat = float(mean / (std / np.sqrt(len(excess))))
        p_value = float(stats.t.sf(t_stat, len(excess) - 1))
        cohen = float(mean / std)
        interpretation = (
            f"Mean excess proximity to multiples of {multiple:g} is {mean:.3f} "
            f"(95% CI {lo:.3f} to {hi:.3f}, n={len(excess)}). "
            f"One-sided t-test of mean excess > 0: t={t_stat:.3f}, p={p_value:.4g}, Cohen's d={cohen:.3f}. "
            "Positive excess means quotes are closer to the grid than the private signals."
        )
    bins = [0.0, 0.25, 0.5, 1.0, 1.5, 2.5]
    q_counts, _ = np.histogram(d_quote, bins=bins)
    s_counts, _ = np.histogram(d_signal, bins=bins)
    chi2 = None
    chi_p = None
    cramer = None
    low_expected = False
    mask = (q_counts + s_counts) > 0
    obs = q_counts[mask].astype(float)
    ref = s_counts[mask].astype(float)
    if ref.sum() > 0 and obs.sum() > 0 and len(obs) >= 2:
        expected = ref / ref.sum() * obs.sum()
        low_expected = bool(np.any(expected < 5))
        if np.all(expected > 0):
            chi2_stat, chi_p_raw = stats.chisquare(obs, expected)
            chi2 = float(chi2_stat)
            chi_p = float(chi_p_raw)
            k = len(obs)
            cramer = float(np.sqrt(chi2 / (obs.sum() * (k - 1))))
            interpretation += (
                f" Chi-square goodness of fit of quote distances against the private-signal distance distribution: "
                f"chi2={chi2:.3f}, df={k - 1}, p={chi_p:.4g}, Cramer's V={cramer:.3f}."
            )
            if low_expected:
                interpretation += " Some expected bin counts are below 5, so the chi-square approximation is rough."
    d10_q = np.array([dist_to_multiple(r["mid"], 10.0) for r in rows])
    d10_s = np.array([dist_to_multiple(r["signal"], 10.0) for r in rows])
    excess10 = d10_s - d10_q
    mean10, _, lo10, hi10 = _mean_ci(excess10)
    return _pack(
        test_id="round_number_anchoring",
        title="Round-number anchoring",
        null_hypothesis="Quote midpoints are no closer to multiples of 5 than the private signals that produced them.",
        alternative="Quote midpoints sit closer to multiples of 5 than their private signals.",
        n=len(rows),
        statistic_name="t",
        statistic=t_stat,
        p_value=p_value,
        effect_size_name="Cohen's d",
        effect_size=cohen,
        estimate_name="mean excess proximity to multiples of 5",
        estimate=mean,
        ci_low=lo,
        ci_high=hi,
        insufficient_data=False,
        interpretation=interpretation,
        series={"excess_proximity": _hist(excess)},
        extra={
            "chi_square": chi2,
            "chi_square_p_value": chi_p,
            "chi_square_df": None if chi2 is None else int(max(len(obs) - 1, 0)),
            "cramers_v": cramer,
            "low_expected_counts": low_expected,
            "multiple_10": {
                "mean_excess": mean10,
                "ci95_low": lo10,
                "ci95_high": hi10,
            },
            "mean_quote_distance": float(d_quote.mean()),
            "mean_signal_distance": float(d_signal.mean()),
        },
    )


def overconfidence(rows: list[dict]) -> dict:
    title = "Overconfidence"
    null = "Mean half-spread equals mean absolute distance from quote midpoint to hidden value."
    alt = "Half-spreads are tighter than realized absolute errors."
    if len(rows) < 30:
        return _pack(
            test_id="overconfidence",
            title=title,
            null_hypothesis=null,
            alternative=alt,
            n=len(rows),
            statistic_name=None,
            statistic=None,
            p_value=None,
            effect_size_name=None,
            effect_size=None,
            estimate_name="mean half-spread minus absolute error",
            estimate=None,
            ci_low=None,
            ci_high=None,
            insufficient_data=True,
            interpretation="Fewer than 30 accepted quotes. The calibration test is not reported.",
        )
    half = np.array([r["spread"] / 2 for r in rows])
    err = np.array([abs(r["mid"] - r["true_value"]) for r in rows])
    diff = half - err
    mean, _, lo, hi = _mean_ci(diff)
    std = float(diff.std(ddof=1))
    ratio = float(err.mean() / half.mean()) if half.mean() else None
    if std < 1e-12:
        t_stat, cohen = None, None
        p_value = 0.0 if mean < 0 else (1.0 if mean > 0 else None)
        text = (
            f"Mean half-spread is {half.mean():.3f}. Mean absolute error is {err.mean():.3f}. "
            f"The gap is constant at {mean:.3f}, so a t statistic is undefined. "
            f"Error / half-spread = {ratio:.3f}."
        )
    else:
        t_stat = float(mean / (std / np.sqrt(len(diff))))
        p_value = float(stats.t.cdf(t_stat, len(diff) - 1))
        cohen = float(mean / std)
        ratio = float(err.mean() / half.mean()) if half.mean() else None
        text = (
            f"Mean half-spread is {half.mean():.3f} (median {np.median(half):.3f}). "
            f"Mean absolute midpoint error versus hidden value is {err.mean():.3f} (median {np.median(err):.3f}). "
            f"Mean gap (half-spread minus error) is {mean:.3f} (95% CI {lo:.3f} to {hi:.3f}). "
            f"One-sided t-test of gap < 0: t={t_stat:.3f}, p={p_value:.4g}, Cohen's d={cohen:.3f}. "
            f"Error / half-spread = {ratio:.3f}. A ratio above 1 means realized errors exceed the quoted half-spread."
        )
    if len(half) > 5 and np.std(half) > 1e-9 and np.std(err) > 1e-9:
        spearman = stats.spearmanr(half, err)
        spearman_r, spearman_p = float(spearman.correlation), float(spearman.pvalue)
    else:
        spearman_r, spearman_p = None, None
    rng = np.random.default_rng(7)
    take = min(240, len(rows))
    idx = rng.choice(len(rows), size=take, replace=False)
    points = [{"half_spread": float(half[i]), "abs_error": float(err[i])} for i in idx]
    return _pack(
        test_id="overconfidence",
        title=title,
        null_hypothesis=null,
        alternative=alt,
        n=len(rows),
        statistic_name="t",
        statistic=t_stat,
        p_value=p_value,
        effect_size_name="Cohen's d",
        effect_size=cohen,
        estimate_name="mean half-spread minus absolute error",
        estimate=mean,
        ci_low=lo,
        ci_high=hi,
        insufficient_data=False,
        interpretation=text,
        series={"gap": _hist(diff), "scatter": points},
        extra={
            "mean_half_spread": float(half.mean()),
            "median_half_spread": float(np.median(half)),
            "mean_abs_error": float(err.mean()),
            "median_abs_error": float(np.median(err)),
            "spearman_r": spearman_r,
            "spearman_p_value": spearman_p,
        },
    )


def _ols(y: np.ndarray, columns: dict[str, np.ndarray], min_n: int = 40) -> dict | None:
    names = list(columns)
    x = np.column_stack([columns[name] for name in names])
    mask = np.isfinite(y) & np.isfinite(x).all(axis=1)
    y = y[mask]
    x = x[mask]
    if len(y) < min_n:
        return {"insufficient": True, "n": int(len(y)), "coefficients": []}
    design = sm.add_constant(x, has_constant="add")
    try:
        cond = float(np.linalg.cond(design))
        model = sm.OLS(y, design).fit(cov_type="HC1")
    except Exception as exc:
        return {"insufficient": False, "singular": True, "n": int(len(y)), "error": str(exc), "coefficients": []}
    labels = ["intercept", *names]
    coefs = []
    for i, label in enumerate(labels):
        ci = model.conf_int(alpha=0.05)[i]
        coefs.append(
            {
                "name": label,
                "coef": float(model.params[i]),
                "std_err": float(model.bse[i]),
                "t": float(model.tvalues[i]),
                "p_value": float(model.pvalues[i]),
                "ci95_low": float(ci[0]),
                "ci95_high": float(ci[1]),
            }
        )
    return {
        "insufficient": False,
        "singular": False,
        "n": int(len(y)),
        "r_squared": float(model.rsquared),
        "condition_number": cond,
        "coefficients": coefs,
    }


def herding(rows: list[dict]) -> dict:
    y = np.array([r["mid"] for r in rows], dtype=float)
    fit = _ols(
        y,
        {
            "private_signal": np.array([r["signal"] for r in rows], dtype=float),
            "last_trade": np.array([np.nan if r["last_trade"] is None else r["last_trade"] for r in rows], dtype=float),
            "prev_midpoint": np.array([np.nan if r["prev_mid"] is None else r["prev_mid"] for r in rows], dtype=float),
        },
    )
    if fit is None or fit.get("insufficient") or fit.get("singular"):
        return _pack(
            test_id="herding",
            title="Herding",
            null_hypothesis="After the private signal, last trade and previous midpoint have no linear association with the quote midpoint.",
            alternative="Last trade or previous midpoint retains a partial association with the quote.",
            n=0 if fit is None else fit.get("n", 0),
            statistic_name=None,
            statistic=None,
            p_value=None,
            effect_size_name="R²",
            effect_size=None,
            estimate_name=None,
            estimate=None,
            ci_low=None,
            ci_high=None,
            insufficient_data=True,
            interpretation="Not enough complete rows, or the design matrix is singular. Coefficients are not reported.",
            extra=fit or {},
        )
    by_name = {c["name"]: c for c in fit["coefficients"]}
    last = by_name.get("last_trade")
    text = (
        f"OLS of quote midpoint on private signal, last trade, and previous midpoint "
        f"(HC1 standard errors, n={fit['n']}, R²={fit['r_squared']:.3f}, condition number={fit['condition_number']:.1f}). "
    )
    if last:
        text += (
            f"Last-trade coefficient {last['coef']:.3f} "
            f"(95% CI {last['ci95_low']:.3f} to {last['ci95_high']:.3f}, p={last['p_value']:.4g}). "
        )
    text += "Coefficients are price units. A large condition number means the regressors move together, so partial effects are hard to separate."
    return _pack(
        test_id="herding",
        title="Herding",
        null_hypothesis="Controlling for the private signal, last trade and previous midpoint have zero partial coefficients.",
        alternative="Public prices retain a partial linear association with quotes.",
        n=fit["n"],
        statistic_name="last_trade t",
        statistic=None if last is None else last["t"],
        p_value=None if last is None else last["p_value"],
        effect_size_name="R²",
        effect_size=fit["r_squared"],
        estimate_name="last_trade coefficient",
        estimate=None if last is None else last["coef"],
        ci_low=None if last is None else last["ci95_low"],
        ci_high=None if last is None else last["ci95_high"],
        insufficient_data=False,
        interpretation=text,
        extra=fit,
    )


def first_price_anchoring(rows: list[dict]) -> dict:
    usable = [r for r in rows if r.get("opening") is not None and r["round"] > 0]
    y = np.array([r["mid"] for r in usable], dtype=float)
    fit = _ols(
        y,
        {
            "opening_midpoint": np.array([r["opening"] for r in usable], dtype=float),
            "private_signal": np.array([r["signal"] for r in usable], dtype=float),
        },
    )
    if fit is None or fit.get("insufficient") or fit.get("singular"):
        return _pack(
            test_id="first_price_anchoring",
            title="First-price anchoring",
            null_hypothesis="The opening midpoint has no partial association with later quote midpoints after the private signal.",
            alternative="Later quotes remain pulled toward the opening midpoint.",
            n=0 if not usable else len(usable),
            statistic_name=None,
            statistic=None,
            p_value=None,
            effect_size_name=None,
            effect_size=None,
            estimate_name="opening midpoint coefficient",
            estimate=None,
            ci_low=None,
            ci_high=None,
            insufficient_data=True,
            interpretation="Not enough post-open quotes to estimate the partial association.",
            extra=fit or {},
        )
    opening = {c["name"]: c for c in fit["coefficients"]}["opening_midpoint"]
    text = (
        f"Later quote midpoint on opening midpoint and private signal "
        f"(HC1, n={fit['n']}, R²={fit['r_squared']:.3f}). "
        f"Opening coefficient {opening['coef']:.3f} "
        f"(95% CI {opening['ci95_low']:.3f} to {opening['ci95_high']:.3f}, p={opening['p_value']:.4g}). "
        "This is the partial association after the agent's own signal, in price units."
    )
    return _pack(
        test_id="first_price_anchoring",
        title="First-price anchoring",
        null_hypothesis="Opening midpoint coefficient is zero after controlling for the private signal.",
        alternative="Later quotes retain a partial association with the opening midpoint.",
        n=fit["n"],
        statistic_name="t",
        statistic=opening["t"],
        p_value=opening["p_value"],
        effect_size_name="R²",
        effect_size=fit["r_squared"],
        estimate_name="opening midpoint coefficient",
        estimate=opening["coef"],
        ci_low=opening["ci95_low"],
        ci_high=opening["ci95_high"],
        insufficient_data=False,
        interpretation=text,
        extra=fit,
    )


def news_reaction(sessions: list[dict]) -> dict:
    horizons = [0, 1, 2, 3]
    buckets = {k: [] for k in horizons}
    speeds = []
    events = 0
    for session in sessions:
        mids = [rnd["book"]["midpoint"] for rnd in session["rounds"]]
        for i, rnd in enumerate(session["rounds"]):
            shock = float(rnd["news_magnitude"])
            if rnd["news_event"] == "NO_NEWS" or abs(shock) < 1e-9 or i == 0:
                continue
            pre = mids[i - 1]
            if pre is None:
                continue
            events += 1
            reached = None
            for k in horizons:
                j = i + k
                if j < len(mids) and mids[j] is not None:
                    adj = (mids[j] - pre) / shock
                    buckets[k].append(float(adj))
                    if reached is None and adj >= 0.5:
                        reached = k
            if reached is not None:
                speeds.append(reached)
    n = events
    if n < 8:
        return _pack(
            test_id="news_reaction",
            title="News reaction",
            null_hypothesis="The midpoint fully incorporates the public shock in the news round.",
            alternative="Adjustment fraction differs from 1.",
            n=n,
            statistic_name=None,
            statistic=None,
            p_value=None,
            effect_size_name=None,
            effect_size=None,
            estimate_name="mean adjustment fraction at horizon 0",
            estimate=None,
            ci_low=None,
            ci_high=None,
            insufficient_data=True,
            interpretation="Fewer than 8 usable news events. Adjustment fractions are not tested.",
        )
    series = []
    for k in horizons:
        arr = np.array(buckets[k], dtype=float)
        mean, _, lo, hi = _mean_ci(arr) if len(arr) else (None, None, None, None)
        series.append({"horizon": k, "n": int(len(arr)), "mean_adjustment": mean, "ci95_low": lo, "ci95_high": hi})
    h0 = np.array(buckets[0], dtype=float)
    gap = h0 - 1.0
    mean, _, lo, hi = _mean_ci(gap)
    std = float(gap.std(ddof=1)) if len(gap) > 1 else 0.0
    if std < 1e-12:
        t_stat, p_value = None, None
    else:
        t_stat = float(mean / (std / np.sqrt(len(gap))))
        p_value = float(2 * stats.t.sf(abs(t_stat), len(gap) - 1))
    speed = float(np.median(speeds)) if speeds else None
    text = (
        f"{n} news events. Mean same-round adjustment fraction is {float(h0.mean()):.3f} "
        f"(gap versus full adjustment {mean:.3f}, 95% CI {lo:.3f} to {hi:.3f}"
        + (f", t={t_stat:.3f}, two-sided p={p_value:.4g}" if t_stat is not None else "")
        + "). Fraction 1 would mean the midpoint moved one-for-one with the public shock. "
        f"Median rounds until half the shock is reflected: {speed if speed is not None else 'not reached'} "
        f"({len(speeds)} of {n} events reached a half adjustment within 3 rounds)."
    )
    return _pack(
        test_id="news_reaction",
        title="News reaction",
        null_hypothesis="Same-round midpoint adjustment equals the public shock.",
        alternative="The adjustment fraction differs from 1.",
        n=n,
        statistic_name="t",
        statistic=t_stat,
        p_value=p_value,
        effect_size_name="mean adjustment fraction",
        effect_size=float(h0.mean()),
        estimate_name="mean same-round adjustment minus 1",
        estimate=mean,
        ci_low=lo,
        ci_high=hi,
        insufficient_data=False,
        interpretation=text,
        series={"horizons": series},
        extra={"median_rounds_to_half_adjustment": speed, "events_reaching_half": len(speeds)},
    )


def inventory_blindness(sessions: list[dict]) -> dict:
    rows = []
    for session in sessions:
        by_agent: dict[str, list[float]] = {}
        for rnd in session["rounds"]:
            for quote in rnd["quotes"]:
                if not quote.get("accepted"):
                    continue
                by_agent.setdefault(quote["agent_id"], []).append(quote["inventory"])
                rows.append(quote | {"round": rnd["round"], "session_id": session["id"]})
        # subsequent change attached below
    mids, signals, invs, next_delta = [], [], [], []
    index = {}
    for session in sessions:
        for rnd in session["rounds"]:
            for quote in rnd["quotes"]:
                if quote.get("accepted") and quote.get("bid") is not None:
                    index[(session["id"], rnd["round"], quote["agent_id"])] = quote
    for (sid, rnd, aid), quote in index.items():
        nxt = index.get((sid, rnd + 1, aid))
        mids.append((quote["bid"] + quote["ask"]) / 2)
        signals.append(quote["private_signal"])
        invs.append(quote["inventory"])
        next_delta.append(None if nxt is None else nxt["inventory"] - quote["inventory"])
    y = np.array(mids, dtype=float) - np.array(signals, dtype=float)
    fit = _ols(y, {"inventory": np.array(invs, dtype=float)})
    delta = np.array([np.nan if v is None else v for v in next_delta], dtype=float)
    fit_delta = _ols(delta, {"inventory": np.array(invs, dtype=float)}, min_n=40)
    if fit is None or fit.get("insufficient") or fit.get("singular"):
        return _pack(
            test_id="inventory",
            title="Inventory and quotes",
            null_hypothesis="Inventory has no linear association with the quote midpoint minus the private signal.",
            alternative="Inventory shifts the quote relative to the private signal.",
            n=0 if fit is None else fit.get("n", 0),
            statistic_name=None,
            statistic=None,
            p_value=None,
            effect_size_name=None,
            effect_size=None,
            estimate_name="inventory coefficient",
            estimate=None,
            ci_low=None,
            ci_high=None,
            insufficient_data=True,
            interpretation="Not enough inventory variation to estimate the quote offset regression.",
            extra={"offset_on_inventory": fit, "next_inventory_change_on_inventory": fit_delta},
        )
    coef = {c["name"]: c for c in fit["coefficients"]}["inventory"]
    text = (
        f"Quote midpoint minus private signal, regressed on inventory before the quote "
        f"(HC1, n={fit['n']}, R²={fit['r_squared']:.3f}). "
        f"Inventory coefficient {coef['coef']:.3f} "
        f"(95% CI {coef['ci95_low']:.3f} to {coef['ci95_high']:.3f}, p={coef['p_value']:.4g}). "
        "A market maker that shades quotes would show a negative coefficient when long. "
        "A coefficient near zero with a wide interval is absence of evidence of shading, not proof of a bias label."
    )
    return _pack(
        test_id="inventory",
        title="Inventory and quotes",
        null_hypothesis="Inventory coefficient on quote-minus-signal is zero.",
        alternative="Inventory shifts quotes relative to the private signal.",
        n=fit["n"],
        statistic_name="t",
        statistic=coef["t"],
        p_value=coef["p_value"],
        effect_size_name="R²",
        effect_size=fit["r_squared"],
        estimate_name="inventory coefficient",
        estimate=coef["coef"],
        ci_low=coef["ci95_low"],
        ci_high=coef["ci95_high"],
        insufficient_data=False,
        interpretation=text,
        extra={"offset_on_inventory": fit, "next_inventory_change_on_inventory": fit_delta},
    )


def analyze_sessions(sessions: list[dict]) -> list[dict]:
    rows = _accepted_quotes(sessions)
    return [
        round_number_anchoring(rows),
        overconfidence(rows),
        herding(rows),
        first_price_anchoring(rows),
        news_reaction(sessions),
        inventory_blindness(sessions),
    ]


def prompt_sensitivity(pairs: list[tuple[dict, dict]]) -> dict:
    quote_deltas = []
    pnl_deltas = []
    trade_deltas = []
    for left, right in pairs:
        left_mids = {}
        for rnd in left["rounds"]:
            for quote in rnd["quotes"]:
                if quote.get("bid") is None or quote.get("ask") is None:
                    continue
                left_mids[(rnd["round"], quote["agent_id"])] = (quote["bid"] + quote["ask"]) / 2
        diffs = []
        for rnd in right["rounds"]:
            for quote in rnd["quotes"]:
                key = (rnd["round"], quote["agent_id"])
                if key not in left_mids or quote.get("bid") is None:
                    continue
                diffs.append(abs(left_mids[key] - (quote["bid"] + quote["ask"]) / 2))
        if diffs:
            quote_deltas.append(float(np.mean(diffs)))
        def _mean_pnl(session: dict) -> float:
            vals = list(session["agent_terminal"].values())
            return float(np.mean(vals)) if vals else 0.0

        pnl_deltas.append(_mean_pnl(left) - _mean_pnl(right))
        trade_deltas.append(float(left["n_trades"] - right["n_trades"]))
    q = np.array(quote_deltas, dtype=float)
    p = np.array(pnl_deltas, dtype=float)
    if len(q) < 2:
        return {
            "n_pairs": int(len(pairs)),
            "insufficient_data": True,
            "interpretation": "Fewer than 2 paired seeds. Prompt divergence is not tested.",
        }
    q_mean, _, q_lo, q_hi = _mean_ci(q)
    p_mean, _, p_lo, p_hi = _mean_ci(p)
    q_std = float(q.std(ddof=1))
    p_std = float(p.std(ddof=1))
    q_t = None if q_std < 1e-12 else float(q_mean / (q_std / np.sqrt(len(q))))
    p_t = None if p_std < 1e-12 else float(p_mean / (p_std / np.sqrt(len(p))))
    q_p = None if q_t is None else float(2 * stats.t.sf(abs(q_t), len(q) - 1))
    p_p = None if p_t is None else float(2 * stats.t.sf(abs(p_t), len(p) - 1))
    return {
        "n_pairs": int(len(pairs)),
        "insufficient_data": False,
        "null_hypothesis": "The debias prompt leaves quote midpoints and agent terminal PnL unchanged relative to prompt v1.",
        "mean_abs_quote_delta": q_mean,
        "quote_delta_ci95": {"low": q_lo, "high": q_hi},
        "quote_delta_t": q_t,
        "quote_delta_p_value": q_p,
        "mean_agent_pnl_delta": p_mean,
        "pnl_delta_ci95": {"low": p_lo, "high": p_hi},
        "pnl_delta_t": p_t,
        "pnl_delta_p_value": p_p,
        "mean_trade_count_delta": float(np.mean(trade_deltas)),
        "prompt_a": "v1",
        "prompt_b": "v1-debias",
        "interpretation": (
            f"{len(pairs)} paired seeds, same latent seed, prompt v1 versus the round-number warning. "
            f"Mean absolute midpoint divergence is {q_mean:.3f} (95% CI {q_lo:.3f} to {q_hi:.3f}"
            + (f", p={q_p:.4g}" if q_p is not None else "")
            + f"). Mean agent terminal-PnL difference (v1 minus warning) is {p_mean:.3f} "
            f"(95% CI {p_lo:.3f} to {p_hi:.3f}"
            + (f", p={p_p:.4g}" if p_p is not None else "")
            + "). These pairs were not used to choose the exploit rules."
        ),
    }
