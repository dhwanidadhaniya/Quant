"""
Portfolio Analytics
====================

P&L analytics for the simulated arbitrage portfolio.
"""
from typing import Dict, List
import math


def calculate_portfolio_analytics(trades: List[Dict], initial_capital: float = 10000.0) -> Dict:
    """
    Calculate comprehensive portfolio performance metrics.
    """
    if not trades:
        return {"message": "No trades to analyze"}
    
    pnls = [t.get("net_pnl", 0) for t in trades]
    cumulative = []
    running = 0
    for p in pnls:
        running += p
        cumulative.append(round(running, 2))
    
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p <= 0]
    
    total_pnl = sum(pnls)
    avg_pnl = total_pnl / len(pnls) if pnls else 0
    
    # Standard deviation of P&L
    if len(pnls) > 1:
        mean = avg_pnl
        variance = sum((p - mean) ** 2 for p in pnls) / (len(pnls) - 1)
        std_dev = math.sqrt(variance)
    else:
        std_dev = 0
    
    return {
        "total_pnl": round(total_pnl, 2),
        "total_return_pct": round((total_pnl / initial_capital) * 100, 2),
        "num_trades": len(trades),
        "avg_pnl": round(avg_pnl, 2),
        "median_pnl": round(sorted(pnls)[len(pnls)//2], 2),
        "std_dev": round(std_dev, 2),
        "best_trade": round(max(pnls), 2),
        "worst_trade": round(min(pnls), 2),
        "win_rate": round(len(wins) / len(trades) * 100, 1) if trades else 0,
        "avg_win": round(sum(wins) / len(wins), 2) if wins else 0,
        "avg_loss": round(sum(losses) / len(losses), 2) if losses else 0,
        "profit_factor": round(sum(wins) / abs(sum(losses)), 2) if losses and sum(losses) != 0 else None,
        "cumulative_pnl": cumulative,
        "pnl_distribution": {
            "values": pnls,
            "bins": _histogram(pnls, 20),
        },
    }


def _histogram(values: List[float], num_bins: int) -> List[Dict]:
    """Create histogram bins for distribution visualization."""
    if not values:
        return []
    
    min_val = min(values)
    max_val = max(values)
    if min_val == max_val:
        return [{"bin_start": min_val, "bin_end": max_val, "count": len(values)}]
    
    bin_width = (max_val - min_val) / num_bins
    bins = []
    for i in range(num_bins):
        bin_start = min_val + i * bin_width
        bin_end = bin_start + bin_width
        count = sum(1 for v in values if bin_start <= v < bin_end)
        if i == num_bins - 1:
            count = sum(1 for v in values if bin_start <= v <= bin_end)
        bins.append({
            "bin_start": round(bin_start, 2),
            "bin_end": round(bin_end, 2),
            "count": count,
        })
    return bins
