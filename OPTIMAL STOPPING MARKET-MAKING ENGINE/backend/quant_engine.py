import numpy as np
import scipy.stats as stats
from typing import Dict, List, Tuple, Any

class StochasticEngine:
    """
    Implements stochastic price dynamics with drift, jump diffusion, and regime switching.
    dS_t = mu_t * dt + sigma_t * dW_t + J_t * dN_t
    """
    def __init__(self, s0: float = 100.0, mu: float = 0.0, sigma: float = 0.2, dt: float = 0.01):
        self.s0 = s0
        self.current_price = s0
        self.mu = mu
        self.sigma = sigma
        self.dt = dt
        self.history = [s0]
        
    def step(self, regime_factor: float = 1.0, jump_prob: float = 0.02, jump_std: float = 0.05) -> float:
        eff_sigma = self.sigma * regime_factor
        dw = np.random.normal(0, np.sqrt(self.dt))
        
        # Continuous diffusion part
        drift = self.mu * self.dt
        diffusion = eff_sigma * self.current_price * dw
        
        # Jump component (Poisson process dN_t)
        jump = 0.0
        if np.random.random() < jump_prob:
            jump = self.current_price * np.random.normal(0, jump_std)
            
        new_price = max(0.01, self.current_price + drift + diffusion + jump)
        self.current_price = round(new_price, 4)
        self.history.append(self.current_price)
        return self.current_price

class FillProbabilityModel:
    """
    Intensity lambda(delta) = A * exp(-k * delta)
    P(fill in dt) = 1 - exp(-lambda(delta) * dt)
    """
    def __init__(self, A: float = 1.4, k: float = 12.0):
        self.A = A
        self.k = k

    def get_intensity(self, delta: float) -> float:
        return self.A * np.exp(-self.k * max(0.001, delta))

    def get_fill_prob(self, delta: float, dt: float = 1.0) -> float:
        lam = self.get_intensity(delta)
        return 1.0 - np.exp(-lam * dt)

class InventoryEngine:
    """
    Tracks inventory, inventory risk skew:
    delta_bid = delta_0 + alpha * q
    delta_ask = delta_0 - alpha * q
    """
    def __init__(self, max_inventory: int = 10, alpha: float = 0.02):
        self.inventory = 0
        self.max_inventory = max_inventory
        self.alpha = alpha

    def get_quote_skew(self, q: int) -> float:
        return self.alpha * q

    def update_inventory(self, change: int):
        self.inventory = max(-self.max_inventory, min(self.max_inventory, self.inventory + change))

class OptimalStoppingEngine:
    """
    Calculates Value Function V(t, x) and continuation vs stopping boundaries.
    Free boundary decision:
    V_continue > V_stop -> CONTINUE
    Otherwise -> STOP / WIDEN / REPRICE
    """
    def __init__(self, gamma: float = 0.1, transaction_cost: float = 0.01):
        self.gamma = gamma
        self.transaction_cost = transaction_cost

    def evaluate_utility(self, expected_pnl: float, var_pnl: float) -> float:
        return expected_pnl - self.gamma * var_pnl

    def compute_stopping_surface(self, q_range: List[int], vol_range: List[float], spread: float) -> Dict[str, Any]:
        """
        Generates 2D grid for Stopping Boundary and Value Surface.
        """
        grid = []
        boundary = []
        for vol in vol_range:
            vol_boundary_q = None
            for q in q_range:
                # Continuation value model: expected spread capture minus inventory variance penalty
                spread_rev = (spread / 2.0) * (1.0 - 0.05 * abs(q))
                inv_risk = 0.5 * self.gamma * (q ** 2) * (vol ** 2)
                v_continue = spread_rev - inv_risk
                
                # Stop value: liquidation cost
                v_stop = -abs(q) * self.transaction_cost - 0.05 * inv_risk
                
                is_continue = v_continue > v_stop
                grid.append({
                    "inventory": q,
                    "volatility": round(vol, 3),
                    "v_continue": round(v_continue, 4),
                    "v_stop": round(v_stop, 4),
                    "action": "CONTINUE" if is_continue else "STOP",
                    "value": round(max(v_continue, v_stop), 4)
                })

                if not is_continue and vol_boundary_q is None:
                    vol_boundary_q = q

            boundary.append({
                "volatility": round(vol, 3),
                "threshold_inventory": vol_boundary_q if vol_boundary_q is not None else max(q_range)
            })

        return {"grid": grid, "boundary": boundary}

    def decide(self, q: int, vol: float, spread: float, obi: float, adverse_risk: float) -> Dict[str, Any]:
        inv_pct = abs(q) / 10.0
        inv_risk = 0.5 * self.gamma * (q ** 2) * (vol ** 2)
        v_continue = (spread / 2.0) * (1.0 - 0.1 * inv_pct) - inv_risk - 0.2 * adverse_risk
        v_stop = -abs(q) * self.transaction_cost - 0.02 * inv_risk

        if v_continue <= v_stop or inv_pct >= 0.95 or vol > 0.45:
            decision = "STOP"
            reason = f"Inventory utilization ({int(inv_pct*100)}%) or Volatility ({round(vol*100,1)}%) breached risk tolerance threshold."
        elif inv_pct > 0.6 or adverse_risk > 0.15:
            if q > 0:
                decision = "WIDEN ASK"
                reason = "Long inventory risk + adverse buy selection. Widening Ask to discourage buys and capture margin."
            else:
                decision = "WIDEN BID"
                reason = "Short inventory risk + adverse sell selection. Widening Bid to discourage sells."
        elif abs(obi) > 0.35:
            decision = "REPRICE"
            reason = f"Order Book Imbalance ({round(obi, 2)}) signals directional momentum. Repricing quotes ahead of mid-price."
        else:
            decision = "CONTINUE"
            reason = "Market conditions within optimal continuation bounds. Quoting both sides."

        return {
            "decision": decision,
            "reason": reason,
            "v_continue": round(v_continue, 4),
            "v_stop": round(v_stop, 4),
            "confidence": round(min(0.99, max(0.5, 0.7 + 0.3 * (v_continue - v_stop))), 2)
        }
