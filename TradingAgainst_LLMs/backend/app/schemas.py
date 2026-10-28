from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ExperimentConfig(BaseModel):
    name: str = "bias-exploitation"
    seed: int = 42
    train_sessions: int = Field(default=12, ge=1, le=400)
    test_sessions: int = Field(default=8, ge=1, le=400)
    rounds: int = Field(default=24, ge=2, le=400)
    agents: int = Field(default=6, ge=2, le=40)
    model: str = "mock-anchor-v1"
    temperature: float = Field(default=0.3, ge=0, le=2)
    personas: list[str] = Field(
        default_factory=lambda: [
            "cautious-mm",
            "signal-chaser",
            "round-anchor",
            "herd-follower",
        ]
    )
    signal_noise: float = Field(default=4.0, gt=0, le=50)
    signal_model: Literal["gaussian", "bounded", "partial"] = "gaussian"
    partial_observability: float = Field(default=0.55, gt=0, le=1)
    news_probability: float = Field(default=0.12, ge=0, le=1)
    news_shock: float = Field(default=6.0, ge=0, le=40)
    hidden_variables: int = Field(default=10, ge=1, le=100)
    distribution: Literal["gaussian", "uniform"] = "gaussian"
    center: float = 50.0
    scale: float = Field(default=8.0, gt=0, le=40)
    volatility: float = Field(default=0.35, ge=0, le=10)
    price_min: float = 0.0
    price_max: float = 150.0
    max_order_size: float = Field(default=4.0, gt=0, le=100)
    position_limit: float = Field(default=15.0, gt=0, le=500)
    initial_cash: float = Field(default=10_000.0, gt=0)
    transaction_cost: float = Field(default=0.0, ge=0, le=20)
    prompt_version: str = "v1"
    provider: str | None = None
    oracle: bool = False
    agent_mix: Literal["llm", "rules", "mixed"] = "llm"
    variant_mode: Literal["train_grid", "fixed_full"] = "train_grid"
    confirm_llm_cost: bool = False
    run_prompt_sensitivity: bool = True
    ignore_cache: bool = False
    prompt_sensitivity_sessions: int = Field(default=4, ge=0, le=40)


class FalsifyRequest(BaseModel):
    sessions: int = Field(default=8, ge=2, le=40)
    rounds: int = Field(default=16, ge=4, le=80)
    rerun: bool = False
    confirm_llm_cost: bool = False
