"""
Expected Value Calculations
=============================

Expected value (EV) is the average outcome you'd expect if you could
repeat the trade infinitely many times.

    EV = P(win) × Payoff_win - P(loss) × Payoff_loss

Or equivalently:

    EV = p × R - C

Where:
    p = probability of winning
    R = payout if correct
    C = cost of the position (including fees)

IMPORTANT:
  Positive EV is NECESSARY but NOT SUFFICIENT for a good trade.
  You also need:
    - Correct probability estimate (your p might be wrong)
    - Sufficient sample size (EV converges over many trades)
    - Proper position sizing (one trade shouldn't risk ruin)
    - Liquidity to execute
"""
from typing import Dict


def calculate_expected_value(
    probability: float,
    price: float,
    payout: float = 1.0,
    fees: float = 0.0,
) -> Dict:
    """
    Calculate the expected value of a prediction market position.
    
    Args:
        probability: Your estimated probability of YES occurring (0-1)
        price: Price you pay for the YES contract
        payout: Payout if YES occurs ($1.00 for standard binary)
        fees: Total fees for the trade
    
    Returns:
        Expected value analysis
    
    Example:
        You believe P(YES) = 68%
        Price = $0.62
        Payout = $1.00
        Fees = $0.01
        
        EV = 0.68 × ($1.00 - $0.62 - $0.01) - (1 - 0.68) × ($0.62 + $0.01)
           = 0.68 × $0.37 - 0.32 × $0.63
           = $0.2516 - $0.2016
           = +$0.0500 per contract
        
        This is a positive EV trade — but only if your probability is right!
    
    Common mistake:
        Confusing EV per dollar with EV per contract.
        EV per contract tells you the expected profit per $1 payout contract.
        EV per dollar tells you the return on invested capital.
    """
    total_cost = price + fees
    
    # What you gain if correct
    profit_if_win = payout - total_cost
    
    # What you lose if wrong
    loss_if_lose = total_cost
    
    # Expected value
    ev = probability * profit_if_win - (1 - probability) * loss_if_lose
    
    # Expected return (% return on invested capital)
    expected_return = ev / total_cost if total_cost > 0 else 0
    
    # Break-even probability
    # At break-even: p × (payout - cost) = (1-p) × cost
    # Solving: p = cost / payout
    break_even_prob = total_cost / payout if payout > 0 else 1.0
    
    return {
        "probability": probability,
        "price": price,
        "payout": payout,
        "fees": fees,
        "total_cost": round(total_cost, 4),
        
        "profit_if_win": round(profit_if_win, 4),
        "loss_if_lose": round(loss_if_lose, 4),
        
        "expected_value": round(ev, 4),
        "expected_return_pct": round(expected_return * 100, 2),
        "break_even_probability": round(break_even_prob, 4),
        "break_even_pct": round(break_even_prob * 100, 2),
        
        "probability_edge": round(probability - break_even_prob, 4),
        "edge_pct": round((probability - break_even_prob) * 100, 2),
        
        "is_positive_ev": ev > 0,
        "assessment": _assess_ev(ev, probability, break_even_prob),
    }


def _assess_ev(ev: float, prob: float, break_even: float) -> str:
    """Generate a professional assessment of the EV."""
    edge = prob - break_even
    
    if ev <= 0:
        return "Negative expected value. Not recommended under current probability assumptions."
    elif edge < 0.02:
        return "Marginally positive EV. Edge is thin — small errors in probability estimate could flip this negative."
    elif edge < 0.05:
        return "Moderately positive EV. Reasonable edge, but sizing should account for estimation uncertainty."
    elif edge < 0.10:
        return "Attractive positive EV. Meaningful edge over the market price."
    else:
        return "Highly attractive EV — verify probability assumptions carefully. Large perceived edges often reflect model risk."


def calculate_ev_sensitivity(
    price: float,
    probabilities: list = None,
    payout: float = 1.0,
    fees: float = 0.0,
) -> list:
    """
    Show how EV changes as your probability estimate changes.
    
    This is critical for understanding model risk.
    If your EV goes negative at p = 0.65 but you estimated p = 0.68,
    you need to be very confident in that 3 percentage point edge.
    """
    if probabilities is None:
        probabilities = [i / 100 for i in range(10, 95, 5)]
    
    results = []
    for p in probabilities:
        ev = calculate_expected_value(p, price, payout, fees)
        results.append({
            "probability": p,
            "probability_pct": round(p * 100, 0),
            "expected_value": ev["expected_value"],
            "expected_return_pct": ev["expected_return_pct"],
            "is_positive": ev["is_positive_ev"],
        })
    
    return results
