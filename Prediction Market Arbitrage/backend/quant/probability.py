"""
Implied Probability Calculations
=================================

In prediction markets, the price of a contract approximates the market's
implied probability of the event occurring.

    Price of YES ≈ P(event occurs)

This is a simplification. In practice:
  - The sum YES + NO may not equal $1.00 (the "vig" or overround)
  - Market prices embed risk premia, liquidity premia, and behavioral biases
  - The "true" probability is unobservable — price is our best estimate

We provide several methods:
  1. Raw price → probability (simplest, most common)
  2. Adjusted for overround (removes the venue's implicit spread)
  3. Log-odds transformation (used in some academic work)

References:
  - Manski (2006), "Interpreting the predictions of prediction markets"
  - Wolfers & Zitzewitz (2004), "Prediction Markets"
"""
from typing import Dict, Optional
import math


def calculate_implied_probability(price: float) -> float:
    """
    Convert a contract price to implied probability.
    
    The simplest conversion: probability ≈ price.
    
    Args:
        price: Contract price in [0, 1] range (e.g., 0.62 = 62 cents)
    
    Returns:
        Implied probability as a decimal (e.g., 0.62 = 62%)
    
    Example:
        >>> calculate_implied_probability(0.62)
        0.62
    
    Why it matters:
        This is the foundational conversion in prediction market analysis.
        When Polymarket prices YES at $0.55 and Kalshi prices it at $0.62,
        they're implying 55% vs 62% probability — a 7 percentage point disagreement.
    """
    if not 0 <= price <= 1:
        raise ValueError(f"Price must be between 0 and 1, got {price}")
    return price


def calculate_overround(yes_price: float, no_price: float) -> float:
    """
    Calculate the overround (vig) of a binary market.
    
    In a perfectly efficient binary market:
        YES + NO = $1.00    (overround = 0%)
    
    In practice:
        YES + NO > $1.00    (positive overround = venue's implicit fee)
        YES + NO < $1.00    (negative overround = potential arbitrage!)
    
    Args:
        yes_price: Price of YES contract
        no_price: Price of NO contract
    
    Returns:
        Overround as a decimal (e.g., 0.03 = 3%)
    
    Example:
        >>> calculate_overround(0.52, 0.51)
        0.030000000000000027
        
        The venue is charging ~3% implicit spread.
    """
    return (yes_price + no_price) - 1.0


def calculate_adjusted_probability(yes_price: float, no_price: float) -> Dict[str, float]:
    """
    Calculate probabilities adjusted for the overround.
    
    Raw prices include the venue's spread (overround). To get "true"
    implied probabilities, we normalize by removing the overround equally
    from both sides.
    
    Method: Multiplicative normalization
        P_adj(YES) = yes_price / (yes_price + no_price)
        P_adj(NO)  = no_price / (yes_price + no_price)
    
    This ensures P_adj(YES) + P_adj(NO) = 1.0
    
    Args:
        yes_price: Price of YES contract
        no_price: Price of NO contract
    
    Returns:
        Dictionary with adjusted probabilities
    
    Example:
        >>> calculate_adjusted_probability(0.55, 0.48)
        {'yes_probability': 0.534, 'no_probability': 0.466, 'overround': 0.03}
    """
    total = yes_price + no_price
    if total == 0:
        return {"yes_probability": 0.5, "no_probability": 0.5, "overround": -1.0}
    
    return {
        "yes_probability": round(yes_price / total, 6),
        "no_probability": round(no_price / total, 6),
        "overround": round(total - 1.0, 6),
    }


def calculate_probability_edge(market_probability: float, user_probability: float) -> Dict[str, float]:
    """
    Calculate the edge between market's implied probability and user's estimate.
    
    This is where the user's view meets the market.
    
    If you believe P(event) = 68% but the market prices it at 62%,
    you perceive a +6 percentage point edge.
    
    IMPORTANT: This edge is ONLY as good as your probability estimate.
    Overconfidence in your own probability is the most common source of
    perceived "edge" that isn't real.
    
    Args:
        market_probability: Market-implied probability (from price)
        user_probability: User's estimated probability
    
    Returns:
        Dictionary with edge analysis
    
    Example:
        >>> calculate_probability_edge(0.62, 0.68)
        {
            'market_probability': 0.62,
            'user_probability': 0.68,
            'probability_edge': 0.06,
            'edge_direction': 'underpriced',
            'percentage_edge': 9.68
        }
    """
    edge = user_probability - market_probability
    
    if abs(edge) < 1e-10:
        direction = "fair"
    elif edge > 0:
        direction = "underpriced"  # Market price too low → buy YES
    else:
        direction = "overpriced"   # Market price too high → buy NO / sell YES
    
    return {
        "market_probability": round(market_probability, 6),
        "user_probability": round(user_probability, 6),
        "probability_edge": round(edge, 6),
        "edge_direction": direction,
        "percentage_edge": round((edge / market_probability) * 100, 2) if market_probability > 0 else 0,
    }


def calculate_log_odds(probability: float) -> float:
    """
    Convert probability to log-odds.
    
    log_odds = ln(p / (1 - p))
    
    Log-odds is useful because it maps [0, 1] to (-∞, +∞),
    making it easier to work with in some statistical models.
    
    Args:
        probability: Probability in (0, 1) — exclusive of 0 and 1
    
    Returns:
        Log-odds value
    
    Common mistake:
        Don't try to compute log-odds for p = 0 or p = 1. These map to ±∞.
    """
    if probability <= 0 or probability >= 1:
        raise ValueError(f"Probability must be in (0, 1) exclusive, got {probability}")
    return math.log(probability / (1 - probability))


def probability_from_log_odds(log_odds: float) -> float:
    """
    Convert log-odds back to probability.
    
    p = exp(log_odds) / (1 + exp(log_odds))
      = 1 / (1 + exp(-log_odds))
    """
    return 1.0 / (1.0 + math.exp(-log_odds))
