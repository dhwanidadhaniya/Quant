"""
Contract Equivalence Engine
==============================

This is one of the most intellectually important modules.

Two contracts on "the same event" are NOT necessarily equivalent.
Differences in settlement, resolution, or payout can make apparently
identical contracts economically distinct — meaning a price difference
is NOT arbitrage.

We score equivalence across multiple dimensions:
1. Resolution criteria (how the outcome is determined)
2. Settlement source (who/what is the authority)
3. Expiration alignment (same dates?)
4. Payout structure (same payoffs?)
5. YES/NO definition (same meaning of "yes"?)

Something we initially got wrong:
  "We treated every cross-venue price difference as arbitrage.
   Closer inspection revealed that settlement rules made several
   of these opportunities non-equivalent. For example, one venue
   might resolve on 'official results' while another resolves on
   'media projection' — these can differ!"
"""
from typing import Dict, Optional


def calculate_contract_equivalence_score(
    resolution_match: bool,
    settlement_source_match: bool,
    expiration_match: bool,
    payout_match: bool,
    yes_definition_match: bool,
    resolution_criteria_similarity: float = 1.0,
) -> Dict:
    """
    Calculate a contract equivalence score between two contracts.
    
    Args:
        resolution_match: Do both contracts resolve on the same criteria?
        settlement_source_match: Same settlement source?
        expiration_match: Same expiration dates?
        payout_match: Same payout structure?
        yes_definition_match: "YES" means the same thing?
        resolution_criteria_similarity: 0-1 score of criteria similarity
    
    Returns:
        Equivalence analysis with score and risk assessment
    
    IMPORTANT:
        This score is NOT a mysterious black box.
        Every component is explicitly weighted and explained.
    
    Weights (our methodology):
        Resolution criteria: 30% (most critical — determines if contracts pay out the same)
        Settlement source: 25% (different sources can resolve differently)
        YES definition: 20% (must agree on what outcome means)
        Payout structure: 15% (different payouts mean different economics)
        Expiration: 10% (different expiry can mean different events)
    """
    # Weights — each represents how much this dimension matters for equivalence
    weights = {
        "resolution_criteria": 0.30,
        "settlement_source": 0.25,
        "yes_definition": 0.20,
        "payout_structure": 0.15,
        "expiration": 0.10,
    }
    
    # Score each dimension
    scores = {
        "resolution_criteria": resolution_criteria_similarity if resolution_match else 0.0,
        "settlement_source": 1.0 if settlement_source_match else 0.0,
        "yes_definition": 1.0 if yes_definition_match else 0.0,
        "payout_structure": 1.0 if payout_match else 0.0,
        "expiration": 1.0 if expiration_match else 0.3,  # Different expiry gets partial credit
    }
    
    # Weighted score
    total_score = sum(scores[k] * weights[k] for k in weights)
    
    # Risk assessment
    if total_score >= 0.95:
        risk = "low"
        assessment = "Contracts appear equivalent. Cross-venue price differences likely represent genuine mispricing."
    elif total_score >= 0.85:
        risk = "medium"
        assessment = "Contracts are mostly equivalent but some terms differ. Review settlement rules before trading."
    elif total_score >= 0.70:
        risk = "high"
        assessment = "Significant differences in contract terms. Price difference may reflect genuine contract risk, not arbitrage."
    else:
        risk = "critical"
        assessment = "Contracts are likely NOT equivalent. Do NOT treat price differences as arbitrage."
    
    return {
        "equivalence_score": round(total_score, 4),
        "equivalence_pct": round(total_score * 100, 1),
        "risk": risk,
        "assessment": assessment,
        
        "dimensions": {
            k: {
                "score": round(scores[k], 2),
                "weight": weights[k],
                "weighted_contribution": round(scores[k] * weights[k], 4),
                "match": scores[k] >= 0.9,
            }
            for k in weights
        },
        
        "methodology_note": (
            "Equivalence is scored across 5 dimensions with explicit weights. "
            "Resolution criteria receive the highest weight (30%) because they "
            "determine whether both contracts will settle the same way."
        ),
    }
