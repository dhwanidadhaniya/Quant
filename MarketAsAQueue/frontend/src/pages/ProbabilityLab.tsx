import { useEffect, useState } from "react";
import { Explain, Panel, fmt, pct } from "../components/explain/Explain";
import { DistChart, LineXY } from "../components/charts/Charts";
import { api } from "../lib/api";
import { useMarket } from "../lib/store";

export function ProbabilityLab() {
  const fill = useMarket((s) => s.state?.fill);
  const [name, setName] = useState("poisson");
  const [a, setA] = useState(8);
  const [b, setB] = useState(1.2);
  const [dist, setDist] = useState<{ x: number[]; y: number[] } | null>(null);

  useEffect(() => {
    api.distributions(name, a, b).then(setDist);
  }, [name, a, b]);

  const surv = (fill?.curve ?? []).map((p) => ({ x: p.t, y: p.S }));
  const haz = (fill?.curve ?? []).map((p) => ({ x: p.t, y: p.h }));
  const cdf = (fill?.curve ?? []).map((p) => ({ x: p.t, y: p.F }));

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12">
        <div className="kicker text-fuchsia">04 · PROBABILITY LAB</div>
        <h1 className="font-display text-4xl">
          Distributions that <span className="text-cyan">do work</span>
        </h1>
      </div>

      <Panel kicker="FAMILY" title="Transform a law" className="col-span-12 md:col-span-4">
        <div className="flex flex-wrap gap-1">
          {["poisson", "exponential", "geometric", "normal"].map((n) => (
            <button key={n} onClick={() => setName(n)} className={`kicker px-2 py-1 ${name === n ? "bg-cyan text-void" : "hairline"}`}>
              {n}
            </button>
          ))}
        </div>
        <label className="mt-4 block kicker">PARAM A {a.toFixed(2)}</label>
        <input type="range" min={0.2} max={20} step={0.1} value={a} onChange={(e) => setA(+e.target.value)} className="w-full" />
        <label className="mt-3 block kicker">PARAM B {b.toFixed(2)}</label>
        <input type="range" min={0.2} max={5} step={0.1} value={b} onChange={(e) => setB(+e.target.value)} className="w-full" />
        <p className="mt-3 text-[12px] text-mute">
          Poisson: count of arrivals in a unit interval. Exponential: waiting time. Geometric: trials until a fill
          clock rings in discrete time. Normal: a limit law, not a model of queues by itself.
        </p>
      </Panel>

      <Panel kicker={name.toUpperCase()} title="Mass / density" className="col-span-12 md:col-span-8">
        <Explain
          title="Why this law is here"
          formula={name === "poisson" ? "P(N=k)=e^{-λ} λ^k / k!" : name === "exponential" ? "f(t)=μ e^{-μ t}" : name}
          what="A probability law is a claim about a random experiment."
          why="Order arrivals, waiting times, and fill clocks are random experiments."
          theory="Introductory point-process and lifetime laws."
          interpretation="Move A and watch mass travel. That is λ changing congestion, not a theme-park slider."
          trading="A Poisson with large λ in a short window is a burst. Size child orders as if bursts exist."
          limitation="Fitting a pretty density to the live tape without a microstructure story is fake complexity."
          educational
        >
          {dist && <DistChart x={dist.x} y={dist.y} color={name === "poisson" ? "#3dfff3" : "#ff2d95"} height={180} />}
        </Explain>
      </Panel>

      <Panel kicker="S(t)" title="Queue survival curve" className="col-span-12 md:col-span-4">
        <Explain
          title="Survival"
          formula="S(t)=P(T_fill > t)"
          what="Probability the order is still unfilled at t."
          why="Execution is a lifetime problem with censoring."
          theory="Survival analysis."
          interpretation="Declining S is rising cumulative fill chance. A flat tail is a stranded order."
          trading="A deadline T* is the number 1−S(T*)."
          limitation="Mixes 'not yet matched' with 'price left me'."
        >
          <LineXY pts={surv} color="#3dfff3" yMax={1} />
        </Explain>
      </Panel>

      <Panel kicker="F(t)" title="Fill-time CDF" className="col-span-12 md:col-span-4">
        <LineXY pts={cdf} color="#ff4ecd" yMax={1} />
        <div className="mt-2 font-mono text-[11px] text-mute">P(T_fill ≤ t) = 1 − S(t)</div>
      </Panel>

      <Panel kicker="h(t)" title="Execution hazard" className="col-span-12 md:col-span-4">
        <Explain
          title="Hazard"
          formula="h(t)=f(t)/S(t)"
          what="Instantaneous fill intensity given survival so far."
          why="Separates late fills from dead clocks."
          theory="Hazard of a lifetime."
          interpretation="Heavy opposite market flow lifts h. Adverse-move risk can crush it after a jump."
          trading="A collapsing hazard after the touch moves is the model saying this price is no longer live."
          limitation="Smoothed from a competing-risk approximation."
        >
          <LineXY pts={haz} color="#ff2d95" />
        </Explain>
      </Panel>

      <Panel kicker="HORIZONS" title="P(fill) by deadline" className="col-span-12">
        <div className="grid grid-cols-5 gap-3">
          {(fill?.horizons ?? []).map((h) => (
            <div key={h.t} className="hairline p-3">
              <div className="kicker">{h.t}s</div>
              <div className="num text-3xl text-mist">{pct(h.fill, 0)}</div>
              <div className="font-mono text-[10px] text-mute">S={pct(h.survival, 0)}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
