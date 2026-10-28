from app.engine.simulator import MarketSimulator
from app.models.entities import AssetSpec, SimulationParams


def test_simulator_runs_and_emits_events():
    sim = MarketSimulator(AssetSpec("T"), SimulationParams(seed=1, lambda_limit=30, lambda_market=12))
    events = sim.advance(1.5)
    assert sim.t >= 1.5
    assert sim.metrics_acc["arrivals"] + sim.metrics_acc["markets"] + sim.metrics_acc["cancels"] > 0
    snap = sim.book.snapshot(5)
    assert snap["best_bid"] is not None
    assert snap["best_ask"] is not None
    assert snap["spread"] > 0
    assert events is not None


def test_user_order_enters_queue():
    sim = MarketSimulator(AssetSpec("T"), SimulationParams(seed=2))
    bb = sim.book.snapshot(1)["best_bid"]
    out = sim.submit_user_limit("bid", bb, 100)
    assert out["order_id"].startswith("USER")
    pos = sim.book.user_position(out["order_id"])
    assert pos is not None
    assert pos["qty"] == 100


def test_state_payload_tagged_simulated():
    sim = MarketSimulator()
    sim.advance(0.3)
    p = sim.state_payload()
    assert p["source"] == "SIMULATED"
    assert "rates" in p
    assert "fill" in p
    assert "congestion" in p["congestion"]["note"].lower() or "model" in p["congestion"]["note"].lower()


def test_shock_depletes_or_marks():
    sim = MarketSimulator()
    before = sim.book.snapshot(5)
    sim.apply_shock("liquidity_withdrawal", 1.0)
    after = sim.book.snapshot(5)
    assert after["bid_depth"] + after["ask_depth"] < before["bid_depth"] + before["ask_depth"]
