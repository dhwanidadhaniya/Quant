'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

// ============================================================
// P&L ANALYTICS
// ============================================================

const PNL_DATA = Array.from({ length: 42 }, (_, i) => {
  const pnl = (Math.random() - 0.4) * 30;
  return { trade: i + 1, pnl: +pnl.toFixed(2) };
});
const cumPnl = PNL_DATA.reduce((acc: any[], t) => {
  const prev = acc.length ? acc[acc.length - 1].cum : 0;
  acc.push({ trade: t.trade, cum: +(prev + t.pnl).toFixed(2) });
  return acc;
}, []);

export default function PnlPage() {
  const total = cumPnl[cumPnl.length - 1]?.cum || 0;
  const wins = PNL_DATA.filter(t => t.pnl > 0);
  const losses = PNL_DATA.filter(t => t.pnl <= 0);
  
  return (
    <div className="max-w-5xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-1">P&L Analytics</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-6">Portfolio performance analysis from simulated backtest</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="kpi-card"><div className="kpi-label">Total P&L</div><div className={`kpi-value text-xl ${total >= 0 ? 'positive' : 'negative'}`}>${total.toFixed(2)}</div></div>
        <div className="kpi-card"><div className="kpi-label">Win Rate</div><div className="kpi-value text-xl">{(wins.length / PNL_DATA.length * 100).toFixed(1)}%</div></div>
        <div className="kpi-card"><div className="kpi-label">Avg Win</div><div className="kpi-value text-xl positive">${(wins.reduce((s, w) => s + w.pnl, 0) / (wins.length || 1)).toFixed(2)}</div></div>
        <div className="kpi-card"><div className="kpi-label">Avg Loss</div><div className="kpi-value text-xl negative">${(losses.reduce((s, l) => s + l.pnl, 0) / (losses.length || 1)).toFixed(2)}</div></div>
      </div>

      <div className="chart-container mb-8">
        <div className="chart-title">Cumulative P&L</div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={cumPnl}>
            <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2} /><stop offset="95%" stopColor="#22d3ee" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,149,176,0.08)" />
            <XAxis dataKey="trade" tick={{ fontSize: 10, fill: '#5a6580' }} />
            <YAxis tick={{ fontSize: 10, fill: '#5a6580' }} tickFormatter={v => `$${v}`} />
            <Tooltip contentStyle={{ background: '#151d35', border: '1px solid rgba(139,149,176,0.2)', borderRadius: 8, fontSize: 12 }} />
            <Area type="monotone" dataKey="cum" stroke="#22d3ee" fill="url(#cg)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <div className="chart-title">Trade-by-Trade P&L</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={PNL_DATA}>
            <XAxis tick={false} /><YAxis tick={{ fontSize: 10, fill: '#5a6580' }} tickFormatter={v => `$${v}`} />
            <Tooltip contentStyle={{ background: '#151d35', border: '1px solid rgba(139,149,176,0.2)', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>{PNL_DATA.map((t, i) => <Cell key={i} fill={t.pnl >= 0 ? '#10b981' : '#f43f5e'} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
