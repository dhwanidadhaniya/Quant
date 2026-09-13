from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True)
    ticker = Column(String(24), unique=True, index=True)
    name = Column(String(120))
    sector = Column(String(64), index=True)
    industry = Column(String(80))
    country = Column(String(8))
    exchange = Column(String(16))
    description = Column(Text)

    prices = relationship("Price", back_populates="company")
    financials = relationship("Financial", back_populates="company")
    scores = relationship("FactorScore", back_populates="company")


class Price(Base):
    __tablename__ = "prices"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), index=True)
    date = Column(Date, index=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Float)
    company = relationship("Company", back_populates="prices")


class Financial(Base):
    __tablename__ = "financials"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), index=True)
    as_of = Column(Date)
    market_cap = Column(Float)
    pe = Column(Float)
    pb = Column(Float)
    ev_ebitda = Column(Float)
    peg = Column(Float)
    earnings_yield = Column(Float)
    roe = Column(Float)
    roa = Column(Float)
    operating_margin = Column(Float)
    net_margin = Column(Float)
    revenue_growth = Column(Float)
    eps_growth = Column(Float)
    earnings_cagr = Column(Float)
    debt_equity = Column(Float)
    interest_coverage = Column(Float)
    current_ratio = Column(Float)
    dividend_yield = Column(Float)
    company = relationship("Company", back_populates="financials")


class FactorScore(Base):
    __tablename__ = "factor_scores"

    id = Column(Integer, primary_key=True)
    company_id = Column(Integer, ForeignKey("companies.id"), index=True)
    date = Column(Date, index=True)
    value = Column(Float)
    momentum = Column(Float)
    quality = Column(Float)
    size = Column(Float)
    growth = Column(Float)
    low_vol = Column(Float)
    alpha_score = Column(Float)
    company = relationship("Company", back_populates="scores")


class Benchmark(Base):
    __tablename__ = "benchmarks"

    id = Column(Integer, primary_key=True)
    ticker = Column(String(24), index=True)
    name = Column(String(80))
    date = Column(Date, index=True)
    value = Column(Float)


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True)
    name = Column(String(120))
    method = Column(String(32))
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    holdings = relationship("Holding", back_populates="portfolio", cascade="all, delete")


class Holding(Base):
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"))
    company_id = Column(Integer, ForeignKey("companies.id"))
    weight = Column(Float)
    portfolio = relationship("Portfolio", back_populates="holdings")
    company = relationship("Company")


class Backtest(Base):
    __tablename__ = "backtests"

    id = Column(Integer, primary_key=True)
    name = Column(String(120))
    strategy = Column(String(48))
    start_date = Column(Date)
    end_date = Column(Date)
    benchmark = Column(String(24))
    rebalance = Column(String(24))
    transaction_cost = Column(Float)
    initial_capital = Column(Float)
    result_json = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


class ResearchNote(Base):
    __tablename__ = "research_notes"

    id = Column(Integer, primary_key=True)
    title = Column(String(160))
    body = Column(Text)
    attached_type = Column(String(32))  # stock | factor | portfolio | chart | backtest
    attached_id = Column(String(64))
    created_at = Column(DateTime, server_default=func.now())
