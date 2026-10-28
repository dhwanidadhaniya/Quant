from __future__ import annotations

import numpy as np

from app.schemas import ExperimentConfig


def draw_signal(
    true_value: float,
    rng: np.random.Generator,
    config: ExperimentConfig,
    memory: dict,
) -> tuple[float, float]:
    """Return (private_signal, signal_minus_truth). Truth is not part of the signal payload."""
    if config.signal_model == "bounded":
        noise = float(rng.uniform(-config.signal_noise, config.signal_noise))
        signal = float(true_value + noise)
        memory["last"] = signal
        return signal, float(signal - true_value)

    if config.signal_model == "partial":
        observe_p = config.partial_observability
        if rng.random() > observe_p:
            signal = float(memory.get("last", config.center))
            return signal, float(signal - true_value)
        noise = float(rng.normal(0.0, config.signal_noise))
        signal = float(true_value + noise)
        memory["last"] = signal
        return signal, float(signal - true_value)

    noise = float(rng.normal(0.0, config.signal_noise))
    signal = float(true_value + noise)
    memory["last"] = signal
    return signal, float(signal - true_value)
