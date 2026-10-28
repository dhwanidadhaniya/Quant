from app.analytics.queueing import littles_law, mm1_bundle, mm1_L, mm1_W, traffic_intensity
from app.analytics.fill import fill_curve, survival
from app.analytics.imbalance import queue_imbalance
from app.analytics.impact import square_root_impact, walk_book
from app.analytics.monte_carlo import simulate_paths, compare_theory_mc
from app.analytics.hawkes import hawkes_path


def test_traffic_intensity():
    assert abs(traffic_intensity(10, 20) - 0.5) < 1e-9


def test_mm1_formulas():
    b = mm1_bundle(10, 20)
    assert b["rho"] == 0.5
    assert abs(b["L"] - 1.0) < 1e-9
    assert abs(b["W"] - 0.1) < 1e-9
    assert abs(mm1_L(0.5) - 1.0) < 1e-9
    assert abs(mm1_W(10, 20) - 0.1) < 1e-9
    assert b["educational"] is True


def test_mm1_unstable_flagged_not_crashed():
    b = mm1_bundle(30, 20)
    assert b["rho"] > 1
    assert b["stable_under_mm1"] is False
    assert b["L"] is None
    assert "cancellations" in b["caveat"].lower() or "unstable" in b["caveat"].lower()


def test_littles_law_triangle():
    r = littles_law(lam=50, W=2)
    assert r["L"] == 100
    r2 = littles_law(L=100, lam=50)
    assert r2["W"] == 2
    r3 = littles_law(L=100, W=2)
    assert r3["lambda"] == 50


def test_fill_survival_decreases():
    c = fill_curve(800, 100, 20, 90, 15, 0.2, 0.02, 0.1, "bid")
    fills = [h["fill"] for h in c["horizons"]]
    assert fills == sorted(fills)
    assert c["horizons"][0]["fill"] < c["horizons"][-1]["fill"]
    assert survival(0, 800, 100, 1, 0.1) == 1.0


def test_imbalance_formula():
    assert abs(queue_imbalance(3, 1) - 0.5) < 1e-9
    assert abs(queue_imbalance(1, 3) + 0.5) < 1e-9
    assert queue_imbalance(0, 0) == 0.0


def test_walk_book_impact():
    levels = [{"price": 100.01, "volume": 100}, {"price": 100.02, "volume": 80}, {"price": 100.03, "volume": 50}]
    w = walk_book(levels, 150)
    assert w["filled"] == 150
    assert w["unfilled"] == 0
    assert abs(w["impact_ticks_proxy"] - 0.01) < 1e-9


def test_square_root_impact_rises_in_size():
    a = square_root_impact(100, 1e6, 0.2, 0.02)
    b = square_root_impact(10_000, 1e6, 0.2, 0.02)
    assert b > a


def test_monte_carlo_fill_times():
    mc = simulate_paths(200, 50, 30, 80, 10, 0.05, n=80, t_max=40, seed=1)
    assert mc["n"] == 80
    assert 0 <= mc["p_fill"] <= 1
    assert len(mc["cdf"]) > 10
    chk = compare_theory_mc(8.0, 0.7, mc)
    assert "why_discrepancy" in chk


def test_hawkes_branching():
    h = hawkes_path(5.0, 0.5, 1.5, t_max=4.0)
    assert h["stable"] is True
    assert h["n"] >= 0
    assert "λ(t)" in h["formula"] or "lambda" in h["formula"].lower() or "μ" in h["formula"]
