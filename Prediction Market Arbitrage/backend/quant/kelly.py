"""
Kelly Criterion & Position Sizing
====================================

The Kelly Criterion answers: "How much of my capital should I bet?"

Formula:
    f* = (b × p - q) / b

Where:
    f* = fraction of capital to wager
    b  = odds received (payout / cost - 1)
    p  = probability of winning
    q  = probability of losing (1 - p)

Properties:
    - Maximizes long-run geometric growth rate
    - Never risks total ruin (mathematically)
    - Very sensitive to probability estimates

WHY FRACTIONAL KELLY?
    Full Kelly is mathematically optimal... IF your probability estimate
    is exactly correct. In practice, probabilities are estimated with
    uncertainty. A small error in p can lead to massive over-betting.
    
    Industry standard:
        Half Kelly (f*/2) — reduces risk substantially with modest growth sacrifice
        Quarter Kelly (f*/4) — very conservative, suitable for uncertain probabilities

References:
    - Kelly (1956), "A New Interpretation of Information Rate"
    - Thorp (2006), "The Kelly Criterion in Blackjack, Sports Betting, and the Stock Market"
"""
from typing import Dict, List


def calculate_kelly_fraction(
    probability: float,
    price: float,
    payout: float = 1.0,
) -> Dict:
    """
    Calculate the Kelly optimal fraction.
    
    Args:
        probability: Your estimated probability of winning (0-1)
        price: Cost per contract
        payout: Payout if correct
    
    Returns:
        Kelly analysis with full, half, and quarter fractions
    
    Example:
        P(win) = 68%
        Price = $0.62
        Payout = $1.00
        
        b = ($1.00 / $0.62) - 1 = 0.6129
        f* = (0.6129 × 0.68 - 0.32) / 0.6129
           = (0.4168 - 0.32) / 0.6129
           = 0.0968 / 0.6129
           = 0.158 (15.8% of capital)
        
        Half Kelly = 7.9%
        Quarter Kelly = 3.95%
    
    Common mistakes:
        1. Using full Kelly with uncertain probabilities → over-betting
        2. Forgetting that Kelly assumes you can repeat the bet many times
        3. Not adjusting for fees in the payout calculation
    """
    if price <= 0 or price >= payout:
        return {
            "kelly_fraction": 0,
            "error": "Price must be between 0 and payout",
        }
    
    q = 1 - probability
    b = (payout / price) - 1  # Odds received
    
    # Kelly formula: f* = (bp - q) / b
    kelly = (b * probability - q) / b
    
    # Kelly can be negative (meaning the bet has negative EV — don't bet)
    kelly = max(0, kelly)
    
    return {
        "probability": probability,
        "price": price,
        "payout": payout,
        "odds": round(b, 4),
        
        # Kelly fractions
        "full_kelly": round(kelly, 4),
        "full_kelly_pct": round(kelly * 100, 2),
        "half_kelly": round(kelly / 2, 4),
        "half_kelly_pct": round(kelly * 100 / 2, 2),
        "quarter_kelly": round(kelly / 4, 4),
        "quarter_kelly_pct": round(kelly * 100 / 4, 2),
        
        # Is the bet worth taking?
        "is_positive_edge": kelly > 0,
        "edge_assessment": _kelly_assessment(kelly),
    }


def calculate_position_size(
    capital: float,
    probability: float,
    price: float,
    payout: float = 1.0,
    kelly_fraction_type: str = "half",
    fees_per_contract: float = 0.0,
) -> Dict:
    """
    Calculate concrete position size in dollar terms.
    
    This translates the abstract Kelly fraction into an actionable position.
    
    Args:
        capital: Total available capital ($)
        probability: Estimated probability
        price: Contract price
        payout: Contract payout
        kelly_fraction_type: "full", "half", "quarter"
        fees_per_contract: Fees per contract (reduces effective payout)
    
    Returns:
        Position sizing recommendation
    """
    # Adjust payout for fees
    effective_payout = payout - fees_per_contract
    
    kelly = calculate_kelly_fraction(probability, price, effective_payout)
    
    # Select fraction
    fraction_map = {
        "full": kelly["full_kelly"],
        "half": kelly["half_kelly"],
        "quarter": kelly["quarter_kelly"],
    }
    selected_fraction = fraction_map.get(kelly_fraction_type, kelly["half_kelly"])
    
    # Position size
    position_dollars = capital * selected_fraction
    num_contracts = position_dollars / price if price > 0 else 0
    
    # Risk metrics
    capital_at_risk = position_dollars
    max_loss = position_dollars  # Worst case: entire position lost
    expected_gain = num_contracts * (probability * (effective_payout - price) - (1 - probability) * price)
    
    return {
        "capital": capital,
        "kelly_type": kelly_fraction_type,
        "kelly_fraction": round(selected_fraction, 4),
        "kelly_fraction_pct": round(selected_fraction * 100, 2),
        
        "position_dollars": round(position_dollars, 2),
        "num_contracts": round(num_contracts, 1),
        
        "capital_at_risk": round(capital_at_risk, 2),
        "capital_at_risk_pct": round((capital_at_risk / capital) * 100, 2) if capital > 0 else 0,
        "max_loss": round(max_loss, 2),
        "expected_gain": round(expected_gain, 2),
        
        "probability": probability,
        "price": price,
        "effective_payout": effective_payout,
        
        **{k: v for k, v in kelly.items() if k not in ["probability", "price", "payout"]},
    }


def kelly_growth_curve(
    probability: float,
    price: float,
    payout: float = 1.0,
    fractions: List[float] = None,
) -> List[Dict]:
    """
    Show expected geometric growth rate at different position fractions.
    
    This visualization demonstrates WHY Kelly is optimal:
    - Too small: slow growth (leaving money on the table)
    - Kelly: maximum growth rate
    - Too large: growth actually DECREASES (over-betting hurts!)
    - 2× Kelly: zero expected growth (you're just gambling)
    - >2× Kelly: NEGATIVE expected growth (you'll go broke)
    """
    if fractions is None:
        fractions = [i / 100 for i in range(0, 105, 5)]
    
    q = 1 - probability
    b = (payout / price) - 1
    
    results = []
    for f in fractions:
        # Geometric growth rate: g = p × log(1 + fb) + q × log(1 - f)
        import math
        if f >= 1:
            growth = float("-inf")
        elif f <= 0:
            growth = 0
        else:
            try:
                growth = probability * math.log(1 + f * b) + q * math.log(1 - f)
            except (ValueError, ZeroDivisionError):
                growth = float("-inf")
        
        results.append({
            "fraction": round(f, 2),
            "fraction_pct": round(f * 100, 1),
            "expected_growth_rate": round(growth, 6) if growth != float("-inf") else None,
            "label": _fraction_label(f, probability, price, payout),
        })
    
    return results


def _fraction_label(f: float, p: float, price: float, payout: float) -> str:
    """Label special points on the Kelly curve."""
    q = 1 - p
    b = (payout / price) - 1
    kelly = (b * p - q) / b if b > 0 else 0
    kelly = max(0, kelly)
    
    if abs(f - kelly) < 0.02:
        return "Full Kelly ★"
    elif abs(f - kelly / 2) < 0.02:
        return "Half Kelly"
    elif abs(f - kelly / 4) < 0.02:
        return "Quarter Kelly"
    return ""


def _kelly_assessment(kelly: float) -> str:
    """Assess the Kelly recommendation."""
    if kelly <= 0:
        return "No bet. Expected value is negative or zero."
    elif kelly < 0.02:
        return "Marginal edge. Very small position recommended."
    elif kelly < 0.05:
        return "Moderate edge. Use half or quarter Kelly for safety."
    elif kelly < 0.15:
        return "Good edge. Half Kelly recommended for practical sizing."
    elif kelly < 0.25:
        return "Strong edge. Still use fractional Kelly — probability estimates have uncertainty."
    else:
        return "Very large Kelly — double-check probability assumptions. Oversized Kelly often indicates overconfident probability estimates."
