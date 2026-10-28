from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from app.schemas import ExperimentConfig


@dataclass
class NewsEvent:
    event: str
    magnitude: float


class NewsEngine:
    def __init__(self, config: ExperimentConfig):
        self.probability = float(config.news_probability)
        self.shock = float(config.news_shock)

    def draw(self, rng: np.random.Generator) -> NewsEvent:
        if self.shock == 0 or rng.random() > self.probability:
            return NewsEvent("NO_NEWS", 0.0)
        signed = self.shock if rng.random() < 0.5 else -self.shock
        event = "NEWS_UP" if signed > 0 else "NEWS_DOWN"
        return NewsEvent(event, float(signed))
