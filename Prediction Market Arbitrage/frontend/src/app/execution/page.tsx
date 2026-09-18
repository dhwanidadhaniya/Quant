'use client';
import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ============================================================
// EXECUTION SIMULATOR
// ============================================================

export default function ExecutionPage() {
  const [grossEdge, setGrossEdge] = useState(5.0);
  const [tradeSize, setTradeSize] = useState(1000);
  const [liquidity, setLiquidity] = useState(25000);

  const data = useMemo(() => Array.from({ length: 20 }, (_, i) => {
    const latency = (i + 1) * 500;
    const decay = Math.exp(-0.693 * latency / 5000);
    const captured = grossEdge * decay;
    const slip = 10 * Math.sqrt(tradeSize / Math.max(liquidity, 1)) * (1 + latency / 10000);
    const net = (captured / 100 * tradeSize) - slip - tradeSize * 0.01;
    return { latency, captured: +captured.toFixed(2), slippage: +slip.toFixed(2), net: +net.toFixed(2) };
  }), [grossEdge, tradeSize, liquidity]);

  return (
    <div className="max-w-5xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-1">Execution Simulator</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-6">How execution delay impacts captured edge</p>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card-static p-6 space-y-4">
          <div><label className="text-xs text-[var(--text-tertiary)]">Gross Edge (%)</label><input type="range" className="range-slider" min={1} max={15} step={0.5} value={grossEdge} onChange={e => setGrossEdge(+e.target.value)} /><span className="mono text-sm">{grossEdge}%</span></div>
          <div><label className="text-xs text-[var(--text-tertiary)]">Trade Size ($)</label><input type="range" className="range-slider" min={100} max={10000} step={100} value={tradeSize} onChange={e => setTradeSize(+e.target.value)} /><span className="mono text-sm">${tradeSize}</span></div>
          <div><label className="text-xs text-[var(--text-tertiary)]">Liquidity ($)</label><input type="range" className="range-slider" min={1000} max={100000} step={1000} value={liquidity} onChange={e => setLiquidity(+e.target.value)} /><span className="mono text-sm">${liquidity.toLocaleString()}</span></div>
        </div>

        <div className="md:col-span-2 chart-container">
          <div className="chart-title">Latency Sensitivity</div>
          <div className="chart-subtitle">Edge captured vs execution latency (ms)</div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,149,176,0.08)" />
              <XAxis dataKey="latency" tick={{ fontSize: 10, fill: '#5a6580' }} label={{ value: 'Latency (ms)', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#5a6580' }} />
              <YAxis tick={{ fontSize: 10, fill: '#5a6580' }} />
              <Tooltip contentStyle={{ background: '#151d35', border: '1px solid rgba(139,149,176,0.2)', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="captured" stroke="#10b981" strokeWidth={2} dot={false} name="Edge Captured (%)" />
              <Line type="monotone" dataKey="net" stroke="#22d3ee" strokeWidth={2} dot={false} name="Net P&L ($)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="research-note">
        <div className="note-label">Key Finding</div>
        <p className="text-sm text-[var(--text-secondary)]">
          Edge decays exponentially with execution latency. At the median decay rate, 50% of the edge is gone within 5 seconds.
          This means execution speed is critical — a 10-second delay can eliminate most of the theoretical profit.
        </p>
      </div>
    </div>
  );
}
