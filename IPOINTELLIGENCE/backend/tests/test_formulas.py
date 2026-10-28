from app.engines.formulas import (
    actual_listing_return,
    directional_accuracy,
    expected_listing_price,
    expected_listing_return,
    gmp_prediction_error,
    mae,
    market_cap,
    pe_ratio,
    rmse,
    terminal_value_gordon,
    wacc,
)


def test_market_cap():
    assert market_cap(500, 60_850_278) == 500 * 60_850_278


def test_pe_rejects_losses():
    assert pe_ratio(100, -2) is None
    assert pe_ratio(100, 0) is None
    assert abs(pe_ratio(100, 5) - 20) < 1e-9


def test_gmp_identity():
    # Happiest Minds-style: issue 166, gmp would be listing_open - issue if GMP matched open
    assert expected_listing_price(166, 184) == 350
    assert abs(expected_listing_return(166, 184) - 184 / 166) < 1e-12
    act = actual_listing_return(350, 166)
    err = gmp_prediction_error(act, expected_listing_return(166, 184))
    assert abs(err) < 1e-12


def test_gmp_error_sign():
    # GMP 10% but listed +30% → positive error (listed hotter than grey market)
    e = gmp_prediction_error(0.30, 0.10)
    assert abs(e - 0.20) < 1e-12


def test_mae_rmse():
    assert abs(mae([0.1, -0.1, 0.2]) - 0.1333333333) < 1e-6
    assert abs(rmse([3, 4]) - 3.53553390593) < 1e-6


def test_directional_accuracy():
    assert directional_accuracy([0.1, -0.2, 0.05], [0.3, -0.01, -0.02]) == 2 / 3


def test_gordon_guard():
    assert terminal_value_gordon(100, 0.04, 0.04) is None
    assert abs(terminal_value_gordon(100, 0.10, 0.04) - 100 / 0.06) < 1e-9


def test_wacc():
    v = wacc(0.14, 0.08, 0.7, 0.3, 0.25)
    assert abs(v - (0.7 * 0.14 + 0.3 * 0.08 * 0.75)) < 1e-12
