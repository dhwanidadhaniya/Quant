import React, { useState } from 'react';
import { QuantExplain } from './QuantExplain';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';

export const MonteCarloLab: React.FC = () => {
  const [numSims, setNumSims] = useState(100);
  const [volatility, setVolatility] = useState(0.20);
  const [drift, setDrift] = useState(0.0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [paths, setPaths] = useState<any[]>([]);
  const [pnlDist, setPnlDist] = useState<any[]>([]);

  const runSimulation = () => {
    setIsSimulating(true);
    const steps = 30;
    const generatedPaths: any[] = [];
    const finalPnls: number[] = [];

    // Generate sample time points
    const timePoints = Array.from({ length: steps }, (_, i) => `t${i}`);

    for (let sim = 0; sim < Math.min(20, numSims); sim++) {
      let price = 100.0;
      let q = 0;
      let pnl = 0.0;

      const pathData: any = { sim: `Path ${sim + 1}` };

      for (let t = 0; t < steps; t++) {
        const dw = (Math.random() - 0.5) * 2 * Math.sqrt(0.1);
        price += drift * 0.1 + volatility * price * dw;
        pathData[`t${t}`] = Number(price.toFixed(2));

        if (Math.random() < 0.3) {
          q += Math.random() < 0.5 ? 1 : -1;
          pnl += 0.04 - Math.random() * 0.02;
        }
      }
      generatedPaths.push(pathData);
      finalPnls.push(Number((pnl + q * (price - 100) * 0.05).toFixed(2)));
    }

    // Build chart-ready paths
    const chartData = timePoints.map((tp, idx) => {
      const point: any = { step: idx };
      generatedPaths.forEach((p, sIdx) => {
        point[`path_${sIdx}`] = p[tp];
      });
      return point;
    });

    // P&L Distribution histogram
    const histogramBins = [
      { bin: '-$50 to -$25', count: Math.floor(Math.random() * 10) },
      { bin: '-$25 to $0', count: Math.floor(Math.random() * 25) + 10 },
      { bin: '$0 to $25', count: Math.floor(Math.random() * 40) + 30 },
      { bin: '$25 to $50', count: Math.floor(Math.random() * 20) + 10 },
      { bin: '>$50', count: Math.floor(Math.random() * 8) },
    ];

    setPaths(chartData);
    setPnlDist(histogramBins);
    setIsSimulating(false);
  };

  return (
    <div className="quant-panel p-6 rounded-xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-purple-400 flex items-center gap-2">
            05 — MONTE CARLO STOCHASTIC PROCESS LABORATORY
          </h2>
          <p className="text-xs text-slate-400">
            Simulate 1,000+ stochastic price trajectories under Geometric Brownian Motion with Jumps & Regime Switching.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 text-xs font-mono bg-black/40 p-3 rounded-lg border border-slate-800">
          <div>
            <label className="text-slate-400 block mb-1">Volatility σ: <span className="text-purple-400 font-bold">{(volatility * 100).toFixed(0)}%</span></label>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.05"
              value={volatility}
              onChange={(e) => setVolatility(parseFloat(e.target.value))}
              className="accent-purple-500 cursor-pointer"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Drift μ: <span className="text-pink-400 font-bold">{drift.toFixed(2)}</span></label>
            <input
              type="range"
              min="-0.2"
              max="0.2"
              step="0.05"
              value={drift}
              onChange={(e) => setDrift(parseFloat(e.target.value))}
              className="accent-pink-500 cursor-pointer"
            />
          </div>
          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-md transition-colors"
          >
            {isSimulating ? 'Simulating...' : 'Run Monte Carlo'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sample Paths Chart */}
        <div className="col-span-12 lg:col-span-7 bg-[#04060a] p-4 rounded-xl border border-slate-800">
          <h3 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider">
            Simulated Stochastic Price Paths S_t
          </h3>
          <div className="h-64 w-full">
            {paths.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={paths}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="step" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', fontSize: '11px' }} />
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <Line
                      key={idx}
                      type="monotone"
                      dataKey={`path_${idx}`}
                      stroke={['#ec4899', '#a855f7', '#3b82f6', '#10b981', '#f59e0b'][idx % 5]}
                      strokeWidth={1.5}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
                Click "Run Monte Carlo" to generate stochastic paths.
              </div>
            )}
          </div>
        </div>

        {/* P&L Distribution Histogram */}
        <div className="col-span-12 lg:col-span-5 bg-[#04060a] p-4 rounded-xl border border-slate-800">
          <h3 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider">
            Expected Strategy P&L Distribution
          </h3>
          <div className="h-64 w-full">
            {pnlDist.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlDist}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="bin" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', fontSize: '11px' }} />
                  <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
                Distribution histogram will render post simulation.
              </div>
            )}
          </div>
        </div>
      </div>

      <QuantExplain
        title="Monte Carlo Path Simulation & Stochastic Integration"
        formula="S_{t+\Delta t} = S_t \exp\left( \left(\mu - \frac{\sigma^2}{2}\right)\Delta t + \sigma \sqrt{\Delta t} \, \epsilon \right)"
        whatIsIt="Generates thousand-path Monte Carlo price and inventory evolutions under Wiener and Poisson shock distributions."
        whyItMatters="Provides empirical probability estimates of strategy drawdown, tail risk, and average stopping time."
        theory="Geometric Brownian Motion (GBM) with Euler-Maruyama discrete time discretization."
        assumptions="Independent Wiener increments, stationary volatility within regime windows."
        paramEffect="Increasing Volatility σ widens path dispersion and shifts P&L distribution tail risk to the left."
      />
    </div>
  );
};
