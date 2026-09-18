"""
Configuration for the Prediction Market Arbitrage Terminal.

We use environment variables where possible, with sensible defaults
for development. The idea is that a student can clone this repo and
run it without configuring anything.
"""
from pydantic_settings import BaseSettings
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    """Application settings with defaults suitable for local development."""

    APP_NAME: str = "Prediction Market Arbitrage Terminal"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database — SQLite by default for zero-config startup
    DATABASE_URL: str = f"sqlite+aiosqlite:///{BASE_DIR / 'data' / 'markets.db'}"

    # API keys (optional — the simulator runs without these)
    POLYMARKET_API_KEY: str = ""
    KALSHI_API_KEY: str = ""

    # Data mode: "simulated", "live", or "historical"
    DATA_MODE: str = "simulated"

    # Default fee assumptions (basis points)
    DEFAULT_TAKER_FEE_BPS: int = 100  # 1%
    DEFAULT_MAKER_FEE_BPS: int = 50   # 0.5%

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
