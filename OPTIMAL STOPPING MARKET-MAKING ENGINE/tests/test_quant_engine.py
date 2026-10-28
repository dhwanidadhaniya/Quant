import unittest
import numpy as np
from backend.quant_engine import StochasticEngine, FillProbabilityModel, InventoryEngine, OptimalStoppingEngine

class TestQuantEngine(unittest.TestCase):
    def test_stochastic_engine(self):
        engine = StochasticEngine(s0=100.0, mu=0.0, sigma=0.2, dt=0.01)
        p1 = engine.step()
        self.assertGreater(p1, 0)
        self.assertEqual(len(engine.history), 2)

    def test_fill_probability(self):
        model = FillProbabilityModel(A=1.5, k=10.0)
        p_close = model.get_fill_prob(0.01)
        p_far = model.get_fill_prob(0.10)
        self.assertGreater(p_close, p_far)

    def test_inventory_engine(self):
        inv = InventoryEngine(max_inventory=10, alpha=0.02)
        inv.update_inventory(5)
        self.assertEqual(inv.inventory, 5)
        self.assertEqual(inv.get_quote_skew(5), 0.1)

    def test_optimal_stopping(self):
        opt = OptimalStoppingEngine(gamma=0.1, transaction_cost=0.01)
        res = opt.decide(q=0, vol=0.15, spread=0.08, obi=0.0, adverse_risk=0.05)
        self.assertIn(res["decision"], ["CONTINUE", "STOP", "WIDEN ASK", "WIDEN BID", "REPRICE"])

if __name__ == "__main__":
    unittest.main()
