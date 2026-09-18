"""
Liquidity Analysis
===================

Liquidity is arguably the most important practical constraint on arbitrage.

A prediction market might show a 10% price discrepancy, but if there's only
$50 of liquidity at that price, the opportunity is economically meaningless
for any reasonable trade size.

Our analysis showed:
  "Liquidity appears to be a major constraint on executable arbitrage.
   Many apparent opportunities exist only at illiquid price levels."

Key metrics:
  - Total liquidity ($ available in the book)
  - Depth at various levels ($ within X% of mid)
  - Bid-ask spread (tightness indicates competitive liquidity)
  - Volume (trading activity as a proxy for liquidity replenishment)
"""
from typing import Dict, List


def calculate_liquidity_metrics(
    bid_levels: List[Dict],
    ask_levels: List[Dict],
) -> Dict:
    """
    Calculate comprehensive liquidity metrics from order book data.
    
    Args:
        bid_levels: List of {"price": float, "quantity": float} (descending price)
        ask_levels: List of {"price": float, "quantity": float} (ascending price)
    
    Returns:
        Liquidity analysis
    
    Why it matters:
        - Total liquidity tells you the maximum you could possibly trade
        - Depth near the mid-price tells you how much you can trade without
          significant price impact
        - The spread tells you the implicit cost of immediacy
    """
    if not bid_levels or not ask_levels:
        return {
            "total_liquidity": 0,
            "bid_liquidity": 0,
            "ask_liquidity": 0,
            "spread": None,
            "mid_price": None,
            "warning": "Insufficient order book data",
        }
    
    # Best bid/ask
    best_bid = bid_levels[0]["price"]
    best_ask = ask_levels[0]["price"]
    mid_price = (best_bid + best_ask) / 2
    spread = best_ask - best_bid
    
    # Total liquidity
    bid_liquidity = sum(l["price"] * l["quantity"] for l in bid_levels)
    ask_liquidity = sum(l["price"] * l["quantity"] for l in ask_levels)
    total_liquidity = bid_liquidity + ask_liquidity
    
    # Depth at various levels from mid
    depth = {}
    for pct in [1, 2, 5, 10]:
        upper = mid_price * (1 + pct / 100)
        lower = mid_price * (1 - pct / 100)
        
        bid_depth = sum(
            l["price"] * l["quantity"]
            for l in bid_levels
            if l["price"] >= lower
        )
        ask_depth = sum(
            l["price"] * l["quantity"]
            for l in ask_levels
            if l["price"] <= upper
        )
        depth[f"depth_{pct}pct"] = round(bid_depth + ask_depth, 2)
    
    return {
        "best_bid": best_bid,
        "best_ask": best_ask,
        "mid_price": round(mid_price, 4),
        "spread": round(spread, 4),
        "spread_bps": round((spread / mid_price) * 10000, 1) if mid_price > 0 else 0,
        "bid_liquidity": round(bid_liquidity, 2),
        "ask_liquidity": round(ask_liquidity, 2),
        "total_liquidity": round(total_liquidity, 2),
        "num_bid_levels": len(bid_levels),
        "num_ask_levels": len(ask_levels),
        **depth,
    }


def calculate_liquidity_adjusted_edge(
    gross_edge_pct: float,
    trade_size: float,
    available_liquidity: float,
    min_acceptable_liquidity_ratio: float = 0.1,
) -> Dict:
    """
    Adjust the edge for liquidity constraints.
    
    The key question: "Can I actually TRADE at this edge?"
    
    If trade_size / liquidity > 10%, the market probably can't absorb
    your order without significant price impact.
    
    Args:
        gross_edge_pct: Gross edge percentage
        trade_size: Desired trade size in $
        available_liquidity: Total available liquidity in $
        min_acceptable_liquidity_ratio: Minimum liquidity ratio to consider tradeable
    
    Returns:
        Liquidity-adjusted edge analysis
    """
    if available_liquidity <= 0:
        return {
            "liquidity_ratio": 0,
            "is_tradeable": False,
            "adjusted_edge_pct": 0,
            "max_reasonable_size": 0,
            "warning": "No liquidity available",
        }
    
    liquidity_ratio = trade_size / available_liquidity
    
    # Liquidity discount: edge is reduced as liquidity ratio increases
    # At 0% ratio: full edge captured
    # At 10% ratio: ~70% of edge captured
    # At 50% ratio: ~29% of edge captured
    # At 100% ratio: 0% captured
    import math
    liquidity_discount = max(0, 1 - math.sqrt(liquidity_ratio))
    adjusted_edge = gross_edge_pct * liquidity_discount
    
    # Maximum reasonable trade size (10% of book as rule of thumb)
    max_reasonable_size = available_liquidity * min_acceptable_liquidity_ratio
    
    is_tradeable = (
        liquidity_ratio <= 0.5 and  # Don't try to take more than 50% of the book
        available_liquidity >= 100   # Minimum $100 of liquidity
    )
    
    return {
        "gross_edge_pct": round(gross_edge_pct, 2),
        "trade_size": trade_size,
        "available_liquidity": available_liquidity,
        "liquidity_ratio": round(liquidity_ratio, 4),
        "liquidity_discount": round(liquidity_discount, 4),
        "adjusted_edge_pct": round(adjusted_edge, 2),
        "edge_captured_pct": round(liquidity_discount * 100, 1),
        "max_reasonable_size": round(max_reasonable_size, 2),
        "is_tradeable": is_tradeable,
    }
