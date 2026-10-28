from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Order:
    order_id: str
    agent_id: str
    side: str
    price: float
    size: float
    remaining: float
    seq: int
    round_idx: int


@dataclass
class Trade:
    buyer_id: str
    seller_id: str
    price: float
    quantity: float
    round_idx: int
    aggressor_side: str
    buy_order_id: str
    sell_order_id: str

    def as_dict(self) -> dict:
        return {
            "buyer_id": self.buyer_id,
            "seller_id": self.seller_id,
            "price": self.price,
            "quantity": self.quantity,
            "round": self.round_idx,
            "aggressor_side": self.aggressor_side,
            "buy_order_id": self.buy_order_id,
            "sell_order_id": self.sell_order_id,
        }


@dataclass
class OrderBook:
    """Round-based continuous double auction with price-time priority."""

    bids: list[Order] = field(default_factory=list)
    asks: list[Order] = field(default_factory=list)
    _seq: int = 0

    def next_seq(self) -> int:
        self._seq += 1
        return self._seq

    def cancel_all(self) -> None:
        self.bids.clear()
        self.asks.clear()

    def _clean(self) -> None:
        self.bids = [o for o in self.bids if o.remaining > 1e-9]
        self.asks = [o for o in self.asks if o.remaining > 1e-9]
        self.bids.sort(key=lambda o: (-o.price, o.seq))
        self.asks.sort(key=lambda o: (o.price, o.seq))

    def add(self, order: Order) -> list[Trade]:
        trades: list[Trade] = []
        if order.size <= 0 or order.remaining <= 0:
            return trades
        if order.side == "bid":
            while order.remaining > 1e-9 and self.asks:
                self._clean()
                if not self.asks:
                    break
                best = self.asks[0]
                if order.price + 1e-9 < best.price:
                    break
                if best.agent_id == order.agent_id:
                    break
                qty = min(order.remaining, best.remaining)
                order.remaining -= qty
                best.remaining -= qty
                trades.append(
                    Trade(
                        buyer_id=order.agent_id,
                        seller_id=best.agent_id,
                        price=best.price,
                        quantity=qty,
                        round_idx=order.round_idx,
                        aggressor_side="buy",
                        buy_order_id=order.order_id,
                        sell_order_id=best.order_id,
                    )
                )
        elif order.side == "ask":
            while order.remaining > 1e-9 and self.bids:
                self._clean()
                if not self.bids:
                    break
                best = self.bids[0]
                if order.price > best.price + 1e-9:
                    break
                if best.agent_id == order.agent_id:
                    break
                qty = min(order.remaining, best.remaining)
                order.remaining -= qty
                best.remaining -= qty
                trades.append(
                    Trade(
                        buyer_id=best.agent_id,
                        seller_id=order.agent_id,
                        price=best.price,
                        quantity=qty,
                        round_idx=order.round_idx,
                        aggressor_side="sell",
                        buy_order_id=best.order_id,
                        sell_order_id=order.order_id,
                    )
                )
        else:
            raise ValueError(f"unknown side {order.side}")
        if order.remaining > 1e-9:
            if order.side == "bid":
                self.bids.append(order)
            else:
                self.asks.append(order)
        self._clean()
        return trades

    def snapshot(self) -> dict:
        self._clean()

        def levels(orders: list[Order]) -> list[dict]:
            grouped: dict[float, dict] = {}
            for order in orders:
                row = grouped.get(order.price)
                if row is None:
                    row = {"price": order.price, "size": 0.0, "orders": 0, "agent_ids": []}
                    grouped[order.price] = row
                row["size"] += order.remaining
                row["orders"] += 1
                row["agent_ids"].append(order.agent_id)
            return list(grouped.values())

        bid_levels = levels(self.bids)
        ask_levels = levels(self.asks)
        best_bid = bid_levels[0]["price"] if bid_levels else None
        best_ask = ask_levels[0]["price"] if ask_levels else None
        midpoint = None
        spread = None
        if best_bid is not None and best_ask is not None:
            midpoint = (best_bid + best_ask) / 2
            spread = best_ask - best_bid
        return {
            "bids": bid_levels,
            "asks": ask_levels,
            "best_bid": best_bid,
            "best_ask": best_ask,
            "best_bid_size": bid_levels[0]["size"] if bid_levels else 0.0,
            "best_ask_size": ask_levels[0]["size"] if ask_levels else 0.0,
            "midpoint": midpoint,
            "spread": spread,
            "bid_depth": float(sum(level["size"] for level in bid_levels)),
            "ask_depth": float(sum(level["size"] for level in ask_levels)),
        }
