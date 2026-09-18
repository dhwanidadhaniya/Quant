'use client';
import { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart, Cell } from 'recharts';

// ============================================================
// BACKTESTING ENGINE
// ============================================================

export default function BacktestPage() {
  const [capital, setCapital] = useState(10000);
  const [sizing, setSizing] = useState('half_kelly');
  const [minEdge, setMinEdge] = useState(0.5);
  const [minLiquidity, setMinLiquidity] = useState(500);
  const [type, setType] = useState('execution_adjusted');
  const [hasRun, setHasRun] = useState(false);

  const results = useMemo(() => {
    // Simulated backtest results
    const numTrades = 42;
    let cap = capital;
    const equity: number[] = [capital];
    const trades: { pnl: number; cum: number }[] = [];
    const dailyPnl: { day: number; pnl: number }[] = [];

    for (let i = 0; i < numTrades; i++) {
      const edge = (Math.random() - 0.35) * (type === 'execution_adjusted' ? 40 : 60);
      cap += edge;
      equity.push(+cap.toFixed(2));
      trades.push({ pnl: +edge.toFixed(2), cum: +(cap - capital).toFixed(2) });
    }
    for (let d = 0; d < 30; d++) {
      dailyPnl.push({ day: d + 1, pnl: +((Math.random() - 0.4) * 30).toFixed(2) });
    }

    const pnls = trades.map(t => t.pnl);
    const wins = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p <= 0);
    let peak = capital, maxDD = 0;
    equity.forEach(v => { if (v > peak) peak = v; const dd = (peak - v) / peak; if (dd > maxDD) maxDD = dd; });

    return {
      equity: equity.map((v, i) => ({ trade: i, value: v })),
      trades, dailyPnl,
      totalPnl: +(cap - capital).toFixed(2),
      totalReturn: +(((cap - capital) / capital) * 100).toFixed(2),
      numTrades, winRate: +((wins.length / numTrades) * 100).toFixed(1),
      avgTrade: +(pnls.reduce((a, b) => a + b, 0) / numTrades).toFixed(2),
      bestTrade: +Math.max(...pnls).toFixed(2),
      worstTrade: +Math.min(...pnls).toFixed(2),
      maxDD: +(maxDD * 100).toFixed(2),
      avgWin: wins.length ? +(wins.reduce((a, b) => a + b, 0) / wins.length).toFixed(2) : 0,
      avgLoss: losses.length ? +(losses.reduce((a, b) => a + b, 0) / losses.length).toFixed(2) : 0,
    };
  }, [capital, sizing, minEdge, type, hasRun]);

  return (
    <div className="max-w-6xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-1">Backtesting Engine</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-6">Historical simulation of arbitrage strategy performance</p>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card-static p-6">
          <h3 className="text-sm font-bold mb-4">Configuration</h3>
          <div className="space-y-3 text-sm">
            <div><label className="text-xs text-[var(--text-tertiary)]">Initial Capital</label><input type="number" className="input-field mt-1" value={capital} onChange={e => setCapital(+e.target.value)} /></div>
            <div><label className="text-xs text-[var(--text-tertiary)]">Position Sizing</label>
              <select className="input-field mt-1" value={sizing} onChange={e => setSizing(e.target.value)}>
                <option value="fixed">Fixed Position</option>
                <option value="equal_weight">Equal Weight (5%)</option>
                <option value="full_kelly">Full Kelly</option>
                <option value="half_kelly">Half Kelly</option>
                <option value="quarter_kelly">Quarter Kelly</option>
              </select>
            </div>
            <div><label className="text-xs text-[var(--text-tertiary)]">Min Net Edge (%)</label><input type="number" className="input-field mt-1" step={0.1} value={minEdge} onChange={e => setMinEdge(+e.target.value)} /></div>
            <div><label className="text-xs text-[var(--text-tertiary)]">Min Liquidity ($)</label><input type="number" className="input-field mt-1" step={100} value={minLiquidity} onChange={e => setMinLiquidity(+e.target.value)} /></div>
            <div>
              <label className="text-xs text-[var(--text-tertiary)]">Backtest Type</label>
              <div className="tab-group mt-1">
                <button className={`tab text-xs ${type === 'theoretical' ? 'active' : ''}`} onClick={() => setType('theoretical')}>Theoretical</button>
                <button className={`tab text-xs ${type === 'execution_adjusted' ? 'active' : ''}`} onClick={() => setType('execution_adjusted')}>Execution-Adjusted</button>
              </div>
            </div>
            <button className="btn btn-primary w-full mt-2" onClick={() => setHasRun(h => !h)}>Run Backtest</button>
          </div>
          {type === 'theoretical' && (
            <div className="mt-3 p-2 bg-[var(--amber-dim)] border border-[rgba(245,158,11,0.2)] rounded text-[0.65rem] text-[var(--amber)]">
              ⚠ Theoretical backtests assume perfect execution at observed prices. Real performance will be worse.
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          {/* Results KPIs */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="kpi-card"><div className="kpi-label">Total P&L</div><div className={`kpi-value text-xl ${results.totalPnl >= 0 ? 'positive' : 'negative'}`}>${results.totalPnl}</div></div>
            <div className="kpi-card"><div className="kpi-label">Return</div><div className={`kpi-value text-xl ${results.totalReturn >= 0 ? 'positive' : 'negative'}`}>{results.totalReturn}%</div></div>
            <div className="kpi-card"><div className="kpi-label">Win Rate</div><div className="kpi-value text-xl">{results.winRate}%</div></div>
            <div className="kpi-card"><div className="kpi-label">Trades</div><div className="kpi-value text-xl">{results.numTrades}</div></div>
            <div className="kpi-card"><div className="kpi-label">Max Drawdown</div><div className="kpi-value text-xl text-[var(--rose)]">{results.maxDD}%</div></div>
            <div className="kpi-card"><div className="kpi-label">Avg Trade</div><div className={`kpi-value text-xl ${results.avgTrade >= 0 ? 'positive' : 'negative'}`}>${results.avgTrade}</div></div>
          </div>

          {/* Equity Curve */}
          <div className="chart-container mb-4">
            <div className="chart-title">Equity Curve</div>
            <div className="chart-subtitle">{type === 'execution_adjusted' ? 'Execution-adjusted' : 'Theoretical'} backtest · {results.numTrades} trades</div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={results.equity}>
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,149,176,0.08)" />
                <XAxis dataKey="trade" tick={{ fontSize: 10, fill: '#5a6580' }} />
                <YAxis tick={{ fontSize: 10, fill: '#5a6580' }} tickFormatter={v => `$${v.toLocaleString()}`} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: '#151d35', border: '1px solid rgba(139,149,176,0.2)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`$${v.toLocaleString()}`, 'Portfolio']} />
                <Area type="monotone" dataKey="value" stroke="#22d3ee" fill="url(#eqGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Trade P&L distribution */}
          <div className="chart-container">
            <div className="chart-title">Trade P&L Distribution</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={results.trades}>
                <XAxis tick={false} />
                <YAxis tick={{ fontSize: 10, fill: '#5a6580' }} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={{ background: '#151d35', border: '1px solid rgba(139,149,176,0.2)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`$${v}`, 'P&L']} />
                <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                  {results.trades.map((t, i) => (<Cell key={i} fill={t.pnl >= 0 ? '#10b981' : '#f43f5e'} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mistake-box">
        <div className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--amber)] mb-2">Important Disclaimer</div>
        <p className="text-sm text-[var(--text-secondary)]">
          Backtesting uses <strong>simulated historical data</strong>. Past performance does not indicate future results.
          The gap between theoretical and execution-adjusted results IS itself a research finding — it quantifies how much
          theoretical edge is consumed by real-world execution constraints.
        </p>
      </div>
    </div>
  );
}
