"""
Market Efficiency Analysis
============================

The ultimate research question:
"How efficient are prediction markets?"

We study efficiency through several lenses:
1. Frequency of pricing discrepancies
2. Magnitude of discrepancies
3. Duration (how quickly do they close?)
4. Relationship to liquidity
5. Impact of transaction costs
6. Variation by market category
7. Trends over time

Our working hypothesis:
  "Prediction markets are generally efficient but exhibit temporary,
   category-dependent inefficiencies that are largely compressed
   by transaction costs."
"""
from typing import Dict, List


def calculate_market_efficiency_metrics(opportunities: List[Dict]) -> Dict:
    """
    Compute market efficiency metrics from opportunity data.
    
    An efficient market would show:
      - Few opportunities
      - Small spreads
      - Very short durations
      - Opportunities that vanish after costs
    
    An inefficient market would show:
      - Many opportunities
      - Large spreads
      - Long durations
      - Opportunities that survive after costs
    """
    if not opportunities:
        return {"message": "No data available for efficiency analysis"}
    
    n = len(opportunities)
    
    # Spread metrics
    gross_spreads = [o.get("gross_spread", 0) for o in opportunities]
    net_edges = [o.get("net_edge", 0) for o in opportunities]
    durations = [o.get("duration_seconds", 0) for o in opportunities if o.get("duration_seconds")]
    liquidities = [o.get("min_liquidity", 0) for o in opportunities if o.get("min_liquidity")]
    
    # Count by classification
    classifications = {}
    for o in opportunities:
        cls = o.get("classification", "unknown")
        classifications[cls] = classifications.get(cls, 0) + 1
    
    # How many survive after costs?
    theoretical = sum(1 for e in net_edges if e <= 0 and gross_spreads[net_edges.index(e)] > 0) if net_edges else 0
    executable = sum(1 for e in net_edges if e > 0)
    
    # Efficiency score (0 = perfectly efficient, 100 = highly inefficient)
    if n > 0:
        pct_executable = executable / n
        avg_net_edge = sum(net_edges) / n if net_edges else 0
        avg_duration = sum(durations) / len(durations) if durations else 0
        
        # Weighted efficiency score
        efficiency_score = min(100, (
            pct_executable * 40 +              # More executable opps = less efficient
            min(avg_net_edge * 100, 30) +       # Higher avg edge = less efficient
            min(avg_duration / 60, 30)           # Longer duration = less efficient
        ))
    else:
        efficiency_score = 0
    
    return {
        "total_observations": n,
        "classifications": classifications,
        
        "gross_spread": {
            "mean": round(sum(gross_spreads) / n, 4) if n else 0,
            "median": round(sorted(gross_spreads)[n // 2], 4) if n else 0,
            "max": round(max(gross_spreads), 4) if gross_spreads else 0,
        },
        "net_edge": {
            "mean": round(sum(net_edges) / n, 4) if n else 0,
            "positive_count": executable,
            "negative_count": n - executable,
            "pct_positive": round(executable / n * 100, 1) if n else 0,
        },
        "duration": {
            "mean_seconds": round(sum(durations) / len(durations), 1) if durations else 0,
            "median_seconds": round(sorted(durations)[len(durations) // 2], 1) if durations else 0,
            "max_seconds": round(max(durations), 1) if durations else 0,
        },
        "liquidity": {
            "mean": round(sum(liquidities) / len(liquidities), 0) if liquidities else 0,
            "median": round(sorted(liquidities)[len(liquidities) // 2], 0) if liquidities else 0,
        },
        
        "efficiency_score": round(efficiency_score, 1),
        "efficiency_assessment": _assess_efficiency(efficiency_score),
        
        "key_findings": [
            f"{executable} of {n} observed price differences ({round(executable/n*100, 1) if n else 0}%) survived after estimated transaction costs",
            f"Median gross spread: {round(sorted(gross_spreads)[n//2]*100, 1) if n else 0}¢" if n else "Insufficient data",
            f"Median opportunity duration: {round(sorted(durations)[len(durations)//2], 0) if durations else 0} seconds" if durations else "Duration data unavailable",
        ],
    }


def _assess_efficiency(score: float) -> str:
    """Generate efficiency assessment."""
    if score < 15:
        return "Markets appear highly efficient. Very few opportunities survive transaction costs."
    elif score < 35:
        return "Markets are generally efficient with occasional temporary inefficiencies."
    elif score < 60:
        return "Moderate inefficiency detected. Some opportunities appear economically meaningful."
    else:
        return "Significant pricing discrepancies observed. Markets may be less efficient in this category."


def analyze_efficiency_by_category(opportunities: List[Dict]) -> List[Dict]:
    """
    Break down efficiency metrics by event category.
    
    This answers: "Are some types of markets less efficient than others?"
    
    Our hypothesis: Event categories with less informed trading (e.g., niche events)
    may exhibit more pricing discrepancies than heavily-traded categories.
    """
    categories = {}
    for opp in opportunities:
        cat = opp.get("category", "unknown")
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(opp)
    
    results = []
    for cat, opps in categories.items():
        metrics = calculate_market_efficiency_metrics(opps)
        results.append({
            "category": cat,
            "count": len(opps),
            "efficiency_score": metrics.get("efficiency_score", 0),
            "avg_gross_spread": metrics.get("gross_spread", {}).get("mean", 0),
            "pct_executable": metrics.get("net_edge", {}).get("pct_positive", 0),
            "avg_duration": metrics.get("duration", {}).get("mean_seconds", 0),
        })
    
    return sorted(results, key=lambda x: x["efficiency_score"], reverse=True)
