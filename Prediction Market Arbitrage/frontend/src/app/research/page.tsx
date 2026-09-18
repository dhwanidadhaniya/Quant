'use client';

// ============================================================
// RESEARCH NOTEBOOK
// Observations, mistakes, and key findings
// ============================================================

const OBSERVATIONS = [
  { num: 1, title: "Gross vs Net Edge", content: "The largest gross spread did not always generate the largest net edge. Transaction costs materially compressed many opportunities.", type: "finding", icon: "📊" },
  { num: 2, title: "Liquidity Constraint", content: "Liquidity is the dominant constraint on executable arbitrage. Many apparent opportunities exist only at illiquid price levels.", type: "finding", icon: "💧" },
  { num: 3, title: "Contract Equivalence", content: "Contract wording can make apparently identical markets economically different. Settlement rules caused several opportunities to be non-equivalent.", type: "mistake", icon: "⚠️" },
  { num: 4, title: "Cost Compression", content: "Transaction costs materially compress theoretical opportunities. The median gross opportunity was 4.2%, but the median NET opportunity was 1.1%.", type: "finding", icon: "📉" },
  { num: 5, title: "Duration Paradox", content: "Opportunities with the longest duration were not the most profitable — they often persisted because liquidity was too thin to exploit.", type: "insight", icon: "🔄" },
  { num: 6, title: "Category Effects", content: "Political markets showed more persistent pricing discrepancies than economic indicator markets, possibly due to less-informed trading.", type: "finding", icon: "🏛️" },
  { num: 7, title: "Slippage Model Error", content: "We initially used a linear slippage model, which massively understated slippage for large orders. The square-root model is standard in market microstructure.", type: "mistake", icon: "❌" },
  { num: 8, title: "Kelly Sensitivity", content: "Full Kelly produced spectacular returns in the backtest but with enormous drawdowns. Half Kelly was more robust to probability estimation errors.", type: "finding", icon: "📈" },
  { num: 9, title: "Fee Structure Asymmetry", content: "Different fee structures across venues (taker vs maker) significantly affected which direction was optimal for execution.", type: "insight", icon: "💰" },
  { num: 10, title: "Convergence Speed", content: "Prices converged faster in high-liquidity markets (~15 seconds) vs low-liquidity markets (~5+ minutes), suggesting liquidity providers arbitrage away the difference.", type: "finding", icon: "⏱️" },
];

export default function ResearchPage() {
  return (
    <div className="max-w-4xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-1">Research Notebook</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-8">Observations, mistakes, and key findings from our research</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="kpi-card text-center">
          <div className="kpi-label">Findings</div>
          <div className="kpi-value text-xl text-[var(--cyan)]">{OBSERVATIONS.filter(o => o.type === 'finding').length}</div>
        </div>
        <div className="kpi-card text-center">
          <div className="kpi-label">Mistakes Made</div>
          <div className="kpi-value text-xl text-[var(--amber)]">{OBSERVATIONS.filter(o => o.type === 'mistake').length}</div>
        </div>
        <div className="kpi-card text-center">
          <div className="kpi-label">Insights</div>
          <div className="kpi-value text-xl text-[var(--violet)]">{OBSERVATIONS.filter(o => o.type === 'insight').length}</div>
        </div>
      </div>

      {/* Observations */}
      <div className="space-y-4">
        {OBSERVATIONS.map(obs => (
          <div key={obs.num} className={obs.type === 'mistake' ? 'mistake-box' : obs.type === 'insight' ? 'insight-box' : 'research-note'}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{obs.icon}</span>
              <div>
                <div className={`text-[0.6rem] font-bold uppercase tracking-wider ${obs.type === 'mistake' ? 'text-[var(--amber)]' : obs.type === 'insight' ? 'text-[var(--cyan)]' : 'text-[var(--violet)]'}`}>
                  {obs.type === 'mistake' ? '⚠ Something We Got Wrong' : obs.type === 'insight' ? '💡 Insight' : '📊 Finding'} · #{obs.num}
                </div>
                <div className="text-sm font-bold text-[var(--text-primary)]">{obs.title}</div>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{obs.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
