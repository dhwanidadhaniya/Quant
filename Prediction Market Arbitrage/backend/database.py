"""
Database setup using SQLAlchemy async engine with SQLite.

Why SQLite?
  - Zero configuration — the database file is created automatically
  - Perfect for a research project where data volumes are modest
  - Can be swapped to PostgreSQL by changing DATABASE_URL (SQLAlchemy abstraction)
  - A student project should "just work" after cloning the repo
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from config import settings
from pathlib import Path
import os

# Ensure the data directory exists
data_dir = Path(settings.DATABASE_URL.replace("sqlite+aiosqlite:///", "")).parent
data_dir.mkdir(parents=True, exist_ok=True)

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args={"check_same_thread": False},  # Required for SQLite
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


async def get_db() -> AsyncSession:
    """Dependency that provides a database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Create all tables. Called on application startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
