from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DB_PATH = ROOT / "database" / "research.db"
DATASETS = ROOT / "datasets"
REPORTS = ROOT / "reports"

# Educational dataset disclaimer — always surface this in the UI.
DATA_DISCLAIMER = (
    "Data shown is for educational/research purposes. "
    "Prices, ratios and factor scores are a realistic historical-style sample, "
    "not a live market feed."
)

# Sample window used throughout the lab.
SAMPLE_START = "2020-01-02"
SAMPLE_END = "2025-12-31"
RISK_FREE_ANNUAL = 0.042  # ~US 10Y average over the sample, not a forecast
TRADING_DAYS = 252
