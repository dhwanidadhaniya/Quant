from __future__ import annotations

import numpy as np

from app.schemas import ExperimentConfig


class AssetEngine:
    """Hidden ground truth. Agents never receive this object."""

    def __init__(self, rng: np.random.Generator, config: ExperimentConfig):
        n = config.hidden_variables
        if config.distribution == "uniform":
            draws = rng.uniform(-1.0, 1.0, size=n)
        else:
            draws = rng.normal(0.0, 1.0, size=n)
        self.hidden = (config.center / n) + (config.scale / np.sqrt(n)) * draws
        self.true_value = float(self.hidden.sum())
        self.volatility = float(config.volatility)
        self.last_vol_shock = 0.0

    def step(self, news_magnitude: float, rng: np.random.Generator) -> float:
        shock = float(rng.normal(0.0, self.volatility))
        self.last_vol_shock = shock
        self.true_value = float(self.true_value + shock + news_magnitude)
        return self.true_value
