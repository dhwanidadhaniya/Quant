from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List
import asyncio

from backend.market_simulator import MarketSimulator
from backend.quant_engine import OptimalStoppingEngine

app = FastAPI(
    title="Optimal Stopping Market-Making Engine API",
    description="Quantitative Research Engine combining Microstructure, Dynamic Programming and Optimal Stopping Theory",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

simulator = MarketSimulator()
stopping_engine = OptimalStoppingEngine()

class SimulationRequest(BaseModel):
    num_simulations: int = 1000
    steps: int = 50
    gamma: float = 0.15
    volatility: float = 0.2

class BacktestRequest(BaseModel):
    initial_capital: float = 100000.0
    steps: int = 200

class WhatIfRequest(BaseModel):
    gamma: float = 0.15
    volatility: float = 0.2
    spread: float = 0.08
    inventory: int = 4
    obi: float = 0.2
    adverse_risk: float = 0.05

@app.get("/")
def read_root():
    return {"status": "ONLINE", "engine": "Optimal Stopping Market-Making Engine v1.0"}

@app.get("/market/state")
def get_market_state():
    return simulator.next_tick()

@app.get("/market/orderbook")
def get_orderbook():
    return simulator.order_book

@app.get("/market/trades")
def get_trades():
    return simulator.trades_history

@app.get("/optimal-stopping/surface")
def get_stopping_surface(gamma: float = 0.15, spread: float = 0.08):
    engine = OptimalStoppingEngine(gamma=gamma)
    q_range = list(range(-10, 11))
    vol_range = [round(v, 2) for v in np.linspace(0.05, 0.50, 10)]
    return engine.compute_stopping_surface(q_range, vol_range, spread)

@app.post("/simulation/monte-carlo")
def run_monte_carlo(req: SimulationRequest):
    return simulator.run_monte_carlo(
        num_sims=req.num_simulations,
        steps=req.steps,
        gamma=req.gamma,
        vol=req.volatility
    )

@app.post("/backtest/run")
def run_backtest(req: BacktestRequest):
    return simulator.run_backtest({"initial_capital": req.initial_capital, "steps": req.steps})

@app.post("/what-if/evaluate")
def evaluate_what_if(req: WhatIfRequest):
    engine = OptimalStoppingEngine(gamma=req.gamma)
    decision = engine.decide(
        q=req.inventory,
        vol=req.volatility,
        spread=req.spread,
        obi=req.obi,
        adverse_risk=req.adverse_risk
    )
    
    # Calculate quote adjustment decomposition
    vol_impact = round(req.volatility * 50, 1)
    inv_impact = round(abs(req.inventory) * 2.5, 1)
    obi_impact = round(req.obi * 15, 1)
    net_adj = round(vol_impact + inv_impact + obi_impact, 1)
    
    return {
        "decision": decision,
        "decomposition": [
            {"factor": "Volatility", "bps": f"+{vol_impact}"},
            {"factor": "Inventory Skew", "bps": f"+{inv_impact}" if req.inventory > 0 else f"-{inv_impact}"},
            {"factor": "Order Flow (OBI)", "bps": f"+{obi_impact}" if req.obi > 0 else f"-{obi_impact}"},
            {"factor": "Net Adjustment", "bps": f"+{net_adj}"}
        ]
    }

@app.websocket("/ws/market")
async def websocket_market(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = simulator.next_tick()
            await websocket.send_json(data)
            await asyncio.sleep(0.5) # Emit update every 500ms
    except WebSocketDisconnect:
        pass
