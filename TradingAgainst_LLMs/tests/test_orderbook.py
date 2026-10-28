from app.engine.orderbook import Order, OrderBook
from app.engine.portfolio import Portfolio
from app.engine.validator import validate_quote
from app.schemas import ExperimentConfig


def _order(agent, side, price, size, seq, round_idx=0):
    return Order(
        order_id=f"{agent}-{side}-{seq}",
        agent_id=agent,
        side=side,
        price=price,
        size=size,
        remaining=size,
        seq=seq,
        round_idx=round_idx,
    )


def test_crossing_and_partial_fill():
    book = OrderBook()
    assert book.add(_order("B", "ask", 50, 2, 1)) == []
    trades = book.add(_order("A", "bid", 51, 5, 2))
    assert len(trades) == 1
    assert trades[0].price == 50
    assert trades[0].quantity == 2
    assert trades[0].buyer_id == "A"
    assert trades[0].seller_id == "B"
    snap = book.snapshot()
    assert snap["best_bid"] == 51
    assert snap["best_bid_size"] == 3
    assert snap["best_ask"] is None


def test_non_crossing_rests():
    book = OrderBook()
    assert book.add(_order("A", "bid", 40, 1, 1)) == []
    assert book.add(_order("B", "ask", 50, 1, 2)) == []
    snap = book.snapshot()
    assert snap["best_bid"] == 40
    assert snap["best_ask"] == 50
    assert snap["spread"] == 10
    assert snap["midpoint"] == 45
    assert book.snapshot()["bid_depth"] == 1


def test_multiple_price_levels():
    book = OrderBook()
    book.add(_order("B", "ask", 50, 2, 1))
    book.add(_order("C", "ask", 48, 2, 2))
    trades = book.add(_order("A", "bid", 51, 5, 3))
    assert [t.seller_id for t in trades] == ["C", "B"]
    assert [t.price for t in trades] == [48, 50]
    assert book.snapshot()["best_bid_size"] == 1


def test_price_time_priority():
    book = OrderBook()
    book.add(_order("B", "ask", 50, 1, 1))
    book.add(_order("C", "ask", 50, 1, 2))
    trades = book.add(_order("A", "bid", 50, 2, 3))
    assert [t.seller_id for t in trades] == ["B", "C"]
    assert sum(t.quantity for t in trades) == 2
    assert book.snapshot()["asks"] == []


def test_better_price_beats_earlier_time():
    book = OrderBook()
    book.add(_order("B", "bid", 49, 1, 1))
    book.add(_order("C", "bid", 51, 1, 2))
    trades = book.add(_order("A", "ask", 48, 2, 3))
    assert [t.buyer_id for t in trades] == ["C", "B"]
    assert [t.price for t in trades] == [51, 49]


def test_self_trade_does_not_cross_own_resting_order():
    book = OrderBook()
    book.add(_order("A", "ask", 50, 1, 1))
    trades = book.add(_order("A", "bid", 51, 1, 2))
    assert trades == []
    snap = book.snapshot()
    assert snap["best_ask"] == 50
    assert snap["best_bid"] == 51


def test_empty_book():
    snap = OrderBook().snapshot()
    assert snap["best_bid"] is None
    assert snap["best_ask"] is None
    assert snap["midpoint"] is None
    assert snap["spread"] is None
    assert snap["bid_depth"] == 0
    assert snap["ask_depth"] == 0


def test_invalid_quotes_and_position_limit():
    cfg = ExperimentConfig(position_limit=5, max_order_size=4, price_min=0, price_max=100)
    port = Portfolio(1_000)
    assert validate_quote(10, 10, 1, port, cfg).reason == "bid_not_below_ask"
    assert validate_quote(10, 9, 1, port, cfg).reason == "bid_not_below_ask"
    assert validate_quote(10, 12, 0, port, cfg).reason == "size_not_positive"
    assert validate_quote(-1, 12, 1, port, cfg).reason == "price_out_of_bounds"
    assert validate_quote(None, 12, 1, port, cfg).reason == "missing_fields"
    clipped = validate_quote(10, 12, 9, port, cfg)
    assert clipped.ok
    assert clipped.bid_size == 4
    assert clipped.ask_size == 4
    port.inventory = 5
    blocked = validate_quote(10, 12, 2, port, cfg)
    assert blocked.ok
    assert blocked.bid_size == 0
    assert blocked.ask_size == 2
    port.inventory = 5
    # Selling is still allowed; a second case at the short limit blocks sells.
    port.inventory = -5
    blocked_short = validate_quote(10, 12, 2, port, cfg)
    assert blocked_short.ask_size == 0
    assert blocked_short.bid_size == 2


def test_settlement_pnl_includes_fees():
    portfolio = Portfolio(100)
    portfolio.apply("buy", 10, 2, 0.1)
    assert portfolio.cash == 100 - 20 - 0.2
    assert portfolio.inventory == 2
    assert portfolio.pnl(12) == (portfolio.cash + 24 - 100)
    portfolio.apply("sell", 11, 2, 0.1)
    assert portfolio.inventory == 0
    assert portfolio.pnl(12) == portfolio.cash - 100
