'use client';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ============================================================
// ARBITRAGE LAB — Single-venue and cross-venue analysis
// ============================================================

export default function ArbitrageLab() {
  const [tab, setTab] = useState<'single' | 'cross'>('cross');
  
  // Single-venue state
  const [yesPrice, setYesPrice] = useState(0.47);
  const [noPrice, setNoPrice] = useState(0.50);
  const [feeBps, setFeeBps] = useState(100);
  
  // Cross-venue state
  const [venueAYes, setVenueAYes] = useState(0.55);
  const [venueBYes, setVenueBYes] = useState(0.62);
  const [feeA, setFeeA] = useState(100);
  const [feeB, setFeeB] = useState(70);
  const [liqA, setLiqA] = useState(25000);
  const [liqB, setLiqB] = useState(18000);
  const [tradeSize, setTradeSize] = useState(1000);
  const [equivScore, setEquivScore] = useState(0.95);

  // Single-venue calculations
  const totalCost = yesPrice + noPrice;
  const grossEdge = 1.0 - totalCost;
  const feeRate = feeBps / 10000;
  const totalFees = totalCost * feeRate * 2;
  const netEdge = grossEdge - totalFees;
  const grossReturn = totalCost > 0 ? (grossEdge / totalCost) * 100 : 0;
  const netReturn = totalCost > 0 ? (netEdge / totalCost) * 100 : 0;

  // Cross-venue calculations
  const crossSpread = Math.abs(venueAYes - venueBYes);
  const pctDivergence = Math.min(venueAYes, venueBYes) > 0 ? (crossSpread / Math.min(venueAYes, venueBYes)) * 100 : 0;
  const buyYesPrice = Math.min(venueAYes, venueBYes);
  const buyNoPrice = 1 - Math.max(venueAYes, venueBYes);
  const crossTotalCost = buyYesPrice + buyNoPrice;
  const crossGrossEdge = 1.0 - crossTotalCost;
  const crossFees = tradeSize * ((feeA + feeB) / 2 / 10000);
  const minLiq = Math.min(liqA, liqB);
  const slippage = tradeSize * 0.1 * Math.sqrt(tradeSize / Math.max(minLiq, 1));
  const crossNetEdge = crossGrossEdge * (tradeSize / Math.max(crossTotalCost, 0.01)) - crossFees - slippage;

  const waterfallData = tab === 'single' ? [
    { name: 'Gross Edge', value: +(grossEdge * 100).toFixed(2), type: 'positive' },
    { name: 'Fees (x2 legs)', value: -(totalFees * 100), type: 'negative' },
    { name: 'Net Edge', value: +(netEdge * 100).toFixed(2), type: netEdge > 0 ? 'result-pos' : 'result-neg' },
  ] : [
    { name: 'Gross Spread', value: +(crossSpread * 100).toFixed(1), type: 'positive' },
    { name: 'Trading Fees', value: -(crossFees / tradeSize * 100 * 100).toFixed(1) as unknown as number, type: 'negative' },
    { name: 'Slippage', value: -(slippage / tradeSize * 100 * 100).toFixed(1) as unknown as number, type: 'negative' },
    { name: 'Net Edge', value: +(crossNetEdge / tradeSize * 100).toFixed(2), type: crossNetEdge > 0 ? 'result-pos' : 'result-neg' },
  ];

  const getBarColor = (type: string) => {
    if (type === 'positive') return '#10b981';
    if (type === 'negative') return '#f43f5e';
    if (type === 'result-pos') return '#22d3ee';
    return '#f43f5e';
  };

  return (
    <div className="max-w-5xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-1">Arbitrage Lab</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-6">Interactive arbitrage analysis — single-venue and cross-venue</p>

      <div className="tab-group mb-8 inline-flex">
        <button className={`tab ${tab === 'single' ? 'active' : ''}`} onClick={() => setTab('single')}>Single-Venue (YES+NO&lt;$1)</button>
        <button className={`tab ${tab === 'cross' ? 'active' : ''}`} onClick={() => setTab('cross')}>Cross-Venue</button>
      </div>

      {tab === 'single' ? (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="glass-card-static p-6">
            <h2 className="text-sm font-bold mb-4">Binary Market Inputs</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[var(--text-tertiary)] block mb-1">YES Price ($)</label>
                <input type="range" className="range-slider" min={0.01} max={0.99} step={0.01} value={yesPrice} onChange={e => setYesPrice(+e.target.value)} />
                <span className="mono text-sm ml-2">${yesPrice.toFixed(2)}</span>
              </div>
              <div>
                <label className="text-xs text-[var(--text-tertiary)] block mb-1">NO Price ($)</label>
                <input type="range" className="range-slider" min={0.01} max={0.99} step={0.01} value={noPrice} onChange={e => setNoPrice(+e.target.value)} />
                <span className="mono text-sm ml-2">${noPrice.toFixed(2)}</span>
              </div>
              <div>
                <label className="text-xs text-[var(--text-tertiary)] block mb-1">Taker Fee (bps)</label>
                <input type="range" className="range-slider" min={0} max={300} step={10} value={feeBps} onChange={e => setFeeBps(+e.target.value)} />
                <span className="mono text-sm ml-2">{feeBps} bps ({(feeBps / 100).toFixed(1)}%)</span>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-[var(--bg-tertiary)]">
              <div className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Formula</div>
              <div className="font-mono text-sm text-[var(--text-primary)]">Edge = $1.00 − (YES + NO)</div>
              <div className="font-mono text-sm text-[var(--text-secondary)] mt-1">= $1.00 − ${totalCost.toFixed(2)} = ${grossEdge.toFixed(3)}</div>
            </div>
          </div>

          {/* Results */}
          <div className="glass-card-static p-6">
            <h2 className="text-sm font-bold mb-4">Analysis</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)]">YES + NO</span>
                <span className={`mono font-semibold ${totalCost < 1 ? 'positive' : totalCost > 1 ? 'negative' : ''}`}>${totalCost.toFixed(3)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)]">Gross Edge / Contract</span>
                <span className={`mono font-semibold ${grossEdge > 0 ? 'positive' : 'negative'}`}>${grossEdge.toFixed(3)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)]">Gross Return</span>
                <span className={`mono font-semibold ${grossReturn > 0 ? 'positive' : 'negative'}`}>{grossReturn.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)]">Total Fees (both legs)</span>
                <span className="mono text-[var(--rose)]">−${(totalFees).toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                <span className="text-sm font-bold text-[var(--text-primary)]">Net Edge / Contract</span>
                <span className={`mono font-bold text-lg ${netEdge > 0 ? 'positive' : 'negative'}`}>${netEdge.toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-bold text-[var(--text-primary)]">Net Return</span>
                <span className={`mono font-bold ${netReturn > 0 ? 'positive' : 'negative'}`}>{netReturn.toFixed(2)}%</span>
              </div>
            </div>

            <div className={`mt-4 p-3 rounded-lg ${netEdge > 0 ? 'bg-[var(--emerald-dim)] border border-[rgba(16,185,129,0.25)]' : 'bg-[var(--rose-dim)] border border-[rgba(244,63,94,0.15)]'}`}>
              <div className="text-xs font-bold">{netEdge > 0 ? '✓ Positive net edge after fees' : '✗ Fees consume the theoretical edge'}</div>
              <div className="text-[0.7rem] text-[var(--text-secondary)] mt-1">
                {netEdge > 0 ? 'Theoretical single-venue arbitrage exists. Check liquidity before execution.' : 'Not profitable after transaction costs.'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Cross-venue inputs */}
          <div className="glass-card-static p-6">
            <h2 className="text-sm font-bold mb-4">Cross-Venue Inputs</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-[var(--cyan)] block mb-1">Polymarket YES</label>
                <input type="number" className="input-field" step={0.01} min={0.01} max={0.99} value={venueAYes} onChange={e => setVenueAYes(+e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-[var(--violet)] block mb-1">Kalshi YES</label>
                <input type="number" className="input-field" step={0.01} min={0.01} max={0.99} value={venueBYes} onChange={e => setVenueBYes(+e.target.value)} />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--text-tertiary)] block mb-1">Trade Size ($)</label>
                <input type="range" className="range-slider" min={100} max={10000} step={100} value={tradeSize} onChange={e => setTradeSize(+e.target.value)} />
                <span className="mono text-sm ml-2">${tradeSize.toLocaleString()}</span>
              </div>
              <div>
                <label className="text-xs text-[var(--text-tertiary)] block mb-1">Contract Equivalence Score</label>
                <input type="range" className="range-slider" min={0.5} max={1} step={0.01} value={equivScore} onChange={e => setEquivScore(+e.target.value)} />
                <span className="mono text-sm ml-2">{(equivScore * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Equivalence warning */}
            {equivScore < 0.85 && (
              <div className="mt-4 p-3 bg-[var(--amber-dim)] border border-[rgba(245,158,11,0.25)] rounded-lg">
                <div className="text-xs font-bold text-[var(--amber)]">⚠ Low Equivalence Score</div>
                <div className="text-[0.7rem] text-[var(--text-secondary)] mt-1">
                  Contracts may not be equivalent. Price difference may reflect genuine contract risk, not arbitrage.
                </div>
              </div>
            )}
          </div>

          {/* Cross-venue results */}
          <div className="glass-card-static p-6">
            <h2 className="text-sm font-bold mb-4">Cross-Venue Analysis</h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)]">Gross Spread</span>
                <span className="mono font-semibold text-[var(--amber)]">{(crossSpread * 100).toFixed(1)}¢ ({pctDivergence.toFixed(1)}%)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)]">Strategy</span>
                <span className="text-sm">Buy YES @ ${buyYesPrice.toFixed(2)}, Buy NO @ ${buyNoPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)]">Est. Fees</span>
                <span className="mono text-[var(--rose)]">−${crossFees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border)]">
                <span className="text-sm text-[var(--text-secondary)]">Est. Slippage</span>
                <span className="mono text-[var(--rose)]">−${slippage.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm font-bold">Net Edge (${tradeSize} trade)</span>
                <span className={`mono font-bold text-lg ${crossNetEdge > 0 ? 'positive' : 'negative'}`}>${crossNetEdge.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Waterfall Chart */}
      <div className="chart-container mt-8">
        <div className="chart-title">Transaction Cost Waterfall</div>
        <div className="chart-subtitle">How costs reduce the gross edge to net edge (in cents per contract)</div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={waterfallData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,149,176,0.08)" />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#5a6580' }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#8b95b0' }} width={120} />
            <Tooltip contentStyle={{ background: '#151d35', border: '1px solid rgba(139,149,176,0.2)', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {waterfallData.map((entry, i) => (
                <Cell key={i} fill={getBarColor(entry.type)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Key insight */}
      <div className="research-note mt-6">
        <div className="note-label">Why This Matters</div>
        <p className="text-sm text-[var(--text-secondary)]">
          The waterfall visualization makes transaction costs viscerally clear. A 7¢ gross spread can shrink to 2-3¢ after 
          fees and slippage — or even go negative. This is why we never call a price difference &ldquo;arbitrage&rdquo; 
          without first deducting costs.
        </p>
      </div>
    </div>
  );
}
