"""Market Efficiency API."""
from fastapi import APIRouter
from data.adapters.simulator import MarketSimulator

router = APIRouter()
sim = MarketSimulator(seed=42)
_data = sim.generate_all_data()

@router.get("/market-efficiency")
async def get_efficiency():
    from quant.efficiency import calculate_market_efficiency_metrics, analyze_efficiency_by_category
    metrics = calculate_market_efficiency_metrics(_data["opportunities"])
    by_category = analyze_efficiency_by_category(_data["opportunities"])
    return {"efficiency": metrics, "by_category": by_category, "data_source": "simulated"}

@router.get("/event-study")
async def get_event_study():
    return {"data": _data["event_study"], "data_source": "simulated"}

@router.get("/liquidity")
async def get_liquidity_analysis():
    opps = _data["opportunities"]
    scatter = [{"liquidity": o["min_liquidity"], "net_edge": o["net_edge"],
                "category": o["category"], "event": o["event_name"][:30]}
               for o in opps]
    return {"scatter_data": scatter, "data_source": "simulated"}
