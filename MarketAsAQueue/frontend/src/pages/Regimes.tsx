import { useEffect, useState } from "react";
import { Explain, Panel, Stat, fmt, pct } from "../components/explain/Explain";
import { Gauge } from "../components/charts/Charts";
import { api } from "../lib/api";
import { useMarket } from "../lib/store";

export function Regimes() {
  const s = useMarket((st) => st.state);
  const [sig, setSig] = useState<any>(null);
  const [hist, setHist] = useState<any>(null);

  useEffect(() => {
    api.imbalance().then(setSig);
    api.history().then(setHist);
  }, [s?.t && Math.floor((s?.t ?? 0) / 3)]);

  const qi = s?.book.imbalance ?? 0;
  const pos = ((qi + 1) / 2) * 100;

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12">
        <div className="kicker text-fuchsia">09 · REGIMES</div>
        <h1 className="font-display text-4xl">
          Pressure, markout, <span className="text-cyan">imbalance</span>
        </h1>
      </div>

      <Panel kicker="NOW" title="Current regime" className="col-span-12 md:col-span-5">
        <div className="font-display text-3xl uppercase text-pink">
          {String(s?.regime?.current ?? "—").replace(/_/g, " ")}
        </div>
        <Gauge value={s?.regime?.confidence ?? 0} label={`CONFIDENCE ${pct(s?.regime?.confidence, 0)}`} />
        <ul className="mt-3 space-y-1 font-mono text-[12px]">
          {(s?.regime?.drivers ?? []).map((d: any) => (
            <li key={d.name} className="flex justify-between">
              <span className="text-mute">{d.name}</span>
              <span>{fmt(d.score, 2)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] text-mute">
          Drivers are observables: depth, |QI|, λ_M, λ_C, realized vol, and an explicit shock flag. Model-defined
          labels — not a vendor taxonomy.
        </p>
      </Panel>

      <Panel kicker="QI" title="Bid-ask queue imbalance" className="col-span-12 md:col-span-7">
        <Explain
          title="Queue imbalance"
          formula="QI = (Q_bid − Q_ask) / (Q_bid + Q_ask)"
          what="Scale-free signed pressure at the touch."
          why="The shortest-horizon picture of which queue is the wall."
          theory="Order-book imbalance literature."
          interpretation={qi > 0.15 ? "BUY PRESSURE in displayed size" : qi < -0.15 ? "SELL PRESSURE" : "BALANCED"}
          trading="A statistic, not a signal — until you measure it against future returns."
          limitation="Displayed only. Fleeting size can spoof QI."
        >
          <div className="relative mt-4 h-3 bg-gradient-to-r from-pink via-white/30 to-cyan">
            <div className="absolute top-[-6px] h-6 w-[2px] bg-white" style={{ left: `${pos}%` }} />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-mute">
            <span>−1 SELL</span>
            <span>0</span>
            <span>+1 BUY</span>
          </div>
          <div className="mt-4 num text-4xl">{pct(qi, 0)}</div>
        </Explain>
      </Panel>

      <Panel kicker="QI → r" title="Imbalance versus future mid return" className="col-span-12 lg:col-span-7">
        <Explain
          title="Do not claim alpha you have not measured"
          formula="corr(QI_t, r_{t+Δ})"
          what="Scatter of current imbalance against subsequent simulated mid return."
          why="The question is empirical. This engine injects a mild QI→flow coupling so the cloud is educationally visible."
          theory="Short-horizon predictive regression on SIMULATED data."
          interpretation={
            sig?.corr == null
              ? "Not enough points yet — let the engine run."
              : `corr=${fmt(sig.corr, 3)}  hit=${pct(sig.hit_rate, 0)}  n=${sig.n}`
          }
          trading="A positive simulated correlation is a property of this generator, not of the S&P."
          limitation={sig?.disclaimer ?? "SIMULATED."}
        >
          <svg viewBox="0 0 420 220" className="w-full bg-black">
            <line x1="210" y1="0" x2="210" y2="220" stroke="#ffffff22" />
            <line x1="0" y1="110" x2="420" y2="110" stroke="#ffffff22" />
            {(sig?.points ?? []).map((p: any, i: number) => (
              <circle
                key={i}
                cx={((p.qi + 1) / 2) * 420}
                cy={110 - p.r * 4000}
                r="2"
                fill="#ff2d95"
                opacity="0.6"
              />
            ))}
          </svg>
          <div className="mt-2 grid grid-cols-5 gap-1 font-mono text-[10px]">
            {(sig?.conditional ?? []).map((c: any) => (
              <div key={c.lo} className="hairline p-2">
                <div className="text-mute">
                  {c.lo}..{c.hi}
                </div>
                <div>{c.mean_r == null ? "—" : c.mean_r.toExponential(2)}</div>
                <div className="text-mute">n={c.n}</div>
              </div>
            ))}
          </div>
        </Explain>
      </Panel>

      <Panel kicker="MARKOUT" title="Adverse selection after a fill" className="col-span-12 lg:col-span-5">
        <p className="text-[12px] text-mute">
          If your buy limit fills and the mid then falls, you were adversely selected. Horizons: 10ms, 100ms, 1s, 5s,
          30s. Place an order and let it fill to accumulate a distribution. SIMULATED fills only.
        </p>
        <ul className="mt-3 max-h-56 overflow-auto font-mono text-[11px]">
          {(hist?.markouts ?? []).slice(-12).map((m: any, i: number) => (
            <li key={i} className="flex justify-between border-b border-white/5 py-1">
              <span>{m.side}</span>
              <span>1s {fmt(m.m_1, 4)}</span>
              <span>5s {fmt(m.m_5, 4)}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel kicker="CONSTELLATION" title="Order lifetime field" className="col-span-12">
        <Explain
          title="Lifetime constellation"
          formula="point = (entry time, lifetime, size, outcome)"
          what="Each order is a point. Filled vs cancelled is color."
          why="Patient liquidity lives; fleeting liquidity is a spark."
          theory="Descriptive point process of order lives."
          interpretation="A cloud near lifetime=0 is cancel-heavy. Long-lived filled points are sticky size."
          trading="If the book is a spark field, displayed depth is a rumor."
          limitation="SIMULATED lifetimes from this engine."
        >
          <svg viewBox="0 0 900 220" className="w-full bg-black">
            {(hist?.lifetimes ?? []).map((o: any, i: number) => (
              <circle
                key={i}
                cx={40 + (i % 80) * 10}
                cy={200 - Math.min(190, o.lifetime * 25)}
                r={Math.max(1.5, Math.sqrt(o.qty) / 6)}
                fill={o.outcome === "filled" ? "#3dfff3" : "#ff2d95"}
                opacity="0.75"
              />
            ))}
          </svg>
          <div className="kicker mt-1">
            <span className="text-cyan">FILLED</span> · <span className="text-pink">CANCELLED</span>
          </div>
        </Explain>
      </Panel>
    </div>
  );
}
