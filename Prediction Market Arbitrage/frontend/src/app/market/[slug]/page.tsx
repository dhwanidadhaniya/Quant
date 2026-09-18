'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';

// ============================================================
// MARKET DETAIL — Single event deep-dive
// ============================================================

const PRICE_DATA = Array.from({ length: 80 }, (_, i) => {
  const base = 0.58 + Math.sin(i / 12) * 0.04;
  return {
    time: `${Math.floor(i * 0.5)}h`,
    polymarket: +(base - 0.03 + (Math.random() - 0.5) * 0.015).toFixed(3),
    kalshi: +(base + 0.03 + (Math.random() - 0.5) * 0.015).toFixed(3),
  };
}).map(d => ({ ...d, spread: +Math.abs(d.kalshi - d.polymarket).toFixed(3) }));

export default function MarketDetailPage() {
  return (
    <div className="max-w-5xl mx-auto animate-in">
      <div className="mb-6">
        <div className="text-[0.6rem] font-bold tracking-[0.15em] uppercase text-[var(--text-muted)] mb-1">Market Detail</div>
        <h1 className="text-2xl font-bold">&ldquo;Will the Fed cut rates in September 2024?&rdquo;</h1>
        <p className="text-sm text-[var(--text-tertiary)]">Economics · Monetary Policy · Resolution: Federal Reserve · Exp: Sep 18, 2024</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="kpi-card"><div className="kpi-label">Polymarket YES</div><div className="kpi-value text-xl" style={{color: 'var(--cyan)'}}>$0.55</div></div>
        <div className="kpi-card"><div className="kpi-label">Kalshi YES</div><div className="kpi-value text-xl" style={{color: 'var(--violet)'}}>$0.62</div></div>
        <div className="kpi-card"><div className="kpi-label">Gross Spread</div><div className="kpi-value text-xl text-[var(--amber)]">7.0¢</div></div>
        <div className="kpi-card"><div className="kpi-label">Net Edge</div><div className="kpi-value text-xl positive">$3.82</div></div>
      </div>

      {/* Price Chart */}
      <div className="chart-container mb-8">
        <div className="chart-title">Price History — Cross-Venue</div>
        <div className="chart-subtitle">Polymarket vs Kalshi · Shaded area = spread</div>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={PRICE_DATA}>
            <defs>
              <linearGradient id="sg2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,149,176,0.08)" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#5a6580' }} />
            <YAxis domain={['auto','auto']} tick={{ fontSize: 10, fill: '#5a6580' }} tickFormatter={v => `$${v}`} />
            <Tooltip contentStyle={{ background: '#151d35', border: '1px solid rgba(139,149,176,0.2)', borderRadius: 8, fontSize: 12 }} />
            <Area type="monotone" dataKey="spread" fill="url(#sg2)" stroke="none" />
            <Line type="monotone" dataKey="polymarket" stroke="#22d3ee" strokeWidth={2} dot={false} name="Polymarket" />
            <Line type="monotone" dataKey="kalshi" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Kalshi" />
            <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Event Details */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="glass-card-static p-6">
          <h3 className="text-sm font-bold mb-3">Event Details</h3>
          <div className="space-y-2 text-sm">
            {[
              ['Category', 'Economics / Monetary Policy'],
              ['Resolution Source', 'Federal Reserve official announcement'],
              ['Expiration', 'September 18, 2024'],
              ['True Probability', '~68% (estimated)'],
              ['Total Volume', '$2.4M across venues'],
              ['Classification', 'Executable Arbitrage'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-tertiary)]">{k}</span>
                <span className="text-[var(--text-primary)]">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card-static p-6">
          <h3 className="text-sm font-bold mb-3">Assessment</h3>
          <div className="research-note">
            <div className="note-label">Analysis</div>
            <p className="text-sm text-[var(--text-secondary)]">
              Potential cross-venue pricing discrepancy. Both venues resolve on the Federal Reserve&apos;s 
              official announcement, giving high contract equivalence. Available liquidity 
              ($24.8K min) supports position sizes up to ~$2,500 with acceptable slippage.
            </p>
          </div>
          <div className="mt-4 p-3 bg-[var(--emerald-dim)] border border-[rgba(16,185,129,0.25)] rounded-lg">
            <span className="badge badge-executable">EXECUTABLE ARBITRAGE</span>
            <p className="text-xs text-[var(--text-secondary)] mt-2">Net edge of $3.82 per $1,000 trade survives after estimated costs.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
