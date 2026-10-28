import React, { useState } from 'react';
import { Activity, Pause, Play, Layers, Zap, BarChart2, FileText } from 'lucide-react';
import { DecisionPanel } from './components/DecisionPanel';
import { StoppingFrontier } from './components/StoppingFrontier';
import { OrderBook } from './components/OrderBook';
import { PnlAttribution } from './components/PnlAttribution';
import { ValueSurfaceLab } from './components/ValueSurfaceLab';
import { MonteCarloLab } from './components/MonteCarloLab';
import { BacktestLab } from './components/BacktestLab';
import { ResearchNotebook } from './components/ResearchNotebook';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'stopping' | 'lab' | 'backtest' | 'notebook'>('overview');
  const [isSimulating, setIsSimulating] = useState(true);

  // Simulated live state
  const [marketState] = useState({
    tick: 1842,
    mid_price: 100.24,
    spread: 0.08,
    microprice: 100.26,
    obi: 0.31,
    regime: 'HIGH VOLATILITY',
    volatility: 0.22,
    inventory: 7,
    max_inventory: 10,
    inventory_pct: 70.0,
    opt_bid: 100.18,
    opt_ask: 100.32,
    decision: 'WIDEN ASK',
    reason: 'Inventory utilization (70%) + High Volatility (22%) breached continuation threshold. Widening Ask quote to encourage inventory reduction.',
    v_continue: 0.012,
    v_stop: -0.095,
    confidence: 0.82,
    net_pnl: 142.50,
    gross_spread_pnl: 210.00,
    adverse_selection_cost: 67.50,
    unrealized_pnl: 12.00,
    order_book: {
      bids: [
        { price: 100.20, size: 120, orders: 5 },
        { price: 100.18, size: 85, orders: 3 },
        { price: 100.16, size: 60, orders: 2 },
        { price: 100.14, size: 45, orders: 2 },
        { price: 100.12, size: 30, orders: 1 },
      ],
      asks: [
        { price: 100.28, size: 45, orders: 2 },
        { price: 100.30, size: 70, orders: 4 },
        { price: 100.32, size: 95, orders: 3 },
        { price: 100.34, size: 110, orders: 6 },
        { price: 100.36, size: 140, orders: 8 },
      ]
    }
  });

  return (
    <div className="min-h-screen bg-[#05070c] text-slate-100 flex flex-col font-mono selection:bg-pink-500/30 selection:text-pink-300">
      {/* Top Header */}
      <header className="px-6 py-3 border-b border-slate-800 bg-[#090d16]/90 flex items-center justify-between backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-pink-500 shadow-[0_0_12px_#ec4899] animate-pulse" />
            <h1 className="text-base font-black tracking-widest text-white uppercase flex items-center gap-2">
              OPTIMAL STOPPING <span className="text-pink-500">MARKET-MAKING ENGINE</span>
            </h1>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/30 font-bold">
            INSTITUTIONAL QUANT RESEARCH LAB
          </span>
        </div>

        {/* Live Metrics Bar */}
        <div className="flex items-center gap-6 text-xs text-slate-400">
          <div>MARKET: <span className="text-emerald-400 font-bold">OPEN</span></div>
          <div>SIMULATION: <span className="text-pink-400 font-bold">{isSimulating ? 'RUNNING' : 'PAUSED'}</span></div>
          <div>LATENCY: <span className="text-white font-bold">2.4 ms</span></div>
          <div>TICKS: <span className="text-white font-bold">{marketState.tick.toLocaleString()}</span></div>
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            {isSimulating ? 'Pause Stream' : 'Resume Stream'}
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="px-6 py-2 border-b border-slate-800/80 bg-[#070a12] flex items-center gap-2 text-xs">
        {[
          { id: 'overview', label: '01 — MARKET OVERVIEW & DECISION FIELD', icon: Activity },
          { id: 'stopping', label: '04 — OPTIMAL STOPPING & VALUE SURFACE', icon: Layers },
          { id: 'lab', label: '05 — STOCHASTIC MONTE CARLO LAB', icon: Zap },
          { id: 'backtest', label: '09 — BACKTESTING & STRATEGY COMPARISON', icon: BarChart2 },
          { id: 'notebook', label: '11 — QUANT RESEARCH NOTEBOOK', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-md flex items-center gap-2 font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-[0_0_12px_rgba(236,72,153,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Sections */}
      <main className="flex-1 p-6 space-y-6 max-w-[1800px] mx-auto w-full">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-5">
              <DecisionPanel
                decision={marketState.decision}
                reason={marketState.reason}
                confidence={marketState.confidence}
                inventoryPct={marketState.inventory_pct}
                volatility={marketState.volatility}
                regime={marketState.regime}
              />
            </div>

            <div className="col-span-12 lg:col-span-7">
              <StoppingFrontier
                boundaryData={[]}
                currentVol={marketState.volatility}
                currentInv={marketState.inventory}
                decision={marketState.decision}
              />
            </div>

            <div className="col-span-12 lg:col-span-6">
              <OrderBook
                orderBook={marketState.order_book}
                midPrice={marketState.mid_price}
                microPrice={marketState.microprice}
                obi={marketState.obi}
              />
            </div>

            <div className="col-span-12 lg:col-span-6">
              <PnlAttribution
                grossSpread={marketState.gross_spread_pnl}
                adverseCost={marketState.adverse_selection_cost}
                unrealizedPnl={marketState.unrealized_pnl}
                netPnl={marketState.net_pnl}
              />
            </div>
          </div>
        )}

        {activeTab === 'stopping' && <ValueSurfaceLab />}
        {activeTab === 'lab' && <MonteCarloLab />}
        {activeTab === 'backtest' && <BacktestLab />}
        {activeTab === 'notebook' && <ResearchNotebook />}
      </main>

      {/* Footer Status Bar */}
      <footer className="px-6 py-2 border-t border-slate-800 bg-[#07090e] text-[11px] text-slate-500 flex justify-between">
        <div>OPTIMAL STOPPING MARKET-MAKING ENGINE v1.0.0 — INSTITUTIONAL EDITION</div>
        <div>MODEL STATUS: <span className="text-emerald-400">OPTIMAL CONTROL ACTIVE</span></div>
      </footer>
    </div>
  );
};

export default App;
