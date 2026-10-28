import { useEffect, useState } from "react";
import { Explain, Panel, Stat, fmt, pct } from "../components/explain/Explain";
import { LineXY } from "../components/charts/Charts";
import { api } from "../lib/api";
import { useMarket } from "../lib/store";
import { UserQueue } from "./Overview";

export function ExecutionLab() {
  const s = useMarket((st) => st.state);
  const [mc, setMc] = useState<any>(null);
  const [cmp, setCmp] = useState<any>(null);
  const [dec, setDec] = useState<any>(null);

  useEffect(() => {
    api.execution().then(setCmp);
    api.decision().then(setDec);
  }, [s?.t && Math.floor(s.t / 2)]);

  const why = s?.fill?.why;

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12">
        <div className="kicker text-fuchsia">05 · EXECUTION LAB</div>
        <h1 className="font-display text-4xl">
          Fill is a function of the <span className="text-pink">queue</span>
        </h1>
        <p className="max-w-3xl text-sm text-mute">
          P(fill | X_t) = f(queue position, order flow, liquidity, cancellation, volatility, time). A limit order does
          not execute because you sent it.
        </p>
      </div>

      <Panel kicker="POSITION" title="Queue race" className="col-span-12 lg:col-span-4">
        <UserQueue user={s?.user} onPlace={() => api.order("bid", 100)} onCancel={() => api.cancel()} />
        <p className="mt-3 text-[12px] text-mute">
          Rank falls as executions and cancels eat the shares ahead. Under FIFO, new limit orders join behind you at
          this price. A price improvement in front of you is how the market queue-jumps you without breaking FIFO.
        </p>
      </Panel>

      <Panel kicker="THEORY vs MC vs LIVE" title="Expected fill time" className="col-span-12 lg:col-span-8">
        <Explain
          title="Three estimates of T_fill"
          formula="E[T_fill]  vs  Monte Carlo  vs  realized"
          what="Closed-form competing risks, simulated paths of Q_ahead, and whatever actually happened to your order."
          why="A single number from a formula is a claim. Checking it is research."
          theory="Competing exponential clocks vs event-driven reduced-form MC."
          interpretation="They will disagree. That disagreement is the model-check."
          trading="Trade on a distribution, not on a point E[T]."
          limitation="MC does not open a new price in front of you."
          educational
        >
          <div className="grid grid-cols-3 gap-3">
            <Stat label="THEORETICAL E[T]" value={`${fmt(s?.fill?.E_T_fill, 1)}s`} />
            <Stat label="MC MEAN" value={`${fmt(mc?.mc?.mean, 1)}s`} />
            <Stat label="MC P(FILL)" value={pct(mc?.mc?.p_fill, 0)} />
          </div>
          <button
            onClick={() => api.monteCarlo(800).then(setMc)}
            className="mt-3 kicker bg-pink px-3 py-2 text-void"
          >
            RUN 800 QUEUE FUTURES
          </button>
          {mc?.check && (
            <p className="mt-2 font-mono text-[11px] text-mute">
              error {fmt(mc.check.error_pct, 2)}% · {mc.check.why_discrepancy}
            </p>
          )}
          {mc?.mc?.cdf && <LineXY pts={mc.mc.cdf.map((d: any) => ({ x: d.t, y: d.F }))} yMax={1} color="#3dfff3" />}
          {mc?.mc && (
            <div className="mt-2 font-mono text-[11px] text-mute">
              p10 {fmt(mc.mc.p10, 1)}s · p25 {fmt(mc.mc.p25, 1)}s · p50 {fmt(mc.mc.median, 1)}s · p75 {fmt(mc.mc.p75, 1)}s ·
              p90 {fmt(mc.mc.p90, 1)}s · censored {mc.mc.n_censored}/{mc.mc.n}
            </div>
          )}
        </Explain>
      </Panel>

      <Panel kicker="WHY?" title="Why did fill probability change?" className="col-span-12 md:col-span-6">
        {why ? (
          <div>
            <div className="flex gap-6 font-mono">
              <div>
                <div className="kicker">PREVIOUS 10s</div>
                <div className="text-2xl">{pct(why.previous, 0)}</div>
              </div>
              <div>
                <div className="kicker">CURRENT 10s</div>
                <div className="text-2xl text-fuchsia">{pct(why.current, 0)}</div>
              </div>
            </div>
            <ul className="mt-3 space-y-1 font-mono text-[12px]">
              {why.drivers.map((d: any) => (
                <li key={d.name} className="flex justify-between">
                  <span className="text-mute">{d.name}</span>
                  <span className={d.contrib >= 0 ? "text-cyan" : "text-pink"}>
                    {d.contrib >= 0 ? "+" : ""}
                    {d.contrib.toFixed(1)} pp
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-mute">Attribution appears once two fill snapshots exist.</p>
        )}
      </Panel>

      <Panel kicker="DECISION ENGINE" title="Transparent policy — not an opaque model" className="col-span-12 md:col-span-6">
        <div className="font-display text-2xl text-pink">{dec?.action ?? "—"}</div>
        <dl className="mt-2 grid grid-cols-2 gap-1 font-mono text-[11px]">
          {Object.entries(dec?.state ?? {}).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <dt className="text-mute">{k}</dt>
              <dd>{typeof v === "number" ? fmt(v as number, 3) : String(v)}</dd>
            </div>
          ))}
        </dl>
        <ul className="mt-3 list-disc pl-4 text-[12px] text-mist/80">
          {(dec?.reasons ?? []).map((r: string, i: number) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
        <p className="mt-2 font-mono text-[10px] text-mute">{dec?.disclaimer}</p>
      </Panel>

      <Panel kicker="STRATEGIES" title="None is universally best" className="col-span-12">
        <Explain
          title="Execution strategy comparison"
          formula="cost ≈ impact + spread paid − spread earned + adverse selection + wait risk"
          what="Market, limit, patient limit, aggressive limit, mid peg — same intent, different queue positions."
          why="Urgency, fill probability, and markout trade off. Ranking is state-dependent."
          theory="Optimal execution as a control problem on X_t (educational comparison, not an optimizer)."
          interpretation="A market order buys certainty and pays the book. A patient limit sells certainty and collects spread if it fills."
          trading="Match the policy to the deadline and to P(fill), not to a brand name."
          limitation="Numbers are model-implied on SIMULATED state."
        >
          <table className="w-full font-mono text-[11px]">
            <thead className="text-mute">
              <tr className="border-b border-pink/20 text-left">
                <th className="py-2">STRATEGY</th>
                <th>P(FILL)</th>
                <th>WAIT</th>
                <th>PRICE</th>
                <th>IMPACT</th>
                <th>ADVERSE</th>
                <th>OPP. COST</th>
              </tr>
            </thead>
            <tbody>
              {(cmp?.rows ?? []).map((r: any) => (
                <tr key={r.strategy} className="border-b border-white/5">
                  <td className="py-1 text-mist">{r.strategy}</td>
                  <td>{pct(r.fill_p, 0)}</td>
                  <td>{fmt(r.wait, 1)}s</td>
                  <td>{fmt(r.price, 3)}</td>
                  <td>{fmt(r.impact, 4)}</td>
                  <td>{fmt(r.adverse, 4)}</td>
                  <td>{fmt(r.opp, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[12px] text-mute">{cmp?.note}</p>
        </Explain>
      </Panel>
    </div>
  );
}
