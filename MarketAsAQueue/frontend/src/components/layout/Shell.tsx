import { NavLink, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { NAV } from "../../lib/types";
import { connectMarket, useMarket } from "../../lib/store";
import { api } from "../../lib/api";
import { FormulaDrawer } from "../formula/FormulaDrawer";
import { fmt, pct } from "../explain/Explain";

const PROCESS = [
  "ARRIVAL",
  "BOOK",
  "QUEUE",
  "POSITION",
  "CANCEL",
  "MARKET",
  "MATCH",
  "EXECUTE",
  "DEPLETE",
  "PRICE",
  "REPLENISH",
  "NEW STATE",
];

export function Shell() {
  const connected = useMarket((s) => s.connected);
  const state = useMarket((s) => s.state);
  const explain = useMarket((s) => s.explain);
  const toggleExplain = useMarket((s) => s.toggleExplain);
  const toggleFormula = useMarket((s) => s.toggleFormula);

  useEffect(() => {
    const ws = connectMarket();
    return () => ws.close();
  }, []);

  const t = state?.ticker ?? [];

  return (
    <div className="flex min-h-screen">
      <nav className="sticky top-0 flex h-screen w-[210px] shrink-0 flex-col border-r border-pink/15 bg-black/40">
        <div className="border-b border-pink/20 px-4 py-5">
          <div className="kicker text-fuchsia">RESEARCH TERMINAL</div>
          <div className="font-display text-[22px] leading-none tracking-tight">
            MARKET
            <br />
            AS A<br />
            <span className="text-pink">QUEUE</span>
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto py-2">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  `flex items-baseline gap-2 px-4 py-2 ${isActive ? "bg-pink/15 text-mist" : "text-mute hover:text-mist"}`
                }
              >
                <span className="font-mono text-[10px] text-pink">{n.n}</span>
                <span className="flex flex-col">
                  <span className="font-display text-[13px]">{n.label}</span>
                  <span className="font-mono text-[9px] text-mute">{n.sub}</span>
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="border-t border-pink/15 p-3 font-mono text-[10px] text-mute">
          <div className="text-fuchsia">{state?.source ?? "SIMULATED"} MARKET</div>
          <div>t = {fmt(state?.t, 2)}s</div>
          <div className={connected ? "text-cyan" : "text-pink"}>{connected ? "ENGINE LINK" : "RECONNECTING"}</div>
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-pink/15 bg-void/80 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
            <div className="flex items-center gap-3 overflow-x-auto font-mono text-[10px] text-mute">
              {PROCESS.map((p, i) => (
                <span key={p} className="flex items-center gap-3">
                  <span className="text-mist">{p}</span>
                  {i < PROCESS.length - 1 && <span className="text-pink">→</span>}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleExplain} className={`kicker px-2 py-1 ${explain ? "bg-pink text-void" : "hairline"}`}>
                EXPLAIN {explain ? "ON" : "OFF"}
              </button>
              <button onClick={toggleFormula} className="kicker hairline px-2 py-1">
                FORMULAS
              </button>
            </div>
          </div>
          <div className="flex gap-0 overflow-x-auto border-t border-pink/10">
            {t.map((a) => (
              <button
                key={a.symbol}
                onClick={() => api.selectAsset(a.symbol)}
                className={`flex min-w-[180px] flex-1 items-center justify-between gap-3 px-4 py-2 text-left ${
                  a.active ? "bg-pink/10" : ""
                }`}
              >
                <div>
                  <div className="kicker">{a.symbol}</div>
                  <div className="num text-lg">{fmt(a.mid, 2)}</div>
                </div>
                <div className="font-mono text-[10px] text-mute">
                  <div>SPD {fmt(a.spread, 2)}</div>
                  <div>DEP {Math.round(a.depth).toLocaleString()}</div>
                  <div className={a.imbalance && a.imbalance > 0 ? "text-cyan" : "text-pink"}>
                    QI {pct(a.imbalance, 0)}
                  </div>
                </div>
              </button>
            ))}
            <div className="kicker flex items-center px-4 text-fuchsia">SIMULATED · NOT A LIVE FEED</div>
          </div>
        </header>
        <main className="min-h-0 flex-1 p-4">
          <Outlet />
        </main>
      </div>
      <FormulaDrawer />
    </div>
  );
}
