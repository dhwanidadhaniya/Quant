"""
Portfolio and backtesting models.

These models track simulated trading activity and backtesting results.
The backtest engine is crucial for answering our research question:
"Would these opportunities have been profitable AFTER costs?"

Important distinction:
  THEORETICAL BACKTEST — assumes perfect execution at observed prices
  EXECUTION-ADJUSTED BACKTEST — models slippage, partial fills, and latency

We always report both, because the gap between them IS the research finding.
"""
from sqlalchemy import Column, Integer, Float, DateTime, String, ForeignKey, Text, JSON, Boolean
from database import Base
from datetime import datetime


class Trade(Base):
    """A simulated trade execution."""
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"))
    
    # Trade details
    venue = Column(String(50), nullable=False)
    contract_id = Column(Integer, ForeignKey("contracts.id"))
    side = Column(String(4), nullable=False)  # "buy" or "sell"
    contract_side = Column(String(3), nullable=False)  # "yes" or "no"
    
    # Pricing
    target_price = Column(Float)       # Price we wanted
    execution_price = Column(Float)    # Price we got (after slippage)
    slippage = Column(Float)           # Difference
    quantity = Column(Float)
    notional = Column(Float)           # execution_price × quantity
    
    # Costs
    fees = Column(Float)
    spread_cost = Column(Float)
    total_cost = Column(Float)
    
    # P&L
    gross_pnl = Column(Float)
    net_pnl = Column(Float)
    roi = Column(Float)

    # Status
    status = Column(String(20), default="simulated")  # "simulated", "executed", "failed"
    
    executed_at = Column(DateTime, default=datetime.utcnow)
    settled_at = Column(DateTime)
    data_source = Column(String(20), default="simulated")


class BacktestRun(Base):
    """
    A complete backtest execution with parameters and results.
    
    Each backtest tests a specific strategy configuration:
    - What counts as an "opportunity" (min edge, min liquidity)
    - How to size positions (fixed, Kelly, etc.)
    - What costs to assume
    """
    __tablename__ = "backtest_runs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200))
    
    # Parameters
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    category_filter = Column(String(100))
    venue_filter = Column(String(100))
    min_gross_edge = Column(Float, default=0.01)
    min_net_edge = Column(Float, default=0.0)
    min_liquidity = Column(Float, default=100.0)
    max_slippage_pct = Column(Float, default=0.05)
    fee_assumption_bps = Column(Integer, default=100)
    initial_capital = Column(Float, default=10000.0)
    position_sizing = Column(String(50), default="fixed")  # "fixed", "equal_weight", "full_kelly", "half_kelly", "quarter_kelly"
    fixed_position_size = Column(Float, default=100.0)
    
    # Backtest type
    backtest_type = Column(String(50), default="theoretical")  # "theoretical", "execution_adjusted"

    # --- RESULTS ---
    total_opportunities = Column(Integer)
    opportunities_traded = Column(Integer)
    
    # P&L
    gross_pnl = Column(Float)
    net_pnl = Column(Float)
    total_fees_paid = Column(Float)
    total_slippage = Column(Float)
    
    # Trade stats
    avg_trade_pnl = Column(Float)
    median_trade_pnl = Column(Float)
    best_trade = Column(Float)
    worst_trade = Column(Float)
    win_rate = Column(Float)
    avg_edge = Column(Float)
    
    # Risk
    max_drawdown = Column(Float)
    max_drawdown_pct = Column(Float)
    avg_holding_time_seconds = Column(Float)
    capital_utilization = Column(Float)  # % of capital deployed on average
    
    # Execution
    avg_slippage = Column(Float)
    fill_rate = Column(Float)  # % of orders fully filled
    
    # Computed at completion
    final_capital = Column(Float)
    total_return = Column(Float)
    total_return_pct = Column(Float)
    
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    status = Column(String(20), default="running")


class BacktestTrade(Base):
    """Individual trade within a backtest run."""
    __tablename__ = "backtest_trades"

    id = Column(Integer, primary_key=True, index=True)
    backtest_id = Column(Integer, ForeignKey("backtest_runs.id"), nullable=False)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"))
    
    entry_price = Column(Float)
    exit_price = Column(Float)
    quantity = Column(Float)
    side = Column(String(10))
    
    gross_pnl = Column(Float)
    fees = Column(Float)
    slippage = Column(Float)
    net_pnl = Column(Float)
    roi = Column(Float)
    
    entry_time = Column(DateTime)
    exit_time = Column(DateTime)
    holding_time_seconds = Column(Float)
    
    capital_used = Column(Float)
    running_pnl = Column(Float)  # Cumulative P&L after this trade
    running_capital = Column(Float)  # Capital after this trade


class PortfolioSnapshot(Base):
    """Daily portfolio state for equity curve construction."""
    __tablename__ = "portfolio_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    backtest_id = Column(Integer, ForeignKey("backtest_runs.id"))
    
    date = Column(DateTime, nullable=False)
    portfolio_value = Column(Float)
    cash = Column(Float)
    invested = Column(Float)
    daily_pnl = Column(Float)
    cumulative_pnl = Column(Float)
    drawdown = Column(Float)
    drawdown_pct = Column(Float)
    num_positions = Column(Integer)
    capital_utilization = Column(Float)
