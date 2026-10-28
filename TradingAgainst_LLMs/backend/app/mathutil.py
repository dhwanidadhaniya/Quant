from __future__ import annotations

import hashlib
import math
from typing import Any

import numpy as np


def nearest_multiple(price: float, multiple: float) -> float:
    if multiple <= 0:
        return float(price)
    return float(math.floor(price / multiple + 0.5) * multiple)


def dist_to_multiple(price: float, multiple: float) -> float:
    if multiple <= 0:
        return 0.0
    remainder = abs(price) % multiple
    return float(min(remainder, multiple - remainder))


def pull_to_multiple(price: float, strength: float, multiple: float) -> float:
    if multiple <= 0 or strength <= 0:
        return float(price)
    target = nearest_multiple(price, multiple)
    return float(price + strength * (target - price))


def mix_seed(*parts: Any) -> int:
    payload = repr(parts).encode()
    return int(hashlib.sha256(payload).hexdigest()[:8], 16)


def tick(price: float, tick_size: float = 0.01) -> float:
    if tick_size <= 0:
        return float(price)
    return float(round(round(price / tick_size) * tick_size, 6))


def clean(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): clean(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [clean(v) for v in value]
    if isinstance(value, (np.floating,)):
        value = float(value)
    elif isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return value
    if isinstance(value, (np.bool_,)):
        return bool(value)
    return value
