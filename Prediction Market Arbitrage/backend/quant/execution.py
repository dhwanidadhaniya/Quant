"""
Execution Simulation & Sensitivity Analysis
=============================================

Execution quality determines whether theoretical edge translates to profit.

Key factors:
  - Latency: How fast can you act?
  - Fill rate: Will the order fill completely?
  - Price movement: Will the price move before you execute?
  - Partial fills: What if only part of the order fills?

Our simulation:
  Models how execution quality degrades with:
  1. Increasing latency (prices move)
  2. Increasing trade size (slippage)
  3. Decreasing liquidity (wider fills)

This is clearly labeled as a SIMULATION, not measured execution data.
"""
from typing import Dict, List
import math


def simulate_execution(
    gross_edge_pct: float,
    trade_size: float,
    available_liquidity: float,
    latency_ms: float = 100,
    edge_decay_halflife_ms: float = 5000,
) -> Dict:
    """
    Simulate execution quality given latency and market conditions.
    
    The edge decays over time as other participants see the same opportunity.
    We model this as exponential decay:
    
        edge_remaining = edge × exp(-0.693 × latency / halflife)
    
    Args:
        gross_edge_pct: Starting gross edge (%)
        trade_size: Trade size in $
        available_liquidity: Available liquidity in $
        latency_ms: Execution latency in milliseconds
        edge_decay_halflife_ms: Half-life of edge in ms
    
    Returns:
        Execution simulation results
    
    Important disclaimer:
        This is a SIMULATION based on assumed decay parameters.
        Real execution depends on market conditions, venue API latency,
        and concurrent participant behavior.
    """
    # Edge decay due to latency
    decay_factor = math.exp(-0.693 * latency_ms / edge_decay_halflife_ms)
    latency_adjusted_edge = gross_edge_pct * decay_factor
    
    # Slippage due to trade size
    liquidity_ratio = trade_size / available_liquidity if available_liquidity > 0 else 1
    slippage_pct = 0.1 * math.sqrt(liquidity_ratio) * 100  # Convert to %
    
    # Net edge after execution costs
    net_edge = latency_adjusted_edge - slippage_pct
    
    # Fill probability (decreases with trade size relative to liquidity)
    fill_probability = max(0, min(1, 1 - liquidity_ratio * 0.8))
    
    # Expected capture (combines edge, fill probability, and execution quality)
    expected_capture = net_edge * fill_probability
    
    return {
        "gross_edge_pct": round(gross_edge_pct, 2),
        "latency_ms": latency_ms,
        "decay_factor": round(decay_factor, 4),
        "latency_adjusted_edge_pct": round(latency_adjusted_edge, 2),
        "slippage_pct": round(slippage_pct, 2),
        "net_edge_pct": round(net_edge, 2),
        "fill_probability": round(fill_probability, 2),
        "expected_capture_pct": round(expected_capture, 2),
        "trade_size": trade_size,
        "available_liquidity": available_liquidity,
        "is_simulation": True,
    }


def simulate_latency_sensitivity(
    gross_edge_pct: float,
    trade_size: float,
    available_liquidity: float,
    latencies: List[float] = None,
) -> List[Dict]:
    """
    Show how execution quality changes with latency.
    
    This answers: "How fast do I need to be to capture this edge?"
    
    Typical finding:
        50ms → capture ~97% of edge
        500ms → capture ~93% of edge
        2000ms → capture ~78% of edge
        10000ms → capture ~25% of edge
    """
    if latencies is None:
        latencies = [50, 100, 250, 500, 1000, 2000, 5000, 10000]
    
    results = []
    for latency in latencies:
        sim = simulate_execution(gross_edge_pct, trade_size, available_liquidity, latency)
        results.append({
            "latency_ms": latency,
            "latency_label": f"{latency}ms" if latency < 1000 else f"{latency/1000:.1f}s",
            "gross_edge_pct": sim["gross_edge_pct"],
            "net_edge_pct": sim["net_edge_pct"],
            "expected_capture_pct": sim["expected_capture_pct"],
            "fill_probability": sim["fill_probability"],
        })
    
    return results
