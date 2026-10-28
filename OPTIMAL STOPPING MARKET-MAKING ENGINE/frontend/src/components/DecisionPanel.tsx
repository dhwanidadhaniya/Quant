import React from 'react';
import { QuantExplain } from './QuantExplain';

interface DecisionPanelProps {
  decision: string;
  reason: string;
  confidence: number;
  inventoryPct: number;
  volatility: number;
  regime: string;
}

export const DecisionPanel: React.FC<DecisionPanelProps> = ({
  decision,
  reason,
  confidence,
  inventoryPct,
  volatility,
  regime
}) => {
  const getDecisionBadge = () => {
    switch (decision) {
      case 'CONTINUE':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
      case 'STOP':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]';
      case 'WIDEN ASK':
      case 'WIDEN BID':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]';
    }
  };

  return (
    <div className="quant-panel-glow p-5 rounded-xl flex flex-col justify-between h-full border border-pink-500/30">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold tracking-wider text-pink-400 uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
            OPTIMAL DECISION ENGINE
          </h2>
          <span className="text-xs font-mono text-slate-400">Model: OptStop-v1.4</span>
        </div>

        <div className="mb-4">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Current Action</div>
          <div className={`text-2xl font-black px-4 py-2 rounded-lg border flex items-center justify-between ${getDecisionBadge()}`}>
            <span>{decision}</span>
            <span className="text-xs font-mono font-normal opacity-80">{(confidence * 100).toFixed(0)}% Confidence</span>
          </div>
        </div>

        <div className="p-3 bg-black/40 rounded-lg border border-slate-800 text-xs leading-relaxed text-slate-300">
          <strong className="text-pink-400 font-semibold block mb-1">DECOMPOSITION REASONING:</strong>
          {reason}
        </div>

        {/* Dynamic Metric Chips */}
        <div className="grid grid-cols-3 gap-2 mt-4 text-xs font-mono">
          <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
            <div className="text-[10px] text-slate-500">Inventory Util</div>
            <div className="text-white font-bold">{inventoryPct}%</div>
          </div>
          <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
            <div className="text-[10px] text-slate-500">Volatility σ</div>
            <div className="text-white font-bold">{(volatility * 100).toFixed(1)}%</div>
          </div>
          <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
            <div className="text-[10px] text-slate-500">Regime</div>
            <div className="text-pink-400 font-bold text-[11px] truncate">{regime}</div>
          </div>
        </div>
      </div>

      <QuantExplain
        title="Optimal Quoting Control & Decision Logic"
        formula="\max_{\delta_{bid}, \delta_{ask}} \{ \mathbb{E}[\Delta \Pi] - \gamma \text{Var}(\Pi) \}"
        whatIsIt="Continuous decision process balancing continuation value against free boundary stopping condition."
        whyItMatters="Prevents ruinous drawdowns during adverse market shocks while capturing spread in calm markets."
        theory="Stochastic Control & Hamilton-Jacobi-Bellman (HJB) Dynamic Programming."
        assumptions="Poisson order arrival, Wiener mid-price diffusion."
        paramEffect="When inventory or adverse selection risk spikes, decision automatically transitions from CONTINUE -> WIDEN -> STOP."
      />
    </div>
  );
};
