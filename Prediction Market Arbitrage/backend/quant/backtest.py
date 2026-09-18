"""
Backtesting Engine
===================

The backtesting engine answers the central research question:
"Would these opportunities have been profitable in the past?"

CRITICAL DISTINCTION:
  THEORETICAL BACKTEST — assumes perfect execution at observed mid-prices
  EXECUTION-ADJUSTED BACKTEST — models slippage, partial fills, and latency

We ALWAYS report both, because the GAP between them is itself a research finding.
It tells us how much theoretical edge is consumed by execution reality.

Limitations (we're honest about these):
  - Look-ahead bias: We detect opportunities using data that wouldn't be available in real-time
  - Survivorship bias: We only see opportunities that occurred, not those that didn't
  - Impact assumption: Our slippage model may not capture real-world impact accurately
  - Fee changes: Historical fee structures may differ from current
"""
from typing import Dict, List, Optional
from quant.arbitrage import detect_cross_venue_arbitrage
from quant.kelly import calculate_position_size
from quant.risk import calculate_drawdown
import random
import math


def run_backtest(
    opportunities: List[Dict],
    initial_capital: float = 10000.0,
    position_sizing: str = "half_kelly",
    fixed_position_size: float = 100.0,
    min_net_edge: float = 0.005,
    min_liquidity: float = 500.0,
    max_slippage_pct: float = 0.05,
    fee_bps: int = 100,
    backtest_type: str = "execution_adjusted",
) -> Dict:
    """
    Run a historical backtest over detected opportunities.
    
    Args:
        opportunities: List of opportunity dicts with pricing data
        initial_capital: Starting capital ($)
        position_sizing: "fixed", "equal_weight", "full_kelly", "half_kelly", "quarter_kelly"
        fixed_position_size: Size if using fixed position sizing
        min_net_edge: Minimum net edge to trade (decimal)
        min_liquidity: Minimum liquidity requirement ($)
        max_slippage_pct: Maximum acceptable slippage
        fee_bps: Fee assumption in basis points
        backtest_type: "theoretical" or "execution_adjusted"
    
    Returns:
        Complete backtest results
    """
    capital = initial_capital
    trades = []
    equity_curve = [initial_capital]
    total_fees = 0
    total_slippage = 0
    
    for opp in opportunities:
        # Filter: apply minimum thresholds
        net_edge = opp.get("net_edge", 0)
        liquidity = opp.get("min_liquidity", 0)
        
        if net_edge < min_net_edge:
            continue
        if liquidity < min_liquidity:
            continue
        
        # Position sizing
        if position_sizing == "fixed":
            position = min(fixed_position_size, capital * 0.2)
        elif position_sizing == "equal_weight":
            position = capital * 0.05  # 5% per trade
        elif position_sizing in ("full_kelly", "half_kelly", "quarter_kelly"):
            kelly_type = position_sizing.replace("_kelly", "")
            prob = opp.get("implied_probability", 0.5)
            price = opp.get("buy_yes_price", 0.5)
            ps = calculate_position_size(capital, prob, price, kelly_fraction_type=kelly_type)
            position = ps["position_dollars"]
        else:
            position = fixed_position_size
        
        position = max(0, min(position, capital * 0.25))  # Cap at 25% of capital
        
        if position < 10:  # Minimum viable trade
            continue
        
        # Calculate trade P&L
        gross_edge_pct = opp.get("gross_edge_per_contract", 0) / opp.get("total_cost_per_pair", 1) if opp.get("total_cost_per_pair", 0) > 0 else 0
        
        if backtest_type == "theoretical":
            # Perfect execution — no slippage
            trade_pnl = position * gross_edge_pct
            trade_fees = position * (fee_bps / 10000)
            trade_slippage = 0
        else:
            # Execution-adjusted — realistic modeling
            trade_fees = position * (fee_bps / 10000)
            
            # Slippage depends on position relative to liquidity
            liq_ratio = position / liquidity if liquidity > 0 else 1
            trade_slippage = position * 0.1 * math.sqrt(liq_ratio)
            
            trade_pnl = position * gross_edge_pct - trade_slippage
        
        net_pnl = trade_pnl - trade_fees
        capital += net_pnl
        total_fees += trade_fees
        total_slippage += trade_slippage
        
        equity_curve.append(round(capital, 2))
        
        trades.append({
            "opportunity_id": opp.get("id"),
            "position": round(position, 2),
            "gross_pnl": round(trade_pnl + trade_fees, 2),
            "fees": round(trade_fees, 2),
            "slippage": round(trade_slippage, 2),
            "net_pnl": round(net_pnl, 2),
            "capital_after": round(capital, 2),
        })
    
    # Calculate summary statistics
    if not trades:
        return {
            "backtest_type": backtest_type,
            "total_opportunities": len(opportunities),
            "opportunities_traded": 0,
            "message": "No opportunities met the minimum criteria",
        }
    
    pnls = [t["net_pnl"] for t in trades]
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p <= 0]
    
    dd = calculate_drawdown(equity_curve)
    
    return {
        "backtest_type": backtest_type,
        "position_sizing": position_sizing,
        "initial_capital": initial_capital,
        "final_capital": round(capital, 2),
        
        "total_opportunities": len(opportunities),
        "opportunities_traded": len(trades),
        "opportunities_filtered": len(opportunities) - len(trades),
        
        "gross_pnl": round(sum(t["gross_pnl"] for t in trades), 2),
        "total_fees_paid": round(total_fees, 2),
        "total_slippage": round(total_slippage, 2),
        "net_pnl": round(sum(pnls), 2),
        
        "total_return_pct": round(((capital - initial_capital) / initial_capital) * 100, 2),
        
        "avg_trade_pnl": round(sum(pnls) / len(pnls), 2),
        "median_trade_pnl": round(sorted(pnls)[len(pnls) // 2], 2),
        "best_trade": round(max(pnls), 2),
        "worst_trade": round(min(pnls), 2),
        
        "win_rate": round(len(wins) / len(trades) * 100, 1),
        "avg_win": round(sum(wins) / len(wins), 2) if wins else 0,
        "avg_loss": round(sum(losses) / len(losses), 2) if losses else 0,
        
        "max_drawdown": dd["max_drawdown"],
        "max_drawdown_pct": dd["max_drawdown_pct"],
        
        "equity_curve": equity_curve,
        "trades": trades[:100],  # Limit for API response size
        "num_trades_total": len(trades),
    }
