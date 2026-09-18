'use client';

// ============================================================
// METHODOLOGY — Academic-style documentation
// ============================================================

export default function MethodologyPage() {
  return (
    <div className="max-w-3xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-1">Methodology</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-8">How we detect, classify, and analyze pricing discrepancies</p>

      <div className="space-y-8">
        <section className="glass-card-static p-6">
          <h2 className="text-lg font-bold mb-3">1. Data Collection</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            We track 12 prediction market events across 2 venues (Polymarket, Kalshi). Prices, order books,
            and liquidity metrics are sampled at regular intervals. All data in this version is <strong>simulated</strong> using
            an Ornstein-Uhlenbeck mean-reverting process to produce realistic market microstructure properties.
          </p>
          <div className="formula-card mt-4">
            <div className="formula-name">Price Process</div>
            <div className="formula-main">dp = θ(μ − p)dt + σdW</div>
            <p className="text-xs text-[var(--text-secondary)]">θ = mean reversion speed, μ = true probability, σ = volatility, dW = Wiener increment</p>
          </div>
        </section>

        <section className="glass-card-static p-6">
          <h2 className="text-lg font-bold mb-3">2. Opportunity Detection</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
            Cross-venue arbitrage is detected when the same event is priced differently. We compute the gross spread
            and then apply our full cost model to determine net edge.
          </p>
          <div className="formula-card">
            <div className="formula-name">Cost Model</div>
            <div className="formula-main">Net Edge = Gross Edge − Fees − Slippage − Spread Cost</div>
          </div>
        </section>

        <section className="glass-card-static p-6">
          <h2 className="text-lg font-bold mb-3">3. Classification Pipeline</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
            Every pricing discrepancy passes through a 5-stage classification pipeline:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-[var(--text-secondary)]">
            <li><strong>Price Difference</strong> — Raw price gap detected</li>
            <li><strong>Mispricing</strong> — Contracts verified as equivalent</li>
            <li><strong>Theoretical Arbitrage</strong> — Positive gross edge exists</li>
            <li><strong>Practical Arbitrage</strong> — Positive net edge after costs</li>
            <li><strong>Executable Arbitrage</strong> — Sufficient liquidity for execution</li>
          </ol>
        </section>

        <section className="glass-card-static p-6">
          <h2 className="text-lg font-bold mb-3">4. Transaction Cost Modeling</h2>
          <div className="space-y-3 text-sm text-[var(--text-secondary)]">
            <p><strong>Fees:</strong> Venue-specific taker/maker fees applied per leg.</p>
            <p><strong>Slippage:</strong> Square-root price impact model: <code className="mono bg-[var(--bg-tertiary)] px-1 rounded">σ√(Q/L)</code></p>
            <p><strong>Spread Cost:</strong> Half the bid-ask spread on each leg.</p>
          </div>
        </section>

        <section className="glass-card-static p-6">
          <h2 className="text-lg font-bold mb-3">5. Position Sizing</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            We use the Kelly Criterion (specifically half-Kelly) for position sizing.
            This balances growth optimization with drawdown management.
          </p>
          <div className="formula-card mt-4">
            <div className="formula-name">Kelly Criterion</div>
            <div className="formula-main">f* = (bp − q) / b</div>
          </div>
        </section>

        <section className="glass-card-static p-6">
          <h2 className="text-lg font-bold mb-3">6. Backtesting</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            We run both <strong>theoretical</strong> (perfect execution) and <strong>execution-adjusted</strong> (realistic)
            backtests. The gap between them is itself a research finding — it quantifies execution cost.
          </p>
        </section>
      </div>
    </div>
  );
}
