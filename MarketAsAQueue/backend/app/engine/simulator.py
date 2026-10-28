"""Event-driven limit-order-book simulator.

The market is a multi-type point process on a pair of FIFO queue networks
(bids and asks) coupled by a price-time matching engine.

Arrivals
    N(t) ~ Poisson(λ t)                    educational baseline
    λ(t) = μ + Σ α e^{-β(t-t_i)}          optional Hawkes self-excitation

Queue length at a price
    Q_t = Q_{t-Δt} + A_t − D_t − C_t

State
    X_t = (Q^{bid}_t, Q^{ask}_t, P_t, I_t)

Educational simplification
    Independent Poisson streams are a first approximation. Real order flow
    clusters, is strategic, and is non-stationary. Hawkes intensity is
    offered as an advanced extension, not as the foundation.
"""

from __future__ import annotations

import math
import random
from collections import defaultdict, deque
from typing import Any, Optional
from uuid import uuid4

from app.engine.event_queue import EventQueue
from app.engine.orderbook import OrderBook
from app.models.entities import AssetSpec, Order, SimulationParams
from app.models.types import DataSource, EventType, OrderStatus, Regime, ShockType, Side


def _oid() -> str:
    return uuid4().hex[:10]


class IntensityTracker:
    """Rolling intensity λ̂ = N / T over a trailing window."""

    def __init__(self, window: float = 5.0) -> None:
        self.window = window
        self.times: dict[str, deque[float]] = defaultdict(deque)

    def hit(self, kind: str, t: float) -> None:
        self.times[kind].append(t)
        self._trim(kind, t)

    def rate(self, kind: str, t: float) -> float:
        self._trim(kind, t)
        n = len(self.times[kind])
        return n / self.window if self.window > 0 else 0.0

    def _trim(self, kind: str, t: float) -> None:
        q = self.times[kind]
        cutoff = t - self.window
        while q and q[0] < cutoff:
            q.popleft()


class MarketSimulator:
    """Single-asset event-driven LOB simulator."""

    def __init__(self, spec: Optional[AssetSpec] = None, params: Optional[SimulationParams] = None) -> None:
        self.spec = spec or AssetSpec(symbol="ASSET-A")
        self.params = params or SimulationParams()
        self.rng = random.Random(self.params.seed)
        self.book = OrderBook(tick_size=self.spec.tick_size, n_levels=self.spec.n_levels)
        self.eq = EventQueue()
        self.t = 0.0
        self.source = DataSource.SIMULATED
        self.intensity = IntensityTracker(5.0)
        self.hawkes_level = 0.0
        self.user_order_id: Optional[str] = None
        self.event_log: deque[dict] = deque(maxlen=400)
        self.heatmap: deque[dict] = deque(maxlen=240)
        self.imbalance_hist: deque[dict] = deque(maxlen=400)
        self.mid_hist: deque[dict] = deque(maxlen=800)
        self.spread_hist: deque[dict] = deque(maxlen=400)
        self.queue_len_hist: deque[dict] = deque(maxlen=400)
        self.markouts: list[dict] = []
        self.pending_markouts: list[dict] = []
        self.order_lifetimes: deque[dict] = deque(maxlen=500)
        self._fill_mid_at: dict[str, tuple[float, float, Side]] = {}
        self.shock: Optional[dict] = None
        self.shock_until: float = 0.0
        self.resilience: dict[str, Any] = {
            "before": None,
            "trough": None,
            "after": None,
            "t_shock": None,
            "t_recovery": None,
            "recovered": False,
        }
        self.metrics_acc = {
            "arrivals": 0,
            "markets": 0,
            "cancels": 0,
            "executions": 0,
            "depletions": 0,
        }
        self.level_rates: dict[tuple[str, int], dict[str, deque]] = defaultdict(
            lambda: {"a": deque(maxlen=40), "c": deque(maxlen=40), "e": deque(maxlen=40)}
        )
        self.paused = False
        self._force_side = None
        self._prev_fill_inputs = None
        self._seed_book()
        self._schedule_exogenous()

    def _exp(self, rate: float) -> float:
        if rate <= 1e-9:
            return 1e9
        u = self.rng.random()
        return -math.log(max(u, 1e-12)) / rate

    def _size(self, mean: float) -> int:
        # Exponential sizes, floored, clipped — typical for educational LOB sims.
        x = self.rng.expovariate(1.0 / max(mean, 1.0))
        return max(10, min(int(x), int(mean * 8)))

    def _seed_book(self) -> None:
        mid = self.book.ticks(self.spec.initial_mid)
        half = self.spec.n_levels
        for i in range(1, half + 1):
            bid_px = mid - i
            ask_px = mid + i
            # Depth decays away from the touch.
            scale = math.exp(-0.18 * (i - 1))
            n_bid = max(3, int(4 + 6 * scale + self.rng.randint(0, 3)))
            n_ask = max(3, int(4 + 6 * scale + self.rng.randint(0, 3)))
            for _ in range(n_bid):
                qty = self._size(self.spec.seed_depth / n_bid)
                o = Order(
                    order_id=_oid(),
                    side=Side.BID,
                    price_ticks=bid_px,
                    quantity=qty,
                    remaining=qty,
                    timestamp=0.0,
                )
                o.record(OrderStatus.QUEUED, 0.0, "seed")
                self.book.level(Side.BID, bid_px).enqueue(o)
                self.book.orders[o.order_id] = o
            for _ in range(n_ask):
                qty = self._size(self.spec.seed_depth / n_ask)
                o = Order(
                    order_id=_oid(),
                    side=Side.ASK,
                    price_ticks=ask_px,
                    quantity=qty,
                    remaining=qty,
                    timestamp=0.0,
                )
                o.record(OrderStatus.QUEUED, 0.0, "seed")
                self.book.level(Side.ASK, ask_px).enqueue(o)
                self.book.orders[o.order_id] = o

    def _base_rates(self) -> dict[str, float]:
        p = self.params
        shock_mult = {"limit": 1.0, "market": 1.0, "cancel": 1.0}
        if self.shock and self.t < self.shock_until:
            kind = self.shock["type"]
            if kind == ShockType.FLASH_SELLING.value:
                shock_mult["market"] = 6.0
                self._force_side = Side.ASK
            elif kind == ShockType.FLASH_BUYING.value:
                shock_mult["market"] = 6.0
                self._force_side = Side.BID
            elif kind == ShockType.MASS_CANCELLATION.value:
                shock_mult["cancel"] = 10.0
            elif kind == ShockType.LIQUIDITY_WITHDRAWAL.value:
                shock_mult["cancel"] = 8.0
                shock_mult["limit"] = 0.15
            elif kind == ShockType.MARKET_ORDER_SURGE.value:
                shock_mult["market"] = 5.0
            elif kind == ShockType.VOLATILITY_SPIKE.value:
                shock_mult["market"] = 3.0
                shock_mult["cancel"] = 2.5
                shock_mult["limit"] = 1.4
        else:
            self._force_side = None
            if self.shock and self.t >= self.shock_until:
                self.shock = None

        hawkes = self.hawkes_level
        n_rest = max(1, self.book.snapshot(1)["n_resting"])
        # Keep cancels inside a band so the book neither explodes nor goes empty.
        cancel_rate = (0.42 * p.lambda_limit + 0.03 * n_rest * max(p.lambda_cancel, 0.05)) * shock_mult["cancel"]
        return {
            "limit": (p.lambda_limit + hawkes) * shock_mult["limit"],
            "market": (p.lambda_market + 0.4 * hawkes) * shock_mult["market"],
            "cancel": max(3.0, min(cancel_rate, p.lambda_limit * 0.85)),
        }

    def _schedule_exogenous(self) -> None:
        rates = self._base_rates()
        for kind, rate in rates.items():
            self.eq.schedule(self.t + self._exp(rate), kind)

    def _bump_hawkes(self) -> None:
        self.hawkes_level += self.params.hawkes_alpha

    def _decay_hawkes(self, dt: float) -> None:
        self.hawkes_level *= math.exp(-self.params.hawkes_beta * dt)

    def _pick_limit_price(self, side: Side) -> int:
        """Place more volume near the touch; some inside-spread improvements."""
        bb = self.book.best_bid()
        ba = self.book.best_ask()
        if bb is None or ba is None:
            mid = self.book.ticks(self.spec.initial_mid)
            return mid - 1 if side is Side.BID else mid + 1
        # Geometric offset from the touch.
        k = 1
        while self.rng.random() > 0.55 and k < self.spec.n_levels:
            k += 1
        if side is Side.BID:
            # Occasional join or improve
            if self.rng.random() < 0.12 and ba - bb > 1:
                return bb + 1
            return bb - (k - 1)
        if self.rng.random() < 0.12 and ba - bb > 1:
            return ba - 1
        return ba + (k - 1)

    def _log(self, etype: EventType, side: Optional[Side], price_ticks: Optional[int], qty: int, note: str = "") -> None:
        rec = {
            "t": round(self.t, 6),
            "type": etype.value,
            "side": side.value if side else None,
            "price": self.book.px(price_ticks) if price_ticks is not None else None,
            "quantity": qty,
            "note": note,
        }
        self.event_log.appendleft(rec)

    def _record_heat(self) -> None:
        snap = self.book.snapshot(8)
        self.heatmap.append(
            {
                "t": self.t,
                "bids": [{"px": r["price"], "v": r["volume"]} for r in snap["bids"]],
                "asks": [{"px": r["price"], "v": r["volume"]} for r in snap["asks"]],
                "mid": snap["mid"],
            }
        )

    def _track_hist(self) -> None:
        snap = self.book.snapshot(1)
        self.imbalance_hist.append({"t": self.t, "qi": snap["imbalance"] or 0.0})
        self.mid_hist.append({"t": self.t, "mid": snap["mid"]})
        self.spread_hist.append({"t": self.t, "spread": snap["spread"]})
        self.queue_len_hist.append(
            {
                "t": self.t,
                "bid": snap["best_bid_queue"],
                "ask": snap["best_ask_queue"],
            }
        )

    def _resolve_markouts(self) -> None:
        mid = self.book.mid_ticks()
        if mid is None:
            return
        mid_px = self.book.px(mid)
        still = []
        horizons = [0.01, 0.1, 1.0, 5.0, 30.0]
        for m in self.pending_markouts:
            elapsed = self.t - m["t"]
            for h in horizons:
                key = f"m_{h}"
                if key not in m and elapsed >= h:
                    # For a buy fill, later mid down is adverse.
                    signed = (mid_px - m["mid"]) * (1 if m["side"] == "bid" else -1)
                    m[key] = signed
            if elapsed >= 30.0:
                self.markouts.append(m)
            else:
                still.append(m)
        self.pending_markouts = still[-200:]

    def step_event(self) -> Optional[dict]:
        if self.paused:
            return None
        ev = self.eq.pop()
        if ev is None:
            self._schedule_exogenous()
            ev = self.eq.pop()
            if ev is None:
                return None
        dt = max(0.0, ev.timestamp - self.t)
        self._decay_hawkes(dt)
        self.t = ev.timestamp
        kind = ev.kind
        out: Optional[dict] = None
        if kind == "limit":
            out = self._on_limit()
        elif kind == "market":
            out = self._on_market()
        elif kind == "cancel":
            out = self._on_cancel()
        # Re-schedule that stream.
        rates = self._base_rates()
        if kind in rates:
            self.eq.schedule(self.t + self._exp(rates[kind]), kind)
        if self.params.hawkes_alpha > 0 and kind in ("limit", "market"):
            self._bump_hawkes()
        self._resolve_markouts()
        if int(self.t * 8) != int((self.t - dt) * 8):
            self._record_heat()
            self._track_hist()
        if self.book.best_bid() is None or self.book.best_ask() is None:
            self._seed_book()
        bb, ba = self.book.best_bid(), self.book.best_ask()
        if bb is not None:
            self.book._shed(Side.BID, bb, self.t)
        if ba is not None:
            self.book._shed(Side.ASK, ba, self.t)
        self._update_resilience()
        return out

    def advance(self, dt: float) -> list[dict]:
        """Advance simulated time by dt seconds, processing all events in between."""
        target = self.t + dt * max(self.params.speed, 0.05)
        events: list[dict] = []
        guard = 0
        while self.eq.peek_time() is not None and self.eq.peek_time() <= target and guard < 800:
            rec = self.step_event()
            if rec:
                events.append(rec)
            guard += 1
        self.t = max(self.t, target)
        return events

    def _on_limit(self) -> dict:
        side = self.rng.choice([Side.BID, Side.ASK])
        px = self._pick_limit_price(side)
        qty = self._size(self.params.mean_limit_size)
        order = Order(
            order_id=_oid(),
            side=side,
            price_ticks=px,
            quantity=qty,
            remaining=qty,
            timestamp=self.t,
        )
        trades = self.book.add_limit(order, self.t)
        self.intensity.hit("limit", self.t)
        self.metrics_acc["arrivals"] += 1
        self.level_rates[(side.value, px)]["a"].append(self.t)
        self._log(EventType.LIMIT_ORDER, side, px, qty, "limit arrival")
        for tr in trades:
            self.intensity.hit("execution", self.t)
            self.metrics_acc["executions"] += 1
            self._log(EventType.EXECUTION, tr.aggressive_side, tr.price_ticks, tr.quantity, "limit crossed")
            self._maybe_user_fill(tr)
        return {"type": "limit_order", "side": side.value, "qty": qty, "price": self.book.px(px), "fills": len(trades)}

    def _on_market(self) -> dict:
        if getattr(self, "_force_side", None) is not None:
            side = self._force_side
        else:
            # Imbalance-conditioned flow: more buys when QI > 0 (educational, not a claim of alpha).
            qi = self.book.queue_imbalance() or 0.0
            p_buy = 0.5 + 0.18 * qi
            side = Side.BID if self.rng.random() < p_buy else Side.ASK
        qty = self._size(self.params.mean_market_size)
        bb_before, ba_before = self.book.best_bid(), self.book.best_ask()
        mid_before = self.book.mid_ticks()
        trades, unfilled, depleted = self.book.add_market(side, qty, self.t)
        self.intensity.hit("market", self.t)
        self.metrics_acc["markets"] += 1
        self._log(EventType.MARKET_ORDER, side, None, qty, "aggressive order")
        for tr in trades:
            self.intensity.hit("execution", self.t)
            self.metrics_acc["executions"] += 1
            self.level_rates[(("ask" if side is Side.BID else "bid"), tr.price_ticks)]["e"].append(self.t)
            self._log(EventType.EXECUTION, side, tr.price_ticks, tr.quantity)
            self._maybe_user_fill(tr)
        if depleted:
            self.metrics_acc["depletions"] += len(depleted)
            self._log(
                EventType.LEVEL_DEPLETED,
                Side.ASK if side is Side.BID else Side.BID,
                depleted[-1],
                0,
                "liquidity level depleted",
            )
            self._log(EventType.PRICE_CHANGE, None, None, 0, "next price becomes the touch")
        mid_after = self.book.mid_ticks()
        impact = None
        if mid_before is not None and mid_after is not None:
            # Signed: buy aggression should push mid up.
            impact = (mid_after - mid_before) * self.book.tick_size * (1 if side is Side.BID else -1)
        return {
            "type": "market_order",
            "side": side.value,
            "qty": qty,
            "fills": len(trades),
            "unfilled": unfilled,
            "depleted": [self.book.px(p) for p in depleted],
            "impact": impact,
            "best_before": {"bid": bb_before, "ask": ba_before},
        }

    def _on_cancel(self) -> dict:
        ids = self.book.random_resting_ids()
        if not ids:
            return {"type": "cancel", "qty": 0}
        oid = self.rng.choice(ids)
        order = self.book.orders.get(oid)
        if order is None:
            return {"type": "cancel", "qty": 0}
        lvl_key = (order.side.value, order.price_ticks)
        removed = self.book.cancel_order(oid, self.t)
        if removed is None:
            return {"type": "cancel", "qty": 0}
        self.intensity.hit("cancel", self.t)
        self.metrics_acc["cancels"] += 1
        self.level_rates[lvl_key]["c"].append(self.t)
        self.order_lifetimes.append(
            {
                "t0": removed.timestamp,
                "lifetime": self.t - removed.timestamp,
                "qty": removed.quantity,
                "price": self.book.px(removed.price_ticks),
                "side": removed.side.value,
                "outcome": "cancelled",
            }
        )
        self._log(EventType.CANCELLATION, removed.side, removed.price_ticks, removed.remaining, "cancel")
        return {"type": "cancel", "qty": removed.remaining, "side": removed.side.value, "price": self.book.px(removed.price_ticks)}

    def _maybe_user_fill(self, tr) -> None:
        if not tr.is_user:
            return
        mid = self.book.mid_ticks()
        if mid is None:
            return
        maker = self.book.orders.get(tr.maker_order_id)
        side = maker.side if maker else Side.BID
        self.pending_markouts.append(
            {
                "t": self.t,
                "mid": self.book.px(mid),
                "side": side.value,
                "qty": tr.quantity,
                "px": self.book.px(tr.price_ticks),
            }
        )
        if maker and maker.remaining == 0:
            self.order_lifetimes.append(
                {
                    "t0": maker.timestamp,
                    "lifetime": self.t - maker.timestamp,
                    "qty": maker.quantity,
                    "price": self.book.px(maker.price_ticks),
                    "side": maker.side.value,
                    "outcome": "filled",
                }
            )

    def submit_user_limit(self, side: str, price: float, qty: int) -> dict:
        s = Side.BID if side == "bid" else Side.ASK
        order = Order(
            order_id="USER-" + _oid()[:6],
            side=s,
            price_ticks=self.book.ticks(price),
            quantity=qty,
            remaining=qty,
            timestamp=self.t,
            is_user=True,
        )
        order.record(OrderStatus.CREATED, self.t, "trader intent")
        trades = self.book.add_limit(order, self.t)
        self.user_order_id = order.order_id
        self._log(EventType.USER_ORDER, s, order.price_ticks, qty, "your order")
        return {
            "order_id": order.order_id,
            "status": order.status.value,
            "remaining": order.remaining,
            "fills": len(trades),
            "position": self.book.user_position(order.order_id),
        }

    def cancel_user(self) -> Optional[dict]:
        if not self.user_order_id:
            return None
        o = self.book.cancel_order(self.user_order_id, self.t)
        self.user_order_id = None
        return {"cancelled": o.order_id if o else None}

    def apply_shock(self, shock_type: str, duration: float = 2.5) -> dict:
        self.shock = {"type": shock_type, "t0": self.t}
        self.shock_until = self.t + duration
        snap = self.book.snapshot(5)
        self.resilience = {
            "before": snap["bid_depth"] + snap["ask_depth"],
            "trough": snap["bid_depth"] + snap["ask_depth"],
            "after": None,
            "t_shock": self.t,
            "t_recovery": None,
            "recovered": False,
            "type": shock_type,
        }
        if shock_type == ShockType.LIQUIDITY_WITHDRAWAL.value:
            # Instantly cancel a large fraction of displayed depth.
            ids = self.book.random_resting_ids()
            self.rng.shuffle(ids)
            for oid in ids[: int(0.8 * len(ids))]:
                self.book.cancel_order(oid, self.t)
        return {"shock": shock_type, "until": self.shock_until, "t": self.t}

    def _update_resilience(self) -> None:
        r = self.resilience
        if r.get("t_shock") is None:
            return
        snap = self.book.snapshot(5)
        depth = snap["bid_depth"] + snap["ask_depth"]
        if r["trough"] is None or depth < r["trough"]:
            r["trough"] = depth
        r["after"] = depth
        if r["before"] and depth >= 0.9 * r["before"] and not r["recovered"] and self.t > r["t_shock"] + 0.2:
            r["recovered"] = True
            r["t_recovery"] = self.t - r["t_shock"]

    def set_params(self, **kwargs) -> None:
        for k, v in kwargs.items():
            if hasattr(self.params, k) and v is not None:
                setattr(self.params, k, v)

    def rates(self) -> dict[str, float]:
        return {
            "limit": self.intensity.rate("limit", self.t),
            "market": self.intensity.rate("market", self.t),
            "cancel": self.intensity.rate("cancel", self.t),
            "execution": self.intensity.rate("execution", self.t),
        }

    def level_stats(self, side: str, px_ticks: int) -> dict:
        buf = self.level_rates[(side, px_ticks)]
        def rate(q: deque) -> float:
            if len(q) < 2:
                return 0.0
            dt = max(self.t - q[0], 0.25)
            return len(q) / dt
        return {"arrival_rate": rate(buf["a"]), "cancel_rate": rate(buf["c"]), "exec_rate": rate(buf["e"])}

    def regime(self) -> dict:
        snap = self.book.snapshot(5)
        rates = self.rates()
        depth = (snap["bid_depth"] or 0) + (snap["ask_depth"] or 0)
        qi = abs(snap["imbalance"] or 0)
        spread = snap["spread"] or 0.02
        vol = self._realized_vol()
        scores = {
            Regime.HIGH_LIQUIDITY.value: min(1.0, depth / 8000),
            Regime.LOW_LIQUIDITY.value: min(1.0, 1200 / max(depth, 1)),
            Regime.HIGH_CANCELLATION.value: min(1.0, rates["cancel"] / 40.0),
            Regime.HIGH_MARKET_ORDER_PRESSURE.value: min(1.0, rates["market"] / 25.0),
            Regime.QUEUE_IMBALANCE.value: min(1.0, qi / 0.45),
            Regime.LIQUIDITY_SHOCK.value: 1.0 if self.shock else 0.0,
            Regime.VOLATILITY_SHOCK.value: min(1.0, vol / 0.8),
            Regime.NORMAL.value: 0.4,
        }
        if self.shock:
            current = Regime.LIQUIDITY_SHOCK.value
        else:
            current = max(scores, key=scores.get)
        conf = scores[current]
        drivers = sorted(scores.items(), key=lambda x: -x[1])[:4]
        return {
            "current": current,
            "confidence": conf,
            "scores": scores,
            "drivers": [{"name": k, "score": v} for k, v in drivers],
            "observables": {
                "depth": depth,
                "imbalance": snap["imbalance"],
                "spread": spread,
                "market_rate": rates["market"],
                "cancel_rate": rates["cancel"],
                "realized_vol": vol,
            },
        }

    def _realized_vol(self) -> float:
        mids = [x["mid"] for x in list(self.mid_hist)[-40:] if x["mid"]]
        if len(mids) < 5:
            return self.params.volatility
        rets = [math.log(mids[i] / mids[i - 1]) for i in range(1, len(mids)) if mids[i - 1]]
        if not rets:
            return self.params.volatility
        mu = sum(rets) / len(rets)
        var = sum((r - mu) ** 2 for r in rets) / max(len(rets) - 1, 1)
        return math.sqrt(var) * math.sqrt(252 * 6.5 * 3600)

    def congestion(self) -> dict:
        rates = self.rates()
        snap = self.book.snapshot(1)
        lam = rates["limit"]
        mu = max(rates["execution"], 0.1)
        rho = lam / mu
        L = snap["best_bid_queue"] + snap["best_ask_queue"]
        W = L / max(lam, 0.1)
        cancel = rates["cancel"]
        score = 0.35 * min(rho, 3) / 3 + 0.25 * min(L / 4000, 1) + 0.2 * min(W / 20, 1) + 0.2 * min(cancel / 50, 1)
        if score < 0.25:
            label = "LOW"
        elif score < 0.5:
            label = "NORMAL"
        elif score < 0.75:
            label = "CONGESTED"
        else:
            label = "SEVERELY CONGESTED"
        return {
            "index": score,
            "label": label,
            "rho": rho,
            "lambda": lam,
            "mu": mu,
            "L": L,
            "W": W,
            "note": "Model-defined composite. Classical ρ>1 instability does not literally apply to a cancellable LOB.",
        }

    def pressure_index(self) -> dict:
        snap = self.book.snapshot(5)
        rates = self.rates()
        qi = (snap["imbalance"] or 0) * 100
        mo = min(40.0, rates["market"] * 1.4)
        ca = min(30.0, rates["cancel"] * 0.6)
        vol = min(20.0, self._realized_vol() * 12)
        depth = (snap["bid_depth"] + snap["ask_depth"]) / 1000
        depth_c = -min(25.0, depth * 2)
        components = {
            "Queue Imbalance": round(qi * 0.5, 1),
            "Market Orders": round(mo, 1),
            "Cancellations": round(ca, 1),
            "Volatility": round(vol, 1),
            "Depth": round(depth_c, 1),
        }
        net = sum(components.values())
        return {
            "name": "Liquidity Pressure Index",
            "disclaimer": "Model-defined composite indicator, not an industry-standard metric.",
            "components": components,
            "net": round(net, 1),
        }

    def state_payload(self) -> dict:
        snap = self.book.snapshot(10)
        rates = self.rates()
        pos = self.book.user_position(self.user_order_id) if self.user_order_id else None
        from app.analytics.fill import fill_module

        fills = fill_module(self, pos)
        levels = []
        for row in snap["asks"][::-1]:
            st = self.level_stats("ask", row["price_ticks"])
            levels.append({**row, "side": "ask", **st, **_level_estimates(st, row["volume"], rates)})
        for row in snap["bids"]:
            st = self.level_stats("bid", row["price_ticks"])
            levels.append({**row, "side": "bid", **st, **_level_estimates(st, row["volume"], rates)})
        return {
            "source": self.source.value,
            "symbol": self.spec.symbol,
            "t": self.t,
            "book": snap,
            "levels": levels,
            "rates": rates,
            "user": pos,
            "fill": fills,
            "regime": self.regime(),
            "congestion": self.congestion(),
            "pressure": self.pressure_index(),
            "events": list(self.event_log)[:40],
            "resilience": self.resilience,
            "params": self.params.__dict__,
            "hawkes": self.hawkes_level,
            "metrics": self.metrics_acc,
        }


def _level_estimates(st: dict, volume: int, rates: dict) -> dict:
    dep = st["exec_rate"] * 80 + st["cancel_rate"] * 40 + rates["market"] * 0.4
    wait = volume / max(dep, 1.0)
    pfill = 1.0 - math.exp(-min(wait, 60) / max(wait, 1e-6) * 0.5)
    # More coherent: higher exec vs cancel → higher fill
    ratio = st["exec_rate"] / max(st["exec_rate"] + st["cancel_rate"] + 0.1, 0.1)
    pfill = max(0.02, min(0.98, 0.35 * ratio + 0.65 * (1 - math.exp(-rates["market"] / 15))))
    return {"est_wait": wait, "est_fill_p": pfill}


class MultiAssetMarket:
    def __init__(self) -> None:
        self.assets: dict[str, MarketSimulator] = {
            "ASSET-A": MarketSimulator(
                AssetSpec("ASSET-A", initial_mid=100.00, seed_depth=900),
                SimulationParams(seed=7, lambda_limit=42, lambda_market=18),
            ),
            "ASSET-B": MarketSimulator(
                AssetSpec("ASSET-B", initial_mid=250.60, tick_size=0.02, seed_depth=1400),
                SimulationParams(seed=11, lambda_limit=55, lambda_market=22, mean_limit_size=180),
            ),
            "ASSET-C": MarketSimulator(
                AssetSpec("ASSET-C", initial_mid=98.42, seed_depth=500),
                SimulationParams(seed=19, lambda_limit=28, lambda_market=12, lambda_cancel=0.5, volatility=0.32),
            ),
        }
        self.active = "ASSET-A"

    def current(self) -> MarketSimulator:
        return self.assets[self.active]

    def select(self, symbol: str) -> MarketSimulator:
        if symbol in self.assets:
            self.active = symbol
        return self.current()

    def tick_all(self, dt: float) -> dict[str, list]:
        return {k: sim.advance(dt) for k, sim in self.assets.items()}

    def ticker(self) -> list[dict]:
        rows = []
        for sym, sim in self.assets.items():
            s = sim.book.snapshot(5)
            rows.append(
                {
                    "symbol": sym,
                    "mid": s["mid"],
                    "spread": s["spread"],
                    "depth": (s["bid_depth"] + s["ask_depth"]),
                    "imbalance": s["imbalance"],
                    "active": sym == self.active,
                    "source": sim.source.value,
                }
            )
        return rows
