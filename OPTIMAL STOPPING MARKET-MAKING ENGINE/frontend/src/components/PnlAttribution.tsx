import React from 'react';
import { QuantExplain } from './QuantExplain';

interface PnlAttributionProps {
  grossSpread: number;
  adverseCost: number;
  unrealizedPnl: number;
  netPnl: number;
}

export const PnlAttribution: React.FC<PnlAttributionProps> = ({
  grossSpread,
  adverseCost,
  unrealizedPnl,
  netPnl
}) => {
  return (
    <div className="quant-panel p-4 rounded-xl flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            QUANTITATIVE P&L ATTRIBUTION LAB
          </h3>
          <span className="text-xs font-mono font-bold text-emerald-400">Net: ${netPnl.toFixed(2)}</span>
        </div>

        {/* Waterfall Decomposition */}
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-slate-300">+ Gross Spread Capture</span>
            <span className="text-emerald-400 font-bold">+${grossSpread.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center p-2 rounded bg-rose-500/10 border border-rose-500/20">
            <span className="text-slate-300">- Adverse Selection Cost</span>
            <span className="text-rose-400 font-bold">-${adverseCost.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center p-2 rounded bg-purple-500/10 border border-purple-500/20">
            <span className="text-slate-300">+/- Inventory Mark-to-Market</span>
            <span className={unrealizedPnl >= 0 ? "text-purple-400 font-bold" : "text-amber-400 font-bold"}>
              {unrealizedPnl >= 0 ? `+$${unrealizedPnl.toFixed(2)}` : `-$${Math.abs(unrealizedPnl).toFixed(2)}`}
            </span>
          </div>

          <div className="flex justify-between items-center p-2.5 rounded bg-pink-500/20 border border-pink-500/40 font-bold text-white text-sm">
            <span>= Net Market-Maker P&L</span>
            <span className={netPnl >= 0 ? "text-emerald-400" : "text-rose-400"}>${netPnl.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <QuantExplain
        title="Market-Maker P&L Attribution"
        formula="\Pi_{Net} = \text{SpreadCapture} - \text{AdverseSelection} \pm \text{InventoryMtM}"
        whatIsIt="Decomposes total market making returns into raw bid-ask spread earned minus toxic flow losses and position holding drift."
        whyItMatters="Market makers can earn positive gross spread but lose money overall if adverse selection cost exceeds spread width."
        theory="Glosten-Milgrom & Avellaneda-Stoikov Microstructure P&L decomposition."
        assumptions="Markouts measured over 1-second horizon post execution."
        paramEffect="Widening spread increases Gross Spread, but reduces fill rate. Skewing quotes minimizes Adverse Selection cost."
      />
    </div>
  );
};
