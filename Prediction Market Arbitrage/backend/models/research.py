"""
Research models: Notes, observations, and findings.

The research notebook is what makes this project feel like genuine academic work.
These aren't just UI decorations — they capture real analytical observations
that emerged during development.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from database import Base
from datetime import datetime


class ResearchNote(Base):
    """
    A research note or analyst report attached to an opportunity or event.
    
    Modeled after sell-side research notes — concise, structured, opinionated.
    """
    __tablename__ = "research_notes"

    id = Column(Integer, primary_key=True, index=True)
    
    # Linkage (optional — notes can be standalone)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"))
    event_id = Column(Integer, ForeignKey("events.id"))
    
    title = Column(String(300), nullable=False)
    content = Column(Text, nullable=False)
    note_type = Column(String(50))  # "observation", "methodology", "finding", "limitation", "insight"
    
    # Structured research fields
    bull_case = Column(Text)
    base_case = Column(Text)
    bear_case = Column(Text)
    assessment = Column(Text)
    
    # Tags and categorization
    tags = Column(JSON, default=list)
    category = Column(String(100))
    importance = Column(String(20), default="medium")
    
    author = Column(String(100), default="Research Team")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Observation(Base):
    """
    A specific research observation — the "What we learned" boxes.
    
    These are numbered observations that appear throughout the UI.
    They represent genuine insights from the analysis.
    """
    __tablename__ = "observations"

    id = Column(Integer, primary_key=True, index=True)
    observation_number = Column(Integer, unique=True, nullable=False)
    
    title = Column(String(300), nullable=False)
    content = Column(Text, nullable=False)
    
    # What kind of observation
    observation_type = Column(String(50))
    # "finding" — something we discovered
    # "mistake" — something we initially got wrong
    # "limitation" — a constraint we identified
    # "methodology" — a methodological choice we made
    # "insight" — a non-obvious takeaway
    
    # Context
    related_concept = Column(String(100))  # e.g., "liquidity", "slippage", "contract_equivalence"
    chart_reference = Column(String(100))  # Which chart supports this observation
    
    created_at = Column(DateTime, default=datetime.utcnow)
