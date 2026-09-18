"""Opportunities API — arbitrage detection, scanning, heatmap data."""
from fastapi import APIRouter, Query
from typing import Optional
from data.adapters.simulator import MarketSimulator

router = APIRouter()
sim = MarketSimulator(seed=42)
_data = sim.generate_all_data()


@router.get("/opportunities")
async def get_opportunities(
    category: Optional[str] = None,
    venue: Optional[str] = None,
    min_edge: Optional[float] = None,
    min_liquidity: Optional[float] = None,
    status: Optional[str] = None,
    classification: Optional[str] = None,
    sort_by: str = "net_edge",
    limit: int = 50,
):
    """Get arbitrage opportunities with filters."""
    opps = _data["opportunities"]
    if category:
        opps = [o for o in opps if o["category"] == category]
    if min_edge is not None:
        opps = [o for o in opps if o["net_edge"] >= min_edge]
    if min_liquidity is not None:
        opps = [o for o in opps if o["min_liquidity"] >= min_liquidity]
    if status:
        opps = [o for o in opps if o["status"] == status]
    if classification:
        opps = [o for o in opps if o["classification"] == classification]

    sort_keys = {
        "net_edge": lambda x: x["net_edge"],
        "gross_spread": lambda x: x["gross_spread"],
        "liquidity": lambda x: x["min_liquidity"],
        "duration": lambda x: x["duration_seconds"],
    }
    key_fn = sort_keys.get(sort_by, sort_keys["net_edge"])
    opps.sort(key=key_fn, reverse=True)

    return {
        "opportunities": opps[:limit],
        "total": len(opps),
        "filters_applied": {
            "category": category, "min_edge": min_edge,
            "min_liquidity": min_liquidity, "status": status,
        },
        "data_source": "simulated",
    }


@router.get("/opportunities/{opp_id}")
async def get_opportunity_detail(opp_id: int):
    """Get detailed analysis for a single opportunity."""
    opp = next((o for o in _data["opportunities"] if o["id"] == opp_id), None)
    if not opp:
        return {"error": "Opportunity not found"}

    from quant.arbitrage import detect_cross_venue_arbitrage
    from quant.fees import calculate_cost_waterfall
    from quant.slippage import simulate_slippage_curve
    from quant.execution import simulate_latency_sensitivity
    from quant.kelly import calculate_kelly_fraction, calculate_position_size, kelly_growth_curve
    from quant.expected_value import calculate_expected_value, calculate_ev_sensitivity
    from quant.risk import calculate_risk_matrix

    arb = detect_cross_venue_arbitrage(opp["venue_a_yes"], opp["venue_b_yes"])
    waterfall = calculate_cost_waterfall(
        max(arb["gross_edge_total"], 0.01),
        arb["fees"]["total"], arb["spread_cost"],
        arb["slippage"]["total_cost"]
    )
    slippage_curve = simulate_slippage_curve(opp["min_liquidity"])
    latency = simulate_latency_sensitivity(opp["gross_spread"] * 100, 1000, opp["min_liquidity"])
    kelly = calculate_kelly_fraction(opp["implied_probability"], opp["buy_yes_price"])
    position = calculate_position_size(10000, opp["implied_probability"], opp["buy_yes_price"])
    growth_curve = kelly_growth_curve(opp["implied_probability"], opp["buy_yes_price"])
    ev = calculate_expected_value(opp["implied_probability"], opp["buy_yes_price"])
    ev_sensitivity = calculate_ev_sensitivity(opp["buy_yes_price"])
    risk_matrix = calculate_risk_matrix(
        opp["min_liquidity"], 1000, opp["equivalence_score"],
        opp["net_edge_pct"], opp["duration_seconds"]
    )

    return {
        "opportunity": opp,
        "arbitrage_analysis": arb,
        "cost_waterfall": waterfall,
        "slippage_curve": slippage_curve,
        "latency_sensitivity": latency,
        "kelly": kelly,
        "position_sizing": position,
        "kelly_growth_curve": growth_curve,
        "expected_value": ev,
        "ev_sensitivity": ev_sensitivity,
        "risk_matrix": risk_matrix,
        "data_source": "simulated",
    }


@router.get("/heatmap")
async def get_heatmap(metric: str = "net_edge"):
    """Get opportunity heatmap data."""
    return {
        "data": _data["heatmap"],
        "metric": metric,
        "data_source": "simulated",
    }


@router.get("/arbitrage/single-venue")
async def single_venue_arbitrage(yes_price: float = 0.47, no_price: float = 0.50, fee_bps: int = 100):
    """Analyze single-venue arbitrage (YES + NO < $1)."""
    from quant.arbitrage import detect_single_venue_arbitrage
    return detect_single_venue_arbitrage(yes_price, no_price, fee_bps)


@router.get("/arbitrage/cross-venue")
async def cross_venue_arbitrage(
    venue_a_yes: float = 0.55,
    venue_b_yes: float = 0.62,
    fee_a_bps: int = 100,
    fee_b_bps: int = 70,
    liquidity_a: float = 25000,
    liquidity_b: float = 18000,
    trade_size: float = 1000,
    equivalence_score: float = 0.95,
):
    """Analyze cross-venue arbitrage opportunity."""
    from quant.arbitrage import detect_cross_venue_arbitrage
    return detect_cross_venue_arbitrage(
        venue_a_yes, venue_b_yes,
        fee_a_bps=fee_a_bps, fee_b_bps=fee_b_bps,
        liquidity_a=liquidity_a, liquidity_b=liquidity_b,
        trade_size=trade_size, equivalence_score=equivalence_score,
    )
