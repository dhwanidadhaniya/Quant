"""In-memory research store loaded from processed parquet."""
from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

import pandas as pd

from .config import RESEARCH, UNIVERSE
from .data.ingest import build_universe


JSON_COLS = ("data_labels", "signal", "weather", "flags", "fund_notes")


def _parse_json_col(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    if isinstance(v, (dict, list)):
        return v
    if isinstance(v, str):
        try:
            return json.loads(v)
        except json.JSONDecodeError:
            return v
    return v


@lru_cache(maxsize=1)
def load_df() -> pd.DataFrame:
    if not UNIVERSE.exists():
        build_universe(fetch_yahoo=False)
    df = pd.read_parquet(UNIVERSE)
    for c in JSON_COLS:
        if c in df.columns:
            df[c] = df[c].map(_parse_json_col)
    df["listing_date"] = pd.to_datetime(df["listing_date"], errors="coerce")
    return df


@lru_cache(maxsize=1)
def load_research() -> dict[str, Any]:
    if not RESEARCH.exists():
        load_df()
    return json.loads(RESEARCH.read_text())


def ipo_public(row: pd.Series) -> dict[str, Any]:
    d = row.to_dict()
    dt = d.get("listing_date")
    if hasattr(dt, "date"):
        d["listing_date"] = str(dt.date())
    if "listing_dt" in d:
        d.pop("listing_dt", None)
    for k, v in list(d.items()):
        if isinstance(v, float) and pd.isna(v):
            d[k] = None
        elif hasattr(v, "item"):
            try:
                d[k] = v.item()
            except Exception:
                d[k] = v
    return d


def get_ipo(ipo_id: str) -> dict[str, Any] | None:
    df = load_df()
    hit = df[df["id"] == ipo_id.lower()]
    if hit.empty:
        hit = df[df["ticker"].str.lower() == ipo_id.lower()]
    if hit.empty:
        return None
    return ipo_public(hit.iloc[0])
