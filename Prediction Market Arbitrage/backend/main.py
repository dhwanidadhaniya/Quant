"""
Prediction Market Arbitrage & Market Microstructure Terminal
=============================================================
FastAPI Backend Entry Point

"Same Event. Different Prices. Find the Edge."

This is the main application entry point. It initializes the database,
seeds demo data, and serves the API endpoints that power the research terminal.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_db
from config import settings
from api import markets, opportunities, analysis, orderbook, risk, efficiency, research, gamification


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and seed data on startup."""
    await init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Research platform for prediction market arbitrage and market microstructure analysis",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(markets.router, prefix="/api", tags=["Markets"])
app.include_router(opportunities.router, prefix="/api", tags=["Opportunities"])
app.include_router(orderbook.router, prefix="/api", tags=["Order Book"])
app.include_router(analysis.router, prefix="/api", tags=["Analysis"])
app.include_router(risk.router, prefix="/api", tags=["Risk"])
app.include_router(efficiency.router, prefix="/api", tags=["Efficiency"])
app.include_router(research.router, prefix="/api", tags=["Research"])
app.include_router(gamification.router, prefix="/api", tags=["Gamification"])


@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "data_mode": settings.DATA_MODE,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
