"""Analysis API — Kelly, EV, slippage, backtest, what-if simulation."""
from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()


@router.get("/kelly")
async def kelly_calculator(
    probability: float = 0.68, price: float = 0.62, payout: float = 1.0,
    capital: float = 10000, kelly_type: str = "half",
):
    from quant.kelly import calculate_kelly_fraction, calculate_position_size, kelly_growth_curve
    kelly = calculate_kelly_fraction(probability, price, payout)
    position = calculate_position_size(capital, probability, price, payout, kelly_type)
    growth = kelly_growth_curve(probability, price, payout)
    return {"kelly": kelly, "position": position, "growth_curve": growth}


@router.get("/expected-value")
async def expected_value(
    probability: float = 0.68, price: float = 0.62, payout: float = 1.0, fees: float = 0.01,
):
    from quant.expected_value import calculate_expected_value, calculate_ev_sensitivity
    ev = calculate_expected_value(probability, price, payout, fees)
    sensitivity = calculate_ev_sensitivity(price, payout=payout, fees=fees)
    return {"ev": ev, "sensitivity": sensitivity}


@router.get("/simulate/slippage")
async def slippage_sim(liquidity: float = 25000, trade_size: float = 1000):
    from quant.slippage import estimate_slippage, simulate_slippage_curve
    slip = estimate_slippage(trade_size, liquidity)
    curve = simulate_slippage_curve(liquidity)
    return {"slippage": slip, "curve": curve}


@router.get("/simulate/execution")
async def execution_sim(
    gross_edge_pct: float = 5.0, trade_size: float = 1000,
    liquidity: float = 25000, latency_ms: float = 100,
):
    from quant.execution import simulate_execution, simulate_latency_sensitivity
    exec_result = simulate_execution(gross_edge_pct, trade_size, liquidity, latency_ms)
    sensitivity = simulate_latency_sensitivity(gross_edge_pct, trade_size, liquidity)
    return {"execution": exec_result, "latency_sensitivity": sensitivity}


@router.get("/simulate/what-if")
async def what_if(
    market_price: float = 0.62, probability: float = 0.68, capital: float = 10000,
    liquidity: float = 25000, fee_bps: int = 100, trade_size: float = 1000,
    execution_delay_ms: float = 100,
):
    """Complete what-if analysis combining all models."""
    from quant.expected_value import calculate_expected_value
    from quant.kelly import calculate_kelly_fraction, calculate_position_size
    from quant.slippage import estimate_slippage
    from quant.execution import simulate_execution
    from quant.fees import calculate_fee_impact

    fees = trade_size * (fee_bps / 10000)
    ev = calculate_expected_value(probability, market_price, fees=fees / trade_size)
    kelly = calculate_kelly_fraction(probability, market_price)
    position = calculate_position_size(capital, probability, market_price, kelly_fraction_type="half")
    slippage = estimate_slippage(trade_size, liquidity)
    execution = simulate_execution(
        abs(probability - market_price) * 100, trade_size, liquidity, execution_delay_ms
    )
    gross_edge = trade_size * max(0, probability - market_price)
    fee_impact = calculate_fee_impact(max(gross_edge, 0.01), fees, trade_size)

    return {
        "inputs": {
            "market_price": market_price, "probability": probability,
            "capital": capital, "liquidity": liquidity,
            "fee_bps": fee_bps, "trade_size": trade_size,
            "execution_delay_ms": execution_delay_ms,
        },
        "expected_value": ev,
        "kelly": kelly,
        "position_sizing": position,
        "slippage": slippage,
        "execution": execution,
        "fee_impact": fee_impact,
    }


@router.get("/backtest")
async def run_backtest(
    initial_capital: float = 10000, position_sizing: str = "half_kelly",
    min_net_edge: float = 0.5, min_liquidity: float = 500,
    backtest_type: str = "execution_adjusted",
):
    from quant.backtest import run_backtest as _run_backtest
    from data.adapters.simulator import MarketSimulator
    sim = MarketSimulator(seed=42)
    opps = sim.generate_backtest_opportunities(200)
    result = _run_backtest(
        opps, initial_capital=initial_capital, position_sizing=position_sizing,
        min_net_edge=min_net_edge / 100, min_liquidity=min_liquidity,
        backtest_type=backtest_type,
    )
    return {"backtest": result, "data_source": "simulated"}


@router.get("/probability")
async def probability_tools(
    price: float = 0.62, user_probability: Optional[float] = None,
):
    from quant.probability import (
        calculate_implied_probability, calculate_overround,
        calculate_adjusted_probability, calculate_probability_edge,
    )
    result = {
        "implied_probability": calculate_implied_probability(price),
        "implied_pct": round(price * 100, 2),
    }
    if user_probability is not None:
        result["edge"] = calculate_probability_edge(price, user_probability)
    return result


@router.get("/contract-equivalence")
async def contract_equivalence(
    resolution_match: bool = True, settlement_source_match: bool = True,
    expiration_match: bool = True, payout_match: bool = True,
    yes_definition_match: bool = True,
):
    from quant.contract_equivalence import calculate_contract_equivalence_score
    return calculate_contract_equivalence_score(
        resolution_match, settlement_source_match,
        expiration_match, payout_match, yes_definition_match,
    )
