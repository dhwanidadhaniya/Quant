"""Canonical research notes served to the notebook page."""

NOTEBOOK = {
    "title": "Market as a Queueing System — Research Notebook",
    "source": "SIMULATED",
    "sections": [
        {
            "id": "queueing",
            "title": "Queueing Theory",
            "body": [
                "A queue is a waiting line plus a service mechanism. Kendall's notation A/S/c describes the arrival process, the service-time law, and the number of servers.",
                "M/M/1 is the educational baseline: Poisson arrivals (memoryless), exponential service, one server. Traffic intensity ρ = λ/μ must be < 1 for a proper stationary distribution.",
                "Little's law L = λ W is more general: it does not need Poisson or exponential assumptions, only that long-run averages exist.",
            ],
            "formula": "L = λ W",
            "limitation": "An order book is a network of queues with cancellations, not a single M/M/1 server.",
        },
        {
            "id": "probability",
            "title": "Probability",
            "body": [
                "A Poisson process N(t) ~ Poisson(λ t) counts events in time. Inter-arrivals are Exp(λ).",
                "Survival S(t) = P(T > t) is the probability a resting order is still unfilled at t. The hazard h(t) = f(t)/S(t) is the instantaneous fill intensity given survival so far.",
                "Competing risks: execution versus adverse price move versus cancellation. The first clock to ring decides the order's fate.",
            ],
            "formula": "h(t) = f(t) / S(t)",
            "limitation": "Independence of clocks is assumed. Real cancellations are strategic and correlated with the information that also moves price.",
        },
        {
            "id": "microstructure",
            "title": "Market Microstructure",
            "body": [
                "The limit-order book is the market's visible inventory of trading intentions. Liquidity is supplied by resting limit orders and consumed by marketable orders.",
                "Price is not an exogenous ticker. Price is the best remaining queue after matching. When the touch queue hits zero, the next level becomes the new price.",
                "Queue imbalance QI = (Q_bid − Q_ask)/(Q_bid + Q_ask) is a state of displayed pressure. Whether it forecasts returns is an empirical question, not an identity.",
            ],
            "formula": "QI = (Q_bid − Q_ask) / (Q_bid + Q_ask)",
            "limitation": "Displayed depth ≠ executable liquidity. Hidden orders, latency, and multi-venue routing are omitted.",
        },
        {
            "id": "book",
            "title": "Order Book Mechanics",
            "body": [
                "Price-time priority: better price first; at the same price, earlier timestamp first (FIFO).",
                "A market buy walks the ask from cheapest to dearer until quantity is filled or the book is empty.",
                "Cancellations remove depth without a trade and can starve a queue that looked deep a millisecond earlier.",
            ],
            "formula": "Q_t = Q_{t−Δt} + A_t − D_t − C_t",
            "limitation": "Some markets use pro-rata or size-time hybrids. This laboratory is FIFO.",
        },
        {
            "id": "execution",
            "title": "Execution Theory",
            "body": [
                "A limit order is an option on fill. You choose price and size; the market chooses whether and when you trade.",
                "P(fill | X_t) rises when queue ahead is small, opposite-side market flow is heavy, and the touch is stable.",
                "Patient vs aggressive is a trade-off among spread capture, waiting, adverse selection, and opportunity cost. No policy is universally best.",
            ],
            "formula": "P(fill | X_t) = f(Q_ahead, λ_M, λ_C, spread, σ, t)",
            "limitation": "Closed-form fill curves here are competing-risk approximations, calibrated to the simulator, not to a live tape.",
        },
        {
            "id": "impact",
            "title": "Market Impact",
            "body": [
                "Impact is the price displacement caused by consuming liquidity. Mechanical walk of the book is exact for displayed quantity if nothing else happens.",
                "Square-root impact I ~ σ √(Q/V) is an empirical regularity in some equities, not a theorem.",
                "Impact and queue depletion are the same object viewed from size vs from price.",
            ],
            "formula": "Impact = f(Q, L, σ)",
            "limitation": "Hidden liquidity, child-order scheduling, and other agents' responses are not modeled.",
        },
        {
            "id": "liquidity",
            "title": "Liquidity & Resilience",
            "body": [
                "Resilience is the speed at which depth returns after a shock. T_recovery is the time to reclaim a fraction of pre-shock depth.",
                "A market can look deep and still be fragile if cancellation intensity is high.",
                "Spread is an equilibrium quote. It widens when adverse-selection risk or inventory risk rises, or when the touch queues thin out.",
            ],
            "formula": "Resilience = f(replenishment rate, depth recovery, time)",
            "limitation": "Shock experiments here are synthetic. Real crashes involve inventory constraints and venue fragmentation.",
        },
        {
            "id": "assumptions",
            "title": "Model Assumptions",
            "body": [
                "Foundation: independent Poisson streams for limit, market, and cancel events, with sizes exponential.",
                "Extension: Hawkes self-excitation λ(t) = μ + Σ α e^{−β(t−t_i)}.",
                "Priority: price-time FIFO. Single venue. No hidden orders. No latency. Stationary intensities except during explicit shocks.",
            ],
            "formula": "N(t) ~ Poisson(λ t)",
            "limitation": "Real order flow is clustered, strategic, and cross-correlated across prices, sides, and venues.",
        },
        {
            "id": "simulation",
            "title": "Simulation Methodology",
            "body": [
                "Discrete-event calendar: next event is drawn from competing exponential clocks and processed in timestamp order.",
                "Matching is exact FIFO at each price. Mid, spread, imbalance, and heatmap are measurements on the resulting state.",
                "Monte Carlo for fill time uses a reduced birth-death of Q_ahead, because resimulating the whole book 10^3 times per request would stall the live loop.",
            ],
            "formula": "X_t → X_{t+Δt}  via {limit, market, cancel, execute, price change}",
            "limitation": "Reduced-form MC for Q_ahead ignores new price levels opening in front of you.",
        },
        {
            "id": "limitations",
            "title": "Limitations",
            "body": [
                "Poisson / exponential / independence / Markov assumptions.",
                "Strategic cancellations, order-flow clustering, hidden liquidity, latency, queue-jumping, multiple venues, fragmented markets, non-stationary intensity, self-exciting flow.",
                "All live numbers are SIMULATED. Do not treat them as a market data feed.",
            ],
            "formula": "—",
            "limitation": "Intellectual honesty is part of the product. A prettier formula that does not answer a financial question is omitted.",
        },
    ],
}
