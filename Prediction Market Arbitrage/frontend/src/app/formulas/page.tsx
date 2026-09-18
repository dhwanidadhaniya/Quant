'use client';

// ============================================================
// FORMULA LIBRARY — Every formula explained with examples
// ============================================================

const FORMULAS = [
  { name: "Implied Probability", formula: "p ≈ Price", explanation: "In prediction markets, the contract price approximates the market's implied probability.", example: "Price = $0.62 → Implied probability = 62%", mistake: "Treating price as exact probability. Prices include risk premia and liquidity effects." },
  { name: "Single-Venue Edge", formula: "Edge = 1 − (YES + NO)", explanation: "In binary markets, YES + NO should equal $1. Any discount represents theoretical edge.", example: "YES=$0.47, NO=$0.50 → Edge = 1 − 0.97 = $0.03", mistake: "Forgetting to subtract fees on BOTH legs." },
  { name: "Cross-Venue Spread", formula: "Spread = |P_A − P_B|", explanation: "The absolute price difference between two venues on the same event.", example: "Polymarket=$0.55, Kalshi=$0.62 → Spread = $0.07", mistake: "Assuming spread = profit. Spread is GROSS — costs must be subtracted." },
  { name: "Percentage Divergence", formula: "Div% = (P_high − P_low) / P_low × 100", explanation: "Normalizes the spread relative to the lower price for comparability.", example: "$0.62 vs $0.55 → (0.07/0.55)×100 = 12.7%", mistake: "Comparing absolute spreads across markets at different price levels." },
  { name: "Expected Value", formula: "EV = p × R − (1−p) × C", explanation: "The average outcome if you could repeat the trade infinitely.", example: "p=0.68, R=$0.38, C=$0.62 → EV = 0.68×0.38 − 0.32×0.62 = +$0.06", mistake: "Using the market's probability instead of YOUR probability." },
  { name: "Kelly Criterion", formula: "f* = (bp − q) / b", explanation: "The fraction of capital that maximizes long-run geometric growth.", example: "p=0.68, price=$0.62, b=0.613 → f*=15.8%", mistake: "Using full Kelly with uncertain probabilities. Use half or quarter Kelly." },
  { name: "Slippage (Square-Root)", formula: "Slippage ≈ σ × √(Q / Liquidity)", explanation: "Price impact follows a square-root model, not linear. Standard in market microstructure.", example: "$1K order into $25K liquidity → ~2% slippage", mistake: "Using linear slippage model — significantly understates large order impact." },
  { name: "Maximum Drawdown", formula: "MDD = (Peak − Trough) / Peak", explanation: "The largest peak-to-trough decline in portfolio value.", example: "Peak=$10,500, Trough=$9,200 → MDD=12.4%", mistake: "Ignoring drawdown entirely. A 50% drawdown requires 100% gain to recover." },
  { name: "Overround", formula: "Overround = (YES + NO) − 1.0", explanation: "When YES + NO > $1.00, the venue is charging an implicit spread.", example: "YES=$0.52, NO=$0.51 → Overround = 3%", mistake: "Ignoring overround when comparing probabilities across venues." },
  { name: "Net Edge", formula: "Net = Gross − Fees − Slip − Spread", explanation: "The edge remaining after ALL transaction costs. This is what you actually keep.", example: "Gross: 7¢, Fees: 2¢, Slip: 1.5¢ → Net: 3.5¢", mistake: "Confusing gross edge with profit." },
  { name: "Return on Investment", formula: "ROI = Profit / Capital × 100%", explanation: "How much you earned relative to what you invested.", example: "Profit=$47, Capital=$1000 → ROI=4.7%", mistake: "Comparing ROI without adjusting for holding period." },
  { name: "Probability Edge", formula: "Edge = P_you − P_breakeven", explanation: "The difference between your probability estimate and the break-even probability.", example: "Your estimate: 70%, Break-even: 65% → Edge: 5pp", mistake: "Overconfidence in your probability estimate." },
];

export default function FormulasPage() {
  return (
    <div className="max-w-4xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-1">Formula Library</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-8">Every formula used in our analysis — explained with examples and common mistakes</p>

      <div className="space-y-6">
        {FORMULAS.map((f, i) => (
          <div key={i} className="formula-card">
            <div className="formula-name">{f.name}</div>
            <div className="formula-main">{f.formula}</div>
            <p className="text-sm text-[var(--text-secondary)] mb-3">{f.explanation}</p>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded bg-[var(--bg-primary)] border border-[var(--border)]">
                <div className="text-[0.6rem] text-[var(--emerald)] font-bold uppercase tracking-wider mb-1">Example</div>
                <div className="text-xs text-[var(--text-secondary)]">{f.example}</div>
              </div>
              <div className="p-3 rounded bg-[var(--amber-dim)] border border-[rgba(245,158,11,0.15)]">
                <div className="text-[0.6rem] text-[var(--amber)] font-bold uppercase tracking-wider mb-1">Common Mistake</div>
                <div className="text-xs text-[var(--text-secondary)]">{f.mistake}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
