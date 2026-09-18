'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell } from 'recharts';

// ============================================================
// MARKET EFFICIENCY ANALYSIS
// ============================================================

const EFFICIENCY_DATA = [
  { category: 'Politics', score: 28, opps: 8, avgSpread: 5.2, executable: 2, avgDuration: 120, color: '#3b82f6' },
  { category: 'Economics', score: 18, opps: 12, avgSpread: 3.8, executable: 3, avgDuration: 47, color: '#22d3ee' },
  { category: 'Crypto', score: 42, opps: 6, avgSpread: 6.1, executable: 2, avgDuration: 180, color: '#f59e0b' },
  { category: 'Sports', score: 12, opps: 4, avgSpread: 2.1, executable: 0, avgDuration: 34, color: '#10b981' },
  { category: 'Science', score: 35, opps: 3, avgSpread: 4.5, executable: 1, avgDuration: 210, color: '#8b5cf6' },
  { category: 'Finance', score: 22, opps: 5, avgSpread: 3.2, executable: 1, avgDuration: 68, color: '#f43f5e' },
];

const RADAR_DATA = [
  { dimension: 'Spread Size', value: 65 },
  { dimension: 'Duration', value: 45 },
  { dimension: 'Executable %', value: 35 },
  { dimension: 'Convergence', value: 72 },
  { dimension: 'Liquidity', value: 58 },
  { dimension: 'Fee Impact', value: 80 },
];

export default function EfficiencyPage() {
  const overallScore = 24;
  return (
    <div className="max-w-6xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-1">Market Efficiency Analysis</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-6">&ldquo;How efficient are prediction markets?&rdquo;</p>

      {/* Overall Efficiency Score */}
      <div className="glass-card-static p-8 mb-8 text-center">
        <div className="text-[0.6rem] font-bold tracking-[0.15em] uppercase text-[var(--text-muted)] mb-3">Market Efficiency Score</div>
        <div className="text-6xl font-black mono text-[var(--cyan)] mb-2">{overallScore}<span className="text-2xl text-[var(--text-muted)]">/100</span></div>
        <div className="text-sm text-[var(--text-secondary)] max-w-xl mx-auto">
          Markets appear <strong>generally efficient</strong> with occasional temporary inefficiencies.
          Most pricing discrepancies are eliminated by transaction costs.
        </div>
        <div className="text-[0.6rem] text-[var(--text-muted)] mt-2">0 = perfectly efficient · 100 = highly inefficient</div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* By Category */}
        <div className="chart-container">
          <div className="chart-title">Efficiency by Market Category</div>
          <div className="chart-subtitle">Higher score = less efficient (more pricing discrepancies)</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={EFFICIENCY_DATA} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,149,176,0.08)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#5a6580' }} />
              <YAxis dataKey="category" type="category" tick={{ fontSize: 11, fill: '#8b95b0' }} width={80} />
              <Tooltip contentStyle={{ background: '#151d35', border: '1px solid rgba(139,149,176,0.2)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                {EFFICIENCY_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar */}
        <div className="chart-container">
          <div className="chart-title">Efficiency Dimensions</div>
          <div className="chart-subtitle">Multi-dimensional efficiency profile</div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={RADAR_DATA}>
              <PolarGrid stroke="rgba(139,149,176,0.15)" />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: '#8b95b0' }} />
              <PolarRadiusAxis tick={{ fontSize: 8, fill: '#5a6580' }} />
              <Radar dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category breakdown table */}
      <div className="glass-card-static p-6 mb-8">
        <div className="chart-title mb-4">Detailed Category Breakdown</div>
        <table className="data-table">
          <thead>
            <tr><th>Category</th><th>Efficiency Score</th><th>Opportunities</th><th>Avg Spread</th><th>Executable</th><th>Avg Duration</th><th>Assessment</th></tr>
          </thead>
          <tbody>
            {EFFICIENCY_DATA.map(d => (
              <tr key={d.category}>
                <td className="font-medium text-[var(--text-primary)]">{d.category}</td>
                <td className="mono-cell">{d.score}/100</td>
                <td className="mono-cell">{d.opps}</td>
                <td className="mono-cell">{d.avgSpread}¢</td>
                <td className="mono-cell">{d.executable}</td>
                <td className="mono-cell">{d.avgDuration}s</td>
                <td className="text-xs text-[var(--text-tertiary)]">{d.score < 20 ? 'Efficient' : d.score < 35 ? 'Generally efficient' : 'Less efficient'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="research-note">
          <div className="note-label">Key Finding</div>
          <p className="text-sm text-[var(--text-secondary)]">
            Crypto and science markets show higher inefficiency scores, likely due to lower trading volume
            and fewer informed participants. Political markets have more persistent spreads but also 
            deeper liquidity.
          </p>
        </div>
        <div className="insight-box">
          <div className="insight-label">Working Hypothesis</div>
          <p className="text-sm text-[var(--text-secondary)]">
            &ldquo;Prediction markets are generally efficient but exhibit temporary, category-dependent
            inefficiencies that are largely compressed by transaction costs.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
