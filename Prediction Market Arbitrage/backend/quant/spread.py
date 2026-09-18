"""
Spread Analysis
================

Spread analysis is about understanding the price gap between venues or
between bid and ask prices.

IMPORTANT DISTINCTION:
  Spread ≠ Edge ≠ Arbitrage

  A spread tells you prices differ.
  An edge tells you the difference exceeds costs.
  Arbitrage tells you the edge is executable.
"""
from typing import Dict, List


def calculate_cross_venue_spread(price_a: float, price_b: float) -> Dict:
    """
    Calculate the spread between two venues pricing the same event.
    
    Spread = |P_a - P_b|
    
    Args:
        price_a: YES price on venue A
        price_b: YES price on venue B
    
    Returns:
        Spread analysis
    
    Example:
        Polymarket YES = $0.55
        Kalshi YES = $0.62
        Spread = $0.07 (7 cents)
        
    Why it matters:
        The spread is the starting point for arbitrage analysis.
        But a 7¢ spread does NOT mean 7¢ of profit.
    """
    spread = abs(price_a - price_b)
    higher = max(price_a, price_b)
    lower = min(price_a, price_b)
    mid = (price_a + price_b) / 2
    
    return {
        "spread": round(spread, 4),
        "spread_cents": round(spread * 100, 1),
        "higher_price": higher,
        "lower_price": lower,
        "mid_price": round(mid, 4),
        "percentage_spread": round((spread / lower) * 100, 2) if lower > 0 else 0,
        "percentage_of_mid": round((spread / mid) * 100, 2) if mid > 0 else 0,
    }


def calculate_bid_ask_spread(best_bid: float, best_ask: float) -> Dict:
    """
    Calculate the bid-ask spread for a single contract.
    
    Spread = Ask - Bid
    Mid = (Bid + Ask) / 2
    
    The bid-ask spread is the market maker's compensation.
    It's also a cost you pay every time you trade.
    
    A tight spread means the market is liquid and competitive.
    A wide spread means the market is illiquid or there's uncertainty.
    """
    if best_bid > best_ask:
        # Crossed market — unusual but can happen briefly
        spread = 0
    else:
        spread = best_ask - best_bid
    
    mid = (best_bid + best_ask) / 2
    spread_bps = (spread / mid) * 10000 if mid > 0 else 0
    
    return {
        "best_bid": best_bid,
        "best_ask": best_ask,
        "spread": round(spread, 4),
        "mid_price": round(mid, 4),
        "spread_bps": round(spread_bps, 1),
        "spread_pct": round(spread_bps / 100, 2),
        "is_crossed": best_bid > best_ask,
    }


def calculate_spread_history_metrics(spreads: List[float]) -> Dict:
    """
    Compute summary statistics on historical spread data.
    
    Useful for understanding how spreads behave over time:
    - Do they widen during events?
    - How tight are they normally?
    - What's the typical range?
    """
    if not spreads:
        return {"error": "No spread data provided"}
    
    sorted_spreads = sorted(spreads)
    n = len(sorted_spreads)
    
    return {
        "count": n,
        "mean": round(sum(spreads) / n, 4),
        "median": round(sorted_spreads[n // 2], 4),
        "min": round(sorted_spreads[0], 4),
        "max": round(sorted_spreads[-1], 4),
        "p25": round(sorted_spreads[int(n * 0.25)], 4),
        "p75": round(sorted_spreads[int(n * 0.75)], 4),
        "p90": round(sorted_spreads[int(n * 0.90)], 4),
        "range": round(sorted_spreads[-1] - sorted_spreads[0], 4),
    }
