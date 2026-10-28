# Backtesting

See `backend/app/engines/backtest.py` and `docs/KNOWN_LIMITATIONS.md`.

Presets A–D are declared in code before the UI runs them. Look-ahead fields raise `rejected`. Fill = `listing_open` (executable) or `allotment` (optimistic). Horizon returns missing if Yahoo was not cached. Event-time wealth is not a calendar CAGR.
