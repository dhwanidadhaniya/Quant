"""
Market data models: Prices, Order Books, and Liquidity.

These models capture the time-series data that drives our analysis.
Understanding order book structure is essential for realistic execution modeling —
a price quote means nothing if the depth isn't there to fill your order.

Key insight from our research:
The "price" you see is just the best bid/ask. The price you GET depends on
how much you're trying to trade and how deep the book is.
"""
from sqlalchemy import Column, Integer, Float, DateTime, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class PriceSnapshot(Base):
    """
    A point-in-time price observation for a contract.
    
    We store both YES and NO prices because:
      YES + NO should ≈ $1.00 in an efficient market.
      If YES + NO < $1.00, there's a theoretical single-venue arbitrage.
      If YES + NO > $1.00, the market maker is charging a spread.
    """
    __tablename__ = "price_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)

    # Prices
    yes_price = Column(Float, nullable=False)
    no_price = Column(Float, nullable=False)
    mid_price = Column(Float)  # (best_bid + best_ask) / 2
    
    # Derived
    yes_plus_no = Column(Float)  # YES + NO — should be ~1.0
    implied_probability = Column(Float)  # ≈ yes_price
    
    # Volume
    volume = Column(Float, default=0)
    trade_count = Column(Integer, default=0)

    # Best bid/ask
    best_bid = Column(Float)
    best_ask = Column(Float)
    spread = Column(Float)  # best_ask - best_bid

    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    data_source = Column(String(20), default="simulated")  # "live", "historical", "simulated"


class OrderBookSnapshot(Base):
    """
    A snapshot of the order book at a point in time.
    
    The order book is the heart of market microstructure.
    It tells you not just WHAT the price is, but HOW MUCH you can trade at that price.
    
    We store snapshots rather than streaming updates because:
    1. Our analysis is research-oriented, not HFT
    2. Snapshots are sufficient for slippage modeling
    3. Storage is manageable
    """
    __tablename__ = "order_book_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)

    # Summary metrics
    best_bid = Column(Float)
    best_ask = Column(Float)
    mid_price = Column(Float)
    spread = Column(Float)
    bid_depth_total = Column(Float)  # Total $ on bid side
    ask_depth_total = Column(Float)  # Total $ on ask side
    num_bid_levels = Column(Integer)
    num_ask_levels = Column(Integer)

    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    data_source = Column(String(20), default="simulated")

    # Relationships
    levels = relationship("OrderBookLevel", back_populates="snapshot", cascade="all, delete-orphan")


class OrderBookLevel(Base):
    """
    A single price level in the order book.
    
    Each level represents resting orders at a specific price.
    Cumulative depth tells you how much you could fill up to and including this level.
    """
    __tablename__ = "order_book_levels"

    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(Integer, ForeignKey("order_book_snapshots.id"), nullable=False)

    side = Column(String(4), nullable=False)  # "bid" or "ask"
    price = Column(Float, nullable=False)
    quantity = Column(Float, nullable=False)  # Number of contracts
    dollar_value = Column(Float)  # price × quantity
    cumulative_quantity = Column(Float)  # Running total from best price
    cumulative_dollar_value = Column(Float)
    level_index = Column(Integer)  # 0 = best bid/ask

    # Relationships
    snapshot = relationship("OrderBookSnapshot", back_populates="levels")


class LiquiditySnapshot(Base):
    """
    Aggregated liquidity metrics for a contract.
    
    Liquidity is arguably the most important practical constraint on arbitrage.
    A 10% price discrepancy means nothing if you can only trade $50 at that price.
    
    Interesting observation from our research:
    The largest gross spread was not necessarily the best opportunity once liquidity
    and fees were considered. Some small-spread opportunities in liquid markets
    had better risk-adjusted expected returns.
    """
    __tablename__ = "liquidity_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)

    # Liquidity metrics
    total_liquidity = Column(Float)  # Total available liquidity in $
    bid_liquidity = Column(Float)
    ask_liquidity = Column(Float)
    
    # Depth at various levels
    depth_1pct = Column(Float)   # $ available within 1% of mid
    depth_2pct = Column(Float)   # $ available within 2% of mid
    depth_5pct = Column(Float)   # $ available within 5% of mid
    depth_10pct = Column(Float)  # $ available within 10% of mid

    # Spread metrics
    spread = Column(Float)
    spread_bps = Column(Float)  # Spread in basis points relative to mid

    # Volume
    volume_24h = Column(Float)
    volume_7d = Column(Float)
    avg_trade_size = Column(Float)
    num_trades_24h = Column(Integer)

    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    data_source = Column(String(20), default="simulated")
