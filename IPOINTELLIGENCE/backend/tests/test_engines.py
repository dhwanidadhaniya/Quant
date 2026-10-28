from app.engines.backtest import PRESETS, run_backtest
from app.engines.dcf import run_dcf
import pandas as pd


def test_dcf_undefined_for_losses():
    out = run_dcf(revenue0=1000, pat0=-50, net_debt=0, post_issue_shares=1e8, ipo_price=100)
    assert out["status"] == "undefined"


def test_dcf_base_positive_pat():
    out = run_dcf(revenue0=4500, pat0=624, net_debt=0, post_issue_shares=40e7, ipo_price=500)
    assert out["status"] == "ok"
    assert out["scenarios"]["BASE"]["fair_value_per_share"] is not None
    assert out["scenarios"]["BULL"]["fair_value_per_share"] > out["scenarios"]["BEAR"]["fair_value_per_share"]


def test_backtest_rejects_lookahead():
    df = pd.DataFrame(
        {
            "name": ["A"],
            "listing_date": ["2022-01-01"],
            "gmp_pct": [0.3],
            "listing_return": [0.4],
            "ret_90d": [0.1],
        }
    )
    out = run_backtest(df, {"all": [{"field": "ret_90d", "op": ">", "value": 0}]})
    assert out["status"] == "rejected"
