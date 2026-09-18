"""
Tests for the Quant Engine — financial calculation correctness.

These are the most important tests in the entire project.
Getting the financial math wrong invalidates all downstream analysis.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from quant.probability import (
    calculate_implied_probability, calculate_overround,
    calculate_adjusted_probability, calculate_probability_edge,
)
from quant.arbitrage import (
    detect_single_venue_arbitrage, detect_cross_venue_arbitrage,
    classify_opportunity,
)
from quant.expected_value import calculate_expected_value
from quant.kelly import calculate_kelly_fraction, calculate_position_size
from quant.slippage import estimate_slippage
from quant.fees import calculate_trading_fee, calculate_cost_waterfall
from quant.risk import calculate_drawdown, calculate_risk_matrix
from quant.contract_equivalence import calculate_contract_equivalence_score


class TestProbability:
    def test_implied_probability_basic(self):
        assert calculate_implied_probability(0.62) == 0.62
        assert calculate_implied_probability(0.0) == 0.0
        assert calculate_implied_probability(1.0) == 1.0

    def test_implied_probability_invalid(self):
        with pytest.raises(ValueError):
            calculate_implied_probability(1.5)
        with pytest.raises(ValueError):
            calculate_implied_probability(-0.1)

    def test_overround_efficient(self):
        """YES + NO = 1.0 → overround should be 0."""
        result = calculate_overround(0.50, 0.50)
        assert abs(result) < 1e-10

    def test_overround_positive(self):
        """YES + NO > 1.0 → venue charging spread."""
        result = calculate_overround(0.52, 0.51)
        assert result > 0

    def test_overround_negative(self):
        """YES + NO < 1.0 → potential arbitrage."""
        result = calculate_overround(0.47, 0.50)
        assert result < 0

    def test_adjusted_probability_sums_to_one(self):
        result = calculate_adjusted_probability(0.55, 0.48)
        assert abs(result["yes_probability"] + result["no_probability"] - 1.0) < 1e-6

    def test_probability_edge_underpriced(self):
        result = calculate_probability_edge(0.62, 0.68)
        assert result["probability_edge"] > 0
        assert result["edge_direction"] == "underpriced"

    def test_probability_edge_overpriced(self):
        result = calculate_probability_edge(0.62, 0.55)
        assert result["probability_edge"] < 0
        assert result["edge_direction"] == "overpriced"


class TestArbitrage:
    def test_single_venue_yes_plus_no_less_than_1(self):
        """YES=$0.47, NO=$0.50 → $0.97 total → $0.03 edge."""
        result = detect_single_venue_arbitrage(0.47, 0.50)
        assert result["gross_edge_per_contract"] > 0
        assert result["total_cost"] < 1.0

    def test_single_venue_no_arbitrage(self):
        """YES=$0.52, NO=$0.51 → $1.03 total → no edge."""
        result = detect_single_venue_arbitrage(0.52, 0.51)
        assert result["gross_edge_per_contract"] < 0
        assert result["classification"] == "not_arbitrage"

    def test_single_venue_yes_plus_no_exactly_1(self):
        """YES + NO = $1.00 → zero edge."""
        result = detect_single_venue_arbitrage(0.50, 0.50)
        assert abs(result["gross_edge_per_contract"]) < 1e-10

    def test_single_venue_fees_kill_edge(self):
        """Small edge gets eaten by fees."""
        result = detect_single_venue_arbitrage(0.49, 0.50, taker_fee_bps=200)  # 2% fee
        assert result["gross_edge_per_contract"] > 0
        assert result["net_edge_per_contract"] < 0
        assert result["classification"] == "theoretical_arbitrage"

    def test_cross_venue_basic(self):
        """Polymarket=$0.55, Kalshi=$0.62 → 7¢ spread."""
        result = detect_cross_venue_arbitrage(0.55, 0.62)
        assert result["gross_spread"] == 0.07
        assert result["gross_spread_cents"] == 7.0
        assert result["type"] == "cross_venue"

    def test_cross_venue_no_difference(self):
        """Same price → no spread."""
        result = detect_cross_venue_arbitrage(0.55, 0.55)
        assert result["gross_spread"] == 0.0

    def test_classification_pipeline(self):
        assert classify_opportunity(0, 0, 0.95, 10000, 100) == "price_difference"
        assert classify_opportunity(0.05, -0.01, 0.95, 10000, 100) == "theoretical_arbitrage"
        assert classify_opportunity(0.05, 0.02, 0.95, 50, 100) == "practical_arbitrage"
        assert classify_opportunity(0.05, 0.02, 0.95, 10000, 100) == "executable_arbitrage"
        assert classify_opportunity(0.05, 0.02, 0.6, 10000, 100) == "insufficient_info"


class TestExpectedValue:
    def test_positive_ev(self):
        """68% probability at $0.62 → positive EV."""
        result = calculate_expected_value(0.68, 0.62)
        assert result["is_positive_ev"]
        assert result["expected_value"] > 0

    def test_negative_ev(self):
        """40% probability at $0.62 → negative EV."""
        result = calculate_expected_value(0.40, 0.62)
        assert not result["is_positive_ev"]
        assert result["expected_value"] < 0

    def test_break_even(self):
        """Break-even probability should be approximately equal to price."""
        result = calculate_expected_value(0.62, 0.62)
        assert abs(result["expected_value"]) < 0.01
        assert abs(result["break_even_probability"] - 0.62) < 0.01

    def test_fees_reduce_ev(self):
        """Adding fees should reduce EV."""
        ev_no_fees = calculate_expected_value(0.68, 0.62, fees=0.0)
        ev_with_fees = calculate_expected_value(0.68, 0.62, fees=0.02)
        assert ev_with_fees["expected_value"] < ev_no_fees["expected_value"]


class TestKelly:
    def test_positive_edge(self):
        """68% probability at $0.62 → positive Kelly fraction."""
        result = calculate_kelly_fraction(0.68, 0.62)
        assert result["full_kelly"] > 0
        assert abs(result["half_kelly"] - result["full_kelly"] / 2) < 0.001
        assert result["is_positive_edge"]

    def test_negative_edge(self):
        """40% probability at $0.62 → zero Kelly (don't bet)."""
        result = calculate_kelly_fraction(0.40, 0.62)
        assert result["full_kelly"] == 0
        assert not result["is_positive_edge"]

    def test_half_kelly_smaller_than_full(self):
        result = calculate_kelly_fraction(0.68, 0.62)
        assert result["half_kelly"] < result["full_kelly"]

    def test_position_size_within_capital(self):
        result = calculate_position_size(10000, 0.68, 0.62)
        assert result["position_dollars"] <= 10000
        assert result["position_dollars"] >= 0


class TestSlippage:
    def test_zero_trade_no_slippage(self):
        result = estimate_slippage(0, 10000)
        assert result["slippage_cost"] == 0

    def test_larger_trade_more_slippage(self):
        small = estimate_slippage(100, 10000)
        large = estimate_slippage(5000, 10000)
        assert large["slippage_pct"] > small["slippage_pct"]

    def test_no_liquidity_max_slippage(self):
        result = estimate_slippage(1000, 0)
        assert result["slippage_pct"] == 1.0

    def test_sqrt_model_concavity(self):
        """Doubling trade size should NOT double slippage (sqrt model)."""
        slip_1k = estimate_slippage(1000, 50000)
        slip_2k = estimate_slippage(2000, 50000)
        ratio = slip_2k["slippage_pct"] / slip_1k["slippage_pct"]
        assert ratio < 2.0  # Should be ~1.41 (sqrt(2))


class TestFees:
    def test_basic_fee(self):
        result = calculate_trading_fee(1000, 100)  # 1%
        assert result["fee_amount"] == 10.0

    def test_cost_waterfall(self):
        result = calculate_cost_waterfall(10.0, 2.0, 1.0, 1.5, 0.5)
        assert result["net_edge"] == 5.0
        assert result["is_profitable"]

    def test_costs_exceed_edge(self):
        result = calculate_cost_waterfall(5.0, 3.0, 2.0, 2.0, 0)
        assert result["net_edge"] < 0
        assert not result["is_profitable"]


class TestRisk:
    def test_drawdown_basic(self):
        equity = [100, 105, 110, 95, 90, 100, 108]
        result = calculate_drawdown(equity)
        assert result["max_drawdown"] > 0
        assert result["max_drawdown_pct"] > 0

    def test_drawdown_no_decline(self):
        equity = [100, 101, 102, 103]
        result = calculate_drawdown(equity)
        assert result["max_drawdown"] == 0

    def test_risk_matrix(self):
        result = calculate_risk_matrix(25000, 1000, 0.95, 2.5, 120)
        assert result["overall_risk"] in ["low", "medium", "high"]
        assert len(result["risks"]) == 8


class TestContractEquivalence:
    def test_perfect_match(self):
        result = calculate_contract_equivalence_score(True, True, True, True, True)
        assert result["equivalence_score"] == 1.0
        assert result["risk"] == "low"

    def test_no_match(self):
        result = calculate_contract_equivalence_score(False, False, False, False, False)
        assert result["equivalence_score"] < 0.5
        assert result["risk"] in ["high", "critical"]

    def test_partial_match(self):
        result = calculate_contract_equivalence_score(True, True, False, True, True)
        assert 0.5 < result["equivalence_score"] < 1.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
