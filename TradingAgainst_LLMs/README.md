# Trading Against LLM Agents

Controlled market simulation. The research system knows a hidden asset value. Trading agents do not, unless a run is explicitly marked as an oracle control. A transparent rule strategy is chosen on training sessions and scored only on held-out sessions.

This is not a claim about real-world trading profit.

## Run

```text
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --app-dir backend --port 8000

cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The overview button runs a seeded mock experiment. Every number on screen comes back from the API.

Copy `.env.example` to `.env` to point at an OpenAI-compatible API or Ollama. Live model calls stay off unless the provider is changed and `confirm_llm_cost` is set. The default provider is `mock`.

```text
python scripts/run_demo.py
```

## Layout

- `backend/app/engine` — hidden value, private signals, news, order book, validation
- `backend/app/agents` — LLM, random, noise, momentum, and market-maker agents
- `backend/app/strategy` — explainable exploit rules
- `backend/app/research` — anchoring, calibration, herding, news, inventory, prompt checks
- `backend/app/sim` — sessions, train/test freeze, falsification
- `frontend` — research terminal
- `data` — SQLite and parquet exports

The protocol is in `docs/protocol.md`.
