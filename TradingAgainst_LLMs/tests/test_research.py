import numpy as np

from app.research.analyses import herding, overconfidence, round_number_anchoring


def _row(mid, signal, true_value=50, spread=1, inventory=0, last=None, prev=None, opening=None, round_idx=1):
    return {
        "mid": mid,
        "signal": signal,
        "true_value": true_value,
        "spread": spread,
        "inventory": inventory,
        "last_trade": last,
        "prev_mid": prev,
        "opening": opening,
        "round": round_idx,
        "session_id": "s",
        "agent_id": "A01",
        "news_event": "NO_NEWS",
        "news_magnitude": 0,
    }


def test_anchoring_detects_round_grid_and_spares_unanchored_quotes():
    anchored = [_row(float(50 + 5 * (i % 3)), 50 + (i % 7) * 0.37) for i in range(80)]
    found = round_number_anchoring(anchored)
    assert found["insufficient_data"] is False
    assert found["ci95"]["estimate"] > 0
    assert found["p_value"] < 0.01
    assert found["extra"]["chi_square"] is not None
    assert found["extra"]["chi_square_p_value"] < 0.05

    neutral = [_row(50 + i * 0.17, 50 + i * 0.17) for i in range(80)]
    spare = round_number_anchoring(neutral)
    assert spare["insufficient_data"] is False
    assert abs(spare["ci95"]["estimate"]) < 1e-9
    assert spare["p_value"] is None or spare["p_value"] > 0.05 or spare["statistic"] is None


def test_overconfidence_when_spreads_are_tighter_than_errors():
    rows = [_row(50, 50, true_value=56, spread=0.4) for _ in range(60)]
    result = overconfidence(rows)
    assert result["insufficient_data"] is False
    assert result["ci95"]["estimate"] < 0
    assert result["p_value"] < 0.01
    assert result["extra"]["mean_abs_error"] > result["extra"]["mean_half_spread"]


def test_herding_regression_recovers_last_trade_coefficient():
    rng = np.random.default_rng(4)
    rows = []
    for i in range(90):
        signal = float(rng.normal(50, 2))
        last = float(rng.normal(50, 2))
        prev = float(rng.normal(50, 1))
        mid = 0.2 * signal + 0.7 * last + 0.1 * prev + float(rng.normal(0, 0.05))
        rows.append(_row(mid, signal, last=last, prev=prev))
    result = herding(rows)
    assert result["insufficient_data"] is False
    last = {c["name"]: c for c in result["extra"]["coefficients"]}["last_trade"]
    assert 0.55 < last["coef"] < 0.85
    assert last["p_value"] < 0.01
    assert last["ci95_low"] > 0
