'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ============================================================
// RISK ANALYTICS — 8-Dimension Risk Matrix
// ============================================================

const RISK_MATRIX = [
  { name: 'Execution Risk', level: 'low', score: 1, reason: 'Trade size is well within available liquidity', category: 'execution' },
  { name: 'Liquidity Risk', level: 'medium', score: 2, reason: 'Moderate liquidity — slippage may be significant', category: 'market' },
  { name: 'Settlement Risk', level: 'low', score: 1, reason: 'Contracts appear to settle on the same criteria', category: 'contract' },
  { name: 'Contract Risk', level: 'low', score: 1, reason: 'Contracts are closely matched on all dimensions', category: 'contract' },
  { name: 'Platform Risk', level: 'medium', score: 2, reason: 'API reliability and regulatory status are external dependencies', category: 'operational' },
  { name: 'Model Risk', level: 'medium', score: 2, reason: 'Moderate edge — within plausible range but verify assumptions', category: 'analytical' },
  { name: 'Timing Risk', level: 'low', score: 1, reason: 'Opportunity persists long enough for comfortable execution', category: 'execution' },
  { name: 'Capital Lock-Up', level: 'medium', score: 2, reason: 'Capital is locked until event resolution', category: 'financial' },
];

const riskColor = (level: string) => level === 'low' ? '#10b981' : level === 'medium' ? '#f59e0b' : '#f43f5e';
const riskBg = (level: string) => level === 'low' ? 'var(--emerald-dim)' : level === 'medium' ? 'var(--amber-dim)' : 'var(--rose-dim)';

const DRAWDOWN_DATA = Array.from({ length: 40 }, (_, i) => {
  const dd = Math.sin(i / 5) * 0.05 + Math.random() * 0.03;
  return { trade: i + 1, drawdown: +(Math.max(0, dd) * 100).toFixed(2) };
});

export default function RiskPage() {
  const avgScore = (RISK_MATRIX.reduce((a, r) => a + r.score, 0) / RISK_MATRIX.length);
  const overall = avgScore < 1.5 ? 'LOW' : avgScore < 2.3 ? 'MEDIUM' : 'HIGH';
  const overallColor = avgScore < 1.5 ? 'var(--emerald)' : avgScore < 2.3 ? 'var(--amber)' : 'var(--rose)';

  return (
    <div className="max-w-5xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-1">Risk Analytics</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-6">&ldquo;What can go wrong?&rdquo; — 8-Dimension Risk Assessment</p>

      {/* Overall */}
      <div className="kpi-card mb-8 text-center">
        <div className="kpi-label">Overall Risk Level</div>
        <div className="text-4xl font-black mono" style={{ color: overallColor }}>{overall}</div>
        <div className="text-xs text-[var(--text-tertiary)] mt-1">Score: {avgScore.toFixed(2)} / 3.00</div>
      </div>

      {/* Risk Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {RISK_MATRIX.map(risk => (
          <div key={risk.name} className="glass-card-static p-5" style={{ borderLeft: `3px solid ${riskColor(risk.level)}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-[var(--text-primary)]">{risk.name}</span>
              <span className="badge" style={{ background: riskBg(risk.level), color: riskColor(risk.level), border: `1px solid ${riskColor(risk.level)}30` }}>
                {risk.level.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">{risk.reason}</p>
            <div className="text-[0.6rem] text-[var(--text-muted)] mt-2 uppercase tracking-wider">{risk.category}</div>
          </div>
        ))}
      </div>

      {/* Drawdown Chart */}
      <div className="chart-container mb-8">
        <div className="chart-title">Drawdown Analysis</div>
        <div className="chart-subtitle">Maximum peak-to-trough decline during simulated backtest</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={DRAWDOWN_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,149,176,0.08)" />
            <XAxis dataKey="trade" tick={{ fontSize: 10, fill: '#5a6580' }} />
            <YAxis tick={{ fontSize: 10, fill: '#5a6580' }} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={{ background: '#151d35', border: '1px solid rgba(139,149,176,0.2)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v}%`, 'Drawdown']} />
            <Bar dataKey="drawdown" fill="rgba(244, 63, 94, 0.5)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="research-note">
        <div className="note-label">Risk Philosophy</div>
        <p className="text-sm text-[var(--text-secondary)]">
          We assess risk across 8 dimensions because no single metric captures the full risk picture.
          A trade might be low-risk on execution but high-risk on contract equivalence.
          The overall score is an average, but individual HIGH ratings should be investigated regardless.
        </p>
      </div>
    </div>
  );
}
