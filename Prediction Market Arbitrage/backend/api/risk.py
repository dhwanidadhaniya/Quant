"""Risk API."""
from fastapi import APIRouter
router = APIRouter()

@router.get("/risk")
async def get_risk_analysis(
    liquidity: float = 25000, trade_size: float = 1000,
    equivalence_score: float = 0.95, net_edge_pct: float = 2.5,
    duration_seconds: float = 120,
):
    from quant.risk import calculate_risk_matrix
    return calculate_risk_matrix(liquidity, trade_size, equivalence_score, net_edge_pct, duration_seconds)

@router.get("/pnl")
async def get_pnl():
    from quant.backtest import run_backtest
    from data.adapters.simulator import MarketSimulator
    sim = MarketSimulator(seed=42)
    opps = sim.generate_backtest_opportunities(200)
    result = run_backtest(opps)
    from quant.portfolio import calculate_portfolio_analytics
    analytics = calculate_portfolio_analytics(result.get("trades", []))
    return {"backtest": result, "analytics": analytics, "data_source": "simulated"}
