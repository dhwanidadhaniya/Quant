"""
Realistic Market Data Simulator
=================================

This generates SIMULATED prediction market data that exhibits realistic
market microstructure characteristics:

  - Prices mean-revert around a fundamental value
  - Spreads widen during volatility and narrow during calm
  - Liquidity varies by time of day and market popularity
  - Order books have realistic shape (more depth further from mid)
  - Cross-venue prices diverge temporarily and converge (arbitrage opportunities)
  - Different venues have slightly different equilibrium prices (venue effects)

ALL SIMULATED DATA IS CLEARLY LABELED.
We never pretend simulated data is real.

Methodology note:
  Prices follow an Ornstein-Uhlenbeck process (mean-reverting diffusion):
    dp = θ(μ - p)dt + σdW
  Where:
    θ = mean reversion speed
    μ = long-run equilibrium price (the "true" probability)
    σ = volatility
    dW = Wiener process increment
"""
import random
import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple


class MarketSimulator:
    """
    Generates realistic prediction market data for research purposes.
    
    Design philosophy:
      Generate data that exhibits the SAME PROPERTIES as real market data,
      allowing us to build and test our analysis pipeline, while being
      completely transparent that this is simulated.
    """
    
    def __init__(self, seed: int = 42):
        self.rng = random.Random(seed)
        self.events = self._create_events()
    
    def _create_events(self) -> List[Dict]:
        """Create a diverse set of prediction market events."""
        return [
            {
                "name": "Will the Democratic candidate win the 2024 Presidential Election?",
                "slug": "democratic-candidate-wins-2024",
                "category": "politics",
                "subcategory": "us_elections",
                "true_probability": 0.52,
                "volatility": 0.03,
                "importance": "high",
                "resolution_source": "Associated Press",
                "end_date": "2024-11-05",
                "tags": ["election", "2024", "president"],
            },
            {
                "name": "Will the Fed cut rates in September 2024?",
                "slug": "fed-rate-cut-september-2024",
                "category": "economics",
                "subcategory": "monetary_policy",
                "true_probability": 0.68,
                "volatility": 0.04,
                "importance": "high",
                "resolution_source": "Federal Reserve",
                "end_date": "2024-09-18",
                "tags": ["fed", "rates", "monetary_policy"],
            },
            {
                "name": "Will US CPI exceed 3.0% in August 2024?",
                "slug": "us-cpi-above-3-august-2024",
                "category": "economics",
                "subcategory": "inflation",
                "true_probability": 0.35,
                "volatility": 0.05,
                "importance": "medium",
                "resolution_source": "Bureau of Labor Statistics",
                "end_date": "2024-09-11",
                "tags": ["cpi", "inflation", "economics"],
            },
            {
                "name": "Will Bitcoin exceed $100,000 by end of 2024?",
                "slug": "bitcoin-100k-2024",
                "category": "crypto",
                "subcategory": "price_targets",
                "true_probability": 0.42,
                "volatility": 0.06,
                "importance": "medium",
                "resolution_source": "CoinMarketCap",
                "end_date": "2024-12-31",
                "tags": ["bitcoin", "crypto", "price"],
            },
            {
                "name": "Will there be a US government shutdown in Q4 2024?",
                "slug": "government-shutdown-q4-2024",
                "category": "politics",
                "subcategory": "fiscal_policy",
                "true_probability": 0.28,
                "volatility": 0.04,
                "importance": "medium",
                "resolution_source": "Congressional Records",
                "end_date": "2024-12-31",
                "tags": ["government", "shutdown", "fiscal"],
            },
            {
                "name": "Will SpaceX Starship complete orbital flight in 2024?",
                "slug": "spacex-starship-orbital-2024",
                "category": "science",
                "subcategory": "space",
                "true_probability": 0.58,
                "volatility": 0.05,
                "importance": "medium",
                "resolution_source": "FAA / SpaceX official announcements",
                "end_date": "2024-12-31",
                "tags": ["spacex", "starship", "space"],
            },
            {
                "name": "Will Real Madrid win the Champions League 2024-25?",
                "slug": "real-madrid-champions-league-2025",
                "category": "sports",
                "subcategory": "football",
                "true_probability": 0.22,
                "volatility": 0.03,
                "importance": "medium",
                "resolution_source": "UEFA Official Results",
                "end_date": "2025-05-31",
                "tags": ["football", "champions_league", "sports"],
            },
            {
                "name": "Will US GDP growth exceed 2.5% in Q3 2024?",
                "slug": "us-gdp-growth-q3-2024",
                "category": "economics",
                "subcategory": "gdp",
                "true_probability": 0.55,
                "volatility": 0.04,
                "importance": "medium",
                "resolution_source": "Bureau of Economic Analysis",
                "end_date": "2024-10-30",
                "tags": ["gdp", "growth", "economics"],
            },
            {
                "name": "Will a Category 5 hurricane hit the US mainland in 2024?",
                "slug": "cat5-hurricane-us-2024",
                "category": "weather",
                "subcategory": "natural_disasters",
                "true_probability": 0.15,
                "volatility": 0.03,
                "importance": "low",
                "resolution_source": "National Hurricane Center",
                "end_date": "2024-11-30",
                "tags": ["hurricane", "weather", "climate"],
            },
            {
                "name": "Will the S&P 500 close above 5,500 by end of 2024?",
                "slug": "sp500-above-5500-2024",
                "category": "finance",
                "subcategory": "equities",
                "true_probability": 0.62,
                "volatility": 0.05,
                "importance": "high",
                "resolution_source": "S&P Dow Jones Indices",
                "end_date": "2024-12-31",
                "tags": ["sp500", "stocks", "equities"],
            },
            {
                "name": "Will the EU impose new tariffs on Chinese EVs in 2024?",
                "slug": "eu-tariffs-chinese-evs-2024",
                "category": "politics",
                "subcategory": "trade",
                "true_probability": 0.72,
                "volatility": 0.04,
                "importance": "medium",
                "resolution_source": "European Commission Official Journal",
                "end_date": "2024-12-31",
                "tags": ["eu", "tariffs", "trade", "evs"],
            },
            {
                "name": "Will OpenAI release GPT-5 in 2024?",
                "slug": "openai-gpt5-2024",
                "category": "tech",
                "subcategory": "ai",
                "true_probability": 0.30,
                "volatility": 0.05,
                "importance": "medium",
                "resolution_source": "OpenAI official announcements",
                "end_date": "2024-12-31",
                "tags": ["ai", "openai", "gpt", "technology"],
            },
        ]
    
    def generate_venue_data(self) -> List[Dict]:
        """Generate venue configurations."""
        return [
            {
                "name": "Polymarket",
                "slug": "polymarket",
                "description": "Decentralized prediction market built on Polygon",
                "url": "https://polymarket.com",
                "taker_fee_bps": 100,
                "maker_fee_bps": 0,
                "min_trade_size": 1.0,
                "max_trade_size": 100000.0,
                "settlement_currency": "USDC",
                "supports_limit_orders": True,
                "supports_market_orders": True,
            },
            {
                "name": "Kalshi",
                "slug": "kalshi",
                "description": "CFTC-regulated prediction exchange",
                "url": "https://kalshi.com",
                "taker_fee_bps": 70,
                "maker_fee_bps": 0,
                "min_trade_size": 1.0,
                "max_trade_size": 25000.0,
                "settlement_currency": "USD",
                "supports_limit_orders": True,
                "supports_market_orders": True,
            },
        ]
    
    def generate_price_series(
        self,
        true_prob: float,
        volatility: float,
        num_points: int = 200,
        venue_bias: float = 0.0,
        dt: float = 1.0,
        mean_reversion: float = 0.05,
    ) -> List[Dict]:
        """
        Generate a realistic price series using Ornstein-Uhlenbeck process.
        
        dp = θ(μ - p)dt + σdW
        
        This produces mean-reverting prices that:
        - Fluctuate around the true probability
        - Have realistic volatility
        - Stay in [0.01, 0.99] range
        - Include venue-specific bias
        """
        prices = []
        p = true_prob + venue_bias + self.rng.gauss(0, volatility * 0.5)
        p = max(0.01, min(0.99, p))
        
        base_time = datetime(2024, 6, 1, 9, 30)
        
        for i in range(num_points):
            # OU process step
            drift = mean_reversion * (true_prob + venue_bias - p) * dt
            diffusion = volatility * math.sqrt(dt) * self.rng.gauss(0, 1)
            p += drift + diffusion
            p = max(0.01, min(0.99, p))
            
            # Generate realistic NO price (with small overround)
            overround = self.rng.uniform(0.01, 0.04)
            no_price = max(0.01, min(0.99, 1.0 - p + overround * self.rng.choice([-1, 1]) * 0.5))
            
            # Spread
            half_spread = self.rng.uniform(0.005, 0.02)
            best_bid = max(0.01, p - half_spread)
            best_ask = min(0.99, p + half_spread)
            
            # Volume
            base_volume = self.rng.uniform(500, 50000)
            volume = base_volume * (1 + 0.5 * math.sin(i / 24 * math.pi))  # Intraday pattern
            
            timestamp = base_time + timedelta(hours=i * 0.5)
            
            prices.append({
                "yes_price": round(p, 4),
                "no_price": round(no_price, 4),
                "mid_price": round((best_bid + best_ask) / 2, 4),
                "best_bid": round(best_bid, 4),
                "best_ask": round(best_ask, 4),
                "spread": round(best_ask - best_bid, 4),
                "volume": round(volume, 0),
                "implied_probability": round(p, 4),
                "yes_plus_no": round(p + no_price, 4),
                "timestamp": timestamp.isoformat(),
                "data_source": "simulated",
            })
        
        return prices
    
    def generate_order_book(
        self,
        mid_price: float,
        base_liquidity: float = 20000,
        num_levels: int = 10,
    ) -> Dict:
        """
        Generate a realistic order book.
        
        Realistic properties:
        - More depth further from mid (patient limit orders)
        - Bid side slightly thinner than ask (typical in prediction markets)
        - Quantity increases with distance from mid
        """
        bids = []
        asks = []
        tick = 0.01
        
        bid_cumulative = 0
        ask_cumulative = 0
        
        for i in range(num_levels):
            # Quantity increases with distance from mid (more patient orders further out)
            base_qty = base_liquidity / num_levels * (1 + i * 0.3)
            qty_noise = self.rng.uniform(0.5, 1.5)
            
            bid_price = round(max(0.01, mid_price - (i + 1) * tick), 2)
            bid_qty = round(base_qty * qty_noise * 0.9, 0)  # Bids slightly thinner
            bid_cumulative += bid_qty
            
            ask_price = round(min(0.99, mid_price + (i + 1) * tick), 2)
            ask_qty = round(base_qty * qty_noise, 0)
            ask_cumulative += ask_qty
            
            bids.append({
                "price": bid_price,
                "quantity": bid_qty,
                "dollar_value": round(bid_price * bid_qty, 2),
                "cumulative_quantity": round(bid_cumulative, 0),
                "level_index": i,
            })
            
            asks.append({
                "price": ask_price,
                "quantity": ask_qty,
                "dollar_value": round(ask_price * ask_qty, 2),
                "cumulative_quantity": round(ask_cumulative, 0),
                "level_index": i,
            })
        
        return {
            "bids": bids,
            "asks": asks,
            "best_bid": bids[0]["price"] if bids else 0,
            "best_ask": asks[0]["price"] if asks else 0,
            "mid_price": mid_price,
            "spread": round(asks[0]["price"] - bids[0]["price"], 4) if bids and asks else 0,
            "bid_depth_total": round(sum(b["dollar_value"] for b in bids), 2),
            "ask_depth_total": round(sum(a["dollar_value"] for a in asks), 2),
            "total_liquidity": round(sum(b["dollar_value"] for b in bids) + sum(a["dollar_value"] for a in asks), 2),
        }
    
    def generate_opportunities(self, num_opportunities: int = 30) -> List[Dict]:
        """
        Generate simulated arbitrage opportunities with realistic properties.
        
        Key realism properties:
        - Most opportunities have small gross spreads (1-5%)
        - A few have larger spreads (5-15%)
        - Many disappear after transaction costs
        - Duration varies widely (seconds to hours)
        - Liquidity is the main constraint
        """
        opportunities = []
        statuses = ["live", "live", "live", "developing", "developing", "compressing", "expired", "expired"]
        
        classifications = [
            "executable_arbitrage",
            "executable_arbitrage",
            "practical_arbitrage",
            "practical_arbitrage",
            "practical_arbitrage",
            "theoretical_arbitrage",
            "theoretical_arbitrage",
            "theoretical_arbitrage",
            "theoretical_arbitrage",
            "not_arbitrage",
        ]
        
        for i in range(num_opportunities):
            event = self.rng.choice(self.events)
            true_prob = event["true_probability"]
            vol = event["volatility"]
            
            # Generate cross-venue prices with realistic divergence
            venue_a_yes = round(max(0.01, min(0.99, true_prob + self.rng.gauss(0, vol))), 2)
            
            # Venue B has a bias (the divergence source)
            divergence = self.rng.choice([-1, 1]) * self.rng.uniform(0.01, 0.12)
            venue_b_yes = round(max(0.01, min(0.99, true_prob + divergence + self.rng.gauss(0, vol * 0.5))), 2)
            
            gross_spread = abs(venue_a_yes - venue_b_yes)
            
            # Liquidity
            base_liq = self.rng.uniform(5000, 100000)
            liquidity_a = round(base_liq * self.rng.uniform(0.6, 1.4), 0)
            liquidity_b = round(base_liq * self.rng.uniform(0.6, 1.4), 0)
            min_liq = min(liquidity_a, liquidity_b)
            
            # Costs
            fee_rate = 0.01  # 1%
            trade_size = min(1000, min_liq * 0.1)
            total_fees = trade_size * fee_rate * 2  # Both legs
            slippage = trade_size * 0.1 * math.sqrt(trade_size / min_liq) if min_liq > 0 else trade_size
            spread_cost = trade_size * 0.005
            
            gross_edge_total = gross_spread * (trade_size / (venue_a_yes + (1 - venue_b_yes)))
            net_edge_total = gross_edge_total - total_fees - slippage - spread_cost
            
            # Duration
            duration = self.rng.choice([3, 5, 8, 12, 21, 34, 47, 68, 120, 180, 300, 600, 1800])
            
            status = self.rng.choice(statuses)
            classification = self.rng.choice(classifications)
            
            # Override classification based on actual numbers
            if gross_spread < 0.01:
                classification = "not_arbitrage"
            elif net_edge_total <= 0:
                classification = "theoretical_arbitrage"
            elif min_liq < 500:
                classification = "practical_arbitrage"
            else:
                classification = "executable_arbitrage"
            
            equivalence_score = self.rng.uniform(0.82, 1.0)
            
            # Execution difficulty
            if min_liq > trade_size * 10:
                exec_diff = "easy"
            elif min_liq > trade_size * 3:
                exec_diff = "medium"
            else:
                exec_diff = "hard"
            
            now = datetime.utcnow()
            detected_at = now - timedelta(seconds=self.rng.uniform(0, duration))
            
            opportunities.append({
                "id": i + 1,
                "event_name": event["name"],
                "event_slug": event["slug"],
                "category": event["category"],
                "subcategory": event.get("subcategory", ""),
                
                "venue_a": "Polymarket",
                "venue_b": "Kalshi",
                "venue_a_yes": venue_a_yes,
                "venue_b_yes": venue_b_yes,
                "venue_a_no": round(1 - venue_a_yes, 2),
                "venue_b_no": round(1 - venue_b_yes, 2),
                
                "gross_spread": round(gross_spread, 4),
                "gross_spread_cents": round(gross_spread * 100, 1),
                "percentage_divergence": round((gross_spread / min(venue_a_yes, venue_b_yes)) * 100, 2) if min(venue_a_yes, venue_b_yes) > 0 else 0,
                
                "total_cost_per_pair": round(min(venue_a_yes, venue_b_yes) + (1 - max(venue_a_yes, venue_b_yes)), 4),
                "gross_edge_per_contract": round(1 - (min(venue_a_yes, venue_b_yes) + (1 - max(venue_a_yes, venue_b_yes))), 4),
                "buy_yes_price": min(venue_a_yes, venue_b_yes),
                
                "estimated_fees": round(total_fees, 2),
                "estimated_slippage": round(slippage, 2),
                "spread_cost": round(spread_cost, 2),
                "total_transaction_cost": round(total_fees + slippage + spread_cost, 2),
                
                "gross_edge_total": round(gross_edge_total, 2),
                "net_edge": round(net_edge_total, 2),
                "net_edge_pct": round((net_edge_total / trade_size) * 100, 2) if trade_size > 0 else 0,
                "net_roi": round((net_edge_total / trade_size) * 100, 2) if trade_size > 0 else 0,
                
                "liquidity_a": liquidity_a,
                "liquidity_b": liquidity_b,
                "min_liquidity": min_liq,
                "max_executable_size": round(min_liq * 0.1, 0),
                
                "equivalence_score": round(equivalence_score, 2),
                "equivalence_risk": "low" if equivalence_score > 0.95 else "medium" if equivalence_score > 0.85 else "high",
                
                "classification": classification,
                "status": status,
                "execution_difficulty": exec_diff,
                "implied_probability": round(true_prob, 4),
                
                "duration_seconds": duration,
                "duration_label": f"{duration}s" if duration < 60 else f"{duration // 60}m {duration % 60}s",
                "detected_at": detected_at.isoformat(),
                
                "overall_risk": self.rng.choice(["low", "low", "medium", "medium", "medium", "high"]),
                
                "bull_case": f"If execution is fast and liquidity holds, net edge of ~{round(net_edge_total, 2):.2f} is capturable.",
                "base_case": f"After costs, expect approximately {round(net_edge_total * 0.7, 2):.2f} net profit.",
                "bear_case": "Prices converge before execution or slippage exceeds estimates.",
                
                "final_assessment": self._generate_assessment(classification, net_edge_total, min_liq, equivalence_score),
                
                "data_source": "simulated",
            })
        
        # Sort by net edge descending
        opportunities.sort(key=lambda x: x["net_edge"], reverse=True)
        return opportunities
    
    def _generate_assessment(self, classification: str, net_edge: float, liquidity: float, equiv_score: float) -> str:
        """Generate research-style assessment."""
        if classification == "executable_arbitrage":
            return f"Potential cross-venue pricing discrepancy. Gross spread is meaningful, and executable profitability appears positive after estimated transaction costs. Available liquidity (${liquidity:,.0f}) supports reasonable position sizes."
        elif classification == "practical_arbitrage":
            return f"Net edge exists but execution is constrained by liquidity (${liquidity:,.0f}). Smaller position sizes may be feasible."
        elif classification == "theoretical_arbitrage":
            return f"Gross spread exists but is eliminated by estimated transaction costs. Not recommended for execution."
        else:
            return "No actionable opportunity. Price difference is within normal market friction."
    
    def generate_heatmap_data(self, num_events: int = 12, num_timepoints: int = 24) -> List[Dict]:
        """Generate data for the opportunity heatmap."""
        data = []
        events = self.events[:num_events]
        base_time = datetime(2024, 8, 1, 9, 0)
        
        for t in range(num_timepoints):
            timestamp = base_time + timedelta(hours=t * 4)
            for event in events:
                # Opportunity intensity varies by time and event
                base_intensity = self.rng.uniform(0, 0.08)
                time_factor = 1 + 0.5 * math.sin(t / 6 * math.pi)  # Cyclic pattern
                net_edge = max(0, base_intensity * time_factor + self.rng.gauss(0, 0.01))
                
                has_opportunity = net_edge > 0.01
                
                data.append({
                    "event_name": event["name"][:40],
                    "event_slug": event["slug"],
                    "category": event["category"],
                    "timestamp": timestamp.isoformat(),
                    "time_label": timestamp.strftime("%H:%M"),
                    "date_label": timestamp.strftime("%b %d"),
                    "net_edge": round(net_edge, 4) if has_opportunity else 0,
                    "gross_spread": round(net_edge + self.rng.uniform(0.01, 0.03), 4) if has_opportunity else round(self.rng.uniform(0, 0.01), 4),
                    "liquidity": round(self.rng.uniform(5000, 80000), 0),
                    "duration_seconds": self.rng.randint(5, 600) if has_opportunity else 0,
                    "has_opportunity": has_opportunity,
                    "intensity": round(min(1, net_edge / 0.05), 2),
                })
        
        return data
    
    def generate_backtest_opportunities(self, num: int = 200) -> List[Dict]:
        """Generate a larger set of opportunities for backtesting."""
        return self.generate_opportunities(num)
    
    def generate_price_convergence_data(self) -> Dict:
        """
        Generate the hero chart data: two venues pricing the same event,
        showing divergence and convergence.
        """
        true_prob = 0.58
        num_points = 150
        
        prices_a = []
        prices_b = []
        
        pa = true_prob - 0.02
        pb = true_prob + 0.02
        
        base_time = datetime(2024, 8, 15, 9, 30)
        
        for i in range(num_points):
            # Phase 1: Gradual divergence (0-40)
            if i < 40:
                pa += self.rng.gauss(-0.001, 0.005)
                pb += self.rng.gauss(0.001, 0.005)
            # Phase 2: Peak divergence (40-70)
            elif i < 70:
                pa += self.rng.gauss(-0.0005, 0.003)
                pb += self.rng.gauss(0.0005, 0.003)
            # Phase 3: Convergence (70-120)
            elif i < 120:
                target = (pa + pb) / 2
                pa += 0.03 * (target - pa) + self.rng.gauss(0, 0.003)
                pb += 0.03 * (target - pb) + self.rng.gauss(0, 0.003)
            # Phase 4: Stable (120+)
            else:
                pa += self.rng.gauss(0, 0.002)
                pb += self.rng.gauss(0, 0.002)
            
            pa = max(0.01, min(0.99, pa))
            pb = max(0.01, min(0.99, pb))
            
            timestamp = base_time + timedelta(minutes=i * 10)
            
            prices_a.append({"time": timestamp.isoformat(), "price": round(pa, 4), "venue": "Polymarket"})
            prices_b.append({"time": timestamp.isoformat(), "price": round(pb, 4), "venue": "Kalshi"})
        
        # Find key points
        spreads = [abs(a["price"] - b["price"]) for a, b in zip(prices_a, prices_b)]
        peak_idx = spreads.index(max(spreads))
        
        return {
            "event": "Will the Fed cut rates in September 2024?",
            "polymarket": prices_a,
            "kalshi": prices_b,
            "spreads": [{"time": prices_a[i]["time"], "spread": round(s, 4)} for i, s in enumerate(spreads)],
            "annotations": [
                {"index": 0, "label": "Markets open", "type": "info"},
                {"index": 30, "label": "Divergence begins", "type": "warning"},
                {"index": peak_idx, "label": f"Peak divergence: {spreads[peak_idx]*100:.1f}¢", "type": "alert"},
                {"index": 90, "label": "Convergence", "type": "info"},
                {"index": 130, "label": "Prices realigned", "type": "success"},
            ],
            "peak_spread": round(max(spreads), 4),
            "peak_spread_cents": round(max(spreads) * 100, 1),
            "avg_spread": round(sum(spreads) / len(spreads), 4),
            "data_source": "simulated",
        }

    def generate_event_study_data(self) -> List[Dict]:
        """Generate data for event study analysis."""
        phases = ["pre_event", "event_day", "post_event"]
        categories = ["politics", "economics", "sports", "crypto"]
        
        data = []
        for cat in categories:
            for phase in phases:
                base_spread = {"pre_event": 0.03, "event_day": 0.06, "post_event": 0.015}[phase]
                base_volume = {"pre_event": 20000, "event_day": 80000, "post_event": 15000}[phase]
                base_freq = {"pre_event": 5, "event_day": 15, "post_event": 2}[phase]
                
                data.append({
                    "category": cat,
                    "phase": phase,
                    "avg_spread": round(base_spread + self.rng.gauss(0, 0.005), 4),
                    "avg_volume": round(base_volume * self.rng.uniform(0.7, 1.3), 0),
                    "opportunity_frequency": max(0, round(base_freq + self.rng.gauss(0, 2), 0)),
                    "avg_duration_seconds": round(self.rng.uniform(10, 300), 0),
                    "convergence_speed": round(self.rng.uniform(0.5, 5), 1),
                })
        
        return data

    def generate_all_data(self) -> Dict:
        """Generate a complete dataset for the application."""
        opportunities = self.generate_opportunities(30)
        
        # Generate price history for each event on both venues
        price_histories = {}
        for event in self.events:
            prices_a = self.generate_price_series(
                event["true_probability"], event["volatility"],
                venue_bias=-0.02, num_points=200
            )
            prices_b = self.generate_price_series(
                event["true_probability"], event["volatility"],
                venue_bias=0.02, num_points=200
            )
            price_histories[event["slug"]] = {
                "polymarket": prices_a,
                "kalshi": prices_b,
            }
        
        # Order books for a few contracts
        order_books = {}
        for event in self.events[:5]:
            mid = event["true_probability"]
            order_books[event["slug"]] = {
                "polymarket": self.generate_order_book(mid - 0.01),
                "kalshi": self.generate_order_book(mid + 0.02),
            }
        
        return {
            "venues": self.generate_venue_data(),
            "events": self.events,
            "opportunities": opportunities,
            "price_histories": price_histories,
            "order_books": order_books,
            "heatmap": self.generate_heatmap_data(),
            "hero_chart": self.generate_price_convergence_data(),
            "backtest_opportunities": self.generate_backtest_opportunities(200),
            "event_study": self.generate_event_study_data(),
            "data_source": "simulated",
            "generated_at": datetime.utcnow().isoformat(),
        }
