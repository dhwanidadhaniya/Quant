'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ScatterChart, Scatter, Cell } from 'recharts';

// ============================================================
// MAIN FINANCE DASHBOARD
// The most important screen — feels like a financial research workstation
// ============================================================

const MOCK_STATS = {
  active_opportunities: 8, net_edge_total: 47.20, gross_spread_avg: 4.2,
  liquidity_total: 342000, avg_duration: 47, executable: 4,
  expected_pnl: 38.50, capital_required: 2400,
};

const OPPORTUNITIES = [
  { id: 1, event: "Fed rate cut Sep 2024", category: "economics", venue_a: "Polymarket", venue_b: "Kalshi", venue_a_yes: 0.55, venue_b_yes: 0.62, gross_spread: 0.07, net_edge: 3.82, liquidity: 24800, duration: "47s", status: "live", classification: "executable_arbitrage", risk: "medium" },
  { id: 2, event: "Democratic candidate wins 2024", category: "politics", venue_a: "Polymarket", venue_b: "Kalshi", venue_a_yes: 0.50, venue_b_yes: 0.56, gross_spread: 0.06, net_edge: 2.15, liquidity: 68000, duration: "2m 8s", status: "live", classification: "executable_arbitrage", risk: "low" },
  { id: 3, event: "Bitcoin exceeds $100K", category: "crypto", venue_a: "Polymarket", venue_b: "Kalshi", venue_a_yes: 0.40, venue_b_yes: 0.47, gross_spread: 0.07, net_edge: 1.90, liquidity: 15200, duration: "21s", status: "developing", classification: "practical_arbitrage", risk: "medium" },
  { id: 4, event: "S&P 500 above 5,500", category: "finance", venue_a: "Polymarket", venue_b: "Kalshi", venue_a_yes: 0.60, venue_b_yes: 0.64, gross_spread: 0.04, net_edge: 0.85, liquidity: 42000, duration: "1m 34s", status: "live", classification: "practical_arbitrage", risk: "low" },
  { id: 5, event: "US CPI above 3.0%", category: "economics", venue_a: "Polymarket", venue_b: "Kalshi", venue_a_yes: 0.33, venue_b_yes: 0.38, gross_spread: 0.05, net_edge: -0.40, liquidity: 8500, duration: "12s", status: "compressing", classification: "theoretical_arbitrage", risk: "high" },
  { id: 6, event: "EU tariffs on Chinese EVs", category: "politics", venue_a: "Polymarket", venue_b: "Kalshi", venue_a_yes: 0.70, venue_b_yes: 0.74, gross_spread: 0.04, net_edge: -0.15, liquidity: 12000, duration: "34s", status: "expired", classification: "not_arbitrage", risk: "low" },
];

const HERO_CHART_DATA = Array.from({ length: 50 }, (_, i) => {
  const base = 0.58;
  const polymarket = base - 0.03 + Math.sin(i / 8) * 0.03 + (Math.random() - 0.5) * 0.01;
  const kalshi = base + 0.04 + Math.sin(i / 8) * 0.02 + (Math.random() - 0.5) * 0.01;
  return { time: `${Math.floor(i / 2)}:${i % 2 === 0 ? '00' : '30'}`, polymarket: +polymarket.toFixed(3), kalshi: +kalshi.toFixed(3), spread: +Math.abs(kalshi - polymarket).toFixed(3) };
});

const statusBadge = (status: string) => {
  const map: Record<string, string> = { live: 'badge-live', developing: 'badge-developing', compressing: 'badge-compressing', expired: 'badge-expired' };
  return <span className={`badge ${map[status] || 'badge-expired'}`}><span className={status === 'live' ? 'pulse-dot' : 'w-1.5 h-1.5 rounded-full bg-current'} />{status.toUpperCase()}</span>;
};

const classificationBadge = (cls: string) => {
  const map: Record<string, [string, string]> = {
    executable_arbitrage: ['badge-executable', 'EXECUTABLE'],
    practical_arbitrage: ['badge-developing', 'PRACTICAL'],
    theoretical_arbitrage: ['badge-theoretical', 'THEORETICAL'],
    not_arbitrage: ['badge-not-arb', 'NOT ARB'],
  };
  const [className, label] = map[cls] || ['badge-expired', cls];
  return <span className={`badge ${className}`}>{label}</span>;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-static p-3 text-xs">
      <div className="text-[var(--text-tertiary)] mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}:</span>
          <span className="mono font-semibold">${p.value?.toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto animate-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Finance Dashboard</h1>
          <p className="text-sm text-[var(--text-tertiary)]">Real-time research workstation · Cross-venue analysis</p>
        </div>
        <span className="badge badge-simulated">⬡ SIMULATED DATA</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Opportunities', value: MOCK_STATS.active_opportunities.toString(), color: 'var(--cyan)' },
          { label: 'Total Net Edge', value: `$${MOCK_STATS.net_edge_total.toFixed(2)}`, color: 'var(--emerald)' },
          { label: 'Avg Gross Spread', value: `${MOCK_STATS.gross_spread_avg}¢`, color: 'var(--text-primary)' },
          { label: 'Total Liquidity', value: `$${(MOCK_STATS.liquidity_total / 1000).toFixed(0)}K`, color: 'var(--text-primary)' },
          { label: 'Executable Opps', value: MOCK_STATS.executable.toString(), color: 'var(--emerald)' },
          { label: 'Avg Duration', value: `${MOCK_STATS.avg_duration}s`, color: 'var(--text-primary)' },
          { label: 'Expected P&L', value: `$${MOCK_STATS.expected_pnl.toFixed(2)}`, color: 'var(--emerald)' },
          { label: 'Capital Required', value: `$${MOCK_STATS.capital_required.toLocaleString()}`, color: 'var(--amber)' },
        ].map((kpi) => (
          <div key={kpi.label} className="kpi-card">
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Hero Arbitrage Chart */}
      <div className="chart-container mb-8">
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="chart-title">Cross-Venue Price Comparison</div>
            <div className="chart-subtitle">Fed Rate Cut Sep 2024 — Polymarket vs Kalshi · Shaded area = divergence</div>
          </div>
          <div className="text-right">
            <div className="text-[0.6rem] uppercase tracking-wider text-[var(--text-muted)]">Peak Divergence</div>
            <div className="text-lg font-bold mono text-[var(--amber)]">7.2¢</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={HERO_CHART_DATA}>
            <defs>
              <linearGradient id="spreadGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,149,176,0.08)" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#5a6580' }} axisLine={false} tickLine={false} />
            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#5a6580' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toFixed(2)}`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="spread" fill="url(#spreadGrad)" stroke="none" />
            <Line type="monotone" dataKey="polymarket" stroke="#22d3ee" strokeWidth={2} dot={false} name="Polymarket" />
            <Line type="monotone" dataKey="kalshi" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Kalshi" />
            <Legend wrapperStyle={{ fontSize: '0.7rem' }} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="text-[0.65rem] text-[var(--text-muted)] italic mt-2">
          Annotation: Peak divergence coincided with a conflicting economic data release. Prices converged within ~25 minutes.
        </div>
      </div>

      {/* Live Opportunity Feed */}
      <div className="glass-card-static p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="chart-title">Live Opportunity Feed</div>
            <div className="chart-subtitle">Cross-venue pricing discrepancies · Sorted by net edge</div>
          </div>
          <Link href="/scanner" className="btn btn-ghost text-xs">View Scanner →</Link>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Category</th>
                <th>Venues</th>
                <th>YES A</th>
                <th>YES B</th>
                <th>Gross</th>
                <th>Net Edge</th>
                <th>Liquidity</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Classification</th>
              </tr>
            </thead>
            <tbody>
              {OPPORTUNITIES.map((opp) => (
                <tr key={opp.id} className="cursor-pointer">
                  <td className="font-medium text-[var(--text-primary)] max-w-[200px] truncate">{opp.event}</td>
                  <td><span className="text-[0.7rem] text-[var(--text-tertiary)] uppercase">{opp.category}</span></td>
                  <td className="text-[0.7rem]">{opp.venue_a} / {opp.venue_b}</td>
                  <td className="mono-cell">${opp.venue_a_yes.toFixed(2)}</td>
                  <td className="mono-cell">${opp.venue_b_yes.toFixed(2)}</td>
                  <td className="mono-cell">{(opp.gross_spread * 100).toFixed(1)}¢</td>
                  <td className={`mono-cell font-semibold ${opp.net_edge > 0 ? 'positive' : 'negative'}`}>
                    ${opp.net_edge.toFixed(2)}
                  </td>
                  <td className="mono-cell">${(opp.liquidity / 1000).toFixed(1)}K</td>
                  <td className="mono-cell">{opp.duration}</td>
                  <td>{statusBadge(opp.status)}</td>
                  <td>{classificationBadge(opp.classification)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Research Notes at the bottom */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="research-note">
          <div className="note-label">Observation #01</div>
          <p className="text-sm text-[var(--text-secondary)]">
            The largest gross spread did not always generate the largest net edge. 
            Transaction costs materially compressed many opportunities.
          </p>
        </div>
        <div className="insight-box">
          <div className="insight-label">Key Distinction</div>
          <p className="text-sm text-[var(--text-secondary)]">
            Of {OPPORTUNITIES.length} observed price differences, only {OPPORTUNITIES.filter(o => o.classification === 'executable_arbitrage').length} ({((OPPORTUNITIES.filter(o => o.classification === 'executable_arbitrage').length / OPPORTUNITIES.length) * 100).toFixed(0)}%) survived as executable after costs and liquidity analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
