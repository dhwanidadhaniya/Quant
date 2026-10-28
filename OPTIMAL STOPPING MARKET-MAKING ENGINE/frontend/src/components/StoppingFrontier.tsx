import React from 'react';
import { QuantExplain } from './QuantExplain';

interface StoppingFrontierProps {
  boundaryData: Array<{ volatility: number; threshold_inventory: number }>;
  currentVol: number;
  currentInv: number;
  decision: string;
}

export const StoppingFrontier: React.FC<StoppingFrontierProps> = ({
  boundaryData,
  currentVol,
  currentInv,
  decision
}) => {
  return (
    <div className="quant-panel p-4 rounded-xl flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-ping" />
            OPTIMAL STOPPING FRONTIER (2D STATE SPACE)
          </h3>
          <span className={`px-2.5 py-0.5 text-xs font-bold rounded ${
            decision === 'CONTINUE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
          }`}>
            {decision}
          </span>
        </div>

        {/* 2D Grid Visualizer */}
        <div className="relative w-full h-48 bg-[#04060a] rounded-lg border border-slate-800 p-2 overflow-hidden flex flex-col justify-between">
          <div className="absolute top-2 left-2 text-[10px] text-slate-500 font-semibold">
            Inventory Risk (q) →
          </div>
          <div className="absolute bottom-2 left-2 text-[10px] text-slate-500 font-semibold">
            Volatility (σ) ↑
          </div>

          <div className="absolute inset-0 grid grid-cols-2">
            <div className="bg-emerald-500/10 border-r border-dashed border-emerald-500/30 flex items-center justify-center">
              <span className="text-emerald-400/40 font-bold text-xs tracking-widest uppercase">🟢 Continue Region</span>
            </div>
            <div className="bg-rose-500/10 flex items-center justify-center">
              <span className="text-rose-400/40 font-bold text-xs tracking-widest uppercase">🔴 Stop Region</span>
            </div>
          </div>

          {/* Current State Indicator Pin */}
          <div 
            className="absolute z-10 w-4 h-4 rounded-full bg-pink-500 border-2 border-white shadow-[0_0_15px_#ec4899] transition-all duration-500 flex items-center justify-center"
            style={{
              left: `${Math.min(90, Math.max(10, 50 + (currentInv / 10) * 40))}%`,
              top: `${Math.min(90, Math.max(10, 100 - (currentVol / 0.5) * 80))}%`
            }}
          >
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
        </div>
      </div>

      <QuantExplain
        title="Optimal Stopping Boundary V(t,x)"
        formula="V(t,x) = \sup_{\tau} E[U(X_\tau)]"
        whatIsIt="Computes the free boundary separating continuation region from stopping region in state space (Inventory × Volatility)."
        whyItMatters="Tells the market maker exactly when inventory holding risk or volatility exceeds expected spread capture reward."
        theory="Snell Envelope / Dynamic Programming free boundary formulation for optimal stopping problems."
        assumptions="Log-normal price diffusion, quadratic risk aversion utility, fixed liquidation transaction cost."
        paramEffect="Higher volatility shifts boundary left (lower allowed inventory). Higher risk aversion narrows continuation region."
      />
    </div>
  );
};
