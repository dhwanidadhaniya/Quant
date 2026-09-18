"""
Arbitrage Detection Engine
============================

This is the core analytical module. It implements the classification pipeline:

  PRICE DIFFERENCE → MISPRICING → THEORETICAL ARBITRAGE → PRACTICAL ARBITRAGE → EXECUTABLE ARBITRAGE

Two types of arbitrage:

1. SINGLE-VENUE ARBITRAGE
   In binary markets: YES + NO should = $1.00
   If YES + NO < $1.00 → buy both → guaranteed profit (minus fees)
   If YES + NO > $1.00 → the venue is charging a spread (normal)

2. CROSS-VENUE ARBITRAGE
   Same event on two venues, different prices.
   Buy cheap on Venue A, sell expensive on Venue B.
   BUT: contracts must be equivalent (settlement, resolution, payout).

Key insight from our research:
  "We initially treated every cross-venue price difference as arbitrage.
   Contract settlement rules made several of these opportunities non-equivalent."
"""
from typing import Dict, List, Optional, Tuple
from quant.probability import calculate_implied_probability, calculate_overround
from quant.fees import calculate_total_fees
from quant.slippage import estimate_slippage


def detect_single_venue_arbitrage(
    yes_price: float,
    no_price: float,
    taker_fee_bps: int = 100,
    trade_size: float = 100.0,
) -> Dict:
    """
    Detect single-venue arbitrage in a binary contract.
    
    In a binary market, one of two outcomes occurs:
        - YES pays $1.00, NO pays $0.00
        - NO pays $1.00, YES pays $0.00
    
    If YES + NO < $1.00:
        Buying both guarantees a profit of $1.00 - (YES + NO)
        This is THEORETICAL arbitrage before costs.
    
    Args:
        yes_price: Current YES price (e.g., 0.47)
        no_price: Current NO price (e.g., 0.50)
        taker_fee_bps: Taker fee in basis points (100 = 1%)
        trade_size: Notional trade size in dollars
    
    Returns:
        Complete arbitrage analysis dictionary
    
    Example:
        YES = $0.47, NO = $0.50
        Total cost = $0.97
        Payout = $1.00
        Gross edge = $0.03 per contract
        Gross return = 3.09%
        
        Then we subtract fees, slippage...
    
    Common mistake:
        Forgetting that you pay fees on BOTH legs (YES and NO).
        A 1% fee on each leg is effectively 2% on the round-trip.
    """
    total_cost = yes_price + no_price
    payout = 1.0
    overround = calculate_overround(yes_price, no_price)
    
    # Gross edge
    gross_edge_per_contract = payout - total_cost  # Positive = arbitrage exists
    gross_return = gross_edge_per_contract / total_cost if total_cost > 0 else 0
    
    # Fee calculation — fees on both legs
    num_contracts = trade_size / total_cost if total_cost > 0 else 0
    fee_rate = taker_fee_bps / 10000
    
    # We pay fees on the total notional of both legs
    total_fees = (yes_price * num_contracts * fee_rate) + (no_price * num_contracts * fee_rate)
    fee_per_contract = total_fees / num_contracts if num_contracts > 0 else 0
    
    # Net edge
    net_edge_per_contract = gross_edge_per_contract - fee_per_contract
    net_edge_total = net_edge_per_contract * num_contracts
    net_return = net_edge_per_contract / total_cost if total_cost > 0 else 0
    
    # Classification
    if gross_edge_per_contract <= 0:
        classification = "not_arbitrage"
    elif net_edge_per_contract <= 0:
        classification = "theoretical_arbitrage"  # Positive gross, negative net
    else:
        classification = "practical_arbitrage"  # Positive net edge
    
    return {
        "type": "single_venue",
        "yes_price": yes_price,
        "no_price": no_price,
        "total_cost": round(total_cost, 4),
        "payout": payout,
        "overround": round(overround, 4),
        "overround_pct": round(overround * 100, 2),
        
        "gross_edge_per_contract": round(gross_edge_per_contract, 4),
        "gross_return_pct": round(gross_return * 100, 2),
        "gross_edge_total": round(gross_edge_per_contract * num_contracts, 2),
        
        "num_contracts": round(num_contracts, 2),
        "fee_rate_pct": round(fee_rate * 100, 2),
        "total_fees": round(total_fees, 2),
        "fee_per_contract": round(fee_per_contract, 4),
        
        "net_edge_per_contract": round(net_edge_per_contract, 4),
        "net_return_pct": round(net_return * 100, 2),
        "net_edge_total": round(net_edge_total, 2),
        
        "classification": classification,
        "is_profitable": net_edge_per_contract > 0,
        
        # Waterfall breakdown
        "cost_waterfall": {
            "gross_edge": round(gross_edge_per_contract * num_contracts, 2),
            "fees": round(-total_fees, 2),
            "net_edge": round(net_edge_total, 2),
        },
    }


def detect_cross_venue_arbitrage(
    venue_a_yes: float,
    venue_b_yes: float,
    venue_a_no: Optional[float] = None,
    venue_b_no: Optional[float] = None,
    fee_a_bps: int = 100,
    fee_b_bps: int = 100,
    liquidity_a: float = 10000,
    liquidity_b: float = 10000,
    trade_size: float = 100.0,
    equivalence_score: float = 1.0,
    slippage_model: str = "linear",
) -> Dict:
    """
    Detect cross-venue arbitrage between two venues pricing the same event.
    
    Strategy: Buy YES cheap on Venue A, buy NO cheap on Venue B
    (or equivalently: buy YES on the venue where it's cheaper)
    
    If Polymarket YES = $0.55 and Kalshi YES = $0.62:
        Buy YES on Polymarket at $0.55
        Buy NO on Kalshi at $0.38 (= 1.00 - 0.62)
        Total cost = $0.55 + $0.38 = $0.93
        Guaranteed payout = $1.00
        Gross edge = $0.07 per pair
    
    BUT this assumes:
        1. Contracts are equivalent (same event, same resolution)
        2. You can actually execute at these prices (liquidity)
        3. Fees don't eat the edge
        4. Slippage is manageable
        5. You can offset positions (settle on both venues)
    
    Args:
        venue_a_yes: YES price on venue A
        venue_b_yes: YES price on venue B
        venue_a_no: NO price on venue A (defaults to 1 - yes)
        venue_b_no: NO price on venue B (defaults to 1 - yes)
        fee_a_bps: Taker fee on venue A in basis points
        fee_b_bps: Taker fee on venue B in basis points
        liquidity_a: Available liquidity on venue A ($)
        liquidity_b: Available liquidity on venue B ($)
        trade_size: Target trade size in dollars
        equivalence_score: Contract equivalence score (0-1)
        slippage_model: Slippage model to use
    
    Returns:
        Complete cross-venue arbitrage analysis
    """
    # Default NO prices from YES prices (binary market assumption)
    if venue_a_no is None:
        venue_a_no = round(1.0 - venue_a_yes, 4)
    if venue_b_no is None:
        venue_b_no = round(1.0 - venue_b_yes, 4)
    
    # Identify the cheaper YES and cheaper NO
    # Strategy: buy YES where cheap, buy NO where cheap
    if venue_a_yes <= venue_b_yes:
        buy_yes_venue = "A"
        buy_yes_price = venue_a_yes
        buy_no_venue = "B"
        buy_no_price = venue_b_no
        buy_yes_fee_bps = fee_a_bps
        buy_no_fee_bps = fee_b_bps
        buy_yes_liquidity = liquidity_a
        buy_no_liquidity = liquidity_b
    else:
        buy_yes_venue = "B"
        buy_yes_price = venue_b_yes
        buy_no_venue = "A"
        buy_no_price = venue_a_no
        buy_yes_fee_bps = fee_b_bps
        buy_no_fee_bps = fee_a_bps
        buy_yes_liquidity = liquidity_b
        buy_no_liquidity = liquidity_a

    # Gross analysis
    total_cost = buy_yes_price + buy_no_price
    payout = 1.0
    gross_spread = abs(venue_a_yes - venue_b_yes)
    gross_edge_per_contract = payout - total_cost
    
    percentage_divergence = (gross_spread / min(venue_a_yes, venue_b_yes) * 100) if min(venue_a_yes, venue_b_yes) > 0 else 0
    
    # Execution-adjusted analysis
    num_contracts = trade_size / total_cost if total_cost > 0 else 0
    
    # Fees on both legs
    fee_yes = buy_yes_price * num_contracts * (buy_yes_fee_bps / 10000)
    fee_no = buy_no_price * num_contracts * (buy_no_fee_bps / 10000)
    total_fees = fee_yes + fee_no
    
    # Slippage estimation (simplified — uses trade_size relative to liquidity)
    slippage_yes = estimate_slippage(trade_size / 2, buy_yes_liquidity)
    slippage_no = estimate_slippage(trade_size / 2, buy_no_liquidity)
    total_slippage_cost = (slippage_yes["slippage_cost"] + slippage_no["slippage_cost"])
    
    # Spread cost (implicit cost of crossing the bid-ask)
    spread_cost = 0.005 * num_contracts  # ~0.5¢ per contract average
    
    # Total costs
    total_transaction_cost = total_fees + total_slippage_cost + spread_cost
    
    # Net edge
    gross_edge_total = gross_edge_per_contract * num_contracts
    net_edge_total = gross_edge_total - total_transaction_cost
    net_edge_per_contract = net_edge_total / num_contracts if num_contracts > 0 else 0
    net_roi = net_edge_total / trade_size if trade_size > 0 else 0
    cost_drag = total_transaction_cost / gross_edge_total if gross_edge_total > 0 else float("inf")
    
    # Liquidity constraint
    min_liquidity = min(buy_yes_liquidity, buy_no_liquidity)
    max_executable_size = min_liquidity * 0.1  # Conservative: max 10% of book
    
    # Classification
    if gross_edge_per_contract <= 0:
        classification = "not_arbitrage"
    elif equivalence_score < 0.8:
        classification = "insufficient_info"
    elif net_edge_per_contract <= 0:
        classification = "theoretical_arbitrage"
    elif trade_size > max_executable_size:
        classification = "practical_arbitrage"  # Edge exists but size limited
    else:
        classification = "executable_arbitrage"
    
    # Execution difficulty
    if min_liquidity > trade_size * 10:
        execution_difficulty = "easy"
    elif min_liquidity > trade_size * 3:
        execution_difficulty = "medium"
    elif min_liquidity > trade_size:
        execution_difficulty = "hard"
    else:
        execution_difficulty = "infeasible"
    
    # Risk assessment
    if equivalence_score >= 0.95:
        equivalence_risk = "low"
    elif equivalence_score >= 0.85:
        equivalence_risk = "medium"
    else:
        equivalence_risk = "high"
    
    return {
        "type": "cross_venue",
        
        "venue_a_yes": venue_a_yes,
        "venue_b_yes": venue_b_yes,
        "venue_a_no": venue_a_no,
        "venue_b_no": venue_b_no,
        
        "buy_yes_venue": buy_yes_venue,
        "buy_yes_price": buy_yes_price,
        "buy_no_venue": buy_no_venue,
        "buy_no_price": buy_no_price,
        
        "gross_spread": round(gross_spread, 4),
        "gross_spread_cents": round(gross_spread * 100, 1),
        "percentage_divergence": round(percentage_divergence, 2),
        
        "total_cost_per_pair": round(total_cost, 4),
        "gross_edge_per_contract": round(gross_edge_per_contract, 4),
        "gross_edge_total": round(gross_edge_total, 2),
        
        "num_contracts": round(num_contracts, 2),
        
        "fees": {
            "fee_yes": round(fee_yes, 2),
            "fee_no": round(fee_no, 2),
            "total": round(total_fees, 2),
        },
        "slippage": {
            "slippage_yes_pct": round(slippage_yes["slippage_pct"], 4),
            "slippage_no_pct": round(slippage_no["slippage_pct"], 4),
            "total_cost": round(total_slippage_cost, 2),
        },
        "spread_cost": round(spread_cost, 2),
        "total_transaction_cost": round(total_transaction_cost, 2),
        
        "net_edge_per_contract": round(net_edge_per_contract, 4),
        "net_edge_total": round(net_edge_total, 2),
        "net_roi_pct": round(net_roi * 100, 2),
        "cost_drag_pct": round(cost_drag * 100, 2) if cost_drag != float("inf") else None,
        
        "min_liquidity": round(min_liquidity, 2),
        "max_executable_size": round(max_executable_size, 2),
        
        "equivalence_score": equivalence_score,
        "equivalence_risk": equivalence_risk,
        
        "classification": classification,
        "execution_difficulty": execution_difficulty,
        "is_profitable": net_edge_per_contract > 0,
        
        # Cost waterfall for visualization
        "cost_waterfall": [
            {"label": "Gross Edge", "value": round(gross_edge_total, 2), "type": "positive"},
            {"label": "Trading Fees", "value": round(-total_fees, 2), "type": "negative"},
            {"label": "Slippage", "value": round(-total_slippage_cost, 2), "type": "negative"},
            {"label": "Spread Cost", "value": round(-spread_cost, 2), "type": "negative"},
            {"label": "Net Edge", "value": round(net_edge_total, 2), "type": "result"},
        ],
    }


def classify_opportunity(
    gross_edge: float,
    net_edge: float,
    equivalence_score: float,
    liquidity: float,
    trade_size: float,
) -> str:
    """
    Classify an opportunity through the full pipeline.
    
    PRICE DIFFERENCE → MISPRICING → THEORETICAL → PRACTICAL → EXECUTABLE
    
    This function makes the key intellectual distinction of the project:
    not every price difference is an arbitrage opportunity.
    """
    if gross_edge <= 0:
        return "price_difference"  # No edge at all
    
    if equivalence_score < 0.7:
        return "insufficient_info"  # Can't verify contract equivalence
    
    if equivalence_score < 0.9:
        return "mispricing"  # Might be different contracts
    
    if net_edge <= 0:
        return "theoretical_arbitrage"  # Edge exists pre-cost but not post-cost
    
    if liquidity < trade_size:
        return "practical_arbitrage"  # Net edge exists but can't execute at size
    
    return "executable_arbitrage"  # Everything checks out
