# Equity Factor & Alpha Research Platform

A student-built equity research laboratory. The point is not a live trading terminal. The point is to **see** what a factor is, score a universe transparently, build a book, and ask whether the leftover still looks like alpha after risk, costs and regime.

Data shown is for educational/research purposes. Prices, ratios and factor scores are a realistic historical-style sample, not a live market feed.

## What this is

Undergraduate finance capstone / research lab covering:

- Factor investing (Value, Momentum, Quality, Size, Growth, Low Volatility)
- Transparent multi-factor ranking (“Alpha Score”) — **not** a return forecast
- Portfolio construction (equal / cap / factor weights)
- Backtests versus S&P 500, Nifty 50 and NASDAQ, plus equal-weight and cap-weight books
- Risk identities: Sharpe, Sortino, Treynor, IR, VaR, CVaR, max drawdown
- Regime maps (bull / bear / high-vol / recovery / sideways)
- A notebook and a printable research report

Visual identity: **Market Glass** — ivory research workspace that darkens only where charts need contrast (backtest / risk). Not a white SaaS dashboard, not a Bloomberg cosplay.

## Financial concepts (short)

A **factor** is a shared characteristic that has historically lined up with differences in return. Cheapness is a factor. Recent relative strength is a factor. Profitability is a factor. Owning “the market” is also a factor (beta).

**Alpha**, in the regression sense, is leftover after you have paid for the risks you took:

```
α = Rp − [Rf + β(Rm − Rf)]
```

The 0–100 **Alpha Score** in this lab is different: it is a weighted percentile of six characteristics. High score = high *exposure* to the mix you chose. It is not a predicted return, and it is not Jensen alpha. The UI says so on purpose.

## Features

- Research canvas with NIFTY, S&P, NASDAQ, India VIX, USD/INR, 10Y
- Alpha landscape (risk × return × cap × score)
- Stock explorer and company research notes
- Factor lab + constellation map
- Weight sliders that re-rank the book immediately
- Portfolio builder with live factor/sector mix
- Backtest studio with a year-drag timeline
- Regime heatmap
- Theory library written like a study group
- Report generator (markdown + CSV + print-to-PDF)

## Architecture

```
backend/     FastAPI + SQLAlchemy + SQLite + Pandas/NumPy
frontend/    React + TypeScript + Vite + Tailwind + Recharts
database/    research.db (created on first API boot)
datasets/    universe.csv snapshot after seed
docs/        academic write-up
reports/     generated research notes
```

Returns in the sample are generated from a small multi-factor model so Value/Momentum/Quality actually *move* the backtest — the way a lab dataset should — and then labelled as sample.

## Install

Python 3.11+ and Node 18+ assumed.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

```powershell
cd frontend
npm install
```

## Run

Terminal 1 — API (seeds SQLite on first launch; takes a minute):

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```

Terminal 2 — UI:

```powershell
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api` to port 8000.

Re-seed from scratch:

```powershell
cd backend
python -c "from app.seed import seed; seed(force=True)"
```

## Methodology (honest version)

1. 75-name mixed US + India universe (recognisable large names, not a CRSP tape).
2. Daily prices 2020–2025 from a factor model with baked-in 2020 crash, 2022 bear, 2023–24 recovery.
3. Cross-sectional 0–100 ranks for six factors as of sample end.
4. Default Alpha Score = 25% Value + 20% Momentum + 20% Quality + 15% Growth + 10% Size + 10% Low Vol.
5. Long-only top-N sleeves, equal-weighted, rebalanced monthly/quarterly/annual with a flat cost assumption.

**Look-ahead:** holdings in the backtest are ranked on full-sample scores. That is a bias. The UI prints it. Do not treat the path as a live track record.

## Assumptions

- Rf = 4.2% (sample-period stand-in, not a forecast)
- 252 trading days
- No separate dividend modelling (price path ≈ total return)
- Flat transaction cost (default 10 bps of turnover)
- One currency book mixing US and India — a student-lab shortcut

## Limitations (read these)

- Backtest ≠ future performance
- Factor premia crowd and fade
- Survivorship is baked into a fixed 75-name list
- Look-ahead bias in scores
- Data quality is synthetic-realistic, not vendor-grade
- Regime labels are judgement, not a hidden Markov oracle
- No claim of guaranteed alpha, and no “AI predicts the market”

## Future work

Point-in-time scores, live vendor feed, proper total-return indices, India/US books split, transaction-cost functions that scale with size, and an actual Fama–French regression attribution.

Built as a finance-first student lab. The sophistication should come from the questions, not from glowing cards.
