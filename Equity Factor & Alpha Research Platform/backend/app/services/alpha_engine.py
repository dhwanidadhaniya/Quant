from __future__ import annotations

DEFAULT_WEIGHTS = {
    "value": 0.25,
    "momentum": 0.20,
    "quality": 0.20,
    "growth": 0.15,
    "size": 0.10,
    "low_vol": 0.10,
}

FACTORS = list(DEFAULT_WEIGHTS)


def normalise(weights: dict) -> dict:
    w = {k: float(weights.get(k, DEFAULT_WEIGHTS[k])) for k in FACTORS}
    s = sum(w.values()) or 1.0
    return {k: v / s for k, v in w.items()}


def alpha_score(row: dict, weights: dict | None = None) -> float:
    w = normalise(weights or DEFAULT_WEIGHTS)
    return sum(w[k] * float(row.get(k) or 0) for k in FACTORS)


def why_ranked(row: dict, weights: dict | None = None) -> list[str]:
    """Plain-English reasons a name sits high or low. Student-lab tone, not marketing."""
    w = normalise(weights or DEFAULT_WEIGHTS)
    contrib = {k: w[k] * float(row.get(k) or 0) for k in FACTORS}
    ranked = sorted(contrib.items(), key=lambda x: -x[1])
    notes = []
    labels = {
        "value": "valuation looks cheaper than the rest of the book",
        "momentum": "recent relative performance has been constructive",
        "quality": "profitability and balance-sheet screens are clean",
        "growth": "revenue/EPS growth sits above the cross-section",
        "size": "smaller-cap tilt is adding to the size sleeve",
        "low_vol": "realised volatility is subdued versus peers",
    }
    for k, _ in ranked[:3]:
        score = float(row.get(k) or 0)
        if score >= 60:
            notes.append(f"{k.replace('_', ' ').title()} ({score:.0f}/100) — {labels[k]}.")
        elif score <= 40:
            notes.append(f"{k.replace('_', ' ').title()} ({score:.0f}/100) is actually a drag — the other sleeves are carrying the rank.")
    if float(row.get("alpha_score") or 0) >= 70:
        notes.append("This is a factor-based research score, not a forecast of next month's return.")
    return notes[:4]
