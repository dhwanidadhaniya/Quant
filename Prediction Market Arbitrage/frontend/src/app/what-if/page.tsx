'use client';
import { useState, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

// ============================================================
// WHAT-IF LAB — Interactive sandbox for trade simulation
// "WHAT'S THE TRADE ACTUALLY WORTH?"
// ============================================================

export default function WhatIfLab() {
  const [price, setPrice] = useState(0.62);
  const [probability, setProbability] = useState(0.68);
  const [capital, setCapital] = useState(10000);
  const [liquidity, setLiquidity] = useState(25000);
  const [feeBps, setFeeBps] = useState(100);
  const [tradeSize, setTradeSize] = useState(1000);
  const [latencyMs, setLatencyMs] = useState(250);

  const analysis = useMemo(() => {
    const feeRate = feeBps / 10000;
    const fees = tradeSize * feeRate;
    const totalCost = price + fees / tradeSize;
    const profitIfWin = 1.0 - totalCost;
    const lossIfLose = totalCost;
    const ev = probability * profitIfWin - (1 - probability) * lossIfLose;
    const evDollar = ev * tradeSize;
    const breakEven = totalCost;
    const probEdge = probability - breakEven;

    // Kelly
    const b = (1.0 / price) - 1;
    const kellyFull = Math.max(0, (b * probability - (1 - probability)) / b);
    const kellyHalf = kellyFull / 2;
    const positionDollar = capital * kellyHalf;
    const numContracts = positionDollar / price;

    // Slippage
    const liqRatio = tradeSize / Math.max(liquidity, 1);
    const slippagePct = 0.1 * Math.sqrt(liqRatio);
    const slippageCost = tradeSize * slippagePct;

    // Execution decay
    const decayFactor = Math.exp(-0.693 * latencyMs / 5000);
    const capturedEdge = Math.abs(probEdge) * 100 * decayFactor;

    // Gross/Net
    const grossEdge = tradeSize * Math.max(0, probability - price);
    const netEdge = grossEdge - fees - slippageCost;
    const roi = tradeSize > 0 ? (netEdge / tradeSize) * 100 : 0;

    return {
      ev: +ev.toFixed(4), evDollar: +evDollar.toFixed(2), breakEven: +breakEven.toFixed(4),
      breakEvenPct: +(breakEven * 100).toFixed(1), probEdge: +probEdge.toFixed(4),
      probEdgePct: +(probEdge * 100).toFixed(1), isPositiveEv: ev > 0,
      kellyFull: +(kellyFull * 100).toFixed(1), kellyHalf: +(kellyHalf * 100).toFixed(1),
      positionDollar: +positionDollar.toFixed(0), numContracts: +numContracts.toFixed(0),
      slippagePct: +(slippagePct * 100).toFixed(2), slippageCost: +slippageCost.toFixed(2),
      decayFactor: +(decayFactor * 100).toFixed(1), capturedEdge: +capturedEdge.toFixed(2),
      grossEdge: +grossEdge.toFixed(2), netEdge: +netEdge.toFixed(2), roi: +roi.toFixed(2),
      fees: +fees.toFixed(2),
    };
  }, [price, probability, capital, liquidity, feeBps, tradeSize, latencyMs]);

  // EV sensitivity curve
  const evCurve = useMemo(() => {
    return Array.from({ length: 19 }, (_, i) => {
      const p = (i + 1) * 0.05;
      const totalCost = price + (feeBps / 10000 * tradeSize) / tradeSize;
      const ev = p * (1 - totalCost) - (1 - p) * totalCost;
      return { probability: +(p * 100).toFixed(0), ev: +(ev * 100).toFixed(2) };
    });
  }, [price, feeBps, tradeSize]);

  const Input = ({ label, value, onChange, min, max, step, unit, description }: any) => (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <label className="text-xs text-[var(--text-tertiary)]">{label}</label>
        <span className="mono text-sm text-[var(--text-primary)]">{typeof value === 'number' && value >= 100 ? value.toLocaleString() : value}{unit}</span>
      </div>
      <input type="range" className="range-slider" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} />
      {description && <div className="text-[0.6rem] text-[var(--text-muted)] mt-1">{description}</div>}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-1">What-If Lab</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-1">&ldquo;What&apos;s the trade actually worth?&rdquo;</p>
      <p className="text-xs text-[var(--text-muted)] mb-6">Adjust any parameter — the entire analysis updates in real time.</p>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="glass-card-static p-6">
          <h2 className="text-sm font-bold mb-4">Parameters</h2>
          <Input label="Market Price" value={price} onChange={setPrice} min={0.05} max={0.95} step={0.01} unit="" description="Current contract price" />
          <Input label="Your Probability" value={(probability * 100).toFixed(0)} onChange={(v: number) => setProbability(v / 100)} min={5} max={95} step={1} unit="%" description="Your estimated probability" />
          <Input label="Capital" value={capital} onChange={setCapital} min={1000} max={100000} step={1000} unit="" description="" />
          <Input label="Liquidity" value={liquidity} onChange={setLiquidity} min={1000} max={200000} step={1000} unit="" description="" />
          <Input label="Fees" value={feeBps} onChange={setFeeBps} min={0} max={300} step={10} unit=" bps" description="" />
          <Input label="Trade Size" value={tradeSize} onChange={setTradeSize} min={100} max={20000} step={100} unit="" description="" />
          <Input label="Execution Delay" value={latencyMs} onChange={setLatencyMs} min={50} max={10000} step={50} unit="ms" description="" />

          <button className="btn btn-ghost w-full mt-4 text-xs" onClick={() => { setPrice(0.62); setProbability(0.68); setCapital(10000); setLiquidity(25000); setFeeBps(100); setTradeSize(1000); setLatencyMs(250); }}>
            Reset Assumptions
          </button>
        </div>

        {/* Results */}
        <div className="md:col-span-2 space-y-4">
          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="kpi-card">
              <div className="kpi-label">Expected Value</div>
              <div className={`kpi-value text-xl ${analysis.isPositiveEv ? 'positive' : 'negative'}`}>${analysis.evDollar}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Net Edge</div>
              <div className={`kpi-value text-xl ${analysis.netEdge > 0 ? 'positive' : 'negative'}`}>${analysis.netEdge}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Kelly (Half)</div>
              <div className="kpi-value text-xl text-[var(--cyan)]">{analysis.kellyHalf}%</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">ROI</div>
              <div className={`kpi-value text-xl ${analysis.roi > 0 ? 'positive' : 'negative'}`}>{analysis.roi}%</div>
            </div>
          </div>

          {/* Detailed breakdown */}
          <div className="glass-card-static p-6">
            <h3 className="text-sm font-bold mb-3">Detailed Breakdown</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">Break-even Probability</span>
                <span className="mono">{analysis.breakEvenPct}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">Probability Edge</span>
                <span className={`mono ${analysis.probEdgePct > 0 ? 'positive' : 'negative'}`}>{analysis.probEdgePct > 0 ? '+' : ''}{analysis.probEdgePct}pp</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">Gross Edge</span>
                <span className="mono">${analysis.grossEdge}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">Fees</span>
                <span className="mono text-[var(--rose)]">−${analysis.fees}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">Slippage</span>
                <span className="mono text-[var(--rose)]">−${analysis.slippageCost} ({analysis.slippagePct}%)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">Edge Captured</span>
                <span className="mono">{analysis.decayFactor}% (at {latencyMs}ms)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">Position Size (½ Kelly)</span>
                <span className="mono">${analysis.positionDollar.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">Contracts</span>
                <span className="mono">{analysis.numContracts}</span>
              </div>
            </div>
          </div>

          {/* EV Sensitivity Chart */}
          <div className="chart-container">
            <div className="chart-title">Expected Value Sensitivity</div>
            <div className="chart-subtitle">How EV changes as your probability estimate varies (current estimate: {(probability * 100).toFixed(0)}%)</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={evCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,149,176,0.08)" />
                <XAxis dataKey="probability" tick={{ fontSize: 10, fill: '#5a6580' }} label={{ value: 'Your Probability (%)', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#5a6580' }} />
                <YAxis tick={{ fontSize: 10, fill: '#5a6580' }} label={{ value: 'EV (¢)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#5a6580' }} />
                <Tooltip contentStyle={{ background: '#151d35', border: '1px solid rgba(139,149,176,0.2)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="ev">
                  {evCurve.map((entry, i) => (
                    <Cell key={i} fill={entry.ev >= 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="text-[0.65rem] text-[var(--text-muted)] italic mt-2">
              Your probability estimate is the key assumption. Small changes can flip EV from positive to negative.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
