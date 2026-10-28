"""Limit-order book as a collection of FIFO queues.

Financial theory
----------------
Each displayed price is a queue. Limit orders arrive and wait. Marketable
orders consume the opposite queue in price-time priority. Cancellations
remove resting liquidity without a trade. When the best queue hits zero
the next price becomes the new touch — that is price formation.

Queueing theory
---------------
The book is a network of parallel queues (one per tick) coupled by a
matching server. Service at the touch is the incoming market-order flow
plus cancellations. New limit orders are arrivals. Price-time priority
is strict FIFO within a price.

Formula
-------
    Q_t = Q_{t-Δt} + A_t − D_t − C_t

    Q_t  queue length (shares) at a price
    A_t  new limit arrivals
    D_t  executions / departures
    C_t  cancellations

State
-----
    X_t = (Q_t^{bid}, Q_t^{ask}, P_t, I_t)
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Optional
from uuid import uuid4

from app.models.entities import Order, Trade
from app.models.types import EventType, OrderStatus, Side


def _oid() -> str:
    return uuid4().hex[:10]


@dataclass
class PriceLevel:
    price_ticks: int
    side: Side
    orders: deque[Order] = field(default_factory=deque)

    @property
    def volume(self) -> int:
        return sum(o.remaining for o in self.orders)

    @property
    def n_orders(self) -> int:
        return len(self.orders)

    def enqueue(self, order: Order) -> int:
        self.orders.append(order)
        return len(self.orders)

    def cancel(self, order_id: str) -> Optional[Order]:
        kept: deque[Order] = deque()
        removed: Optional[Order] = None
        for o in self.orders:
            if o.order_id == order_id and removed is None:
                removed = o
            else:
                kept.append(o)
        self.orders = kept
        return removed

    def take(self, qty: int, t: float, taker_id: str, aggressive: Side) -> tuple[list[Trade], int]:
        trades: list[Trade] = []
        remaining = qty
        while remaining > 0 and self.orders:
            head = self.orders[0]
            fill = min(remaining, head.remaining)
            head.remaining -= fill
            head.filled_qty += fill
            px = self.price_ticks
            notional = head.avg_fill_price * (head.filled_qty - fill) + px * fill
            head.avg_fill_price = notional / head.filled_qty if head.filled_qty else 0.0
            remaining -= fill
            trades.append(
                Trade(
                    trade_id=_oid(),
                    timestamp=t,
                    price_ticks=px,
                    quantity=fill,
                    aggressive_side=aggressive,
                    maker_order_id=head.order_id,
                    taker_order_id=taker_id,
                    is_user=head.is_user,
                )
            )
            if head.remaining == 0:
                head.record(OrderStatus.FILLED, t, "fully executed")
                self.orders.popleft()
            else:
                head.record(OrderStatus.PARTIAL_FILL, t, f"partial {fill}")
        return trades, remaining

    def position_of(self, order_id: str) -> Optional[tuple[int, int, int, int]]:
        """Return (rank 1-based, qty, ahead volume, behind volume) or None."""
        ahead = 0
        rank = 0
        found: Optional[Order] = None
        for i, o in enumerate(self.orders, start=1):
            if o.order_id == order_id:
                rank = i
                found = o
                break
            ahead += o.remaining
        if found is None:
            return None
        behind = self.volume - ahead - found.remaining
        return rank, found.remaining, ahead, behind


class OrderBook:
    def __init__(self, tick_size: float = 0.01, n_levels: int = 10) -> None:
        self.tick_size = tick_size
        self.n_levels = n_levels
        self.bids: dict[int, PriceLevel] = {}
        self.asks: dict[int, PriceLevel] = {}
        self.orders: dict[str, Order] = {}
        self.trades: list[Trade] = []
        self.events: list[dict] = []

    def px(self, ticks: int) -> float:
        return ticks * self.tick_size

    def ticks(self, price: float) -> int:
        return int(round(price / self.tick_size))

    def best_bid(self) -> Optional[int]:
        return max(self.bids) if self.bids else None

    def best_ask(self) -> Optional[int]:
        return min(self.asks) if self.asks else None

    def mid_ticks(self) -> Optional[float]:
        bb, ba = self.best_bid(), self.best_ask()
        if bb is None or ba is None:
            return None
        return 0.5 * (bb + ba)

    def spread_ticks(self) -> Optional[int]:
        bb, ba = self.best_bid(), self.best_ask()
        if bb is None or ba is None:
            return None
        return ba - bb

    def _side_book(self, side: Side) -> dict[int, PriceLevel]:
        return self.bids if side is Side.BID else self.asks

    def level(self, side: Side, price_ticks: int) -> PriceLevel:
        book = self._side_book(side)
        if price_ticks not in book:
            book[price_ticks] = PriceLevel(price_ticks=price_ticks, side=side)
        return book[price_ticks]

    def drop_empty(self, side: Side, price_ticks: int) -> bool:
        book = self._side_book(side)
        lvl = book.get(price_ticks)
        if lvl is not None and lvl.n_orders == 0:
            del book[price_ticks]
            return True
        return False

    def add_limit(self, order: Order, t: float) -> list[Trade]:
        """Price-time priority. Marketable limits walk the opposite book."""
        order.record(OrderStatus.SUBMITTED, t, "submitted")
        self.orders[order.order_id] = order
        trades: list[Trade] = []
        if order.side is Side.BID:
            while order.remaining > 0 and self.asks and order.price_ticks >= min(self.asks):
                best = min(self.asks)
                got, leftover = self.asks[best].take(order.remaining, t, order.order_id, Side.BID)
                trades.extend(got)
                order.remaining = leftover
                if self.drop_empty(Side.ASK, best):
                    self.events.append(
                        {"t": t, "type": EventType.LEVEL_DEPLETED.value, "side": "ask", "px": best}
                    )
            if order.remaining > 0:
                self.level(Side.BID, order.price_ticks).enqueue(order)
                order.record(OrderStatus.QUEUED, t, "resting bid")
                self._shed(Side.BID, order.price_ticks, t)
        else:
            while order.remaining > 0 and self.bids and order.price_ticks <= max(self.bids):
                best = max(self.bids)
                got, leftover = self.bids[best].take(order.remaining, t, order.order_id, Side.ASK)
                trades.extend(got)
                order.remaining = leftover
                if self.drop_empty(Side.BID, best):
                    self.events.append(
                        {"t": t, "type": EventType.LEVEL_DEPLETED.value, "side": "bid", "px": best}
                    )
            if order.remaining > 0:
                self.level(Side.ASK, order.price_ticks).enqueue(order)
                order.record(OrderStatus.QUEUED, t, "resting ask")
                self._shed(Side.ASK, order.price_ticks, t)
        if order.remaining == 0:
            order.record(OrderStatus.FILLED, t, "marketable limit filled")
        self.trades.extend(trades)
        return trades

    def _shed(self, side: Side, price_ticks: int, t: float, cap: int = 40) -> None:
        """Bound displayed FIFO length so the laboratory stays inspectable.

        Excess non-user size is cancelled from the back of the queue — a didactic
        stand-in for 'this price is already a wall'.
        """
        book = self._side_book(side)
        lvl = book.get(price_ticks)
        if lvl is None:
            return
        while lvl.n_orders > cap:
            victim = next((o for o in reversed(lvl.orders) if not o.is_user), None)
            if victim is None:
                break
            self.cancel_order(victim.order_id, t)

    def add_market(self, side: Side, qty: int, t: float, taker_id: Optional[str] = None) -> tuple[list[Trade], int, list[int]]:
        """Aggressive order consumes opposite queues until filled or the book is empty.

        Returns (trades, unfilled, depleted_price_ticks).
        """
        taker_id = taker_id or f"mkt-{_oid()}"
        trades: list[Trade] = []
        remaining = qty
        depleted: list[int] = []
        if side is Side.BID:
            while remaining > 0 and self.asks:
                best = min(self.asks)
                got, leftover = self.asks[best].take(remaining, t, taker_id, Side.BID)
                trades.extend(got)
                remaining = leftover
                if self.drop_empty(Side.ASK, best):
                    depleted.append(best)
                    self.events.append(
                        {"t": t, "type": EventType.LEVEL_DEPLETED.value, "side": "ask", "px": best}
                    )
        else:
            while remaining > 0 and self.bids:
                best = max(self.bids)
                got, leftover = self.bids[best].take(remaining, t, taker_id, Side.ASK)
                trades.extend(got)
                remaining = leftover
                if self.drop_empty(Side.BID, best):
                    depleted.append(best)
                    self.events.append(
                        {"t": t, "type": EventType.LEVEL_DEPLETED.value, "side": "bid", "px": best}
                    )
        self.trades.extend(trades)
        return trades, remaining, depleted

    def cancel_order(self, order_id: str, t: float) -> Optional[Order]:
        order = self.orders.get(order_id)
        if order is None or order.remaining <= 0:
            return None
        lvl = self._side_book(order.side).get(order.price_ticks)
        if lvl is None:
            return None
        removed = lvl.cancel(order_id)
        if removed is None:
            return None
        removed.record(OrderStatus.CANCELLED, t, "cancelled")
        self.drop_empty(order.side, order.price_ticks)
        return removed

    def random_resting_ids(self, side: Optional[Side] = None) -> list[str]:
        ids: list[str] = []
        books = [self.bids, self.asks] if side is None else [self._side_book(side)]
        for book in books:
            for lvl in book.values():
                for o in lvl.orders:
                    if not o.is_user:
                        ids.append(o.order_id)
        return ids

    def depth_side(self, side: Side, n: int = 10, include_orders: bool = False) -> list[dict]:
        book = self._side_book(side)
        keys = sorted(book.keys(), reverse=(side is Side.BID))[:n]
        out = []
        cum = 0
        for k in keys:
            lvl = book[k]
            cum += lvl.volume
            out.append(
                {
                    "price": self.px(k),
                    "price_ticks": k,
                    "volume": lvl.volume,
                    "n_orders": lvl.n_orders,
                    "cumulative": cum,
                    "notional": lvl.volume * self.px(k),
                    "has_user": any(o.is_user for o in lvl.orders),
                    "orders": (
                        [
                            {
                                "order_id": o.order_id,
                                "qty": o.remaining,
                                "is_user": o.is_user,
                                "age": 0.0,
                                "status": o.status.value,
                            }
                            for o in lvl.orders
                        ]
                        if include_orders
                        else []
                    ),
                }
            )
        return out

    def queue_imbalance(self) -> Optional[float]:
        """QI = (Q_bid − Q_ask) / (Q_bid + Q_ask) at the touch."""
        bb, ba = self.best_bid(), self.best_ask()
        if bb is None or ba is None:
            return None
        qb = self.bids[bb].volume
        qa = self.asks[ba].volume
        tot = qb + qa
        if tot == 0:
            return 0.0
        return (qb - qa) / tot

    def total_depth(self, n: int = 5) -> tuple[int, int]:
        bid = sum(lvl["volume"] for lvl in self.depth_side(Side.BID, n))
        ask = sum(lvl["volume"] for lvl in self.depth_side(Side.ASK, n))
        return bid, ask

    def user_position(self, order_id: str) -> Optional[dict]:
        order = self.orders.get(order_id)
        if order is None:
            return None
        book = self._side_book(order.side)
        lvl = book.get(order.price_ticks)
        if lvl is None:
            return {
                "order_id": order_id,
                "status": order.status.value,
                "remaining": order.remaining,
                "filled": order.filled_qty,
            }
        pos = lvl.position_of(order_id)
        if pos is None:
            return {
                "order_id": order_id,
                "status": order.status.value,
                "remaining": order.remaining,
                "filled": order.filled_qty,
            }
        rank, qty, ahead, behind = pos
        qlist = [
            {
                "rank": i,
                "order_id": o.order_id,
                "qty": o.remaining,
                "is_user": o.is_user,
            }
            for i, o in enumerate(lvl.orders, start=1)
        ]
        # Window around the user so a fat FIFO line does not serialize thousands of rows.
        lo = max(0, rank - 12)
        hi = min(len(qlist), rank + 8)
        return {
            "order_id": order_id,
            "side": order.side.value,
            "price": self.px(order.price_ticks),
            "price_ticks": order.price_ticks,
            "rank": rank,
            "qty": qty,
            "queue_ahead": ahead,
            "queue_behind": behind,
            "n_ahead": rank - 1,
            "n_behind": lvl.n_orders - rank,
            "status": order.status.value,
            "filled": order.filled_qty,
            "lifecycle": order.lifecycle[-12:],
            "queue": qlist[lo:hi],
        }

    def snapshot(self, n: int = 10) -> dict:
        bb, ba = self.best_bid(), self.best_ask()
        mid = self.mid_ticks()
        spread = self.spread_ticks()
        qi = self.queue_imbalance()
        bid_d, ask_d = self.total_depth(5)
        return {
            "best_bid": self.px(bb) if bb is not None else None,
            "best_ask": self.px(ba) if ba is not None else None,
            "best_bid_ticks": bb,
            "best_ask_ticks": ba,
            "best_bid_queue": self.bids[bb].volume if bb is not None else 0,
            "best_ask_queue": self.asks[ba].volume if ba is not None else 0,
            "best_bid_n": self.bids[bb].n_orders if bb is not None else 0,
            "best_ask_n": self.asks[ba].n_orders if ba is not None else 0,
            "mid": self.px(mid) if mid is not None else None,
            "spread": (spread * self.tick_size) if spread is not None else None,
            "spread_ticks": spread,
            "imbalance": qi,
            "bid_depth": bid_d,
            "ask_depth": ask_d,
            "bids": self.depth_side(Side.BID, n, include_orders=False),
            "asks": self.depth_side(Side.ASK, n, include_orders=False),
            "n_resting": sum(1 for o in self.orders.values() if o.remaining > 0),
        }
