from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import DATA_DISCLAIMER
from .database import Base, engine
from .routers import market, research, studio, theory
from .seed import seed

Base.metadata.create_all(bind=engine)
seed(force=False)

app = FastAPI(
    title="Equity Factor & Alpha Research Platform",
    description="Student research lab. Sample data, transparent factor scores, no live feed.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(market.router)
app.include_router(research.router)
app.include_router(studio.router)
app.include_router(theory.router)


@app.get("/api/health")
def health():
    return {"ok": True, "disclaimer": DATA_DISCLAIMER}
