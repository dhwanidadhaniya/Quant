from enum import Enum


class Side(str, Enum):
    BID = "bid"
    ASK = "ask"


class EventType(str, Enum):
    LIMIT_ORDER = "limit_order"
    MARKET_ORDER = "market_order"
    CANCELLATION = "cancellation"
    EXECUTION = "execution"
    PRICE_CHANGE = "price_change"
    LEVEL_DEPLETED = "level_depleted"
    REPLENISHMENT = "replenishment"
    USER_ORDER = "user_order"


class OrderStatus(str, Enum):
    CREATED = "created"
    SUBMITTED = "submitted"
    QUEUED = "queued"
    WAITING = "waiting"
    PARTIAL_FILL = "partial_fill"
    FILLED = "filled"
    CANCELLED = "cancelled"


class DataSource(str, Enum):
    SIMULATED = "SIMULATED"
    HISTORICAL = "HISTORICAL"
    LIVE = "LIVE"


class Regime(str, Enum):
    NORMAL = "normal"
    HIGH_LIQUIDITY = "high_liquidity"
    LOW_LIQUIDITY = "low_liquidity"
    HIGH_CANCELLATION = "high_cancellation"
    HIGH_MARKET_ORDER_PRESSURE = "high_market_order_pressure"
    QUEUE_IMBALANCE = "queue_imbalance"
    LIQUIDITY_SHOCK = "liquidity_shock"
    VOLATILITY_SHOCK = "volatility_shock"


class ShockType(str, Enum):
    FLASH_SELLING = "flash_selling"
    FLASH_BUYING = "flash_buying"
    MASS_CANCELLATION = "mass_cancellation"
    LIQUIDITY_WITHDRAWAL = "liquidity_withdrawal"
    MARKET_ORDER_SURGE = "market_order_surge"
    VOLATILITY_SPIKE = "volatility_spike"


class StrategyType(str, Enum):
    MARKET_ORDER = "market_order"
    LIMIT_ORDER = "limit_order"
    PATIENT_LIMIT = "patient_limit"
    AGGRESSIVE_LIMIT = "aggressive_limit"
    MID_PEG = "mid_peg"
