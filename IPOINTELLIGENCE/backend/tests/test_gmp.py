import pandas as pd
from app.engines.gmp import bucket_gmp, reliability_table, signal_quality


def test_buckets():
    assert bucket_gmp(-0.02) == "Negative"
    assert bucket_gmp(0.12) == "10–20%"
    assert bucket_gmp(0.5) == "35%+"


def test_reliability_identity_perfect():
    rows = [{"expected_listing_return": 0.2, "actual_listing_return": 0.2, "prediction_error": 0.0}] * 12
    rel = reliability_table(rows)
    assert rel["n"] == 12
    assert rel["mae"] == 0
    assert rel["directional_accuracy"] == 1


def test_signal_disclaimer():
    s = signal_quality({"gmp_error": 0.5, "gmp_pct": 0.4, "sub_total": 0.8, "listing_return": -0.1})
    assert "NOT prove manipulation" in s["disclaimer"]
    assert s["label"] == "POTENTIALLY DISTORTED / NOISY"
