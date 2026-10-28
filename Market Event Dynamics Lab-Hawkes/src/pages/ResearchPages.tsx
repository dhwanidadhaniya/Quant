import { useMemo, useState } from "react";
import { useLab } from "../state";
import {
  aic,
  bic,
  branchingMatrix,
  calibrateHawkes,
  calibrateUnivariate,
  endogeneity,
  logLikelihood,
  simulateHawkes,
  simulatePoisson,
  spectralRadius,
} from "../math/hawkes";
import { defaultParams, EVENT_TYPES, poissonParams } from "../math/types";
import { enrichEvents } from "../math/market";
import { guessMap, ingestCsv } from "../data/ingest";
import { Formula, Gauge, Why } from "../components/ui";
import { OgataViz } from "../components/viz";

export function DataPage() {
  const { lab, setLab } = useLab();
  const [headers, setHeaders] = useState<string[]>([]);
  const [raw, setRaw] = useState("");
  const [map, setMap] = useState({ timestamp: "timestamp", event_type: "event_type" } as {
    timestamp: string;
    event_type?: string;
    side?: string;
    price?: string;
  });
  const [report, setReport] = useState<ReturnType<typeof ingestCsv> | null>(null);
  const [T, setT] = useState(120);
  const [kind, setKind] = useState<"hawkes" | "poisson" | "indep">("hawkes");

  return (
    <div className="grid-2">
      <div className="stack">
        <div className="tile">
          <h3>MODE A · HISTORICAL / CSV</h3>
          <p className="lede" style={{ fontSize: 14 }}>
            Expected fields: timestamp, event_type, price, quantity, side, bid, ask, bid_size,
            ask_size. Map whatever names your feed actually uses.
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const text = await f.text();
              setRaw(text);
              const h = text.split(/\r?\n/)[0].split(",").map((x) => x.trim());
              setHeaders(h);
              setMap(guessMap(h));
            }}
          />
          {headers.length > 0 && (
            <div className="stack" style={{ marginTop: 12 }}>
              {(["timestamp", "event_type", "side", "price"] as const).map((k) => (
                <label key={k} className="slider-row">
                  <span className="mono">{k}</span>
                  <select
                    value={(map as any)[k] ?? ""}
                    onChange={(e) => setMap({ ...map, [k]: e.target.value })}
                  >
                    <option value="">—</option>
                    {headers.map((h) => (
                      <option key={h}>{h}</option>
                    ))}
                  </select>
                  <span />
                </label>
              ))}
              <button
                className="btn solid"
                onClick={() => {
                  const r = ingestCsv(raw, map as any);
                  setReport(r);
                  setLab({
                    ...lab,
                    mode: "upload",
                    events: r.events,
                    T: r.T,
                    trueParams: null,
                    ingestNotes: r.steps.map((s) => s.name),
                  });
                }}
              >
                Run ingestion pipeline
              </button>
            </div>
          )}
        </div>
        <div className="tile">
          <h3>MODE B · SYNTHETIC GENERATOR</h3>
          <div className="slider-row">
            <span className="mono">horizon T</span>
            <input type="range" min={20} max={180} value={T} onChange={(e) => setT(+e.target.value)} />
            <span className="mono">{T}</span>
          </div>
          <div className="cta-row" style={{ justifyContent: "flex-start" }}>
            {(["hawkes", "poisson", "indep"] as const).map((k) => (
              <button key={k} className={kind === k ? "btn solid" : "btn"} onClick={() => setKind(k)}>
                {k}
              </button>
            ))}
          </div>
          <button
            className="btn solid"
            style={{ marginTop: 16 }}
            onClick={() => {
              const trueP = kind === "hawkes" ? defaultParams() : poissonParams();
              const ev =
                kind === "poisson"
                  ? simulatePoisson(trueP.mu, T, lab.seed)
                  : kind === "indep"
                    ? simulateHawkes({ ...trueP, alpha: trueP.alpha.map((r) => r.map(() => 0)) }, T, lab.seed)
                    : simulateHawkes(trueP, T, lab.seed);
              setLab({
                ...lab,
                mode: "synthetic",
                events: enrichEvents(ev, lab.seed),
                T,
                params: trueP,
                trueParams: trueP,
                ingestNotes: [`Synthetic ${kind} with known θ*`],
              });
            }}
          >
            Generate controlled tape
          </button>
          <Why>
            Synthetic mode exists so calibration can be scored against truth. Real markets do not
            hand you α*. If the engine cannot recover θ* here, do not trust θ̂ on a CSV.
          </Why>
        </div>
      </div>
      <div className="tile">
        <h3>INGESTION PIPELINE</h3>
        <div className="pipeline">
          {(
            report?.steps ?? [
              { name: "RAW DATA", why: "Event-level records are the atoms of a point process.", detail: "awaiting file" },
              { name: "Timestamp Validation", why: "Unordered or unparseable time is not a filtration.", detail: "—" },
              { name: "Sorting", why: "λ(t|ℋ_t) needs the past, not a shuffled tape.", detail: "—" },
              { name: "Duplicate Detection", why: "Feed echoes inflate self-excitation.", detail: "—" },
              { name: "Missing Value Handling", why: "Zeros are not missingness.", detail: "—" },
              { name: "Event Classification", why: "Wrong types reverse α_ij.", detail: "—" },
              { name: "Market Session Filtering", why: "Auctions ≠ continuous double auction.", detail: "—" },
              { name: "Event-Time Conversion", why: "Kernels live in elapsed time.", detail: "—" },
              { name: "Clean Event Stream", why: "One object for likelihood, residuals, simulation.", detail: `${lab.events.length} events` },
            ]
          ).map((s, i) => (
            <div className="pipe" key={s.name}>
              <div className="mono" style={{ color: "var(--magenta)" }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div>
                <b>{s.name}</b>
                <p>
                  {s.why} {s.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CalibratePage() {
  const { lab, setLab } = useLab();
  const [busy, setBusy] = useState(false);
  const [hist, setHist] = useState<number[]>([]);
  const trueP = lab.trueParams;
  const err = trueP
    ? Math.abs(lab.params.mu[0] - trueP.mu[0]) +
      Math.abs(lab.params.alpha[0][0] - trueP.alpha[0][0]) +
      Math.abs(lab.params.beta[0][0] - trueP.beta[0][0])
    : null;
  return (
    <div className="stack">
      <p className="lede">
        For event times t₁…tₙ the point-process log-likelihood is the events' log-intensity minus
        the compensator. We maximise it with Adam on log-parameters so μ,α,β stay positive. Shared
        β by trigger type keeps the search tractable in-browser.
      </p>
      <Formula>{"L(θ) = Σᵢ log λ_{dᵢ}(tᵢ) − ∫₀ᵀ λ(t) dt"}</Formula>
      <div className="cta-row" style={{ justifyContent: "flex-start" }}>
        <button
          className="btn solid"
          disabled={busy || lab.events.length < 8}
          onClick={() => {
            setBusy(true);
            setTimeout(() => {
              const { params, history } = calibrateHawkes(lab.events, lab.T, {
                steps: 90,
                sharedBeta: true,
                init: lab.trueParams ?? lab.params,
              });
              setHist(history);
              setLab({ ...lab, params });
              setBusy(false);
            }, 30);
          }}
        >
          {busy ? "estimating…" : "Run MLE"}
        </button>
      </div>
      <div className="grid-2">
        <div className="tile">
          <h3>ESTIMATED θ̂</h3>
          <p className="mono">
            μ = [{lab.params.mu.map((x) => x.toFixed(3)).join(", ")}]
          </p>
          <p className="mono" style={{ marginTop: 8 }}>
            α_BUY,BUY = {lab.params.alpha[0][0].toFixed(3)} · β_BUY,BUY = {lab.params.beta[0][0].toFixed(3)}
          </p>
          <p className="mono" style={{ marginTop: 8 }}>
            ℓ = {logLikelihood(lab.params, lab.events, lab.T).toFixed(2)}
          </p>
        </div>
        <div className="tile">
          <h3>TRUE θ* {trueP ? "" : "(unknown on uploads)"}</h3>
          {trueP ? (
            <>
              <p className="mono">μ* = [{trueP.mu.map((x) => x.toFixed(3)).join(", ")}]</p>
              <p className="mono" style={{ marginTop: 8 }}>
                α*_BUY,BUY = {trueP.alpha[0][0].toFixed(3)} · β* = {trueP.beta[0][0].toFixed(3)}
              </p>
              <p className="mono" style={{ marginTop: 8 }}>
                |θ̂ − θ*| proxy (first-pair L1) = {err?.toFixed(3)}
              </p>
            </>
          ) : (
            <p style={{ color: "var(--muted)" }}>
              Empirical tapes have no θ*. Score the model with residuals, OOS likelihood, and Monte
              Carlo clustering — not with a fake error bar.
            </p>
          )}
        </div>
      </div>
      {hist.length > 0 && (
        <div className="tile">
          <h3>LIKELIHOOD PATH</h3>
          <p className="mono">{hist.map((x) => x.toFixed(1)).join(" → ")}</p>
        </div>
      )}
      <Why>
        Recovering α on a short window is hard: excitation and baseline trade off. Always start
        with synthetic recovery, then apply the same engine to history.
      </Why>
    </div>
  );
}

export function OgataPage() {
  const { lab } = useLab();
  return (
    <div className="stack">
      <p className="lede">
        Ogata thinning: compute current intensity, take it as an upper bound (it only decays until
        the next accept), draw a candidate waiting time, accept or reject, jump if accepted, decay
        if not.
      </p>
      <div className="pipeline">
        {[
          ["01", "Current intensity", "λ(t) from μ plus remaining kernel mass."],
          ["02", "Upper bound", "Between events the exponential kernel decreases, so λ(t) is a valid λ̄."],
          ["03", "Candidate time", "Wait ~ Exp(λ̄)."],
          ["04", "Accept / reject", "U·λ̄ ≤ λ(t_cand). Rejection is not a market cancel; it is sampler waste."],
          ["05", "Update", "On accept, increment the triggering type's excitation state."],
        ].map(([n, t, d]) => (
          <div className="pipe" key={n}>
            <div className="mono" style={{ color: "var(--magenta)" }}>{n}</div>
            <div>
              <b>{t}</b>
              <p>{d}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="tile">
        <h3>EVENT → INTENSITY JUMPS → DECAYS → NEW EVENT</h3>
        <OgataViz events={lab.events} params={lab.params} T={lab.T} />
      </div>
    </div>
  );
}

export function ComparePage() {
  const { lab } = useLab();
  const stats = useMemo(() => {
    const times = lab.events.map((e) => e.t);
    const T = lab.T;
    const n = lab.events.length;
    const poisRate = n / T;
    const llPois = n * Math.log(Math.max(poisRate, 1e-12)) - poisRate * T;
    const by = EVENT_TYPES.map((t) => lab.events.filter((e) => e.type === t).map((e) => e.t));
    let llInd = 0;
    by.forEach((ts) => {
      const r = ts.length / T;
      llInd += ts.length * Math.log(Math.max(r, 1e-12)) - r * T;
    });
    const univ = calibrateUnivariate(times, T, 80);
    const llU = univ.logLik;
    const llM = logLikelihood(lab.params, lab.events, T);
    const rows = [
      { name: "Poisson (pooled)", k: 1, ll: llPois },
      { name: "Independent Poisson types", k: 4, ll: llInd },
      { name: "Univariate Hawkes (ignore types)", k: 3, ll: llU },
      { name: "Multivariate Hawkes", k: 4 + 16 + 4, ll: llM },
    ];
    return rows.map((r) => ({ ...r, aic: aic(r.ll, r.k), bic: bic(r.ll, r.k, n) }));
  }, [lab]);
  const split = Math.floor(lab.events.length * 0.7);
  const oos = useMemo(() => {
    const train = lab.events.slice(0, split);
    const test = lab.events.slice(split);
    const Tt = train.at(-1)?.t ?? lab.T * 0.7;
    const Te = lab.T;
    const llTrain = logLikelihood(lab.params, train, Tt);
    const llAll = logLikelihood(lab.params, lab.events, Te);
    return { llTrain, llOos: llAll - llTrain, nTest: test.length };
  }, [lab, split]);
  return (
    <div className="stack">
      <p className="lede">
        Hawkes is not automatically better. A richer intensity can win in-sample by overfitting
        aftershocks. AIC and BIC tax extra αᵢⱼ. Residuals and OOS likelihood are the grown-up tests.
      </p>
      <table className="data">
        <thead>
          <tr>
            <th>model</th>
            <th>k</th>
            <th>log-likelihood</th>
            <th>AIC</th>
            <th>BIC</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td>{r.k}</td>
              <td>{r.ll.toFixed(1)}</td>
              <td>{r.aic.toFixed(1)}</td>
              <td>{r.bic.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Why>
        Log-likelihood: did λ put mass where events happened without wasting mass in the gaps?
        AIC: in-sample fit plus a 2k penalty — useful, still optimistic. BIC: heavier penalty; prefers
        Poisson when excitation is faint. Clustering reproduction lives in Monte Carlo, not in this
        table.
      </Why>
      <div className="tile">
        <h3>OUT-OF-SAMPLE (NAIVE SPLIT)</h3>
        <p className="mono">
          train ℓ {oos.llTrain.toFixed(1)} · increment on held-out events {oos.llOos.toFixed(1)} · test
          n={oos.nTest}
        </p>
        <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 13 }}>
          This uses current θ̂ on a time split of the same tape. A stricter protocol re-estimates on
          the train window only.
        </p>
      </div>
    </div>
  );
}

export function EndoPage() {
  const { lab } = useLab();
  const rho = spectralRadius(branchingMatrix(lab.params));
  const endo = endogeneity(lab.params);
  return (
    <div className="stack">
      <h2 className="display" style={{ fontSize: 48, lineHeight: 0.9 }}>
        How much of the market is the market?
      </h2>
      <p className="lede">
        Endogenous activity is activity generated by previous market events in the branching
        representation of a linear Hawkes process. Exogenous activity is the immigrant baseline μ.
      </p>
      <Formula>Total activity ≈ exogenous + endogenous · Λ = (I − K)⁻¹ μ</Formula>
      <div className="grid-2">
        <div className="tile">
          <h3>SPLIT</h3>
          <div className="big-num">{(endo * 100).toFixed(0)}%</div>
          <div className="unit">endogenous share</div>
          <div className="big-num" style={{ fontSize: 40, marginTop: 18 }}>
            {((1 - endo) * 100).toFixed(0)}%
          </div>
          <div className="unit">exogenous share</div>
        </div>
        <div className="tile">
          <Gauge rho={rho} />
          <p style={{ color: "var(--blush)", lineHeight: 1.65, marginTop: 12 }}>
            Information arrivals, trader reactions, liquidity withdrawal, algorithmic order
            splitting, and feedback loops can all raise measured endogeneity. The kernel does not
            name which one.
          </p>
        </div>
      </div>
      <div className="tile">
        <h3>CAUSAL HUMILITY</h3>
        <p style={{ color: "var(--blush)", lineHeight: 1.7 }}>
          Hawkes excitation represents statistical dependence in event intensity, not necessarily
          economic causality. Two algorithms watching the same mid can cluster without either
          causing the other. Treat α as a reduced-form aftershock, then argue — with data, not with
          the chart's glow — what mechanism produced it.
        </p>
      </div>
    </div>
  );
}
