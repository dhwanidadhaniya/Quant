# OPTIMAL STOPPING MARKET-MAKING ENGINE

> A Finance-First Quantitative Trading & Stochastic Optimization Research Platform

![Optimal Stopping Architecture](https://img.shields.io/badge/Quantitative_Finance-Optimal_Stopping_Theory-pink)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-emerald)
![React](https://img.shields.io/badge/Frontend-React_TypeScript_Vite-blue)

---

## 1. Executive Summary & Central Research Question

Market making is not simply about continuously posting a bid and ask. The market maker must constantly balance expected spread capture against execution probability, inventory risk, adverse selection, volatility, and market impact.

The central research question answered by this platform is:

> **"Given the current market state, inventory, volatility, order-flow conditions, execution probabilities, and expected future P&L, should the market maker continue quoting, modify its quotes, widen the spread, skew the quotes, or stop quoting?"**

---

## 2. Core Quantitative Framework & Mathematical Formulations

### 2.1 Mid-Price Stochastic Dynamics
Price evolution follows Geometric Brownian Motion with stochastic drift, regime-switching volatility, and Poisson jump diffusion:

$$dS_t = \mu_t dt + \sigma_t dW_t + J_t dN_t$$

Where:
- $S_t$: Mid-price
- $\mu_t$: Expected directional drift
- $\sigma_t$: Regime-dependent volatility
- $W_t$: Standard Wiener process
- $J_t dN_t$: Jump intensity process modeling liquidity shocks

### 2.2 Execution Fill Probability Model
Arrival intensity of aggressive market orders follows an exponential decay relative to quote distance $\delta$:

$$\lambda(\delta) = A e^{-k \delta}$$

$$\mathbb{P}(\text{fill in } \Delta t) = 1 - e^{-\lambda(\delta) \Delta t}$$

### 2.3 Inventory-Aware Quote Skew
Optimal bid/ask quotes incorporate an inventory risk skew coefficient $\alpha$:

$$\delta^{\text{bid}} = \delta_0 + \alpha q$$
$$\delta^{\text{ask}} = \delta_0 - \alpha q$$

If the market maker is excessively long ($q > 0$), selling is made more attractive ($\delta^{\text{ask}}$ narrowed) and buying less attractive ($\delta^{\text{bid}}$ widened).

### 2.4 Optimal Stopping Free Boundary & Value Function
Formulated as a Snell Envelope / Stochastic Control problem:

$$V(t, x) = \sup_{\tau} \mathbb{E}[ U(X_\tau) ]$$

Decision Rule:
$$\text{If } V_{\text{continue}}(x, t) > V_{\text{stop}}(x, t) \implies \mathbf{CONTINUE}$$
$$\text{Otherwise} \implies \mathbf{STOP / WIDEN / REPRICE}$$

Where Risk-Sensitive Utility $U(P\&L) = \mathbb{E}[P\&L] - \gamma \text{Var}(P\&L)$.

---

## 3. System Architecture & Module Pipeline

```
Market State
     ↓
Limit Order Book (Microprice & OBI)
     ↓
Stochastic Price Dynamics
     ↓
Fill Probability Model
     ↓
Inventory Risk Skew
     ↓
Optimal Stopping Free Boundary
     ↓
Optimal Quoting Control
     ↓
Quantitative P&L Attribution
```

---

## 4. Setup & Running Instructions

### Backend (Python FastAPI)
```bash
# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Launch FastAPI Server
uvicorn backend.main:app --reload --port 8000
```

### Frontend (React + Vite + TypeScript)
```bash
cd frontend

# Install Node packages
npm install

# Start Vite Development Server
npm run dev
```

---

## 5. Quantitative Verification & Unit Testing

Run unit tests verifying stochastic pricing, fill intensity, inventory skew, and optimal stopping decisions:

```bash
python -m unittest discover -s tests
```
