from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]


@dataclass
class Settings:
    provider: str
    openai_api_key: str
    openai_base_url: str
    openai_model: str
    ollama_base_url: str
    ollama_model: str
    max_concurrency: int
    max_output_tokens: int
    max_retries: int
    request_timeout_seconds: float
    database_path: Path


def get_settings() -> Settings:
    load_dotenv(ROOT / ".env", override=False)
    raw = os.getenv("DATABASE_PATH", "data/research.sqlite")
    path = Path(raw)
    if not path.is_absolute():
        path = ROOT / path
    return Settings(
        provider=os.getenv("PROVIDER", "mock").strip().lower() or "mock",
        openai_api_key=os.getenv("OPENAI_API_KEY", "").strip(),
        openai_base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/"),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/"),
        ollama_model=os.getenv("OLLAMA_MODEL", "llama3.1"),
        max_concurrency=max(1, int(os.getenv("MAX_CONCURRENCY", "4"))),
        max_output_tokens=max(16, int(os.getenv("MAX_OUTPUT_TOKENS", "120"))),
        max_retries=max(1, int(os.getenv("MAX_RETRIES", "3"))),
        request_timeout_seconds=float(os.getenv("REQUEST_TIMEOUT_SECONDS", "30")),
        database_path=path,
    )
