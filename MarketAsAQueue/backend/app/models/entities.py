from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from .types import EventType, OrderStatus, Side


@dataclass
class Order:
    order_id: str
    side: Side
    price_ticks: int
    quantity: int
    remaining: int
    timestamp: float
    is_user: bool = False
    status: OrderStatus = OrderStatus.CREATED
    filled_qty: int = 0
    avg_fill_price: float = 0.0
    last_event_time: float = 0.0
    lifecycle: list[dict] = field(default_factory=list)

    def record(self, status: OrderStatus, t: float, note: str = "") -> None:
        self.status = status
        self.last_event_time = t
        self.lifecycle.append({"status": status.value, "t": t, "note": note, "remaining": self.remaining})


@dataclass
class Trade:
    trade_id: str
    timestamp: float
    price_ticks: int
    quantity: int
    aggressive_side: Side
    maker_order_id: str
    taker_order_id: str
    is_user: bool = False


@dataclass
class PriceLevelSnapshot:
    price_ticks: int
    side: Side
    volume: int
    n_orders: int
    arrival_rate: float
    cancel_rate: float
    exec_rate: float
    est_wait: float
    est_fill_p: float


@dataclass
class MarketEvent:
    timestamp: float
    event_type: EventType
    side: Optional[Side]
    price_ticks: Optional[int]
    quantity: int
    order_id: Optional[str] = None
    queue_position: Optional[int] = None
    note: str = ""


@dataclass
class QueuePosition:
    order_id: str
    side: Side
    price_ticks: int
    rank: int
    qty: int
    queue_ahead: int
    queue_behind: int
    n_ahead: int
    n_behind: int
    est_fill_p: dict[str, float]
    est_fill_time: float
    cancel_hazard: float
    market_pressure: float


@dataclass
class AssetSpec:
    symbol: str
    tick_size: float = 0.01
    lot_size: int = 1
    initial_mid: float = 100.00
    n_levels: int = 10
    seed_depth: int = 800


@dataclass
class SimulationParams:
    """Intensity parameters of the point-process market.

    λ_L : limit-order arrival intensity (orders / sec)
    λ_M : market-order arrival intensity
    λ_C : cancellation intensity (per resting order, approx)
    μ   : effective execution / 'service' rate of the touch queue
    """

    lambda_limit: float = 42.0
    lambda_market: float = 18.0
    lambda_cancel: float = 0.35
    mu_service: float = 22.0
    volatility: float = 0.18
    mean_limit_size: float = 120.0
    mean_market_size: float = 90.0
    hawkes_alpha: float = 0.0
    hawkes_beta: float = 1.6
    tick_size: float = 0.01
    n_levels: int = 10
    seed: int = 7
    speed: float = 1.0
