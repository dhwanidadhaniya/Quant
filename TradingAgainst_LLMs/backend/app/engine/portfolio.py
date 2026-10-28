from __future__ import annotations


class Portfolio:
    def __init__(self, cash: float):
        self.initial_cash = float(cash)
        self.cash = float(cash)
        self.inventory = 0.0

    def apply(self, side: str, price: float, qty: float, fee_per_unit: float) -> None:
        fee = float(fee_per_unit) * float(qty)
        if side == "buy":
            self.cash -= float(price) * float(qty) + fee
            self.inventory += float(qty)
        elif side == "sell":
            self.cash += float(price) * float(qty) - fee
            self.inventory -= float(qty)
        else:
            raise ValueError(f"unknown side {side}")

    def pnl(self, mark: float) -> float:
        return float(self.cash + self.inventory * float(mark) - self.initial_cash)

    def snapshot(self, mid: float | None, true_value: float) -> dict:
        return {
            "cash": self.cash,
            "inventory": self.inventory,
            "pnl_vs_mid": None if mid is None else self.pnl(mid),
            "pnl_vs_truth": self.pnl(true_value),
        }
