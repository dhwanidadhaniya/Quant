# MARKET AS A QUEUEING SYSTEM

A finance-first research terminal that treats a limit-order book as a **dynamic stochastic queueing system**.

This is a laboratory, not a trading product and not a live market-data feed.

**Data policy:** every number the engine emits is tagged `SIMULATED`. Historical and live connectors are schema-ready; they are not implemented. Simulated data is never labeled as a real tape.

---

## Project motivation

A limit order does not execute because it was sent.

It enters a queue. Its fill depends on:

- shares ahead of it (FIFO at a price)
- market-order arrivals on the opposite side
- cancellations of those shares ahead
- whether the touch price survives
- replenishment, volatility, and time

So execution is a functional of a stochastic state

```
X_t = (Q_t^{bid}, Q_t^{ask}, P_t, I_t)
```

and the book itself is how **liquidity → market impact → price formation**.

The two loops the interface is built around:

```
Order arrivals → queue formation → queue position → cancellations
  → market orders → execution → queue depletion → price formation
  → liquidity replenishment → new queue state
```

```
λ, μ → queue state → waiting time → fill probability
  → liquidity → market impact → price dynamics
```

---

## Market microstructure

Each bid and ask **price is a queue**.

| Event | Queueing reading | Market reading |
|---|---|---|
| Limit order | Arrival | Displayed liquidity supplied |
| Marketable order | Service / consumption | Liquidity demanded; may walk the book |
| Cancellation | Reneging | Displayed size was never executable |
| Execution | Departure | A trade; markout starts |
| Touch hits zero | Server removed | **Price changes** — the next tick is the new market |

Price-time priority in this laboratory is strict **FIFO** within a price, better price first. Some real markets are pro-rata or size-time hybrids; that is a stated limitation, not a hidden one.

Displayed depth is not executable liquidity. High cancellation intensity makes a fat queue a rumor.

---

## Queueing theory

**Educational baseline: M/M/1**

- Poisson arrivals, exponential service, one server
- Traffic intensity `ρ = λ / μ`
- Stationary occupancy `P_n = (1−ρ) ρ^n` only if `ρ < 1`
- `L = ρ / (1−ρ)`, `W = 1 / (μ − λ)`

**Do not read `ρ > 1` as “the order book explodes.”** M/M/1 assumptions do not map onto a cancellable multi-level book. Cancels and price moves regulate length. The UI says so next to the gauge.

**Little’s law** `L = λ W` is the identity we take seriously: it is distribution-free whenever the long-run averages exist. More standing size at a given throughput means longer expected wait — including at the touch.

**Birth-death:** `n → n+1` at λ, `n → n−1` at μ. One price’s size is a chain; the book is a **network** of such chains coupled by matching.

---

## Probability theory

- Poisson process `N(t) ~ Poisson(λ t)`: first approximation for arrivals. Independent increments, exponential waits. Real flow clusters.
- Survival `S(t) = P(T_fill > t)`: still unfilled at t.
- Hazard `h(t) = f(t) / S(t)`: instantaneous fill intensity given survival.
- Competing risks: depletion of queue-ahead versus an adverse price jump that strands the order.
- **Hawkes (extension, not foundation):** `λ(t) = μ + Σ α e^{−β(t−t_i)}`. Self-excitation for clustering. Branching ratio `α/β < 1` for linear stability.

---

## Limit order book & queue position

At a price, the line is ordered by timestamp. A marketable order of 3 units fills A, B, C; D waits.

Your state is `(rank, Q_ahead, Q_behind)`. Under FIFO, new limits at **this** price join behind you. You are queue-jumped when someone **improves the price** (a new queue opens in front) or when the touch runs away.

---

## Execution probability and waiting time

Reduced form used in the Execution Lab:

```
P(fill | X_t) = f(Q_ahead, λ_M, λ_C, spread, σ, t)
```

Three estimates of `T_fill` are shown together:

1. Closed-form competing-risk approximation
2. Monte Carlo paths of `Q_ahead` (birth-death / competing clocks)
3. Realized fill of the user’s simulated order, when it happens

They are **supposed** to disagree. The model-check panel exists for that.

No execution strategy is labeled universally best. Market, limit, patient, aggressive, mid-peg are compared on fill, wait, impact, adverse selection, and opportunity cost — all model-implied on simulated state.

The decision engine is a **transparent rule list**, not an opaque scorer.

---

## Market impact and liquidity resilience

Mechanical impact is a walk down (or up) the displayed book:

```
Impact = f(Q, L, σ)
```

When the best queue hits zero, the next price is the market. That is price formation.

Resilience is how fast depth returns:

```
T_recovery = inf{ t : L_{shock+t} ≥ γ L_before }
```

Shocks (flash selling, mass cancel, withdrawal, …) are synthetic intensity jumps. They are not replays of a historical crash.

---

## Mathematical models (what is in the engine)

| Model | Role | Status |
|---|---|---|
| Multi-type Poisson | Foundation of the live book | Used |
| Exponential sizes | Educational size law | Used |
| Price-time FIFO matching | Exact in the simulator | Used |
| M/M/1 closed forms | Teaching contrast | Labeled educational |
| Little’s law | Identity | Used |
| Competing-risk fill curve | Execution lab | Educational |
| Reduced-form MC of Q_ahead | Fill-time distribution | Used |
| Finite Markov liquidity labels | Stochastic lab | Educational |
| Linear Hawkes | Optional live intensity | Off until α > 0 |
| Square-root impact | Comparison, not a theorem | Labeled |

Queue imbalance

```
QI = (Q_bid − Q_ask) / (Q_bid + Q_ask)
```

is measured against subsequent simulated mid returns. The generator **injects** a mild QI→flow coupling so the scatter is visible. That is **not** a claim of live-market alpha. The chart says so.

Liquidity Pressure Index and Queue Congestion Index are **model-defined composites**, not industry standards. Component weights are shown.

---

## Simulation methodology

Discrete-event calendar (priority queue of timestamps):

1. Draw the next limit / market / cancel clock (exponential, optionally Hawkes-modulated)
2. Apply it to the FIFO book
3. If a touch queue hits zero, record depletion and a price change
4. Measure mid, spread, QI, intensities, heatmap slices
5. Broadcast a snapshot over WebSocket at ~12.5 Hz

Monte Carlo for fill time does **not** clone the entire book 10³ times per request. It simulates the reduced process of `Q_ahead` so the live loop does not stall.

---

## Model assumptions

- Single venue
- Price-time FIFO
- No hidden orders
- No latency, no queue-jumping via colocation
- Independent Poisson streams unless Hawkes α is raised
- Locally stationary intensities except during explicit shocks
- Three simulated assets (`ASSET-A/B/C`) with different mid, tick, and intensity

---

## “Backtesting”

There is no historical backtest in v1. All paths are simulated. A reconstruction module rebuilds queues from the same event schema a future L2 loader would emit (`SIMULATED` | `HISTORICAL` | `LIVE`).

---

## Results you should see when you run it

- A living bid/ask ladder whose bars move with the event engine
- Four intensities (limit, market, cancel, execute) as flowing rates
- Fill-probability term structure that reacts to queue ahead and λ_M
- Little’s-law triangle that solves any two of `{L, λ, W}`
- M/M/1 vs live book, with the ρ>1 caveat next to the congestion gauge
- Shock experiments that deplete a touch and, sometimes, move mid
- Model-check: theoretical M/M/1 `L` versus Monte Carlo path mean

---

## Limitations (intellectual honesty)

Poisson, exponential service, independence, Markov memorylessness; strategic cancellations; order-flow clustering; hidden liquidity; latency; queue-jumping; multiple venues; fragmented markets; non-stationary intensity; self-exciting flow; pro-rata matching; inventory and capital constraints.

If a formula does not answer a financial question, it is not on the screen.

---

## Future extensions

- Historical L2 loader into the same event schema (`source=HISTORICAL`)
- Live connector (`source=LIVE`) with the same UI chrome
- Estimated Hawkes on a real tape
- Multi-venue queue network
- Hidden-order layer
- Proper high-frequency markout studies on public datasets (LOBSTER, etc.)

---

## Architecture

```
backend/   Python · FastAPI · NumPy/SciPy
  event queue → order book → matching → analytics → REST + WebSocket

frontend/  React · TypeScript · Vite · Tailwind · Zustand
  11 research pages · explain mode · formula explorer
```

### API (selected)

`GET /market/state` `/orderbook` `/queue/state` `/queue/position` `/orderflow` `/liquidity` `/probabilities` `/risk` `/market-impact` `/metrics` `/regime` `/history`

`POST /simulate` `/scenario` `/shock` `/monte-carlo` `/queue-analysis` `/order` `/params`

WebSocket: `/ws/market` (also aliased as `/ws/orderbook`, `/ws/queue`, `/ws/trades`, `/ws/orderflow`)

---

## Run locally

Requires Python 3.11+ and Node 18+.

```bash
# engine
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000

# terminal UI  (second shell)
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Vite proxies `/api` and `/ws` to port 8000.

### Tests

```bash
cd backend
python -m pytest -q
```

Coverage includes FIFO priority, matching, queue position, cancellations, M/M/1 and Little identities, fill survival monotonicity, book walk, Monte Carlo, Hawkes branching, reconstruction, and the live simulator’s `SIMULATED` tag.

---

## Pages

| # | Page | Question it answers |
|---|---|---|
| 01 | Market overview | What is the queue state right now? |
| 02 | Order book | Where am I in FIFO, and how does matching walk? |
| 03 | Queue lab | What do λ, μ, ρ, L, W mean — and where M/M/1 stops being the book? |
| 04 | Probability lab | What are S(t), F(t), h(t)? |
| 05 | Execution lab | P(fill), E[T], why it changed, strategy comparison |
| 06 | Liquidity lab | Depth, depletion cascade, impact, resilience, heatmaps |
| 07 | Order flow | Four intensities, timeline, Hawkes extension |
| 08 | Stochastic lab | Markov π, Monte Carlo futures, reconstruction |
| 09 | Regimes | QI, markout, imbalance vs return (measured, not claimed) |
| 10 | Scenario lab | Shocks and directed experiments |
| 11 | Notebook | Assumptions, limitations, local observations |

Explain mode is on by default: **What / Why / Theory / Interpretation / Trading implication / Limitation** on major visuals. Formula explorer (right drawer) is the same content, indexed.

---

## License / use

Research and education. Not investment advice. Not a market-data product.
