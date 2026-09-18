"""Markets API — events, contracts, venues, price history."""
from fastapi import APIRouter, Query
from typing import Optional
from data.adapters.simulator import MarketSimulator

router = APIRouter()
sim = MarketSimulator(seed=42)
_data = sim.generate_all_data()


@router.get("/markets")
async def get_markets():
    """Get all tracked events with current pricing across venues."""
    events = _data["events"]
    result = []
    for event in events:
        opps = [o for o in _data["opportunities"] if o["event_slug"] == event["slug"]]
        best_opp = opps[0] if opps else None
        result.append({
            **event,
            "venues": {
                "polymarket": {"yes_price": best_opp["venue_a_yes"] if best_opp else None},
                "kalshi": {"yes_price": best_opp["venue_b_yes"] if best_opp else None},
            },
            "gross_spread": best_opp["gross_spread"] if best_opp else 0,
            "net_edge": best_opp["net_edge"] if best_opp else 0,
            "num_opportunities": len(opps),
            "data_source": "simulated",
        })
    return {"markets": result, "total": len(result), "data_source": "simulated"}


@router.get("/markets/{slug}")
async def get_market_detail(slug: str):
    """Detailed analysis for a single market/event."""
    event = next((e for e in _data["events"] if e["slug"] == slug), None)
    if not event:
        return {"error": "Market not found"}
    prices = _data["price_histories"].get(slug, {})
    order_books = _data["order_books"].get(slug, {})
    opps = [o for o in _data["opportunities"] if o["event_slug"] == slug]
    return {
        "event": event,
        "price_history": prices,
        "order_books": order_books,
        "opportunities": opps,
        "data_source": "simulated",
    }


@router.get("/events")
async def get_events(category: Optional[str] = None):
    """List all events, optionally filtered by category."""
    events = _data["events"]
    if category:
        events = [e for e in events if e["category"] == category]
    return {"events": events, "total": len(events)}


@router.get("/venues")
async def get_venues():
    """Get venue information and fee structures."""
    return {"venues": _data["venues"]}


@router.get("/history/{slug}")
async def get_price_history(slug: str, venue: Optional[str] = None):
    """Get price history for an event."""
    prices = _data["price_histories"].get(slug, {})
    if venue and venue in prices:
        return {"prices": prices[venue], "venue": venue, "data_source": "simulated"}
    return {"prices": prices, "data_source": "simulated"}


@router.get("/hero-chart")
async def get_hero_chart():
    """Get data for the hero arbitrage visualization."""
    return _data["hero_chart"]


@router.get("/stats")
async def get_stats():
    """Get dashboard-level statistics."""
    opps = _data["opportunities"]
    live = [o for o in opps if o["status"] == "live"]
    executable = [o for o in opps if o["classification"] == "executable_arbitrage"]
    net_edges = [o["net_edge"] for o in opps if o["net_edge"] > 0]
    gross_spreads = [o["gross_spread"] for o in opps]
    liquidities = [o["min_liquidity"] for o in opps]
    durations = [o["duration_seconds"] for o in opps]

    return {
        "markets_tracked": len(_data["events"]),
        "total_opportunities": len(opps),
        "active_opportunities": len(live),
        "executable_opportunities": len(executable),
        "avg_gross_spread": round(sum(gross_spreads) / len(gross_spreads) * 100, 1) if gross_spreads else 0,
        "avg_net_edge": round(sum(net_edges) / len(net_edges), 2) if net_edges else 0,
        "total_net_edge": round(sum(net_edges), 2),
        "avg_liquidity": round(sum(liquidities) / len(liquidities), 0) if liquidities else 0,
        "total_liquidity": round(sum(liquidities), 0),
        "avg_duration": round(sum(durations) / len(durations), 0) if durations else 0,
        "median_duration": round(sorted(durations)[len(durations) // 2], 0) if durations else 0,
        "data_source": "simulated",
    }
