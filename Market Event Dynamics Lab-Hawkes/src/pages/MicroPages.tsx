import { useMemo, useState } from "react";
import { useLab } from "../state";
import {
  acf,
  clusteringScore,
  interarrivals,
  ksExponential,
  mean,
  quantile,
  simulateHawkes,
  timeRescaling,
  typeProportions,
  intensityAt,
} from "../math/hawkes";
import {
  classifyRegimes,
  conditionalPriceResponse,
  LSI_WEIGHTS,
  liquidityStress,
  netOrderFlow,
  realizedVol,
  snapshots,
} from "../math/market";
import { EXPERIMENTS, runExperiment } from "../experiments/lab";
import { Formula, Why } from "../components/ui";
import { IntensityRiver } from "../components/viz";
import { cloneParams } from "../math/types";

export function ResidualsPage() {
  const { lab } = useLab();
  const taus = useMemo(() => timeRescaling(lab.events, lab.params), [lab]);
  const ks = ksExponential(taus);
  const a1 = acf(taus, 1);
  return (
    <div className="stack">
      <p className="lede">
        Time-rescaling: warp waiting times by the fitted intensity. If λ is right, the residuals
        τᵢ should look like unit exponentials — i.i.d., no leftover clustering.
      </p>
      <Formula>{"τᵢ = ∫_{tᵢ₋₁}^{tᵢ} λ(s) ds"}</Formula>
      <div className="grid-2">
        <div className="tile">
          <h3>TRANSFORMED INTER-ARRIVALS</h3>
          <Hist xs={taus} />
        </div>
        <div className="tile">
          <h3>QQ vs Exp(1)</h3>
          <QQ xs={taus} />
        </div>
      </div>
      <div className="tile">
        <h3>TESTS</h3>
        <p className="mono">
          KS D = {ks.d.toFixed(3)} · approx p = {ks.pApprox.toFixed(3)} · residual ACF(1) = {a1.toFixed(3)}
        </p>
        <Why>
          A pretty intensity path is not a fit. If residuals still cluster, the kernel family or
          the type set is wrong. Approximate p-values here are a sketch, not a paper-grade KS.
        </Why>
      </div>
    </div>
  );
}

function Hist({ xs }: { xs: number[] }) {
  const bins = 18;
  const m = Math.max(...xs, 1e-6);
  const h = Array(bins).fill(0);
  xs.forEach((x) => {
    const b = Math.min(bins - 1, Math.floor((x / (m * 1.05)) * bins));
    h[b]++;
  });
  const mx = Math.max(...h, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 140 }}>
      {h.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(v / mx) * 100}%`,
            background: "linear-gradient(180deg,#ff4ecd,#4a1038)",
            borderRadius: 4,
          }}
        />
      ))}
    </div>
  );
}

function QQ({ xs }: { xs: number[] }) {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  const pts = s.slice(0, 80).map((x, i) => {
    const p = (i + 0.5) / n;
    const q = -Math.log(1 - p);
    return [q, x] as const;
  });
  const M = Math.max(1, ...pts.flat());
  return (
    <svg viewBox="0 0 200 160" width="100%" height="160">
      <line x1="20" y1="140" x2="180" y2="20" stroke="#6e4d62" />
      {pts.map((p, i) => (
        <circle key={i} cx={20 + (p[0] / M) * 160} cy={140 - (p[1] / M) * 120} r="2" fill="#ff4ecd" />
      ))}
    </svg>
  );
}

export function FlowPage() {
  const { lab } = useLab();
  const [u, setU] = useState(0.5);
  const t = u * lab.T;
  const buy = intensityAt(t, lab.events, lab.params, "BUY");
  const sell = intensityAt(t, lab.events, lab.params, "SELL");
  const nof = netOrderFlow(buy, sell);
  const h = Math.max(0.15, Math.min(0.85, 0.5 - nof / (Math.abs(nof) + buy + sell + 0.2)));
  return (
    <div className="stack">
      <p className="lede">
        Net order-flow pressure is the difference of conditional trade intensities — a signed rate,
        not a signed volume. Positive: the model expects buys to arrive faster than sells, right now.
      </p>
      <Formula>NOF(t) = λ_buy(t) − λ_sell(t)</Formula>
      <div className="nof">
        <div style={{ position: "absolute", left: 16, top: 12 }} className="mono">
          BUY PRESSURE
        </div>
        <div className="axis" />
        <div
          className="bar"
          style={{
            top: nof >= 0 ? `${h * 100}%` : "50%",
            height: `${Math.abs(0.5 - h) * 100}%`,
            background:
              nof >= 0
                ? "linear-gradient(180deg,#ff2d95,transparent)"
                : "linear-gradient(180deg,transparent,#7aa2ff)",
            borderRadius: nof >= 0 ? "20px 20px 0 0" : "0 0 20px 20px",
          }}
        />
        <div style={{ position: "absolute", left: 16, bottom: 12 }} className="mono">
          SELL PRESSURE
        </div>
      </div>
      <div className="slider-row">
        <span className="mono">t</span>
        <input type="range" min={0} max={1} step={0.001} value={u} onChange={(e) => setU(+e.target.value)} />
        <span className="mono">{nof.toFixed(3)}</span>
      </div>
      <Why>
        Persistent NOF with a still mid means depth is absorbing flow. NOF flipping with
        cancellations is a different story: the book is arguing. Neither is a trade signal in this
        lab; both are descriptions of λ.
      </Why>
      <IntensityRiver events={lab.events} params={lab.params} T={lab.T} />
    </div>
  );
}

export function ImpactPage() {
  const { lab } = useLab();
  const r = useMemo(() => conditionalPriceResponse(lab.events, 0.5), [lab.events]);
  return (
    <div className="stack">
      <p className="lede">
        Conditional price response: average mid (or trade price) change after an event type. Named
        carefully. Not "Hawkes caused the move."
      </p>
      <Formula>R̂ = E[ΔP | event type] over a 0.5 time-unit horizon</Formula>
      <table className="data">
        <thead>
          <tr>
            <th>event</th>
            <th>mean ΔP</th>
            <th>n</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(r.mean).map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td>{v.toFixed(5)}</td>
              <td>{r.n[k as keyof typeof r.n]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Why>
        If cascades coincide with larger |ΔP|, you have a joint fact about flow and price — still
        not a structural impact kernel. Size and book state can be layered next; this module starts
        with type only.
      </Why>
    </div>
  );
}

export function LiquidityPage() {
  const { lab } = useLab();
  const ls = useMemo(() => liquidityStress(lab.events, lab.T), [lab]);
  const snaps = snapshots(lab.events);
  return (
    <div className="stack">
      <p className="lede">
        Liquidity here is measured, not sloganeered: spread, depth, cancellation intensity,
        imbalance. The stress index is a documented weighted sum of z-scores — a modelling choice.
      </p>
      <Formula>
        {"LSI_t = 0.30 z(spread) + 0.25 z(cancel intensity) + 0.25 z(vol proxy) + 0.20 z(|imbalance|)"}
      </Formula>
      <div className="grid-3">
        <div className="tile">
          <h3>WEIGHTS</h3>
          <p className="mono">spread {LSI_WEIGHTS.spread}</p>
          <p className="mono">cancellation {LSI_WEIGHTS.cancellation}</p>
          <p className="mono">volatility {LSI_WEIGHTS.volatility}</p>
          <p className="mono">imbalance {LSI_WEIGHTS.imbalance}</p>
          <Why title="Why these variables?">
            Spread: cost of immediacy. Cancellation intensity: liquidity running. Volatility proxy:
            the book is already moving. |Imbalance|: one-sided risk for makers. Weights are
            explicit assumptions, not estimated "optimal liquidity". Change them if you have a
            better theory — then write it down.
          </Why>
        </div>
        <div className="tile">
          <h3>BOOK NOW</h3>
          <p className="mono">spread {snaps.at(-1)?.spread.toFixed(4) ?? "—"}</p>
          <p className="mono">depth {snaps.at(-1)?.depth.toFixed(0) ?? "—"}</p>
          <p className="mono">σ proxy {realizedVol(snaps).toFixed(4)}</p>
        </div>
        <div className="tile">
          <h3>LSI PATH</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 100 }}>
            {ls.lsi.map((v, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.min(100, Math.abs(v) * 28 + 8)}%`,
                  background: v > 0.5 ? "#ff2d95" : "#5a2a4a",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegimesPage() {
  const { lab } = useLab();
  const regs = useMemo(() => classifyRegimes(lab.events, lab.T), [lab]);
  const counts = regs.reduce<Record<string, number>>((a, r) => {
    a[r.regime] = (a[r.regime] ?? 0) + 1;
    return a;
  }, {});
  return (
    <div className="stack">
      <p className="lede">
        Quiet / active / stressed / one-sided are labels on local statistics, then we ask — as an
        empirical question — whether α and ρ(K) look different. This page does not answer "yes, more
        endogenous in stress" in advance.
      </p>
      <div className="grid-3">
        {Object.entries(counts).map(([k, v]) => (
          <div className="tile" key={k}>
            <h3>{k}</h3>
            <div className="big-num" style={{ fontSize: 48 }}>
              {v}
            </div>
            <div className="unit">windows</div>
          </div>
        ))}
      </div>
      <table className="data">
        <thead>
          <tr>
            <th>window</th>
            <th>regime</th>
          </tr>
        </thead>
        <tbody>
          {regs.slice(0, 16).map((r) => (
            <tr key={r.t0}>
              <td className="mono">
                {r.t0.toFixed(1)}–{r.t1.toFixed(1)}
              </td>
              <td>{r.regime}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Why>
        To compare Hawkes parameters across regimes you must re-estimate on each subset (short
        samples: noisy α). Pooling first then slicing intensity is not the same as regime-specific
        kernels.
      </Why>
    </div>
  );
}

export function MonteCarloPage() {
  const { lab } = useLab();
  const [M, setM] = useState(100);
  const [out, setOut] = useState<null | ReturnType<typeof runMC>>(null);
  return (
    <div className="stack">
      <p className="lede">
        One simulated tape is an anecdote. M independent Hawkes paths give sampling bands for the
        statistics of the real (or currently loaded) stream.
      </p>
      <div className="cta-row" style={{ justifyContent: "flex-start" }}>
        {[100, 500, 1000].map((m) => (
          <button key={m} className={M === m ? "btn solid" : "btn"} onClick={() => setM(m)}>
            {m} paths
          </button>
        ))}
        <button
          className="btn solid"
          onClick={() => setOut(runMC(lab.events, lab.params, lab.T, Math.min(M, 180)))}
        >
          Run (capped at 180 in-browser)
        </button>
      </div>
      {out && (
        <table className="data">
          <thead>
            <tr>
              <th>metric</th>
              <th>real</th>
              <th>sim mean</th>
              <th>5%</th>
              <th>95%</th>
            </tr>
          </thead>
          <tbody>
            {out.rows.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.real.toFixed(3)}</td>
                <td>{r.mean.toFixed(3)}</td>
                <td>{r.lo.toFixed(3)}</td>
                <td>{r.hi.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function runMC(real: { t: number; type: string }[], params: any, T: number, M: number) {
  const realIA = interarrivals(real as any);
  const realC = clusteringScore(realIA);
  const realN = real.length;
  const pr = typeProportions(real as any);
  const sims: { n: number; c: number; a: number; buy: number }[] = [];
  for (let m = 0; m < M; m++) {
    const ev = simulateHawkes(params, T, 100 + m);
    const ia = interarrivals(ev);
    sims.push({
      n: ev.length,
      c: clusteringScore(ia),
      a: acf(ia, 1),
      buy: typeProportions(ev).BUY,
    });
  }
  const col = (key: keyof (typeof sims)[0], realV: number, name: string) => {
    const xs = sims.map((s) => s[key]);
    return { name, real: realV, mean: mean(xs), lo: quantile(xs, 0.05), hi: quantile(xs, 0.95) };
  };
  return {
    rows: [
      col("n", realN, "event count"),
      col("c", realC, "clustering (ID of waits)"),
      col("a", acf(realIA, 1), "wait ACF(1)"),
      col("buy", pr.BUY, "BUY share"),
    ],
  };
}

export function ExperimentsPage() {
  const [id, setId] = useState(EXPERIMENTS[0].id);
  const res = useMemo(() => runExperiment(id), [id]);
  return (
    <div className="stack">
      <p className="lede">Controlled questions. Each run has a hypothesis, a tape, and a limitation.</p>
      <div className="cta-row" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
        {EXPERIMENTS.map((e) => (
          <button key={e.id} className={id === e.id ? "btn solid" : "btn"} onClick={() => setId(e.id)}>
            {e.title}
          </button>
        ))}
      </div>
      <div className="tile">
        <h3>HYPOTHESIS</h3>
        <p>{res.spec.hypothesis}</p>
        <p style={{ color: "var(--muted)", marginTop: 8 }}>{res.spec.setup}</p>
      </div>
      <table className="data">
        <thead>
          <tr>
            <th>config</th>
            <th>ρ</th>
            <th>endo</th>
            <th>cluster</th>
            <th>N</th>
            <th>switch</th>
          </tr>
        </thead>
        <tbody>
          {res.series.map((s) => (
            <tr key={s.label}>
              <td>{s.label}</td>
              <td>{s.rho.toFixed(3)}</td>
              <td>{s.endo.toFixed(3)}</td>
              <td>{s.cluster.toFixed(3)}</td>
              <td>{s.n}</td>
              <td>{s.switchRate.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="tile">
        <h3>INTERPRETATION</h3>
        <p>{res.interpretation}</p>
      </div>
      <div className="tile">
        <h3>CONCLUSION</h3>
        <p>{res.conclusion}</p>
      </div>
      <div className="tile">
        <h3>LIMITATIONS</h3>
        <p>{res.limitation}</p>
        {res.notes.map((n) => (
          <p key={n} className="mono" style={{ marginTop: 6 }}>
            {n}
          </p>
        ))}
      </div>
    </div>
  );
}

export function SensitivityPage() {
  const { lab, setLab } = useLab();
  const p = lab.params;
  const setA = (v: number) => {
    const n = cloneParams(p);
    n.alpha = n.alpha.map((r, i) => r.map((x, j) => (i === j ? v : x)));
    setLab({ ...lab, params: n });
  };
  const setB = (v: number) => {
    const n = cloneParams(p);
    n.beta = n.beta.map((r) => r.map(() => v));
    setLab({ ...lab, params: n });
  };
  const setM = (v: number) => {
    const n = cloneParams(p);
    n.mu = n.mu.map(() => v);
    setLab({ ...lab, params: n });
  };
  return (
    <div className="stack">
      <p className="lede">
        Move a parameter, watch the implied physics. This does not re-simulate until you generate a
        new tape on Data; it reinterprets the current events under a new λ.
      </p>
      <div className="tile">
        <div className="slider-row">
          <span>μ baseline</span>
          <input type="range" min={0.02} max={0.8} step={0.01} value={p.mu[0]} onChange={(e) => setM(+e.target.value)} />
          <span className="mono">{p.mu[0].toFixed(2)}</span>
        </div>
        <div className="slider-row">
          <span>α diagonal</span>
          <input type="range" min={0.02} max={1.1} step={0.01} value={p.alpha[0][0]} onChange={(e) => setA(+e.target.value)} />
          <span className="mono">{p.alpha[0][0].toFixed(2)}</span>
        </div>
        <div className="slider-row">
          <span>β decay</span>
          <input type="range" min={0.3} max={4} step={0.05} value={p.beta[0][0]} onChange={(e) => setB(+e.target.value)} />
          <span className="mono">{p.beta[0][0].toFixed(2)}</span>
        </div>
        <p style={{ color: "var(--blush)", lineHeight: 1.7 }}>
          Higher α → stronger excitation → more clustering → greater endogenous activity.
          Higher β → faster decay → shorter memory. Lower β → longer memory → more persistent
          influence.
        </p>
      </div>
      <IntensityRiver events={lab.events} params={lab.params} T={lab.T} />
    </div>
  );
}

export function NotebookPage() {
  const { lab } = useLab();
  const [nb, setNb] = useState({
    hypothesis: "Buy market orders self-excite more than they excite sells on this window.",
    dataset: lab.mode,
    parameters: "exponential multivariate Hawkes, shared β by trigger",
    model: "4-type Hawkes vs independent Poisson",
    experiment: "in-sample ℓ, residual KS, Monte Carlo clustering bands",
    result: "",
    interpretation: "",
    limitations: "Exponential memory; no marks; browser MLE; no diurnal μ(t).",
    next: "Re-estimate on stressed vs quiet subsets and compare ρ(K).",
  });
  const md = `# Market Event Dynamics — research note

## Hypothesis
${nb.hypothesis}

## Dataset
${nb.dataset} · N=${lab.events.length} · T=${lab.T.toFixed(3)}

## Parameters
${nb.parameters}

## Model
${nb.model}

## Experiment
${nb.experiment}

## Result
${nb.result}

## Interpretation
${nb.interpretation}

## Limitations
${nb.limitations}

## Next question
${nb.next}
`;
  return (
    <div className="grid-2">
      <form className="note-form tile">
        {Object.entries(nb).map(([k, v]) => (
          <label key={k}>
            {k}
            <textarea value={v} onChange={(e) => setNb({ ...nb, [k]: e.target.value })} />
          </label>
        ))}
      </form>
      <div className="stack">
        <div className="tile">
          <h3>PREVIEW</h3>
          <pre className="mono" style={{ whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.5 }}>
            {md}
          </pre>
        </div>
        <button
          className="btn solid"
          onClick={() => {
            const blob = new Blob([md], { type: "text/markdown" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "medl-research-note.md";
            a.click();
          }}
        >
          Export Markdown
        </button>
        <button
          className="btn"
          onClick={() => window.print()}
        >
          Print / PDF
        </button>
      </div>
    </div>
  );
}
