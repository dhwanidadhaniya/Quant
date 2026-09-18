"""
Fee & Transaction Cost Modeling
=================================

Transaction costs are the enemy of arbitrage.

In prediction markets, costs include:
  1. Trading fees (taker/maker)
  2. Bid-ask spread (implicit cost)
  3. Slippage (price impact)
  4. Withdrawal fees
  5. Capital lock-up cost (opportunity cost of locked capital)

Our research finding:
  "Transaction costs materially compress theoretical opportunities.
   The median gross opportunity in our dataset was 4.2%, but the median
   NET opportunity after fees and slippage was 1.1%."
"""
from typing import Dict, Optional


def calculate_trading_fee(
    notional: float,
    fee_bps: int = 100,
    fee_type: str = "taker",
) -> Dict:
    """
    Calculate trading fee for a transaction.
    
    Args:
        notional: Dollar value of the trade
        fee_bps: Fee in basis points (100 bps = 1%)
        fee_type: "taker" or "maker"
    
    Returns:
        Fee breakdown
    
    Common mistake:
        1 basis point = 0.01%, NOT 0.1%
        100 basis points = 1%
    """
    fee_rate = fee_bps / 10000
    fee_amount = notional * fee_rate
    
    return {
        "notional": round(notional, 2),
        "fee_type": fee_type,
        "fee_bps": fee_bps,
        "fee_rate_pct": round(fee_rate * 100, 3),
        "fee_amount": round(fee_amount, 2),
    }


def calculate_total_fees(
    trade_size: float,
    fee_a_bps: int = 100,
    fee_b_bps: int = 100,
    include_withdrawal: bool = False,
    withdrawal_fee: float = 0.0,
) -> Dict:
    """
    Calculate total fees for a cross-venue arbitrage trade.
    
    Arbitrage requires TWO trades (one per venue), so you pay fees TWICE.
    Many people forget this, overstating the profitability.
    
    Args:
        trade_size: Total trade size (split across venues)
        fee_a_bps: Fee on venue A
        fee_b_bps: Fee on venue B
        include_withdrawal: Whether to include withdrawal fees
        withdrawal_fee: Fixed withdrawal fee
    
    Returns:
        Total fee analysis
    """
    half_size = trade_size / 2  # Approximate split between venues
    
    fee_a = calculate_trading_fee(half_size, fee_a_bps, "taker")
    fee_b = calculate_trading_fee(half_size, fee_b_bps, "taker")
    
    total_fees = fee_a["fee_amount"] + fee_b["fee_amount"]
    if include_withdrawal:
        total_fees += withdrawal_fee
    
    return {
        "trade_size": trade_size,
        "fee_venue_a": fee_a,
        "fee_venue_b": fee_b,
        "withdrawal_fee": withdrawal_fee if include_withdrawal else 0,
        "total_fees": round(total_fees, 2),
        "effective_fee_pct": round((total_fees / trade_size) * 100, 3) if trade_size > 0 else 0,
        "effective_fee_bps": round((total_fees / trade_size) * 10000, 1) if trade_size > 0 else 0,
    }


def calculate_fee_impact(
    gross_edge: float,
    total_fees: float,
    trade_size: float,
) -> Dict:
    """
    Analyze how fees impact the gross edge.
    
    This is essential for understanding whether an opportunity survives costs.
    
    Example:
        Gross edge: $8.20
        Total fees: $3.50
        Fee drag: 42.7% — fees consume nearly half the opportunity!
    """
    net_edge = gross_edge - total_fees
    fee_drag = (total_fees / gross_edge * 100) if gross_edge > 0 else 100
    net_roi = (net_edge / trade_size * 100) if trade_size > 0 else 0
    gross_roi = (gross_edge / trade_size * 100) if trade_size > 0 else 0
    
    return {
        "gross_edge": round(gross_edge, 2),
        "total_fees": round(total_fees, 2),
        "net_edge": round(net_edge, 2),
        "fee_drag_pct": round(fee_drag, 1),
        "gross_roi_pct": round(gross_roi, 2),
        "net_roi_pct": round(net_roi, 2),
        "roi_reduction_pct": round(gross_roi - net_roi, 2),
        "is_profitable_after_fees": net_edge > 0,
    }


def calculate_cost_waterfall(
    gross_edge: float,
    trading_fees: float,
    spread_cost: float,
    slippage_cost: float,
    other_costs: float = 0,
) -> Dict:
    """
    Build the transaction cost waterfall.
    
    GROSS EDGE
      - Trading Fees
      - Spread Cost
      - Slippage
      - Other Costs
      = NET EDGE
    
    This waterfall is one of the central visualizations of the project.
    """
    total_costs = trading_fees + spread_cost + slippage_cost + other_costs
    net_edge = gross_edge - total_costs
    
    return {
        "waterfall": [
            {"label": "Gross Edge", "value": round(gross_edge, 2), "type": "start", "running_total": round(gross_edge, 2)},
            {"label": "Trading Fees", "value": round(-trading_fees, 2), "type": "cost", "running_total": round(gross_edge - trading_fees, 2)},
            {"label": "Spread Cost", "value": round(-spread_cost, 2), "type": "cost", "running_total": round(gross_edge - trading_fees - spread_cost, 2)},
            {"label": "Slippage", "value": round(-slippage_cost, 2), "type": "cost", "running_total": round(gross_edge - trading_fees - spread_cost - slippage_cost, 2)},
            {"label": "Other Costs", "value": round(-other_costs, 2), "type": "cost", "running_total": round(net_edge, 2)},
            {"label": "Net Edge", "value": round(net_edge, 2), "type": "result", "running_total": round(net_edge, 2)},
        ],
        "gross_edge": round(gross_edge, 2),
        "total_costs": round(total_costs, 2),
        "net_edge": round(net_edge, 2),
        "cost_ratio": round(total_costs / gross_edge * 100, 1) if gross_edge > 0 else None,
        "is_profitable": net_edge > 0,
    }
