"""
Gamification models: Achievements, XP, quizzes, and challenges.

These features exist to make the project engaging without undermining
its academic credibility. Every gamification element is tied to a
genuine financial concept — learning about Kelly is worth XP because
understanding Kelly IS the point.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, JSON
from database import Base
from datetime import datetime


class Achievement(Base):
    """
    A badge/achievement that can be unlocked by learning or doing.
    
    Achievements are finance-themed. They reward genuine understanding,
    not just clicking buttons.
    """
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    
    # Visual
    icon = Column(String(50))  # emoji or icon name
    tier = Column(String(20), default="bronze")  # "bronze", "silver", "gold", "platinum"
    
    # Requirements
    category = Column(String(100))  # "arbitrage", "microstructure", "risk", "backtesting"
    xp_reward = Column(Integer, default=50)
    requirement_type = Column(String(50))  # "action", "quiz", "analysis", "discovery"
    requirement_detail = Column(Text)
    
    # Display order
    sort_order = Column(Integer, default=0)


class UserProgress(Base):
    """
    Tracks user's learning progress and XP.
    
    For a single-user research project, this tracks the "researcher's journey"
    through understanding the material.
    """
    __tablename__ = "user_progress"

    id = Column(Integer, primary_key=True, index=True)
    
    # XP
    total_xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    
    # Streak
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_active_date = Column(DateTime)
    
    # Unlocked achievements (JSON array of achievement slugs)
    unlocked_achievements = Column(JSON, default=list)
    
    # Progress tracking
    opportunities_analyzed = Column(Integer, default=0)
    backtests_run = Column(Integer, default=0)
    quizzes_completed = Column(Integer, default=0)
    lessons_completed = Column(Integer, default=0)
    challenges_completed = Column(Integer, default=0)
    
    # Academy progress
    completed_topics = Column(JSON, default=list)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class QuizResult(Base):
    """Records quiz attempts and scores."""
    __tablename__ = "quiz_results"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(String(100), nullable=False)
    
    score = Column(Integer)
    total_questions = Column(Integer)
    percentage = Column(Float)
    
    # Detailed results
    answers = Column(JSON)  # [{question_id, selected, correct, explanation}]
    
    time_taken_seconds = Column(Integer)
    completed_at = Column(DateTime, default=datetime.utcnow)


class DailyChallenge(Base):
    """Daily finance challenge questions."""
    __tablename__ = "daily_challenges"

    id = Column(Integer, primary_key=True, index=True)
    
    date = Column(DateTime, nullable=False, unique=True)
    question = Column(Text, nullable=False)
    choices = Column(JSON, nullable=False)  # [{id, text}]
    correct_answer_id = Column(String(10), nullable=False)
    explanation = Column(Text, nullable=False)
    
    # Financial context
    concept = Column(String(100))  # What concept this teaches
    difficulty = Column(String(20), default="medium")
    xp_reward = Column(Integer, default=25)
    
    # User's response
    user_answer_id = Column(String(10))
    answered_at = Column(DateTime)
    is_correct = Column(Boolean)
