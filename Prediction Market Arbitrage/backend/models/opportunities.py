"""
Opportunity models: Detected arbitrage opportunities and their lifecycle.

An "opportunity" in our framework is NOT simply a price difference.
It passes through a rigorous classification pipeline:

  PRICE DIFFERENCE → MISPRICING → THEORETICAL ARBITRAGE → PRACTICAL ARBITRAGE → EXECUTABLE ARBITRAGE

Each stage adds constraints:
  - Contract equivalence verified?
  - Liquidity sufficient?
  - Transaction costs accounted for?
  - Slippage modeled?
  - Execution feasible?
  - Net edge still positive?

Only opportunities that survive ALL stages are classified as EXECUTABLE.
"""
from sqlalchemy import Column, Integer, Float, DateTime, String, ForeignKey, Text, Boolean, JSON
from database import Base
from datetime import datetime


class Opportunity(Base):
    """
    A detected arbitrage opportunity between two contracts.
    
    This is the central object of our research — it captures both the
    raw price signal and all the adjustments needed to determine if
    the opportunity is economically meaningful.
    """
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    contract_a_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    contract_b_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    mapping_id = Column(Integer, ForeignKey("contract_mappings.id"))

    # Opportunity type
    opportunity_type = Column(String(50), nullable=False)  # "single_venue", "cross_venue"
    
    # Classification (the key intellectual distinction)
    classification = Column(String(50), nullable=False)
    # "price_difference" — raw price gap, no analysis
    # "mispricing" — contracts are equivalent, prices differ
    # "theoretical_arbitrage" — positive gross edge exists
    # "practical_arbitrage" — positive net edge after costs
    # "executable_arbitrage" — sufficient liquidity + feasible execution
    # "not_arbitrage" — analysis shows this is NOT exploitable
    # "insufficient_info" — cannot determine due to missing data

    # Status lifecycle
    status = Column(String(50), default="detected")
    # "detected", "developing", "live", "compressing", "expired", "executed"

    # --- RAW SIGNAL ---
    venue_a_yes_price = Column(Float, nullable=False)
    venue_b_yes_price = Column(Float, nullable=False)
    venue_a_no_price = Column(Float)
    venue_b_no_price = Column(Float)

    # --- GROSS EDGE ---
    gross_spread = Column(Float)           # |P_a - P_b|
    gross_spread_pct = Column(Float)       # Percentage divergence
    gross_edge_dollars = Column(Float)     # Dollar edge per contract

    # --- COSTS ---
    estimated_fees_a = Column(Float)       # Fees on venue A
    estimated_fees_b = Column(Float)       # Fees on venue B
    total_fees = Column(Float)
    estimated_slippage_a = Column(Float)   # Slippage on venue A
    estimated_slippage_b = Column(Float)   # Slippage on venue B
    total_slippage = Column(Float)
    estimated_spread_cost = Column(Float)  # Bid-ask spread cost
    total_transaction_cost = Column(Float) # All costs combined

    # --- NET EDGE ---
    net_edge = Column(Float)               # Gross - all costs
    net_edge_pct = Column(Float)           # Net edge as percentage
    net_roi = Column(Float)                # Net edge / capital required
    cost_drag = Column(Float)              # Total costs / gross edge

    # --- LIQUIDITY ---
    liquidity_a = Column(Float)            # Available liquidity venue A
    liquidity_b = Column(Float)            # Available liquidity venue B
    min_liquidity = Column(Float)          # Bottleneck liquidity
    max_executable_size = Column(Float)    # Largest executable trade

    # --- CONTRACT EQUIVALENCE ---
    equivalence_score = Column(Float)       # From contract mapping
    equivalence_risk = Column(String(20))   # "low", "medium", "high"

    # --- EXPECTED VALUE ---
    expected_value = Column(Float)
    expected_return = Column(Float)
    break_even_probability = Column(Float)

    # --- KELLY ---
    kelly_fraction = Column(Float)
    recommended_position = Column(Float)   # Dollar position
    capital_required = Column(Float)

    # --- RISK ---
    execution_risk = Column(String(20))     # "low", "medium", "high"
    settlement_risk = Column(String(20))
    liquidity_risk = Column(String(20))
    overall_risk = Column(String(20))
    risk_notes = Column(Text)

    # --- TIMING ---
    detected_at = Column(DateTime, default=datetime.utcnow)
    peak_at = Column(DateTime)              # When divergence was maximum
    compressed_at = Column(DateTime)        # When prices started converging
    expired_at = Column(DateTime)           # When opportunity disappeared
    duration_seconds = Column(Float)        # Total lifetime

    # --- EXECUTION ---
    execution_difficulty = Column(String(20))  # "easy", "medium", "hard", "infeasible"
    execution_notes = Column(Text)

    # --- RESEARCH ---
    category = Column(String(100))          # Event category
    analyst_notes = Column(Text)            # Our observations
    bull_case = Column(Text)
    base_case = Column(Text)
    bear_case = Column(Text)
    final_assessment = Column(Text)

    # --- META ---
    data_source = Column(String(20), default="simulated")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OpportunitySnapshot(Base):
    """
    Time-series data for an opportunity — tracks how the edge evolves.
    
    Opportunities aren't static. They emerge, expand, peak, and compress.
    This snapshot table lets us study the lifecycle.
    """
    __tablename__ = "opportunity_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"), nullable=False)

    gross_spread = Column(Float)
    net_edge = Column(Float)
    liquidity_a = Column(Float)
    liquidity_b = Column(Float)
    venue_a_yes_price = Column(Float)
    venue_b_yes_price = Column(Float)
    status = Column(String(50))

    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
