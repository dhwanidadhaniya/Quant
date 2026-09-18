"""
Risk Analysis Engine
=====================

Risk analysis answers: "What can go wrong?"

In prediction market arbitrage, risks include:

1. EXECUTION RISK — Can you actually fill both legs?
2. LIQUIDITY RISK — Will the order book support your size?
3. SETTLEMENT RISK — Will both venues settle the same way?
4. CONTRACT RISK — Are the contracts truly equivalent?
5. PLATFORM RISK — Will the venue be available when needed?
6. MODEL RISK — Are our calculations correct?
7. TIMING RISK — Will the opportunity last long enough?
8. CAPITAL LOCK-UP RISK — How long is capital tied up?

Each risk is assessed as LOW / MEDIUM / HIGH with explanations.
"""
from typing import Dict, List


def calculate_risk_matrix(
    liquidity: float,
    trade_size: float,
    equivalence_score: float,
    net_edge_pct: float,
    opportunity_duration_seconds: float,
    num_venues: int = 2,
) -> Dict:
    """
    Generate a comprehensive risk assessment matrix.
    
    Returns individual risk ratings and an overall risk score.
    """
    risks = []
    
    # 1. Execution Risk
    liq_ratio = trade_size / liquidity if liquidity > 0 else float("inf")
    if liq_ratio < 0.05:
        exec_risk = "low"
        exec_reason = "Trade size is well within available liquidity"
    elif liq_ratio < 0.2:
        exec_risk = "medium"
        exec_reason = "Trade size is a meaningful fraction of available liquidity"
    else:
        exec_risk = "high"
        exec_reason = "Trade size exceeds comfortable execution threshold"
    risks.append({"name": "Execution Risk", "level": exec_risk, "reason": exec_reason, "category": "execution"})
    
    # 2. Liquidity Risk
    if liquidity > 50000:
        liq_risk = "low"
        liq_reason = "Deep liquidity available on both sides"
    elif liquidity > 10000:
        liq_risk = "medium"
        liq_reason = "Moderate liquidity — slippage may be significant for larger orders"
    else:
        liq_risk = "high"
        liq_reason = "Thin liquidity — even small orders may face significant price impact"
    risks.append({"name": "Liquidity Risk", "level": liq_risk, "reason": liq_reason, "category": "market"})
    
    # 3. Settlement Risk
    if equivalence_score >= 0.95:
        settle_risk = "low"
        settle_reason = "Contracts appear to settle on the same criteria"
    elif equivalence_score >= 0.85:
        settle_risk = "medium"
        settle_reason = "Minor differences in settlement criteria — review carefully"
    else:
        settle_risk = "high"
        settle_reason = "Significant differences in settlement rules may cause divergent outcomes"
    risks.append({"name": "Settlement Risk", "level": settle_risk, "reason": settle_reason, "category": "contract"})
    
    # 4. Contract Equivalence Risk
    if equivalence_score >= 0.95:
        contract_risk = "low"
        contract_reason = "Contracts are closely matched on all dimensions"
    elif equivalence_score >= 0.80:
        contract_risk = "medium"
        contract_reason = "Some contract terms differ — verify resolution rules"
    else:
        contract_risk = "high"
        contract_reason = "Contracts may not be equivalent — apparent spread could reflect genuine difference"
    risks.append({"name": "Contract Risk", "level": contract_risk, "reason": contract_reason, "category": "contract"})
    
    # 5. Platform Risk
    platform_risk = "medium"
    platform_reason = "Platform availability, API reliability, and regulatory status are external dependencies"
    risks.append({"name": "Platform Risk", "level": platform_risk, "reason": platform_reason, "category": "operational"})
    
    # 6. Model Risk
    if net_edge_pct > 5:
        model_risk = "high"
        model_reason = "Large perceived edge — more likely to reflect model error than genuine opportunity"
    elif net_edge_pct > 2:
        model_risk = "medium"
        model_reason = "Moderate edge — within plausible range but verify assumptions"
    else:
        model_risk = "low"
        model_reason = "Small edge consistent with normal market friction differences"
    risks.append({"name": "Model Risk", "level": model_risk, "reason": model_reason, "category": "analytical"})
    
    # 7. Timing Risk
    if opportunity_duration_seconds > 120:
        timing_risk = "low"
        timing_reason = "Opportunity persists long enough for comfortable execution"
    elif opportunity_duration_seconds > 30:
        timing_risk = "medium"
        timing_reason = "Limited time window — prompt execution required"
    else:
        timing_risk = "high"
        timing_reason = "Very short-lived opportunity — may expire before execution completes"
    risks.append({"name": "Timing Risk", "level": timing_risk, "reason": timing_reason, "category": "execution"})
    
    # 8. Capital Lock-Up Risk
    lockup_risk = "medium"
    lockup_reason = "Capital is locked until event resolution — opportunity cost applies"
    risks.append({"name": "Capital Lock-Up Risk", "level": lockup_risk, "reason": lockup_reason, "category": "financial"})
    
    # Overall risk
    risk_scores = {"low": 1, "medium": 2, "high": 3}
    avg_score = sum(risk_scores[r["level"]] for r in risks) / len(risks)
    
    if avg_score < 1.5:
        overall = "low"
    elif avg_score < 2.3:
        overall = "medium"
    else:
        overall = "high"
    
    return {
        "risks": risks,
        "overall_risk": overall,
        "risk_score": round(avg_score, 2),
        "num_high": sum(1 for r in risks if r["level"] == "high"),
        "num_medium": sum(1 for r in risks if r["level"] == "medium"),
        "num_low": sum(1 for r in risks if r["level"] == "low"),
    }


def calculate_drawdown(equity_curve: List[float]) -> Dict:
    """
    Calculate maximum drawdown from an equity curve.
    
    Maximum Drawdown = (Peak - Trough) / Peak
    
    This is the largest peak-to-trough decline, measuring the worst
    loss you would have experienced.
    
    Args:
        equity_curve: List of portfolio values over time
    
    Returns:
        Drawdown analysis
    """
    if not equity_curve or len(equity_curve) < 2:
        return {"max_drawdown": 0, "max_drawdown_pct": 0}
    
    peak = equity_curve[0]
    max_dd = 0
    max_dd_pct = 0
    peak_idx = 0
    trough_idx = 0
    
    drawdown_series = []
    
    for i, value in enumerate(equity_curve):
        if value > peak:
            peak = value
            peak_idx = i
        
        dd = peak - value
        dd_pct = dd / peak if peak > 0 else 0
        drawdown_series.append(round(dd_pct, 4))
        
        if dd > max_dd:
            max_dd = dd
            max_dd_pct = dd_pct
            trough_idx = i
    
    return {
        "max_drawdown": round(max_dd, 2),
        "max_drawdown_pct": round(max_dd_pct * 100, 2),
        "peak_value": round(peak, 2),
        "trough_value": round(equity_curve[trough_idx], 2) if trough_idx < len(equity_curve) else None,
        "drawdown_series": drawdown_series,
    }
