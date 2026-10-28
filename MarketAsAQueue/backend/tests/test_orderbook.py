"""Queue mechanics, FIFO, matching, reconstruction."""

from app.engine.orderbook import OrderBook
from app.engine.reconstruction import reconstruct_book
from app.models.entities import Order
from app.models.types import OrderStatus, Side


def _o(oid, side, px, qty, t=0.0):
    return Order(order_id=oid, side=side, price_ticks=px, quantity=qty, remaining=qty, timestamp=t)


def test_fifo_priority():
    book = OrderBook(tick_size=0.01)
    book.add_limit(_o("A", Side.ASK, 10001, 100), 0.0)
    book.add_limit(_o("B", Side.ASK, 10001, 80), 0.1)
    book.add_limit(_o("C", Side.ASK, 10001, 50), 0.2)
    trades, leftover, depleted = book.add_market(Side.BID, 180, 1.0)
    assert leftover == 0
    assert book.orders["A"].status is OrderStatus.FILLED
    assert book.orders["B"].status is OrderStatus.FILLED
    assert book.orders["C"].remaining == 50
    assert book.orders["C"].status is OrderStatus.QUEUED or book.orders["C"].status is OrderStatus.PARTIAL_FILL
    ids = [t.maker_order_id for t in trades]
    assert ids[0] == "A"
    assert "B" in ids


def test_partial_then_rest():
    book = OrderBook()
    book.add_limit(_o("A", Side.ASK, 10001, 40), 0.0)
    trades, leftover, depleted = book.add_market(Side.BID, 15, 0.5)
    assert leftover == 0
    assert book.orders["A"].remaining == 25
    assert book.orders["A"].status is OrderStatus.PARTIAL_FILL


def test_level_depletion_moves_price():
    book = OrderBook()
    book.add_limit(_o("A", Side.ASK, 10001, 50), 0.0)
    book.add_limit(_o("B", Side.ASK, 10002, 80), 0.0)
    trades, leftover, depleted = book.add_market(Side.BID, 50, 1.0)
    assert depleted == [10001]
    assert book.best_ask() == 10002


def test_queue_position_ahead_behind():
    book = OrderBook()
    book.add_limit(_o("A", Side.BID, 10000, 500), 0.0)
    book.add_limit(_o("B", Side.BID, 10000, 300), 0.1)
    book.add_limit(_o("U", Side.BID, 10000, 100), 0.2)
    book.add_limit(_o("C", Side.BID, 10000, 200), 0.3)
    pos = book.user_position("U")
    assert pos["rank"] == 3
    assert pos["queue_ahead"] == 800
    assert pos["queue_behind"] == 200


def test_cancellation_removes_ahead():
    book = OrderBook()
    book.add_limit(_o("A", Side.BID, 10000, 500), 0.0)
    book.add_limit(_o("U", Side.BID, 10000, 100), 0.1)
    book.cancel_order("A", 0.2)
    pos = book.user_position("U")
    assert pos["rank"] == 1
    assert pos["queue_ahead"] == 0


def test_imbalance_sign():
    book = OrderBook()
    book.add_limit(_o("b", Side.BID, 10000, 1000), 0)
    book.add_limit(_o("a", Side.ASK, 10002, 200), 0)
    qi = book.queue_imbalance()
    assert qi is not None and qi > 0


def test_marketable_limit_crosses():
    book = OrderBook()
    book.add_limit(_o("A", Side.ASK, 10001, 40), 0)
    o = _o("X", Side.BID, 10001, 40)
    trades = book.add_limit(o, 1.0)
    assert len(trades) == 1
    assert o.status is OrderStatus.FILLED


def test_reconstruction_rebuilds_depth():
    events = [
        {"t": 0.0, "type": "limit_order", "side": "bid", "price_ticks": 10000, "quantity": 200, "order_id": "1"},
        {"t": 0.1, "type": "limit_order", "side": "ask", "price_ticks": 10002, "quantity": 150, "order_id": "2"},
        {"t": 0.2, "type": "market_order", "side": "bid", "quantity": 50},
    ]
    out = reconstruct_book(events, 0.01)
    assert out["book"]["best_ask_queue"] == 100
    assert out["n_applied"] == 3
