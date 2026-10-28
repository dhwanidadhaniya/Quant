"""REST + WebSocket API for the microstructure laboratory.

Data policy
    Every payload is tagged source='SIMULATED'. This process does not
    connect to an exchange. A future L2 adapter can emit the same
    schemas with source='HISTORICAL' or 'LIVE'.
"""

from __future__ import annotations

import asyncio
import math
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.analytics.fill import fill_curve
from app.analytics.hawkes import hawkes_path
from app.analytics.imbalance import imbalance_vs_return
from app.analytics.impact import decision_engine, opportunity_cost, square_root_impact, walk_book
from app.analytics.monte_carlo import compare_theory_mc, simulate_paths
from app.analytics.queueing import (
    birth_death_stationary,
    exponential_pdf,
    geometric_pmf,
    littles_law,
    markov_queue_matrix,
    mm1_bundle,
    normal_pdf,
    poisson_pmf,
)
from app.engine.reconstruction import reconstruct_book
from app.engine.simulator import MultiAssetMarket
from app.models.types import ShockType, Side, StrategyType


market = MultiAssetMarket()
subscribers: set[WebSocket] = set()


class ParamUpdate(BaseModel):
    lambda_limit: Optional[float] = None
    lambda_market: Optional[float] = None
    lambda_cancel: Optional[float] = None
    mu_service: Optional[float] = None
    volatility: Optional[float] = None
    hawkes_alpha: Optional[float] = None
    hawkes_beta: Optional[float] = None
    speed: Optional[float] = None
    mean_limit_size: Optional[float] = None
    mean_market_size: Optional[float] = None


class UserOrderIn(BaseModel):
    side: str = "bid"
    price: Optional[float] = None
    quantity: int = 100


class ShockIn(BaseModel):
    type: str
    duration: float = 2.5


class ScenarioIn(BaseModel):
    name: str = "A"
    lambda_limit: Optional[float] = None
    lambda_market: Optional[float] = None
    lambda_cancel: Optional[float] = None
    depth_scale: Optional[float] = None


class LittleIn(BaseModel):
    L: Optional[float] = None
    lam: Optional[float] = Field(None, alias="lambda")
    W: Optional[float] = None

    model_config = {"populate_by_name": True}


class MonteCarloIn(BaseModel):
    n: int = 500
    t_max: float = 60.0


class ReconstructIn(BaseModel):
    events: list[dict]
    tick_size: float = 0.01


class ImpactIn(BaseModel):
    quantity: int = 400
    side: str = "bid"


class DistIn(BaseModel):
    name: str
    param_a: float = 5.0
    param_b: float = 1.0


@asynccontextmanager
async def lifespan(_: FastAPI):
    task = asyncio.create_task(_run_loop())
    yield
    task.cancel()


app = FastAPI(title="Market as a Queueing System", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _run_loop() -> None:
    while True:
        market.tick_all(0.12)
        payload = _broadcast_body()
        dead = []
        for ws in list(subscribers):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            subscribers.discard(ws)
        await asyncio.sleep(0.12)


def _broadcast_body() -> dict:
    sim = market.current()
    state = sim.state_payload()
    state["ticker"] = market.ticker()
    state["active"] = market.active
    return {"channel": "market", "data": state}


def sim():
    return market.current()


@app.get("/health")
def health():
    return {"ok": True, "source": "SIMULATED"}


@app.get("/market/state")
def market_state():
    return _broadcast_body()["data"]


@app.get("/orderbook")
def orderbook(levels: int = 10):
    return {"source": "SIMULATED", **sim().book.snapshot(levels)}


@app.get("/queue/state")
def queue_state():
    s = sim()
    return {"source": "SIMULATED", "t": s.t, "congestion": s.congestion(), "book": s.book.snapshot(10), "rates": s.rates()}


@app.get("/queue/position")
def queue_position():
    s = sim()
    return {"source": "SIMULATED", "position": s.book.user_position(s.user_order_id) if s.user_order_id else None}


@app.get("/orderflow")
def orderflow():
    s = sim()
    return {
        "source": "SIMULATED",
        "rates": s.rates(),
        "events": list(s.event_log)[:80],
        "hist": {
            "imbalance": list(s.imbalance_hist)[-200:],
            "mid": list(s.mid_hist)[-300:],
            "spread": list(s.spread_hist)[-200:],
            "queue": list(s.queue_len_hist)[-200:],
        },
    }


@app.get("/liquidity")
def liquidity():
    s = sim()
    return {
        "source": "SIMULATED",
        "book": s.book.snapshot(12),
        "heatmap": list(s.heatmap)[-180:],
        "resilience": s.resilience,
        "pressure": s.pressure_index(),
    }


@app.get("/probabilities")
def probabilities():
    s = sim()
    pos = s.book.user_position(s.user_order_id) if s.user_order_id else None
    from app.analytics.fill import fill_module

    return {"source": "SIMULATED", "fill": fill_module(s, pos)}


@app.get("/risk")
def risk():
    s = sim()
    return {"source": "SIMULATED", "congestion": s.congestion(), "pressure": s.pressure_index(), "regime": s.regime()}


@app.get("/market-impact")
def market_impact(quantity: int = 400, side: str = "bid"):
    s = sim()
    snap = s.book.snapshot(12)
    levels = snap["asks"] if side == "bid" else snap["bids"]
    walked = walk_book(levels, quantity)
    sr = square_root_impact(quantity, 5_000_000, s._realized_vol(), snap["spread"] or 0.02)
    return {"source": "SIMULATED", "walk": walked, "square_root": sr, "quantity": quantity, "side": side}


@app.post("/market-impact")
def market_impact_post(body: ImpactIn):
    return market_impact(body.quantity, body.side)


@app.get("/metrics")
def metrics():
    s = sim()
    return {"source": "SIMULATED", "t": s.t, "acc": s.metrics_acc, "rates": s.rates()}


@app.get("/regime")
def regime():
    return {"source": "SIMULATED", **sim().regime()}


@app.get("/history")
def history():
    s = sim()
    return {
        "source": "SIMULATED",
        "events": list(s.event_log)[:200],
        "lifetimes": list(s.order_lifetimes)[-300:],
        "markouts": s.markouts[-200:],
        "mid": list(s.mid_hist)[-400:],
    }


@app.post("/simulate")
def post_simulate(seconds: float = 1.0):
    ev = sim().advance(seconds)
    return {"source": "SIMULATED", "n": len(ev), "t": sim().t}


@app.post("/params")
def post_params(body: ParamUpdate):
    sim().set_params(**body.model_dump(exclude_none=True))
    return {"ok": True, "params": sim().params.__dict__}


@app.post("/asset/{symbol}")
def select_asset(symbol: str):
    market.select(symbol.upper())
    return {"active": market.active}


@app.post("/order")
def place_order(body: UserOrderIn):
    s = sim()
    snap = s.book.snapshot(1)
    price = body.price
    if price is None:
        price = snap["best_bid"] if body.side == "bid" else snap["best_ask"]
    if price is None:
        price = 100.0
    return {"source": "SIMULATED", **s.submit_user_limit(body.side, price, body.quantity)}


@app.post("/order/cancel")
def cancel_order():
    return {"source": "SIMULATED", **(sim().cancel_user() or {"cancelled": None})}


@app.post("/scenario")
def scenario(body: ScenarioIn):
    s = sim()
    presets = {
        "A": {"lambda_limit": 90.0},
        "B": {"lambda_cancel": 1.2},
        "C": {"lambda_market": 55.0},
        "D": {},
        "E": {},
        "F": {},
        "G": {},
    }
    kw = presets.get(body.name, {})
    if body.lambda_limit is not None:
        kw["lambda_limit"] = body.lambda_limit
    if body.lambda_market is not None:
        kw["lambda_market"] = body.lambda_market
    if body.lambda_cancel is not None:
        kw["lambda_cancel"] = body.lambda_cancel
    s.set_params(**kw)
    if body.name == "D" or body.depth_scale == 0.2:
        s.apply_shock(ShockType.LIQUIDITY_WITHDRAWAL.value, 1.2)
    if body.name == "C":
        s.apply_shock(ShockType.MARKET_ORDER_SURGE.value, 2.0)
    if body.name == "B":
        s.apply_shock(ShockType.MASS_CANCELLATION.value, 2.0)
    return {"source": "SIMULATED", "applied": body.name, "params": s.params.__dict__}


@app.post("/shock")
def shock(body: ShockIn):
    return {"source": "SIMULATED", **sim().apply_shock(body.type, body.duration)}


@app.post("/pause")
def pause(paused: bool = True):
    sim().paused = paused
    return {"paused": sim().paused}


@app.get("/queue-analysis")
def queue_analysis(lam: float = 20.0, mu: float = 25.0):
    bundle = mm1_bundle(lam, mu)
    bd = birth_death_stationary(lam, mu)
    mkv = markov_queue_matrix(lam, mu)
    return {"source": "SIMULATED", "educational": True, "mm1": bundle, "birth_death": bd, "markov": mkv}


@app.post("/queue-analysis")
def queue_analysis_post(lam: float = 20.0, mu: float = 25.0):
    return queue_analysis(lam, mu)


@app.post("/little")
def little(body: LittleIn):
    return littles_law(L=body.L, lam=body.lam, W=body.W)


@app.post("/monte-carlo")
def monte_carlo(body: MonteCarloIn):
    s = sim()
    pos = s.book.user_position(s.user_order_id) if s.user_order_id else None
    snap = s.book.snapshot(1)
    qa = float((pos or {}).get("queue_ahead") or snap["best_bid_queue"] or 800)
    qty = float((pos or {}).get("qty") or 100)
    rates = s.rates()
    theory = fill_curve(
        qa,
        qty,
        rates["market"],
        s.params.mean_market_size,
        rates["cancel"],
        s._realized_vol(),
        snap["spread"] or 0.02,
        snap["imbalance"] or 0.0,
        (pos or {}).get("side") or "bid",
    )
    mc = simulate_paths(
        qa,
        qty,
        rates["market"],
        s.params.mean_market_size,
        rates["cancel"],
        theory["kappa"],
        n=max(50, min(body.n, 3000)),
        t_max=body.t_max,
    )
    chk = compare_theory_mc(theory["E_T_fill"], theory["P_fill_60"], mc)
    return {"source": "SIMULATED", "theory": theory, "mc": mc, "check": chk}


@app.get("/model-check")
def model_check(lam: float = 18.0, mu: float = 24.0):
    """Compare M/M/1 L against a Monte Carlo birth-death path mean."""
    import random

    bundle = mm1_bundle(lam, mu)
    rng = random.Random(5)
    n_paths = 200
    t_max = 40.0
    means = []
    for _ in range(n_paths):
        q = 0
        t = 0.0
        area = 0.0
        while t < t_max:
            rate = lam + (mu if q > 0 else 0.0)
            dt = rng.expovariate(rate)
            nt = min(t + dt, t_max)
            area += q * (nt - t)
            t = nt
            if t >= t_max:
                break
            if q == 0 or rng.random() < lam / rate:
                q += 1
            else:
                q = max(0, q - 1)
        means.append(area / t_max)
    sim_L = sum(means) / len(means)
    th = bundle["L"]
    err = None if th in (None, float("inf")) else abs(sim_L - th) / max(th, 1e-9)
    return {
        "source": "SIMULATED",
        "theoretical": th,
        "simulated": sim_L,
        "error_pct": None if err is None else err * 100,
        "rho": bundle["rho"],
        "caveat": bundle["caveat"],
    }


@app.get("/hawkes")
def hawkes(mu: float = 8.0, alpha: float = 0.8, beta: float = 1.4, t_max: float = 12.0):
    return {"source": "SIMULATED", **hawkes_path(mu, alpha, beta, t_max)}


@app.get("/imbalance-signal")
def imbalance_signal(horizon: float = 1.0):
    s = sim()
    return {
        "source": "SIMULATED",
        **imbalance_vs_return(list(s.imbalance_hist), list(s.mid_hist), horizon=horizon),
    }


@app.get("/execution/compare")
def execution_compare():
    s = sim()
    snap = s.book.snapshot(8)
    rates = s.rates()
    vol = s._realized_vol()
    spread = snap["spread"] or 0.02
    rows = []
    for strat in StrategyType:
        if strat is StrategyType.MARKET_ORDER:
            walk = walk_book(snap["asks"], 200)
            rows.append(
                {
                    "strategy": strat.value,
                    "fill_p": 1.0 if walk["filled"] else 0.0,
                    "wait": 0.0,
                    "price": walk["vwap"],
                    "impact": walk["impact_ticks_proxy"],
                    "adverse": 0.0,
                    "opp": spread / 2,
                }
            )
        elif strat is StrategyType.AGGRESSIVE_LIMIT:
            px = (snap["best_ask"] - s.spec.tick_size) if snap["best_ask"] else None
            rows.append(_limit_row(strat.value, 0.72, 2.5, px, 0.2 * spread, vol, spread))
        elif strat is StrategyType.PATIENT_LIMIT:
            rows.append(_limit_row(strat.value, 0.38, 18.0, snap["best_bid"], 0.0, vol, spread))
        elif strat is StrategyType.MID_PEG:
            rows.append(_limit_row(strat.value, 0.55, 7.0, snap["mid"], 0.1 * spread, vol, spread))
        else:
            rows.append(_limit_row(strat.value, 0.58, 8.5, snap["best_bid"], 0.05 * spread, vol, spread))
    return {
        "source": "SIMULATED",
        "rows": rows,
        "note": "None of these strategies is universally best. Ranking depends on horizon, urgency, and adverse-selection state.",
        "rates": rates,
    }


def _limit_row(name, p, w, px, impact, vol, spread):
    opp = opportunity_cost(spread, px or 100.0, p, w, vol)
    return {
        "strategy": name,
        "fill_p": p,
        "wait": w,
        "price": px,
        "impact": impact,
        "adverse": vol * 0.02 * (1 if p < 0.5 else 0.4),
        "opp": opp["wait"],
    }


@app.get("/decision")
def decision():
    s = sim()
    snap = s.book.snapshot(5)
    pos = s.book.user_position(s.user_order_id) if s.user_order_id else None
    from app.analytics.fill import fill_module

    fill = fill_module(s, pos)
    return {
        "source": "SIMULATED",
        **decision_engine(pos, snap, fill, s._realized_vol(), s.rates()),
    }


@app.get("/distributions")
def distributions(name: str = "poisson", a: float = 5.0, b: float = 1.0):
    xs = list(range(0, 31)) if name in ("poisson", "geometric") else [i / 10 for i in range(0, 80)]
    ys = []
    for x in xs:
        if name == "poisson":
            ys.append(poisson_pmf(int(x), a))
        elif name == "geometric":
            ys.append(geometric_pmf(int(x), min(max(a, 0.01), 0.99)))
        elif name == "exponential":
            ys.append(exponential_pdf(x, a))
        elif name == "normal":
            ys.append(normal_pdf(x - 4, 0.0, max(b, 0.05)))
        else:
            ys.append(poisson_pmf(int(x) if x == int(x) else 0, a))
    return {"name": name, "x": xs, "y": ys}


@app.post("/reconstruct")
def reconstruct(body: ReconstructIn):
    return reconstruct_book(body.events, body.tick_size)


@app.get("/heatmaps/waiting")
def heatmap_waiting():
    lams = [5, 10, 15, 20, 25, 30, 35, 40]
    mus = [10, 15, 20, 25, 30, 35, 40, 45]
    z = []
    for mu in mus:
        row = []
        for lam in lams:
            w = 1.0 / (mu - lam) if mu > lam else None
            row.append(w)
        z.append(row)
    return {"x": lams, "y": mus, "z": z, "label": "E[W] = 1/(μ−λ)  (M/M/1, educational)"}


@app.get("/heatmaps/fill")
def heatmap_fill():
    qa = [100, 300, 600, 1000, 1500, 2200, 3000, 4000]
    mo = [2, 5, 8, 12, 18, 25, 35, 50]
    z = []
    for m in mo:
        row = []
        for q in qa:
            c = fill_curve(q, 100, m, 90, 20, 0.2, 0.02, 0.0, "bid")
            row.append(c["horizons"][2]["fill"])
        z.append(row)
    return {"x": qa, "y": mo, "z": z, "label": "P(fill ≤ 10s) vs queue ahead × market intensity"}


@app.get("/notebook")
def notebook():
    from app.theory_pack import NOTEBOOK

    return NOTEBOOK


@app.websocket("/ws/market")
async def ws_market(ws: WebSocket):
    await ws.accept()
    subscribers.add(ws)
    try:
        await ws.send_json(_broadcast_body())
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        subscribers.discard(ws)
    except Exception:
        subscribers.discard(ws)


@app.websocket("/ws/orderbook")
async def ws_ob(ws: WebSocket):
    await ws_market(ws)


@app.websocket("/ws/queue")
async def ws_q(ws: WebSocket):
    await ws_market(ws)


@app.websocket("/ws/trades")
async def ws_t(ws: WebSocket):
    await ws_market(ws)


@app.websocket("/ws/orderflow")
async def ws_of(ws: WebSocket):
    await ws_market(ws)
