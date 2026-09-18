# PREDICTION MARKET ARBITRAGE & MARKET MICROSTRUCTURE TERMINAL

> *"Same Event. Different Prices. Find the Edge."*

A **quantitative finance research platform** that studies price discrepancies, arbitrage, liquidity, and market efficiency across prediction market venues.

## 🎯 What This Is

This is a **finance-first** research project (75% finance / 25% technology) that:

- **Detects** cross-venue pricing discrepancies in prediction markets
- **Classifies** them through a rigorous 5-stage pipeline (Price Difference → Mispricing → Theoretical → Practical → Executable Arbitrage)
- **Analyzes** transaction costs, slippage, liquidity constraints, and execution risk
- **Studies** market efficiency and microstructure properties

### Core Research Question

> "Do prediction markets temporarily disagree on the probability of the same real-world event, and can those price differences represent economically meaningful and executable arbitrage opportunities after accounting for contract equivalence, liquidity, transaction costs, slippage, execution risk and settlement risk?"

## 🏗️ Architecture

```
├── backend/                # Python + FastAPI
│   ├── quant/              # 12 financial calculation modules
│   │   ├── probability.py  # Implied probability, overround
│   │   ├── arbitrage.py    # Single & cross-venue detection
│   │   ├── spread.py       # Spread analysis
│   │   ├── slippage.py     # Square-root price impact model
│   │   ├── fees.py         # Transaction cost waterfall
│   │   ├── liquidity.py    # Liquidity metrics
│   │   ├── execution.py    # Latency-adjusted simulation
│   │   ├── expected_value.py # EV calculations
│   │   ├── kelly.py        # Kelly criterion sizing
│   │   ├── risk.py         # 8-dimension risk matrix
│   │   ├── backtest.py     # Historical simulation engine
│   │   ├── portfolio.py    # P&L analytics
│   │   ├── efficiency.py   # Market efficiency analysis
│   │   └── contract_equivalence.py # 5-dimension scoring
│   ├── api/                # REST API endpoints
│   ├── data/adapters/      # Simulated data generator (OU process)
│   ├── models/             # Database ORM models
│   └── tests/              # Financial calculation tests
│
├── frontend/               # Next.js + TypeScript + Recharts
│   └── src/app/            # 21+ interactive pages
│       ├── dashboard/      # Finance dashboard with KPIs
│       ├── scanner/        # Market scanner with filters
│       ├── heatmap/        # Opportunity heatmap
│       ├── arbitrage-lab/  # Single & cross-venue lab
│       ├── what-if/        # Interactive trade sandbox
│       ├── backtest/       # Historical backtesting
│       ├── orderbook/      # Order book visualization
│       ├── execution/      # Execution simulator
│       ├── pnl/            # P&L analytics
│       ├── risk/           # 8-dimension risk matrix
│       ├── efficiency/     # Market efficiency analysis
│       ├── research/       # Research notebook
│       ├── academy/        # Interactive glossary
│       ├── formulas/       # Formula library
│       ├── quiz/           # Finance quiz + Market Detective
│       ├── achievements/   # Gamification / XP system
│       └── presentation/   # Slide-by-slide presentation
```

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
# → API runs at http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# → UI runs at http://localhost:3000
```

## 📊 Key Financial Concepts Studied

| Concept | Module | What We Analyze |
|---------|--------|-----------------|
| Implied Probability | `probability.py` | How contract prices map to probabilities |
| Overround | `probability.py` | The venue's implicit fee in price sums |
| Cross-Venue Arbitrage | `arbitrage.py` | 5-stage classification pipeline |
| Slippage | `slippage.py` | Square-root price impact model |
| Transaction Costs | `fees.py` | Waterfall decomposition |
| Kelly Criterion | `kelly.py` | Optimal position sizing |
| Expected Value | `expected_value.py` | EV sensitivity analysis |
| Market Efficiency | `efficiency.py` | Category-level efficiency scoring |
| Contract Equivalence | `contract_equivalence.py` | 5-dimension weighted scoring |
| Risk Matrix | `risk.py` | 8-dimension risk assessment |

## 🔑 Key Findings

1. **Transaction costs compress most theoretical opportunities** — median gross edge of 4.2¢ becomes 1.1¢ net
2. **Liquidity is the dominant execution constraint** — not price
3. **Contract equivalence matters** — different settlement sources make "same event" contracts non-equivalent
4. **Political markets are less efficient** than economic indicator markets
5. **Half Kelly outperforms Full Kelly** on a risk-adjusted basis

## ⚠️ Disclaimers

- All data is **simulated** using Ornstein-Uhlenbeck mean-reverting processes
- This is a **student research project**, not financial advice
- No actual trades are executed
- Past simulated performance does not predict future results

## 📝 Academic Personality

This project is intentionally designed with a student/researcher voice:
- "Something we initially got wrong..."
- "Our working hypothesis..."
- "What we learned from this mistake..."
- Every formula is explained with examples AND common mistakes

---

*Built as a quantitative finance research project · "The finance is the star. The technology is the engine. The dashboard is the story."*
