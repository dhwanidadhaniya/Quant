"""
Slippage Modeling
==================

Slippage is the difference between the price you EXPECT to get and the
price you ACTUALLY get when executing a trade.

WHY SLIPPAGE MATTERS:
  A $0.07 gross spread means nothing if executing a $5,000 trade
  causes $0.05 of slippage. Your "7 cent edge" is now 2 cents.

Our slippage model:
  We use a simple but realistic square-root impact model:
  
    Slippage = σ × √(Q / ADV)
  
  Where:
    σ = volatility scaling parameter (calibrated to market)
    Q = order quantity
    ADV = average daily volume (proxy for liquidity)
  
  This captures the key empirical finding:
    - Small orders have negligible slippage
    - Large orders have disproportionately high slippage
    - The relationship is concave (square root), not linear
  
  References:
    - Almgren & Chriss (2001), "Optimal Execution of Portfolio Transactions"
    - Kyle (1985), "Continuous Auctions and Insider Trading"

Something we initially got wrong:
  We first used a linear slippage model, which massively understated slippage
  for large orders and overstated it for small orders. The square-root model
  is standard in the market microstructure literature.
"""
from typing import Dict, List
import math


def estimate_slippage(
    trade_size: float,
    available_liquidity: float,
    volatility_param: float = 0.1,
    model: str = "sqrt",
) -> Dict:
    """
    Estimate slippage for a given trade size and liquidity.
    
    Args:
        trade_size: Dollar amount of the trade
        available_liquidity: Available liquidity in the order book ($)
        volatility_param: Scaling parameter (higher = more slippage)
        model: "sqrt" (square-root impact) or "linear"
    
    Returns:
        Slippage analysis
    
    Example:
        Trade: $1,000
        Liquidity: $50,000
        
        Slippage ≈ 0.1 × √(1000/50000) ≈ 0.1 × 0.1414 ≈ 1.41%
        Slippage cost = $1,000 × 0.0141 = $14.14
    
    Key insight:
        Doubling your trade size does NOT double slippage.
        It increases slippage by √2 ≈ 41%.
        This is why position sizing matters.
    """
    if available_liquidity <= 0:
        return {
            "slippage_pct": 1.0,
            "slippage_cost": trade_size,
            "execution_price_impact": 1.0,
            "model": model,
            "warning": "No liquidity available",
        }
    
    ratio = trade_size / available_liquidity
    
    if model == "sqrt":
        # Square-root impact model (industry standard)
        slippage_pct = volatility_param * math.sqrt(ratio)
    elif model == "linear":
        # Linear model (simpler but less realistic)
        slippage_pct = volatility_param * ratio
    else:
        slippage_pct = volatility_param * math.sqrt(ratio)
    
    # Cap at 100% slippage (you can't lose more than your trade)
    slippage_pct = min(slippage_pct, 1.0)
    slippage_cost = trade_size * slippage_pct
    
    return {
        "trade_size": trade_size,
        "available_liquidity": available_liquidity,
        "liquidity_ratio": round(ratio, 4),
        "slippage_pct": round(slippage_pct, 4),
        "slippage_bps": round(slippage_pct * 10000, 1),
        "slippage_cost": round(slippage_cost, 2),
        "execution_price_impact": round(slippage_pct, 4),
        "model": model,
    }


def simulate_slippage_curve(
    available_liquidity: float,
    trade_sizes: List[float] = None,
    volatility_param: float = 0.1,
) -> List[Dict]:
    """
    Generate a slippage curve showing how slippage increases with trade size.
    
    This is one of the most important visualizations in the project.
    It answers: "How much of the edge can you actually capture?"
    
    Typical finding:
        $100 trade → ~1% slippage → edge mostly intact
        $1,000 trade → ~3% slippage → edge compressed
        $10,000 trade → ~10% slippage → edge largely consumed
    """
    if trade_sizes is None:
        trade_sizes = [50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000]
    
    results = []
    for size in trade_sizes:
        if size > available_liquidity:
            continue
        slip = estimate_slippage(size, available_liquidity, volatility_param)
        results.append({
            "trade_size": size,
            "slippage_pct": slip["slippage_pct"],
            "slippage_cost": slip["slippage_cost"],
            "slippage_bps": slip["slippage_bps"],
        })
    
    return results
