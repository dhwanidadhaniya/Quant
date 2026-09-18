'use client';

// ============================================================
// LIMITATIONS — Academic honesty page
// ============================================================

export default function LimitationsPage() {
  const LIMITATIONS = [
    { title: "Simulated Data", severity: "high", content: "All market data is generated using an Ornstein-Uhlenbeck simulation. While the process produces realistic mean-reverting price dynamics, it cannot capture all real-world phenomena (news shocks, coordinated liquidations, etc.)." },
    { title: "Look-Ahead Bias", severity: "medium", content: "Our opportunity detection uses data at each timestamp that assumes immediate price observation. In practice, there would be latency in receiving and processing cross-venue data." },
    { title: "Survivorship Bias", severity: "medium", content: "We only analyze opportunities that were detected. Opportunities that existed briefly and vanished before detection are not included." },
    { title: "Linear Cost Model", severity: "medium", content: "While we use a square-root slippage model, our fee model assumes constant rates. Real-world fees can vary by tier, volume, and time." },
    { title: "Two-Venue Limitation", severity: "low", content: "We only compare two venues (Polymarket, Kalshi). Real-world arbitrage may involve more venues and more complex multi-leg strategies." },
    { title: "No Live Execution", severity: "high", content: "This is a research platform. No actual trades are executed. Real-world results would differ due to factors we cannot fully model." },
    { title: "Contract Equivalence Assumptions", severity: "medium", content: "Our equivalence scoring uses a weighted 5-dimension model. The weights are based on our judgment and may not perfectly capture all contractual differences." },
    { title: "Static Market Microstructure", severity: "low", content: "Our order book simulation generates a snapshot. Real order books change continuously, and the book state when you submit an order may differ from what you observed." },
  ];

  const sevColor = (s: string) => s === 'high' ? 'var(--rose)' : s === 'medium' ? 'var(--amber)' : 'var(--text-tertiary)';

  return (
    <div className="max-w-3xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-1">Limitations & Disclaimers</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-2">&ldquo;Intellectual honesty is more valuable than impressive claims.&rdquo;</p>
      <p className="text-xs text-[var(--text-muted)] mb-8">Every model has limitations. Acknowledging them strengthens our analysis.</p>

      <div className="space-y-4">
        {LIMITATIONS.map((lim, i) => (
          <div key={i} className="glass-card-static p-6" style={{ borderLeft: `3px solid ${sevColor(lim.severity)}` }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-bold text-[var(--text-primary)]">{lim.title}</span>
              <span className="badge text-[0.55rem]" style={{ color: sevColor(lim.severity), background: `${sevColor(lim.severity)}15`, border: `1px solid ${sevColor(lim.severity)}30` }}>
                {lim.severity.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{lim.content}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border)] text-center">
        <div className="text-[0.6rem] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Disclaimer</div>
        <p className="text-sm text-[var(--text-secondary)]">
          This is a student research project. It is not financial advice. All data is simulated.
          No actual trading is performed. Past simulated performance does not predict future results.
        </p>
      </div>
    </div>
  );
}
