import { useEffect, useMemo, useState } from "react";
import { Explain, Panel, Stat, fmt } from "../components/explain/Explain";
import { DistChart, Gauge } from "../components/charts/Charts";
import { api } from "../lib/api";
import { useMarket } from "../lib/store";

export function QueueLab() {
  const live = useMarket((s) => s.state);
  const [lam, setLam] = useState(18);
  const [mu, setMu] = useState(26);
  const [mm1, setMm1] = useState<any>(null);
  const [L, setL] = useState(100);
  const [W, setW] = useState(2);
  const [littleLam, setLittleLam] = useState(50);
  const [lock, setLock] = useState<"L" | "lambda" | "W">("L");
  const [little, setLittle] = useState<any>(null);
  const [check, setCheck] = useState<any>(null);

  useEffect(() => {
    api.queueAnalysis(lam, mu).then(setMm1);
    api.modelCheck(lam, mu).then(setCheck);
  }, [lam, mu]);

  useEffect(() => {
    const body: any = {};
    if (lock !== "L") body.L = L;
    if (lock !== "lambda") body.lambda = littleLam;
    if (lock !== "W") body.W = W;
    api.little(body).then((r) => {
      setLittle(r);
      if (lock === "L") setL(r.L);
      if (lock === "lambda") setLittleLam(r.lambda);
      if (lock === "W") setW(r.W);
    });
  }, [L, W, littleLam, lock]);

  const rho = lam / mu;
  const dist = mm1?.mm1?.distribution ?? [];

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12">
        <div className="kicker text-fuchsia">03 · QUEUE LAB</div>
        <h1 className="font-display text-4xl">
          Classical queues, then the <span className="text-pink">real book</span>
        </h1>
      </div>

      <Panel kicker="WHAT-IF" title="Arrival λ and service μ" className="col-span-12 md:col-span-4">
        <label className="kicker">λ ARRIVAL {lam.toFixed(1)}</label>
        <input type="range" min={2} max={60} step={0.5} value={lam} onChange={(e) => setLam(+e.target.value)} className="mb-4 w-full" />
        <label className="kicker">μ SERVICE {mu.toFixed(1)}</label>
        <input type="range" min={2} max={70} step={0.5} value={mu} onChange={(e) => setMu(+e.target.value)} className="w-full" />
        <p className="mt-3 text-[12px] text-mute">
          These sliders drive the educational M/M/1 panel, not the live LOB (the live LOB has its own λ_L, λ_M, λ_C on
          the Order Flow page). Keep the two models distinct.
        </p>
      </Panel>

      <Panel kicker="M/M/1" title="Educational single-server queue" className="col-span-12 md:col-span-8">
        <Explain
          title="M/M/1"
          formula="ρ = λ/μ    P_n = (1-ρ)ρ^n    L = ρ/(1-ρ)    W = 1/(μ-λ)"
          what="Poisson arrivals, exponential service, one server, infinite buffer."
          why="The simplest closed-form language for congestion."
          theory="Kendall M/M/1. Stationary geometric occupancy iff ρ<1."
          interpretation={
            rho < 1
              ? `ρ=${rho.toFixed(2)} < 1: a stationary distribution exists in this model.`
              : `ρ=${rho.toFixed(2)} > 1: M/M/1 has no stationary law. This is NOT a claim that the order book is unstable.`
          }
          trading="Use as a congestion metaphor. Do not size risk off P_n."
          limitation="Real books: many prices, cancels, strategic placement, simultaneous events, self-excitation, time-varying λ."
          educational
        >
          <div className="grid grid-cols-4 gap-3">
            <Stat label="ρ" value={fmt(mm1?.mm1?.rho, 2)} />
            <Stat label="L" value={fmt(mm1?.mm1?.L, 2)} />
            <Stat label="W" value={fmt(mm1?.mm1?.W, 3)} />
            <Stat label="P0" value={fmt(mm1?.mm1?.P0, 2)} />
          </div>
          <div className="mt-3">
            <DistChart x={dist.map((d: any) => d.n)} y={dist.map((d: any) => d.p || 0)} color="#ff2d95" />
          </div>
          <p className="mt-2 font-mono text-[11px] text-mute">{mm1?.mm1?.caveat}</p>
        </Explain>
      </Panel>

      <Panel kicker="LITTLE" title="L = λ W  · interactive triangle" className="col-span-12 lg:col-span-6">
        <Explain
          title="Little's law"
          formula="L = λ W"
          what="Long-run average number in system equals throughput times average sojourn."
          why="Distribution-free. This is the one queueing identity that still speaks to a messy book."
          theory="Little (1961)."
          interpretation="More standing orders at a given throughput means longer expected wait."
          trading="If the touch queue fattened and λ_M did not, your expected wait lengthened."
          limitation="Averages, not sample paths. Breaks across regime changes."
        >
          <div className="mx-auto my-4 max-w-xs border border-pink/30 p-6 text-center">
            <div className="font-display text-3xl text-pink">L = {fmt(little?.L, 1)}</div>
            <div className="mt-3 flex justify-between font-mono text-sm">
              <span className="text-cyan">λ {fmt(little?.lambda, 1)}</span>
              <span className="text-fuchsia">W {fmt(little?.W, 2)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {(["L", "lambda", "W"] as const).map((k) => (
              <button key={k} onClick={() => setLock(k)} className={`kicker px-2 py-1 ${lock === k ? "bg-pink text-void" : "hairline"}`}>
                SOLVE {k}
              </button>
            ))}
          </div>
          {lock !== "L" && (
            <Slider label={`L ${L.toFixed(1)}`} v={L} min={1} max={400} set={setL} />
          )}
          {lock !== "lambda" && (
            <Slider label={`λ ${littleLam.toFixed(1)}`} v={littleLam} min={1} max={120} set={setLittleLam} />
          )}
          {lock !== "W" && <Slider label={`W ${W.toFixed(2)}`} v={W} min={0.1} max={20} set={setW} />}
          <p className="mt-2 text-[12px] text-mute">{little?.interpretation}</p>
        </Explain>
      </Panel>

      <Panel kicker="BIRTH-DEATH" title="n ↔ n+1" className="col-span-12 lg:col-span-6">
        <Explain
          title="Birth-death process"
          formula="n → n+1 at λ    n → n−1 at μ"
          what="Queue length as a chain on the integers."
          why="The simplest stochastic skeleton of a single price's size."
          theory="Birth-death; M/M/1 is the linear case."
          interpretation="Stationary mass π_n shown as bar heights. Raise λ and mass walks right."
          trading="A touch queue with high birth and low death is a wall — until it isn't (cancels)."
          limitation="One dimension. The book is a vector of such chains coupled by price moves."
          educational
        >
          <div className="flex flex-wrap items-end gap-1">
            {(mm1?.birth_death ?? []).slice(0, 16).map((d: any) => (
              <div key={d.n} className="flex w-6 flex-col items-center">
                <div className="w-full bg-cyan" style={{ height: `${Math.max(4, d.pi * 160)}px` }} />
                <div className="font-mono text-[9px] text-mute">{d.n}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 font-mono text-[11px] text-mute">0 ↔ 1 ↔ 2 ↔ 3 ↔ … with rates λ, μ</div>
        </Explain>
      </Panel>

      <Panel kicker="MODEL CHECK" title="Theoretical L vs simulated L" className="col-span-12 md:col-span-6">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="THEORETICAL" value={fmt(check?.theoretical, 2)} />
          <Stat label="SIMULATED" value={fmt(check?.simulated, 2)} />
          <Stat label="ERROR" value={`${fmt(check?.error_pct, 2)}%`} tone="fuchsia" />
        </div>
        <p className="mt-3 text-[12px] text-mute">
          Discrepancy is expected: Monte Carlo paths are finite, truncation exists, and ρ near 1 mixes slowly. The
          panel exists to show honesty, not a 0.00% trophy.
        </p>
      </Panel>

      <Panel kicker="LIVE BOOK ≠ M/M/1" title="What the real queues are doing" className="col-span-12 md:col-span-6">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="LIVE λ_L" value={fmt(live?.rates.limit, 1)} />
          <Stat label="LIVE λ_M" value={fmt(live?.rates.market, 1)} />
          <Stat label="LIVE λ_C" value={fmt(live?.rates.cancel, 1)} />
          <Stat label="LIVE μ_ex" value={fmt(live?.rates.execution, 1)} />
        </div>
        <Gauge value={live?.congestion?.index ?? 0} label={live?.congestion?.label ?? "—"} />
        <p className="mt-2 text-[12px] text-mute">
          Four intensities, two sides, many prices, cancellable size. That is why we refused to say the book is
          'unstable' when a toy ρ exceeds one.
        </p>
      </Panel>
    </div>
  );
}

function Slider({ label, v, min, max, set }: { label: string; v: number; min: number; max: number; set: (n: number) => void }) {
  return (
    <label className="mt-2 block">
      <div className="kicker">{label}</div>
      <input type="range" min={min} max={max} step={0.1} value={v} onChange={(e) => set(+e.target.value)} className="w-full" />
    </label>
  );
}
