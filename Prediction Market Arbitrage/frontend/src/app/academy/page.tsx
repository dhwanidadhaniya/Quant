'use client';
import { useState } from 'react';

// ============================================================
// FINANCE ACADEMY — Interactive glossary with "teach me like a student" vibe
// ============================================================

const TERMS = [
  { term: "Arbitrage", def: "Simultaneously buying and selling equivalent assets to profit from price differences.", why: "The core concept — prediction markets may price the same event differently.", formula: "Profit = Price_high − Price_low − Costs", example: "Buy YES at $0.55 on Polymarket, sell YES at $0.62 on Kalshi.", mistake: "Treating every price difference as arbitrage without checking contract equivalence." },
  { term: "Implied Probability", def: "The probability of an event implied by the market price of a contract.", why: "Converts prices into probabilities for comparison across venues.", formula: "p ≈ Price", example: "YES price = $0.62 implies 62% probability.", mistake: "Assuming implied probability equals true probability." },
  { term: "Spread", def: "The difference between two prices — either bid/ask or cross-venue.", why: "Represents either the cost of trading (bid-ask) or the potential edge (cross-venue).", formula: "Spread = Ask − Bid (or |P_A − P_B|)", example: "Best bid $0.54, best ask $0.56 → spread = $0.02", mistake: "Confusing bid-ask spread (cost) with cross-venue spread (opportunity)." },
  { term: "Slippage", def: "The difference between expected execution price and actual execution price.", why: "Reduces the edge you can capture, especially for larger trades.", formula: "Slippage ≈ σ × √(OrderSize / Liquidity)", example: "$1,000 order in $25,000 liquidity → ~2% slippage", mistake: "Ignoring slippage when the order is large relative to available liquidity." },
  { term: "Liquidity", def: "The ability to buy or sell without significantly impacting the price.", why: "Determines the maximum trade size and execution quality.", formula: "Measured by order book depth, volume, and bid-ask spread", example: "$50,000 total depth → can comfortably trade ~$5,000", mistake: "Assuming quoted price is available for any trade size." },
  { term: "Kelly Criterion", def: "A formula that determines the optimal fraction of capital to wager.", why: "Prevents over-betting (ruin) and under-betting (missed growth).", formula: "f* = (bp − q) / b", example: "68% edge, price $0.62 → Kelly says bet 15.8% of capital", mistake: "Using full Kelly with uncertain probability estimates." },
  { term: "Expected Value", def: "The average outcome of a decision if repeated many times.", why: "Determines whether a trade is worth taking in the long run.", formula: "EV = p × Reward − (1−p) × Cost", example: "68% chance of winning $0.38, 32% of losing $0.62 → EV = +$0.06", mistake: "Positive EV doesn't mean every trade wins — you need many trades." },
  { term: "Order Book", def: "A list of all buy and sell orders at various prices.", why: "Shows where liquidity exists and at what prices.", formula: "Best Bid / Best Ask / Spread / Depth", example: "Bid: $0.54 (400), Ask: $0.56 (300)", mistake: "Only looking at best bid/ask without checking depth behind them." },
  { term: "Overround", def: "When YES + NO > $1.00, representing the venue's implicit fee.", why: "Positive overround = venue takes a cut; negative = potential arbitrage.", formula: "Overround = (YES + NO) − 1.0", example: "YES=$0.52, NO=$0.51 → Overround = 3%", mistake: "Ignoring overround when comparing probabilities." },
  { term: "Drawdown", def: "The peak-to-trough decline in portfolio value.", why: "Measures the worst-case loss you'd experience.", formula: "DD = (Peak − Trough) / Peak", example: "Portfolio: $10,500 → $9,200 → 12.4% drawdown", mistake: "Focusing only on returns without considering drawdown risk." },
  { term: "Net Edge", def: "The edge remaining after all transaction costs.", why: "This is what actually matters — gross edge is meaningless if costs eat it.", formula: "Net = Gross − Fees − Slippage − Spread", example: "Gross: 7¢, Fees: 2¢, Slip: 1.5¢ → Net: 3.5¢", mistake: "Confusing gross edge with profit." },
  { term: "Market Maker", def: "A participant who provides liquidity by posting buy and sell orders.", why: "Market makers profit from the spread and provide liquidity.", formula: "MM Profit ≈ Spread × Volume − Inventory Risk", example: "Bid $0.54, ask $0.56, earn $0.02 per round trip.", mistake: "Assuming market makers always win — they face adverse selection." },
];

export default function AcademyPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = TERMS.filter(t => t.term.toLowerCase().includes(search.toLowerCase()) || t.def.toLowerCase().includes(search.toLowerCase()));
  const current = TERMS.find(t => t.term === selected);

  return (
    <div className="max-w-5xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-1">Finance Academy</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-6">Interactive glossary — every concept explained with formulas, examples, and common mistakes</p>

      <input type="text" className="input-field mb-6" placeholder="Search terms..." value={search} onChange={e => setSearch(e.target.value)} />

      <div className="grid md:grid-cols-3 gap-6">
        {/* Term list */}
        <div className="space-y-2">
          {filtered.map(t => (
            <button key={t.term} onClick={() => setSelected(t.term)} className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${selected === t.term ? 'border-[var(--cyan)] bg-[var(--cyan-dim)]' : 'border-[var(--border)] hover:border-[var(--border-hover)]'}`}>
              <div className="font-semibold text-[var(--text-primary)]">{t.term}</div>
              <div className="text-xs text-[var(--text-tertiary)] truncate">{t.def}</div>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="md:col-span-2">
          {current ? (
            <div className="glass-card-static p-8">
              <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">{current.term}</h2>
              <p className="text-[var(--text-secondary)] mb-4">{current.def}</p>
              
              <div className="p-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] mb-4">
                <div className="text-[0.6rem] font-bold uppercase tracking-wider text-[var(--cyan)] mb-1">Why This Matters</div>
                <p className="text-sm text-[var(--text-secondary)]">{current.why}</p>
              </div>

              <div className="formula-card mb-4">
                <div className="formula-name">Formula</div>
                <div className="formula-main">{current.formula}</div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.15)]">
                  <div className="text-[0.6rem] font-bold uppercase tracking-wider text-[var(--emerald)] mb-1">Example</div>
                  <p className="text-xs text-[var(--text-secondary)]">{current.example}</p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--amber-dim)] border border-[rgba(245,158,11,0.15)]">
                  <div className="text-[0.6rem] font-bold uppercase tracking-wider text-[var(--amber)] mb-1">Common Mistake</div>
                  <p className="text-xs text-[var(--text-secondary)]">{current.mistake}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card-static p-8 text-center text-[var(--text-tertiary)]">
              <div className="text-4xl mb-3">◎</div>
              <p>Select a term to see its full explanation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
