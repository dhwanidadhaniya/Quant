# IPO Alpha Intelligence

Quantitative IPO valuation, grey-market signal and post-listing research terminal for **Indian mainboard IPOs**.

This is a finance-first research instrument. It is **not** a live brokerage, **not** an AI chatbot, and **not** a generic KPI dashboard.

## Core questions

1. How far do IPO structure, valuation, investor demand, grey-market premia, sector and market tape go in explaining listing outcomes and subsequent abnormal returns?
2. When does Grey Market Premium (GMP) contain information, and when is it a noisy or internally inconsistent signal?

## What is in the box

| Layer | Stack |
|---|---|
| Research engines | Python: valuation, DCF lab, GMP error, subscription microstructure, OLS/HC3, event study, analogues, backtest |
| API | FastAPI |
| Terminal UI | React + TypeScript + Vite + ECharts |
| Dataset | 418 NSE mainboard IPOs (2009–2023 extract) · 164 with sourced last-GMP |

Every number is tagged **ACTUAL**, **CALCULATED**, **ESTIMATED** or **MODEL OUTPUT**. Missing data is shown as unavailable — it is never invented.

## Quick start

```bash
# backend
cd backend
pip install -r requirements.txt
python -m app.data.ingest --no-yahoo   # already run if parquet exists
uvicorn app.main:app --reload --port 8000

# frontend
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The UI proxies `/api` to port 8000.

Optional post-listing prices (30D / 90D / 1Y):

```bash
cd backend
python -m app.data.ingest    # Yahoo Finance; rate-limits are common
```

## Flagship workspaces

- **PULSE** — IPO market map (valuation premium × demand × issue size × GMP)
- **GMP VS REALITY** — last GMP vs listing open, error distribution
- **WHEN GMP WORKS** — segmented MAE / ρ / directional accuracy
- **CONSTELLATION** — historical IPO universe
- **QUANT LAB** — OLS with robust errors, chronological ML
- **BACKTEST LAB** — pre-listing rules only; look-ahead fields are rejected
- **IPO TERMINAL** — full-name drill-down (valuation, DCF scenarios, GMP reliability, analogues)

Press `/` for the command bar (`compare GMP reliability for tech IPOs`, `gmp > 20 and qib > 10`).

## Data provenance

See `docs/DATA_SOURCES.md`. Primary extract: Ghosh et al. (2024), Hugging Face `sohomghosh/Indian_IPO_datasets` (CC-BY-NC-SA-4.0). GMP file: Investorgain clean extract bundled in that dataset. Listing prints: NSE open/high/close in the same extract.

## Non-negotiable caveats

- GMP is unofficial and **not** a SEBI-regulated price.
- Last GMP is a **short-horizon** print, not a T-10 path (that path is not in the extract).
- Signal-quality labels identify **inconsistent observables**. They do **not** prove manipulation.
- P/E is published only when post-issue shares can be estimated from promoter pre/post stakes. Offer size is not market cap.
- DCF converts PAT to FCF with stated reinvestment — **model output**, not an appraisal.
- Backtests are **event-time**, not calendar-time portfolios. Allotment fill is optimistic.

## Tests

```bash
cd backend
pytest -q
```

## License / use

Research and education. Dataset license is **CC-BY-NC-SA-4.0** (non-commercial share-alike) for the Ghosh extract. Do not present this UI as live market data.
