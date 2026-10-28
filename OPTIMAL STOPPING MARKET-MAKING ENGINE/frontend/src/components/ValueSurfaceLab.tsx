import React, { useState, useEffect } from 'react';
import { QuantExplain } from './QuantExplain';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const ValueSurfaceLab: React.FC = () => {
  const [gamma, setGamma] = useState(0.15);
  const [spread, setSpread] = useState(0.08);
  const [gridData, setGridData] = useState<any[]>([]);
  const [boundary, setBoundary] = useState<any[]>([]);

  useEffect(() => {
    // Generate 2D surface grid
    const qRange = Array.from({ length: 21 }, (_, i) => i - 10);
    const volRange = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50];

    const newGrid: any[] = [];
    const newBoundary: any[] = [];

    volRange.forEach((vol) => {
      let stopFound = false;
      qRange.forEach((q) => {
        const spreadRev = (spread / 2.0) * (1.0 - 0.05 * Math.abs(q));
        const invRisk = 0.5 * gamma * (q ** 2) * (vol ** 2);
        const vCont = spreadRev - invRisk;
        const vStop = -Math.abs(q) * 0.015 - 0.05 * invRisk;

        const isContinue = vCont > vStop;
        newGrid.push({
          q,
          vol: vol.toFixed(2),
          vCont: Number(vCont.toFixed(4)),
          vStop: Number(vStop.toFixed(4)),
          action: isContinue ? 'CONTINUE' : 'STOP',
          value: Number(Math.max(vCont, vStop).toFixed(4)),
        });

        if (!isContinue && !stopFound) {
          newBoundary.push({ vol: vol.toFixed(2), threshold_q: q });
          stopFound = true;
        }
      });
      if (!stopFound) {
        newBoundary.push({ vol: vol.toFixed(2), threshold_q: 10 });
      }
    });

    setGridData(newGrid);
    setBoundary(newBoundary);
  }, [gamma, spread]);

  return (
    <div className="quant-panel p-6 rounded-xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-pink-400 flex items-center gap-2">
            04 — OPTIMAL STOPPING & VALUE FUNCTION SURFACE LAB
          </h2>
          <p className="text-xs text-slate-400">
            Free boundary Snell Envelope solution V(t,x) evaluating Continuation Value vs Liquidation Value across State Space (q × σ).
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-6 text-xs font-mono bg-black/40 p-3 rounded-lg border border-slate-800">
          <div>
            <label className="text-slate-400 block mb-1">Risk Aversion γ: <span className="text-pink-400 font-bold">{gamma}</span></label>
            <input
              type="range"
              min="0.01"
              max="0.5"
              step="0.01"
              value={gamma}
              onChange={(e) => setGamma(parseFloat(e.target.value))}
              className="accent-pink-500 cursor-pointer"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Bid-Ask Spread δ: <span className="text-emerald-400 font-bold">${spread}</span></label>
            <input
              type="range"
              min="0.02"
              max="0.20"
              step="0.01"
              value={spread}
              onChange={(e) => setSpread(parseFloat(e.target.value))}
              className="accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Value Function Surface Grid Heatmap */}
        <div className="col-span-12 lg:col-span-7 bg-[#04060a] p-4 rounded-xl border border-slate-800">
          <h3 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider">
            Value Function Surface V(q, σ) Heatmap
          </h3>
          <div className="grid grid-cols-11 gap-1 text-[10px] font-mono">
            {gridData.slice(0, 110).map((cell, idx) => (
              <div
                key={idx}
                className={`p-1.5 rounded text-center border transition-all ${
                  cell.action === 'CONTINUE'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                }`}
                title={`q: ${cell.q}, vol: ${cell.vol}, V_cont: ${cell.vCont}, V_stop: ${cell.vStop}`}
              >
                <div className="font-bold">{cell.q}</div>
                <div className="text-[8px] opacity-70">{cell.vCont}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-2 px-1">
            <span>← Short Inventory (-10)</span>
            <span>Zero Inventory (0)</span>
            <span>Long Inventory (+10) →</span>
          </div>
        </div>

        {/* Free Boundary Line Chart */}
        <div className="col-span-12 lg:col-span-5 bg-[#04060a] p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
              Optimal Stopping Threshold (Max Allowed Inventory vs Volatility)
            </h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={boundary}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="vol" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 10]} />
                  <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', fontSize: '11px' }} />
                  <Line type="monotone" dataKey="threshold_q" stroke="#ec4899" strokeWidth={2.5} dot={{ fill: '#ec4899' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <QuantExplain
        title="Snell Envelope & Dynamic Programming Value Function"
        formula="V(t, x) = \max \left\{ V_{\text{continue}}(x, t), \; V_{\text{stop}}(x, t) \right\}"
        whatIsIt="Calculates the state-dependent expected utility of continuing market making versus liquidating positions immediately."
        whyItMatters="Identifies the precise free boundary where expected future spread capture can no longer compensate for inventory volatility penalty."
        theory="Snell Envelope of Stochastic Processes & Hamilton-Jacobi-Bellman (HJB) Dynamic Programming."
        assumptions="Log-normal price diffusion, constant risk aversion utility, fixed linear liquidation cost."
        paramEffect="Increasing Risk Aversion γ penalizes high volatility cells, causing the magenta stopping boundary to collapse inward."
      />
    </div>
  );
};
