import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import CommandBar from "./CommandBar";
import Ticker from "./Ticker";
import { api, type Ipo } from "../lib/api";
import { useMode } from "../state";

const NAV = [
  ["/", "PULSE"],
  ["/gmp", "GMP VS REALITY"],
  ["/when", "WHEN GMP WORKS"],
  ["/constellation", "CONSTELLATION"],
  ["/sector", "SECTOR"],
  ["/quant", "QUANT LAB"],
  ["/backtest", "BACKTEST"],
  ["/universe", "UNIVERSE"],
];

export default function Shell() {
  const [items, setItems] = useState<Ipo[]>([]);
  const [n, setN] = useState(0);
  const { mode, setMode } = useMode();
  useEffect(() => {
    api.ipos("?limit=80").then((r) => { setItems(r.items); setN(r.n); });
  }, []);

  return (
    <div className="h-screen flex flex-col bg-void text-readout relative">
      <header className="h-8 flex items-center justify-between px-3 border-b border-line bg-chassis">
        <div className="flex items-center gap-3">
          <span className="tabular text-[12px] tracking-widest">IPO ALPHA INTELLIGENCE</span>
          <span className="w-1.5 h-1.5 bg-quant" />
          <span className="micro">HISTORICAL EXTRACT · NOT A LIVE MARKET FEED</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="micro">N={n}</span>
          <button className={`micro px-2 border ${mode.research ? "border-magenta text-magenta" : "border-line text-dim"}`} onClick={() => setMode({ research: !mode.research })}>RESEARCH</button>
          <button className={`micro px-2 border ${mode.learn ? "border-magenta text-magenta" : "border-line text-dim"}`} onClick={() => setMode({ learn: !mode.learn })}>LEARN</button>
          <span className="micro">{new Date().toISOString().slice(0, 19)}Z</span>
        </div>
      </header>
      <CommandBar />
      <Ticker items={items} />
      <nav className="flex shrink-0 border-b border-line overflow-x-auto bg-chassis z-10">
        {NAV.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `micro px-3 py-1.5 border-r border-line ${isActive ? "text-magenta bg-plum" : "text-dim hover:text-readout"}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
    </div>
  );
}
