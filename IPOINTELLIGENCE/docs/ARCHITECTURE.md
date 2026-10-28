# Architecture

```
frontend/          Vite React terminal (port 5173, proxies /api)
backend/
  app/main.py      FastAPI
  app/store.py     parquet + research.json
  app/data/ingest.py
  app/engines/     formulas, gmp, dcf, models, backtest, ...
  tests/
  data/raw/        Ghosh + Investorgain xlsx
  data/processed/  universe.parquet, research.json
docs/
```

Ingest is offline. The API is read-only research. No broker, no orders, no live websocket pretending to be NSE.
