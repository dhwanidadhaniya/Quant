import { useEffect, useState } from "react";
import { Explain, Panel, Stat, fmt } from "../components/explain/Explain";
import { LineXY } from "../components/charts/Charts";
import { api } from "../lib/api";
import { useMarket } from "../lib/store";

export function OrderFlow() {
  const s = useMarket((st) => st.state);
  const [flow, setFlow] = useState<any>(null);
  const [hawkes, setHawkes] = useState<any>(null);
  const [mu, setMu] = useState(8);
  const [alpha, setAlpha] = useState(0.7);
  const [beta, setBeta] = useState(1.5);

  useEffect(() => {
    api.orderflow().then(setFlow);
  }, [s?.t && Math.floor(s.t / 1.5)]);
  useEffect(() => {
    api.hawkes(mu, alpha, beta).then(setHawkes);
  }, [mu, alpha, beta]);

  const rates = s?.rates;

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12">
        <div className="kicker text-fuchsia">07 · ORDER FLOW</div>
        <h1 className="font-display text-4xl">
          Four clocks, not one <span className="text-cyan">intensity</span>
        </h1>
      </div>

      <Panel kicker="INTENSITY PANEL" title="λ̂ = N / window" className="col-span-12">
        <Explain
          title="Empirical intensities"
          formula="λ̂ = (# events) / T_window"
          what="Separate rates for limit arrivals, market orders, cancellations, executions."
          why="A book is not a single Poisson. Cancels can outrun executions."
          theory="Local Poisson MLE; descriptive even when the true process is Hawkes."
          interpretation="Raise live λ_L on the What-If strip and watch congestion — that control is on the Scenario page."
          trading="λ_M vs queue ahead is the fill clock. λ_C vs displayed size is fragility."
          limitation="Window length: short is noisy, long lags the regime."
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Flow label="LIMIT ARRIVALS" v={rates?.limit} dir="right" color="#3dfff3" />
            <Flow label="MARKET ORDERS" v={rates?.market} dir="right" color="#ff2d95" />
            <Flow label="CANCELLATIONS" v={rates?.cancel} dir="left" color="#9b5cff" />
            <Flow label="EXECUTIONS" v={rates?.execution} dir="right" color="#ff4ecd" />
          </div>
        </Explain>
      </Panel>

      <Panel kicker="WHAT-IF λ" title="Live engine parameters" className="col-span-12 md:col-span-4">
        <ParamSlider k="lambda_limit" label="λ_L limit" v={s?.params.lambda_limit} min={5} max={120} />
        <ParamSlider k="lambda_market" label="λ_M market" v={s?.params.lambda_market} min={1} max={80} />
        <ParamSlider k="lambda_cancel" label="cancel hazard" v={s?.params.lambda_cancel} min={0.05} max={1.5} step={0.01} />
        <ParamSlider k="hawkes_alpha" label="Hawkes α (0 = off)" v={s?.params.hawkes_alpha} min={0} max={2} step={0.05} />
        <ParamSlider k="speed" label="sim speed" v={s?.params.speed} min={0.2} max={4} step={0.1} />
        <p className="mt-2 font-mono text-[10px] text-mute">Hawkes level now {fmt(s?.hawkes, 2)}</p>
      </Panel>

      <Panel kicker="TIMELINE" title="Scrub the event calendar" className="col-span-12 md:col-span-8">
        <ul className="max-h-72 overflow-y-auto font-mono text-[11px]">
          {(s?.events ?? []).map((e: any, i: number) => (
            <li key={i} className="grid grid-cols-6 gap-2 border-b border-white/5 py-1">
              <span className="text-mute">{fmt(e.t, 3)}</span>
              <span className="text-fuchsia col-span-2">{e.type}</span>
              <span>{e.side}</span>
              <span>{e.quantity}</span>
              <span className="text-mute">{e.note}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel kicker="ADVANCED EXTENSION" title="Hawkes self-excitation" className="col-span-12">
        <Explain
          title="Hawkes"
          formula="λ(t) = μ + Σ α e^{−β(t−t_i)}"
          what="Intensity depends on the past. Events breed events."
          why="Real order flow clusters. Poisson cannot say so."
          theory="Hawkes (1971). Branching ratio α/β < 1 for linear stability."
          interpretation={`n=${hawkes?.n} events, branching ${fmt(hawkes?.branching_ratio, 2)}, stable=${hawkes?.stable}`}
          trading="A print burst is information about the next second, not a draw from a constant λ."
          limitation="Reduced form. This is an extension, not the foundation of the live book (until you raise α)."
          educational
        >
          <div className="grid grid-cols-3 gap-3">
            <Slider label={`μ ${mu}`} v={mu} min={1} max={20} set={setMu} />
            <Slider label={`α ${alpha}`} v={alpha} min={0} max={2} step={0.05} set={setAlpha} />
            <Slider label={`β ${beta}`} v={beta} min={0.3} max={4} step={0.05} set={setBeta} />
          </div>
          {hawkes?.intensity && (
            <LineXY pts={hawkes.intensity.map((p: any) => ({ x: p.t, y: p.lambda }))} color="#e100ff" height={140} />
          )}
        </Explain>
      </Panel>
    </div>
  );
}

function Flow({ label, v, dir, color }: { label: string; v?: number; dir: "left" | "right"; color: string }) {
  return (
    <div className="hairline p-3">
      <div className="kicker">{label}</div>
      <div className="num text-3xl" style={{ color }}>
        {fmt(v, 1)}
        <span className="text-sm text-mute"> /sec</span>
      </div>
      <div className="relative mt-3 h-2 overflow-hidden bg-white/5">
        <div className={`absolute inset-y-0 w-1/2 ${dir === "right" ? "flow-right" : "flow-left"}`} style={{ background: color, opacity: 0.7 }} />
      </div>
    </div>
  );
}

function ParamSlider({ k, label, v = 0, min, max, step = 0.5 }: { k: string; label: string; v?: number; min: number; max: number; step?: number }) {
  return (
    <label className="mt-2 block">
      <div className="kicker">
        {label} {fmt(v, 2)}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => api.params({ [k]: +e.target.value })}
        className="w-full"
      />
    </label>
  );
}

function Slider({ label, v, min, max, step = 0.5, set }: any) {
  return (
    <label>
      <div className="kicker">{label}</div>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(+e.target.value)} className="w-full" />
    </label>
  );
}
