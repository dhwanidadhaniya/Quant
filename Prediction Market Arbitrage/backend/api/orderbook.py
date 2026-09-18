"""Order Book API."""
from fastapi import APIRouter
from data.adapters.simulator import MarketSimulator

router = APIRouter()
sim = MarketSimulator(seed=42)
_data = sim.generate_all_data()

@router.get("/orderbook/{slug}")
async def get_orderbook(slug: str, venue: str = "polymarket"):
    obs = _data["order_books"].get(slug, {})
    if venue in obs:
        return {"order_book": obs[venue], "venue": venue, "event": slug, "data_source": "simulated"}
    if obs:
        return {"order_books": obs, "event": slug, "data_source": "simulated"}
    # Generate on-the-fly
    event = next((e for e in _data["events"] if e["slug"] == slug), None)
    if event:
        ob = sim.generate_order_book(event["true_probability"])
        return {"order_book": ob, "venue": venue, "event": slug, "data_source": "simulated"}
    return {"error": "Event not found"}
