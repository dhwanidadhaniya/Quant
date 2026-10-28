import asyncio
import random
import time
from typing import Dict, List, Any
from backend.quant_engine import StochasticEngine, FillProbabilityModel, InventoryEngine, OptimalStoppingEngine

class MarketSimulator:
    """
    Simulates LOB depth, Order Flow, Microprice, Adverse Selection, Monte Carlo paths, and Backtesting.
    """
    def __init__(self):
        self.stochastic = StochasticEngine(s0=100.0, mu=0.0, sigma=0.18, dt=0.1)
        self.fill_model = FillProbabilityModel(A=1.5, k=10.0)
        self.inventory_eng = InventoryEngine(max_inventory=10, alpha=0.025)
        self.stopping_eng = OptimalStoppingEngine(gamma=0.15, transaction_cost=0.015)
        
        self.tick_count = 0
        self.mid_price = 100.0
        self.spread = 0.08
        self.regime = "NORMAL MARKET"
        self.regime_vol_mult = 1.0
        
        self.trades_history: List[Dict[str, Any]] = []
        self.pnl_history: List[Dict[str, Any]] = []
        self.cum_pnl = 0.0
        self.gross_spread_pnl = 0.0
        self.adverse_selection_cost = 0.0
        
        # Recent state
        self.order_book = {"bids": [], "asks": []}
        self.microprice = 100.0
        self.obi = 0.0
        self.adverse_risk = 0.05
        
    def generate_order_book(self) -> Dict[str, Any]:
        base_bid = round(self.mid_price - self.spread / 2.0, 2)
        base_ask = round(self.mid_price + self.spread / 2.0, 2)
        
        bids = []
        asks = []
        
        # 5 levels of depth
        bid_vol_sum = 0
        ask_vol_sum = 0
        
        for i in range(5):
            bp = round(base_bid - i * 0.02, 2)
            ap = round(base_ask + i * 0.02, 2)
            bs = random.randint(10, 150) + int(max(0, self.obi * 50 if i == 0 else 0))
            asize = random.randint(10, 150) - int(min(0, self.obi * 50 if i == 0 else 0))
            asize = max(5, asize)
            
            bids.append({"price": bp, "size": bs, "orders": random.randint(1, 8)})
            asks.append({"price": ap, "size": asize, "orders": random.randint(1, 8)})
            
            bid_vol_sum += bs
            ask_vol_sum += asize

        self.obi = round((bid_vol_sum - ask_vol_sum) / max(1, bid_vol_sum + ask_vol_sum), 3)
        
        # Microprice calculation: (P_ask * V_bid + P_bid * V_ask) / (V_bid + V_ask)
        v_b = bids[0]["size"]
        v_a = asks[0]["size"]
        self.microprice = round((asks[0]["price"] * v_b + bids[0]["price"] * v_a) / max(1, v_b + v_a), 3)
        
        self.order_book = {"bids": bids, "asks": asks}
        return self.order_book

    def next_tick(self) -> Dict[str, Any]:
        self.tick_count += 1
        
        # Random regime switching probability
        if random.random() < 0.03:
            regimes = [
                ("NORMAL MARKET", 1.0),
                ("HIGH VOLATILITY", 1.8),
                ("TRENDING BUY", 1.2),
                ("LIQUIDITY SHOCK", 2.5),
                ("CALM LIQUIDITY", 0.6)
            ]
            self.regime, self.regime_vol_mult = random.choice(regimes)

        self.mid_price = self.stochastic.step(regime_factor=self.regime_vol_mult)
        self.generate_order_book()
        
        # Calculate optimal quote skew
        skew = self.inventory_eng.get_quote_skew(self.inventory_eng.inventory)
        delta_bid = max(0.01, round(self.spread / 2.0 + skew, 4))
        delta_ask = max(0.01, round(self.spread / 2.0 - skew, 4))
        
        opt_bid = round(self.mid_price - delta_bid, 2)
        opt_ask = round(self.mid_price + delta_ask, 2)

        # Check execution probabilities
        p_bid_fill = self.fill_model.get_fill_prob(delta_bid)
        p_ask_fill = self.fill_model.get_fill_prob(delta_ask)

        filled_side = None
        if random.random() < p_bid_fill and self.inventory_eng.inventory < self.inventory_eng.max_inventory:
            # Filled on Bid -> Market Maker buys 1 unit
            self.inventory_eng.update_inventory(1)
            filled_side = "BUY"
            spread_captured = self.mid_price - opt_bid
            self.gross_spread_pnl += spread_captured
            self.cum_pnl += spread_captured
            
            # Adverse selection simulation (did price move down after buy fill?)
            if random.random() < 0.35 + (0.2 if self.regime == "HIGH VOLATILITY" else 0.0):
                as_loss = random.uniform(0.01, 0.04)
                self.adverse_selection_cost += as_loss
                self.cum_pnl -= as_loss
                
        elif random.random() < p_ask_fill and self.inventory_eng.inventory > -self.inventory_eng.max_inventory:
            # Filled on Ask -> Market Maker sells 1 unit
            self.inventory_eng.update_inventory(-1)
            filled_side = "SELL"
            spread_captured = opt_ask - self.mid_price
            self.gross_spread_pnl += spread_captured
            self.cum_pnl += spread_captured

            if random.random() < 0.35 + (0.2 if self.regime == "HIGH VOLATILITY" else 0.0):
                as_loss = random.uniform(0.01, 0.04)
                self.adverse_selection_cost += as_loss
                self.cum_pnl -= as_loss

        if filled_side:
            trade_obj = {
                "id": self.tick_count,
                "timestamp": time.strftime("%H:%M:%S"),
                "side": filled_side,
                "price": opt_bid if filled_side == "BUY" else opt_ask,
                "qty": 1,
                "inventory": self.inventory_eng.inventory,
                "mid_price": self.mid_price,
                "spread": self.spread,
                "regime": self.regime
            }
            self.trades_history.insert(0, trade_obj)
            if len(self.trades_history) > 50:
                self.trades_history.pop()

        # Mark-to-market P&L
        unrealized_pnl = round(self.inventory_eng.inventory * (self.mid_price - 100.0) * 0.1, 4)
        net_pnl = round(self.cum_pnl + unrealized_pnl, 4)

        self.pnl_history.append({"tick": self.tick_count, "pnl": net_pnl, "unrealized": unrealized_pnl})
        if len(self.pnl_history) > 100:
            self.pnl_history.pop(0)

        # Decision from optimal stopping engine
        vol = round(self.stochastic.sigma * self.regime_vol_mult, 3)
        self.adverse_risk = round(0.04 + (0.1 if self.regime == "LIQUIDITY SHOCK" else 0.0), 3)
        decision_info = self.stopping_eng.decide(
            q=self.inventory_eng.inventory,
            vol=vol,
            spread=self.spread,
            obi=self.obi,
            adverse_risk=self.adverse_risk
        )

        return {
            "tick": self.tick_count,
            "mid_price": self.mid_price,
            "spread": self.spread,
            "microprice": self.microprice,
            "obi": self.obi,
            "regime": self.regime,
            "volatility": vol,
            "inventory": self.inventory_eng.inventory,
            "max_inventory": self.inventory_eng.max_inventory,
            "inventory_pct": round(abs(self.inventory_eng.inventory) / self.inventory_eng.max_inventory * 100, 1),
            "opt_bid": opt_bid,
            "opt_ask": opt_ask,
            "p_bid_fill": round(p_bid_fill, 3),
            "p_ask_fill": round(p_ask_fill, 3),
            "decision": decision_info["decision"],
            "reason": decision_info["reason"],
            "v_continue": decision_info["v_continue"],
            "v_stop": decision_info["v_stop"],
            "confidence": decision_info["confidence"],
            "net_pnl": net_pnl,
            "gross_spread_pnl": round(self.gross_spread_pnl, 4),
            "adverse_selection_cost": round(self.adverse_selection_cost, 4),
            "unrealized_pnl": unrealized_pnl,
            "order_book": self.order_book,
            "recent_trade": self.trades_history[0] if self.trades_history else None
        }

    def run_monte_carlo(self, num_sims: int = 1000, steps: int = 50, gamma: float = 0.15, vol: float = 0.2) -> Dict[str, Any]:
        """
        Simulates Monte Carlo paths for Price, Inventory, and P&L.
        """
        price_paths = []
        final_pnls = []
        stopping_times = []

        for _ in range(num_sims):
            path = [100.0]
            curr_s = 100.0
            curr_q = 0
            pnl = 0.0
            stopped_step = steps
            
            for step in range(1, steps + 1):
                dw = np.random.normal(0, np.sqrt(0.1))
                curr_s += vol * curr_s * dw
                path.append(round(curr_s, 2))
                
                # Check stopping criteria
                inv_risk = 0.5 * gamma * (curr_q ** 2) * (vol ** 2)
                v_cont = 0.04 - inv_risk
                v_stop = -abs(curr_q) * 0.015
                
                if v_cont <= v_stop and stopped_step == steps:
                    stopped_step = step

                # Simulate execution
                if random.random() < 0.3:
                    curr_q += random.choice([-1, 1])
                    pnl += 0.04 - random.uniform(0, 0.02)

            price_paths.append(path[:20]) # return top 20 sample paths for UI
            final_pnls.append(round(pnl + curr_q * (curr_s - 100.0) * 0.05, 3))
            stopping_times.append(stopped_step)

        mean_pnl = round(float(np.mean(final_pnls)), 3)
        var_pnl = round(float(np.var(final_pnls)), 3)
        sharpe = round(mean_pnl / max(0.01, np.std(final_pnls)), 2)

        return {
            "num_simulations": num_sims,
            "sample_paths": price_paths[:15],
            "mean_pnl": mean_pnl,
            "var_pnl": var_pnl,
            "sharpe_ratio": sharpe,
            "avg_stopping_step": round(float(np.mean(stopping_times)), 1),
            "pnl_distribution": [int(x) for x in np.histogram(final_pnls, bins=10)[0].tolist()]
        }

    def run_backtest(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs strategy comparison backtest across 4 strategies:
        Strategy A: Fixed Spread
        Strategy B: Inventory Aware
        Strategy C: Order-Flow Aware
        Strategy D: Optimal Stopping
        """
        steps = params.get("steps", 200)
        initial_cap = params.get("initial_capital", 100000.0)

        strategies = ["Fixed Spread", "Inventory Aware", "Order-Flow Aware", "Optimal Stopping"]
        results = {}

        for strat in strategies:
            pnl_series = [initial_cap]
            curr_pnl = initial_cap
            trades = 0
            fills = 0
            stopped_ticks = 0
            
            q = 0
            s = 100.0
            
            for t in range(steps):
                s += np.random.normal(0, 0.15)
                
                # Check stopping
                if strat == "Optimal Stopping" and (abs(q) >= 9 or t > 180):
                    stopped_ticks += 1
                    pnl_series.append(round(curr_pnl, 2))
                    continue

                trades += 2
                
                # Fills probability
                fill_prob = 0.45
                if strat in ["Inventory Aware", "Optimal Stopping"]:
                    fill_prob -= 0.03 * abs(q)
                
                if random.random() < fill_prob:
                    fills += 1
                    side = 1 if random.random() < 0.5 else -1
                    q += side
                    
                    spread_gain = 0.04
                    if strat == "Order-Flow Aware":
                        spread_gain += 0.01
                    as_cost = 0.015 if strat == "Optimal Stopping" else 0.025
                    
                    curr_pnl += (spread_gain - as_cost) * 100
                    
                pnl_series.append(round(curr_pnl, 2))

            total_return = round(((curr_pnl - initial_cap) / initial_cap) * 100, 2)
            returns = np.diff(pnl_series)
            sharpe = round(float(np.mean(returns) / max(0.001, np.std(returns)) * np.sqrt(252)), 2)
            max_dd = round(float(np.max(np.maximum.accumulate(pnl_series) - pnl_series) / np.max(pnl_series) * 100), 2)

            results[strat] = {
                "final_pnl": round(curr_pnl - initial_cap, 2),
                "return_pct": total_return,
                "sharpe": sharpe,
                "max_drawdown": max_dd,
                "fill_rate": round(fills / max(1, trades) * 100, 1),
                "stopped_ticks": stopped_ticks,
                "equity_curve": pnl_series[::5] # sample points for charting
            }

        return {"backtest_summary": results}
