'use client';
import { useState } from 'react';

// ============================================================
// MARKET SCANNER — Sortable/filterable opportunity table
// ============================================================

const ALL_OPPORTUNITIES = [
  { id: 1, event: "Fed rate cut Sep 2024", category: "economics", a: 0.55, b: 0.62, spread: 7.0, net: 3.82, liq: 24800, dur: "47s", status: "live", cls: "executable_arbitrage", risk: "medium" },
  { id: 2, event: "Democratic candidate wins", category: "politics", a: 0.50, b: 0.56, spread: 6.0, net: 2.15, liq: 68000, dur: "2m 8s", status: "live", cls: "executable_arbitrage", risk: "low" },
  { id: 3, event: "Bitcoin exceeds $100K", category: "crypto", a: 0.40, b: 0.47, spread: 7.0, net: 1.90, liq: 15200, dur: "21s", status: "developing", cls: "practical_arbitrage", risk: "medium" },
  { id: 4, event: "S&P 500 above 5,500", category: "finance", a: 0.60, b: 0.64, spread: 4.0, net: 0.85, liq: 42000, dur: "1m 34s", status: "live", cls: "practical_arbitrage", risk: "low" },
  { id: 5, event: "US CPI above 3.0%", category: "economics", a: 0.33, b: 0.38, spread: 5.0, net: -0.40, liq: 8500, dur: "12s", status: "compressing", cls: "theoretical_arbitrage", risk: "high" },
  { id: 6, event: "EU tariffs Chinese EVs", category: "politics", a: 0.70, b: 0.74, spread: 4.0, net: -0.15, liq: 12000, dur: "34s", status: "expired", cls: "not_arbitrage", risk: "low" },
  { id: 7, event: "Govt shutdown Q4 2024", category: "politics", a: 0.26, b: 0.31, spread: 5.0, net: 0.72, liq: 9200, dur: "68s", status: "live", cls: "practical_arbitrage", risk: "medium" },
  { id: 8, event: "SpaceX Starship orbital", category: "science", a: 0.55, b: 0.61, spread: 6.0, net: 1.45, liq: 7600, dur: "3m 20s", status: "developing", cls: "practical_arbitrage", risk: "medium" },
  { id: 9, event: "US GDP growth > 2.5%", category: "economics", a: 0.53, b: 0.57, spread: 4.0, net: 0.32, liq: 31000, dur: "55s", status: "live", cls: "practical_arbitrage", risk: "low" },
  { id: 10, event: "OpenAI releases GPT-5", category: "tech", a: 0.28, b: 0.34, spread: 6.0, net: -0.80, liq: 4200, dur: "8s", status: "expired", cls: "theoretical_arbitrage", risk: "high" },
  { id: 11, event: "Real Madrid CL 2025", category: "sports", a: 0.20, b: 0.24, spread: 4.0, net: -0.35, liq: 18000, dur: "2m", status: "live", cls: "not_arbitrage", risk: "low" },
  { id: 12, event: "Cat 5 hurricane US 2024", category: "weather", a: 0.14, b: 0.17, spread: 3.0, net: -0.65, liq: 3100, dur: "5m", status: "expired", cls: "not_arbitrage", risk: "low" },
];

const statusBadge = (s: string) => {
  const m: Record<string, string> = { live: 'badge-live', developing: 'badge-developing', compressing: 'badge-compressing', expired: 'badge-expired' };
  return <span className={`badge ${m[s] || 'badge-expired'}`}>{s === 'live' && <span className="pulse-dot mr-1" />}{s.toUpperCase()}</span>;
};

const clsBadge = (c: string) => {
  const m: Record<string, [string, string]> = { executable_arbitrage: ['badge-executable', 'EXECUTABLE'], practical_arbitrage: ['badge-developing', 'PRACTICAL'], theoretical_arbitrage: ['badge-theoretical', 'THEORETICAL'], not_arbitrage: ['badge-not-arb', 'NOT ARB'] };
  const [cn, label] = m[c] || ['badge-expired', c];
  return <span className={`badge ${cn}`}>{label}</span>;
};

export default function ScannerPage() {
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'net' | 'spread' | 'liq'>('net');

  let filtered = ALL_OPPORTUNITIES;
  if (category !== 'all') filtered = filtered.filter(o => o.category === category);
  if (status !== 'all') filtered = filtered.filter(o => o.status === status);
  filtered = [...filtered].sort((a, b) => sortBy === 'liq' ? b.liq - a.liq : sortBy === 'spread' ? b.spread - a.spread : b.net - a.net);

  const categories = ['all', ...new Set(ALL_OPPORTUNITIES.map(o => o.category))];
  const statuses = ['all', 'live', 'developing', 'compressing', 'expired'];

  return (
    <div className="max-w-7xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-1">Market Scanner</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-6">All detected pricing discrepancies across venues</p>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div>
          <label className="text-[0.6rem] text-[var(--text-muted)] uppercase tracking-wider block mb-1">Category</label>
          <select className="input-field text-sm" value={category} onChange={e => setCategory(e.target.value)}>
            {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[0.6rem] text-[var(--text-muted)] uppercase tracking-wider block mb-1">Status</label>
          <select className="input-field text-sm" value={status} onChange={e => setStatus(e.target.value)}>
            {statuses.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[0.6rem] text-[var(--text-muted)] uppercase tracking-wider block mb-1">Sort By</label>
          <div className="tab-group">
            <button className={`tab text-xs ${sortBy === 'net' ? 'active' : ''}`} onClick={() => setSortBy('net')}>Net Edge</button>
            <button className={`tab text-xs ${sortBy === 'spread' ? 'active' : ''}`} onClick={() => setSortBy('spread')}>Spread</button>
            <button className={`tab text-xs ${sortBy === 'liq' ? 'active' : ''}`} onClick={() => setSortBy('liq')}>Liquidity</button>
          </div>
        </div>
        <div className="ml-auto text-xs text-[var(--text-muted)]">{filtered.length} results</div>
      </div>

      {/* Table */}
      <div className="glass-card-static p-4 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>Event</th><th>Category</th><th>Poly YES</th><th>Kalshi YES</th><th>Spread</th><th>Net Edge</th><th>Liquidity</th><th>Duration</th><th>Status</th><th>Classification</th></tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id}>
                <td className="font-medium text-[var(--text-primary)] max-w-[180px] truncate">{o.event}</td>
                <td className="text-[0.7rem] text-[var(--text-tertiary)] uppercase">{o.category}</td>
                <td className="mono-cell">${o.a.toFixed(2)}</td>
                <td className="mono-cell">${o.b.toFixed(2)}</td>
                <td className="mono-cell text-[var(--amber)]">{o.spread.toFixed(1)}¢</td>
                <td className={`mono-cell font-semibold ${o.net > 0 ? 'positive' : 'negative'}`}>${o.net.toFixed(2)}</td>
                <td className="mono-cell">${(o.liq / 1000).toFixed(1)}K</td>
                <td className="mono-cell">{o.dur}</td>
                <td>{statusBadge(o.status)}</td>
                <td>{clsBadge(o.cls)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
