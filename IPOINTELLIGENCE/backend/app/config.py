from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # backend/
DATA_RAW = ROOT / "data" / "raw"
DATA_PROC = ROOT / "data" / "processed"
MAINLINE = DATA_RAW / "ipo_mainline_final_data_v18.xlsx"
GMP_XLSX = DATA_RAW / "GMP_Mainline_2019_2024YTD_Investorgrain_CLEAN.xlsx"
UNIVERSE = DATA_PROC / "universe.parquet"
RESEARCH = DATA_PROC / "research.json"
YF_CACHE = DATA_PROC / "yf_cache.parquet"
