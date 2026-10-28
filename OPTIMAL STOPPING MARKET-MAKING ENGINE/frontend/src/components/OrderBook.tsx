import React from 'react';
import { QuantExplain } from './QuantExplain';

interface OrderBookProps {
  orderBook: {
    bids: Array<{ price: number; size: number; orders: number }>;
    asks: Array<{ price: number; size: number; orders: number }>;
  };
  midPrice: number;
  microPrice: number;
  obi: number;
}

export const OrderBook: React.FC<OrderBookProps> = ({ orderBook, midPrice, microPrice, obi }) => {
  return (
    <div className="quant-panel p-4 rounded-xl flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            LIMIT ORDER BOOK & MICROPRICE
          </h3>
          <div className="flex gap-2 text-xs font-mono">
            <span className="text-slate-400">Mid: <strong className="text-white">{midPrice.toFixed(2)}</strong></span>
            <span className="text-slate-400">Micro: <strong className="text-pink-400">{microPrice.toFixed(2)}</strong></span>
          </div>
        </div>

        {/* Depth Imbalance Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
            <span className="text-emerald-400">Bid Depth ({(50 + obi * 50).toFixed(0)}%)</span>
            <span className="text-pink-400">OBI: {obi > 0 ? `+${obi}` : obi}</span>
            <span className="text-rose-400">Ask Depth ({(50 - obi * 50).toFixed(0)}%)</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 transition-all duration-300" style={{ width: `${50 + obi * 50}%` }} />
            <div className="bg-rose-500 transition-all duration-300" style={{ width: `${50 - obi * 50}%` }} />
          </div>
        </div>

        {/* Order Book Table */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Bids */}
          <div className="space-y-1">
            <div className="text-[10px] text-slate-500 uppercase font-semibold border-b border-slate-800 pb-1 flex justify-between">
              <span>Orders</span>
              <span>Size</span>
              <span>Bid Price</span>
            </div>
            {orderBook.bids.map((b, idx) => (
              <div key={idx} className="flex justify-between py-0.5 px-1 rounded bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400 font-mono">
                <span className="text-slate-500 text-[10px]">{b.orders}</span>
                <span>{b.size}</span>
                <span className="font-bold">{b.price.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Asks */}
          <div className="space-y-1">
            <div className="text-[10px] text-slate-500 uppercase font-semibold border-b border-slate-800 pb-1 flex justify-between">
              <span>Ask Price</span>
              <span>Size</span>
              <span>Orders</span>
            </div>
            {orderBook.asks.map((a, idx) => (
              <div key={idx} className="flex justify-between py-0.5 px-1 rounded bg-rose-500/5 hover:bg-rose-500/15 text-rose-400 font-mono">
                <span className="font-bold">{a.price.toFixed(2)}</span>
                <span>{a.size}</span>
                <span className="text-slate-500 text-[10px]">{a.orders}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <QuantExplain
        title="Microprice & Order Book Imbalance (OBI)"
        formula="MicroPrice = \frac{P_{ask}V_{bid} + P_{bid}V_{ask}}{V_{bid} + V_{ask}}"
        whatIsIt="Volume-weighted mid-price incorporating top-of-book depth imbalance."
        whyItMatters="Microprice leads mid-price changes. High bid depth pulls Microprice up before trades occur."
        theory="Market Microstructure order flow pressure theory."
        assumptions="Depth at top levels correlates directly with short-horizon aggressive order flow probability."
        paramEffect="Positive OBI signals buying pressure -> Reprice quotes higher or widen ask to avoid adverse fills."
      />
    </div>
  );
};
