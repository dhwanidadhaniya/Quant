import React from 'react';
import { QuantExplain } from './QuantExplain';

export const ResearchNotebook: React.FC = () => {
  return (
    <div className="quant-panel p-6 rounded-xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-blue-400 flex items-center gap-2">
          11 — QUANT RESEARCH NOTEBOOK & FORMULA REFERENCE LIBRARY
        </h2>
        <p className="text-xs text-slate-400">
          Theoretical motivation, mathematical formulations, and institutional assumptions of optimal stopping market making.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6 text-xs leading-relaxed text-slate-300 font-mono">
        <div className="col-span-12 lg:col-span-6 space-y-4">
          <div className="p-4 bg-[#04060a] rounded-xl border border-slate-800">
            <h3 className="font-bold text-pink-400 mb-2 uppercase text-sm">1. Central Intellectual Narrative</h3>
            <p>
              Market making is not simply about continuously posting a bid and ask. The market maker must constantly balance expected spread capture against execution probability, inventory risk, adverse selection, volatility, and market impact.
            </p>
            <p className="mt-2 text-slate-400">
              The central intellectual narrative answers: At what point does the expected value of continuing to provide liquidity fall below the value of stopping or liquidating exposure?
            </p>
          </div>

          <div className="p-4 bg-[#04060a] rounded-xl border border-slate-800">
            <h3 className="font-bold text-purple-400 mb-2 uppercase text-sm">2. Free Boundary Snell Envelope Formulation</h3>
            <div className="p-2.5 bg-black/60 rounded border border-purple-500/30 text-purple-300 text-center font-bold mb-2">
              V(t, x) = sup E[ U(X_t) ]
            </div>
            <p>
              The state space X_t = (q_t, sigma_t, OBI_t) evolves stochastically. The stopping time tau* represents the optimal moment to halt quoting when V_continue &lt;= V_stop.
            </p>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-6 space-y-4">
          <div className="p-4 bg-[#04060a] rounded-xl border border-slate-800">
            <h3 className="font-bold text-emerald-400 mb-2 uppercase text-sm">3. Key Microstructure Equations</h3>
            <div className="space-y-2">
              <div className="p-2 bg-slate-900/80 rounded border border-slate-800 flex justify-between">
                <span className="text-slate-400">Microprice:</span>
                <span className="text-emerald-400 font-bold">MP = (P_ask * V_bid + P_bid * V_ask) / (V_bid + V_ask)</span>
              </div>
              <div className="p-2 bg-slate-900/80 rounded border border-slate-800 flex justify-between">
                <span className="text-slate-400">Order Book Imbalance (OBI):</span>
                <span className="text-emerald-400 font-bold">OBI = (V_bid - V_ask) / (V_bid + V_ask)</span>
              </div>
              <div className="p-2 bg-slate-900/80 rounded border border-slate-800 flex justify-between">
                <span className="text-slate-400">Fill Arrival Intensity:</span>
                <span className="text-emerald-400 font-bold">lambda(delta) = A * exp(-k * delta)</span>
              </div>
              <div className="p-2 bg-slate-900/80 rounded border border-slate-800 flex justify-between">
                <span className="text-slate-400">Inventory Quote Skew:</span>
                <span className="text-emerald-400 font-bold">delta_bid = delta_0 + alpha*q,  delta_ask = delta_0 - alpha*q</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#04060a] rounded-xl border border-slate-800">
            <h3 className="font-bold text-blue-400 mb-2 uppercase text-sm">4. Model Assumptions & Simplifications</h3>
            <ul className="list-disc pl-4 space-y-1 text-slate-400">
              <li>Geometric Brownian Motion price paths with discrete Poisson jumps.</li>
              <li>Symmetric linear liquidation costs for stopping time evaluations.</li>
              <li>Exogenous order arrival intensities without strategic trader feedback loops.</li>
            </ul>
          </div>
        </div>
      </div>

      <QuantExplain
        title="Quant Research Notebook & Literature References"
        formula="Market State -> Stochastic Dynamics -> Execution Risk -> Inventory -> Optimal Stopping -> Quote Decision -> P&L"
        whatIsIt="Interactive quantitative notebook integrating mathematical derivations, literature references, and model parameters."
        whyItMatters="Ensures transparency and financial rigor across every component of the market-making engine."
        theory="Avellaneda-Stoikov (2008), Ho-Stoll (1981), Glosten-Milgrom (1985)."
        assumptions="Log-normal price diffusion, mean-reverting order flow imbalance."
        paramEffect="Parameter modifications propagate dynamically across all simulation and optimal stopping modules."
      />
    </div>
  );
};
