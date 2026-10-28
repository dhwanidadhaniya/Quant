from __future__ import annotations

from dataclasses import dataclass

from app.engine.portfolio import Portfolio
from app.mathutil import tick
from app.schemas import ExperimentConfig


@dataclass
class ValidatedQuote:
    ok: bool
    reason: str | None
    bid: float | None
    ask: float | None
    bid_size: float
    ask_size: float


def validate_quote(
    bid: float | None,
    ask: float | None,
    size: float | None,
    portfolio: Portfolio,
    config: ExperimentConfig,
) -> ValidatedQuote:
    if bid is None or ask is None or size is None:
        return ValidatedQuote(False, "missing_fields", None, None, 0.0, 0.0)
    try:
        bid_f = float(bid)
        ask_f = float(ask)
        size_f = float(size)
    except (TypeError, ValueError):
        return ValidatedQuote(False, "non_numeric", None, None, 0.0, 0.0)
    if bid_f != bid_f or ask_f != ask_f or size_f != size_f:
        return ValidatedQuote(False, "non_finite", None, None, 0.0, 0.0)
    if size_f <= 0:
        return ValidatedQuote(False, "size_not_positive", None, None, 0.0, 0.0)
    if bid_f >= ask_f:
        return ValidatedQuote(False, "bid_not_below_ask", None, None, 0.0, 0.0)
    if bid_f < config.price_min or ask_f > config.price_max:
        return ValidatedQuote(False, "price_out_of_bounds", None, None, 0.0, 0.0)
    if bid_f > config.price_max or ask_f < config.price_min:
        return ValidatedQuote(False, "price_out_of_bounds", None, None, 0.0, 0.0)

    bid_f = tick(bid_f)
    ask_f = tick(ask_f)
    if bid_f >= ask_f:
        return ValidatedQuote(False, "bid_not_below_ask", None, None, 0.0, 0.0)

    capped = min(size_f, config.max_order_size)
    buy_room = config.position_limit - portfolio.inventory
    sell_room = config.position_limit + portfolio.inventory
    bid_size = max(0.0, min(capped, buy_room))
    ask_size = max(0.0, min(capped, sell_room))
    if bid_size <= 1e-9 and ask_size <= 1e-9:
        return ValidatedQuote(False, "position_limit", bid_f, ask_f, 0.0, 0.0)
    return ValidatedQuote(True, None, bid_f, ask_f, bid_size, ask_size)
