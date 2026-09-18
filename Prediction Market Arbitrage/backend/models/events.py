"""
Core market structure models: Events, Contracts, Venues, and Contract Mappings.

In prediction markets, an EVENT is a real-world outcome (e.g., "Will X win the election?").
Each venue (Polymarket, Kalshi) lists CONTRACTS on that event.
CONTRACT MAPPINGS link contracts across venues that refer to the same underlying event —
this is critical for cross-venue arbitrage analysis.

NOTE: Contract equivalence is NOT trivial. Two contracts on "the same event" may differ
in settlement rules, resolution sources, or payout structures. Our ContractMapping model
captures an equivalence_score to reflect this.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class Venue(Base):
    """
    A prediction market venue (exchange).
    
    Examples: Polymarket, Kalshi
    Each venue has its own fee structure, settlement rules, and API.
    """
    __tablename__ = "venues"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(50), unique=True, nullable=False)  # e.g., "polymarket", "kalshi"
    description = Column(Text)
    url = Column(String(255))

    # Fee structure (basis points for precision)
    taker_fee_bps = Column(Integer, default=100)  # 1% = 100 bps
    maker_fee_bps = Column(Integer, default=50)    # 0.5% = 50 bps
    withdrawal_fee = Column(Float, default=0.0)

    # Venue characteristics
    min_trade_size = Column(Float, default=1.0)
    max_trade_size = Column(Float, default=100000.0)
    settlement_currency = Column(String(10), default="USD")
    supports_limit_orders = Column(Boolean, default=True)
    supports_market_orders = Column(Boolean, default=True)

    # Status
    is_active = Column(Boolean, default=True)
    data_mode = Column(String(20), default="simulated")  # "live", "historical", "simulated"

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    contracts = relationship("Contract", back_populates="venue")


class Event(Base):
    """
    A real-world event that prediction markets price.
    
    An event is venue-agnostic — it represents the actual thing happening in the world.
    Multiple venues may list contracts on the same event.
    
    Examples:
      - "Will Candidate X win the 2024 presidential election?"
      - "Will the Fed raise rates in December 2024?"
      - "Will Team A win the Super Bowl?"
    """
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(500), nullable=False)
    slug = Column(String(200), unique=True, nullable=False)
    description = Column(Text)
    category = Column(String(100), nullable=False)  # "politics", "economics", "sports", etc.
    subcategory = Column(String(100))

    # Event timing
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    resolution_date = Column(DateTime)

    # Resolution
    resolution_source = Column(String(255))  # e.g., "Associated Press", "BLS", "Official results"
    resolution_status = Column(String(50), default="open")  # "open", "resolved_yes", "resolved_no", "voided"
    resolution_value = Column(Float)  # Final outcome value (1.0 for YES, 0.0 for NO)

    # Metadata
    importance = Column(String(20), default="medium")  # "low", "medium", "high"
    tags = Column(JSON, default=list)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    contracts = relationship("Contract", back_populates="event")
    contract_mappings = relationship("ContractMapping", back_populates="event")


class Contract(Base):
    """
    A tradable contract on a specific venue for a specific event.
    
    Each contract has a YES and NO side. In a binary market:
      YES payout + NO payout = $1.00
    
    The contract price implies a probability:
      Price of YES ≈ Implied probability of YES
    
    IMPORTANT: Two contracts on "the same event" across venues may NOT be equivalent
    if their settlement criteria, resolution sources, or payout structures differ.
    """
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    venue_id = Column(Integer, ForeignKey("venues.id"), nullable=False)

    # Contract identification
    venue_contract_id = Column(String(200))  # ID on the venue's platform
    name = Column(String(500), nullable=False)
    slug = Column(String(200), nullable=False)

    # Current prices
    yes_price = Column(Float)  # e.g., 0.55 means 55 cents
    no_price = Column(Float)   # e.g., 0.45 means 45 cents
    yes_volume_24h = Column(Float, default=0)
    no_volume_24h = Column(Float, default=0)

    # Contract specifications
    min_price = Column(Float, default=0.01)
    max_price = Column(Float, default=0.99)
    tick_size = Column(Float, default=0.01)
    contract_size = Column(Float, default=1.0)
    payout = Column(Float, default=1.0)  # $1.00 for binary

    # Settlement
    settlement_source = Column(String(255))
    settlement_rules = Column(Text)
    expiration = Column(DateTime)

    # Status
    status = Column(String(50), default="active")  # "active", "halted", "settled", "voided"
    is_active = Column(Boolean, default=True)

    # Liquidity snapshot
    total_liquidity = Column(Float, default=0)
    bid_depth = Column(Float, default=0)  # Total $ on bid side
    ask_depth = Column(Float, default=0)  # Total $ on ask side
    spread = Column(Float, default=0)     # Best ask - best bid

    last_updated = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    event = relationship("Event", back_populates="contracts")
    venue = relationship("Venue", back_populates="contracts")


class ContractMapping(Base):
    """
    Maps contracts across venues that refer to the same underlying event.
    
    This is where contract equivalence analysis happens.
    
    CRITICAL INSIGHT: A mapping does NOT mean the contracts are identical.
    The equivalence_score reflects how similar they are based on:
      - Resolution criteria match
      - Settlement source match  
      - Expiration alignment
      - Payout structure match
      - YES/NO definition alignment
    
    Something we initially got wrong:
    We treated every cross-venue price difference as arbitrage. Contract settlement
    rules made several of these opportunities non-equivalent.
    """
    __tablename__ = "contract_mappings"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    contract_a_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    contract_b_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)

    # Equivalence analysis
    equivalence_score = Column(Float, default=0.0)  # 0.0 to 1.0
    resolution_match = Column(Boolean, default=False)
    settlement_source_match = Column(Boolean, default=False)
    expiration_match = Column(Boolean, default=False)
    payout_match = Column(Boolean, default=False)
    yes_definition_match = Column(Boolean, default=False)

    # Notes on differences
    equivalence_notes = Column(Text)
    risk_notes = Column(Text)

    # Status
    is_verified = Column(Boolean, default=False)
    verified_by = Column(String(100))
    verified_at = Column(DateTime)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    event = relationship("Event", back_populates="contract_mappings")
    contract_a = relationship("Contract", foreign_keys=[contract_a_id])
    contract_b = relationship("Contract", foreign_keys=[contract_b_id])
