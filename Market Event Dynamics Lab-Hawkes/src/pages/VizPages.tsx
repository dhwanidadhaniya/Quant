import { useMemo, useState } from "react";
import { EVENT_SHORT, EVENT_TYPES } from "../math/types";
import {
  attachParents,
  branchingMatrix,
  halfLife,
  heatmap,
  intensityAt,
} from "../math/hawkes";
import { useLab } from "../state";
import { Formula, Gauge, Why } from "../components/ui";
import { CascadeCanvas, EventUniverse, HeatmapView, IntensityRiver } from "../components/viz";

export function UniversePage() {
  const { lab } = useLab();
  const ev = useMemo(() => attachParents(lab.events, lab.params), [lab.events, lab.params]);
  const [picked, setPicked] = useState<(typeof ev)[0] | null>(null);
  return (
    <div className="stack">
      <p className="lede">
        Each particle is an event. BUY = sphere, SELL = diamond, cancellation = ring. Radial
        distance is event time. Links are inferred parents — the largest kernel contribution among
        prior events, not a causal arrow.
      </p>
      <div className="tile" style={{ minHeight: 460 }}>
        <h3>THE EVENT UNIVERSE</h3>
        <EventUniverse events={ev} onPick={(e) => setPicked(e)} />
      </div>
      {picked && (
        <div className="tile">
          <h3>SELECTED EVENT</h3>
          <p>
            {EVENT_SHORT[picked.type]} at t={picked.t.toFixed(4)} · parent{" "}
            {picked.parent ?? "immigrant / unclear"} · excitation {picked.excitation?.toFixed(3) ?? "—"}
          </p>
          <Why>
            Parent assignment is a heuristic decomposition of intensity into baseline vs kernel
            terms. Two events can be dependent without one being the other's parent.
          </Why>
        </div>
      )}
    </div>
  );
}

export function RiverPage() {
  const { lab } = useLab();
  const [u, setU] = useState(0.55);
  const t = u * lab.T;
  const buy = intensityAt(t, lab.events, lab.params, "BUY");
  const sell = intensityAt(t, lab.events, lab.params, "SELL");
  const cxl =
    intensityAt(t, lab.events, lab.params, "B_CXL") + intensityAt(t, lab.events, lab.params, "S_CXL");
  const mu = lab.params.mu.reduce((a, b) => a + b, 0);
  return (
    <div className="stack">
      <p className="lede">
        The intensity river is the model's bloodwork: how fast each event type is expected to
        arrive, given history. Pulses are not prices. They are rates.
      </p>
      <div className="tile">
        <h3>INTENSITY RIVER</h3>
        <IntensityRiver events={lab.events} params={lab.params} T={lab.T} />
        <div className="slider-row">
          <span className="mono">probe t</span>
          <input type="range" min={0} max={1} step={0.001} value={u} onChange={(e) => setU(+e.target.value)} />
          <span className="mono">{t.toFixed(2)}</span>
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>object</th>
              <th>value</th>
              <th>meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>λ_buy(t)</td>
              <td>{buy.toFixed(3)}</td>
              <td>buy-market arrival rate</td>
            </tr>
            <tr>
              <td>λ_sell(t)</td>
              <td>{sell.toFixed(3)}</td>
              <td>sell-market arrival rate</td>
            </tr>
            <tr>
              <td>λ_cancel(t)</td>
              <td>{cxl.toFixed(3)}</td>
              <td>combined cancellation rate</td>
            </tr>
            <tr>
              <td>Σ μ</td>
              <td>{mu.toFixed(3)}</td>
              <td>exogenous floor (no memory)</td>
            </tr>
            <tr>
              <td>excitation</td>
              <td>{(buy + sell + cxl - mu).toFixed(3)}</td>
              <td>history contribution at this t</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MatrixPage() {
  const { lab } = useLab();
  const [sel, setSel] = useState<[number, number]>([0, 0]);
  const [i, j] = sel;
  const a = lab.params.alpha[i][j];
  const b = lab.params.beta[i][j];
  const recv = EVENT_TYPES[i];
  const trig = EVENT_TYPES[j];
  return (
    <div className="grid-2">
      <div className="tile">
        <h3>EXCITATION MATRIX αᵢⱼ</h3>
        <p className="lede" style={{ fontSize: 14 }}>
          Rows receive. Columns trigger. Cell size encodes α — the jump in i's intensity when j
          fires.
        </p>
        <div className="matrix" style={{ marginTop: 12 }}>
          <div className="matrix-row">
            <span />
            {EVENT_TYPES.map((t) => (
              <span className="mlab" key={t} style={{ textAlign: "center" }}>
                {EVENT_SHORT[t]}
              </span>
            ))}
          </div>
          {EVENT_TYPES.map((row, ri) => (
            <div className="matrix-row" key={row}>
              <span className="mlab">{EVENT_SHORT[row]}</span>
              {EVENT_TYPES.map((col, ci) => {
                const v = lab.params.alpha[ri][ci];
                const s = 0.55 + 0.7 * Math.min(1, v / 0.7);
                return (
                  <button
                    key={col}
                    className="mcell"
                    onClick={() => setSel([ri, ci])}
                    style={{
                      transform: `scale(${s})`,
                      background: `rgba(255,45,149,${0.15 + 0.8 * Math.min(1, v / 0.6)})`,
                    }}
                  >
                    {v.toFixed(2)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="stack">
        <div className="tile">
          <h3>
            {EVENT_SHORT[trig]} → {EVENT_SHORT[recv]}
          </h3>
          <p style={{ color: "var(--blush)", lineHeight: 1.6 }}>
            {EVENT_SHORT[recv]} intensity receives excitation from preceding {EVENT_SHORT[trig]}{" "}
            events.
          </p>
          <Formula>
            α = {a.toFixed(3)} · β = {b.toFixed(3)} · half-life = {halfLife(b).toFixed(3)}
          </Formula>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>
            Confidence intervals and p-values require a Hessian of the likelihood or a parametric
            bootstrap. This desk reports point estimates from MLE / known θ. Do not read a large
            α as "statistically significant" without that extra step.
          </p>
          <Why>
            Strong BUY→BUY is consistent with order splitting and momentum. Strong BUY→SELL is
            consistent with two-sided flow or short-horizon reversion. Neither is a verdict on
            information.
          </Why>
        </div>
        <Gauge rho={Math.max(...branchingMatrix(lab.params).flat())} />
      </div>
    </div>
  );
}

export function CascadePage() {
  const { lab } = useLab();
  const ev = useMemo(() => attachParents(lab.events, lab.params), [lab.events, lab.params]);
  const [idx, setIdx] = useState(12);
  const e = ev[Math.min(idx, Math.max(0, ev.length - 1))];
  const before = e
    ? intensityAt(Math.max(0, e.t - 1e-6), ev.slice(0, ev.indexOf(e)), lab.params, e.type)
    : 0;
  const after = e ? intensityAt(e.t + 1e-6, ev.slice(0, ev.indexOf(e) + 1), lab.params, e.type) : 0;
  return (
    <div className="stack">
      <p className="lede">
        A cascade is a branching tree of statistically attributed offspring. Animation traces
        probability mass, not settlement instructions.
      </p>
      <div className="tile">
        <h3>CASCADE VIEW</h3>
        <CascadeCanvas events={ev} />
      </div>
      <div className="tile">
        <h3>INSPECT NODE</h3>
        <div className="slider-row">
          <span className="mono">event index</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, ev.length - 1)}
            value={idx}
            onChange={(e) => setIdx(+e.target.value)}
          />
          <span className="mono">{idx}</span>
        </div>
        {e && (
          <table className="data">
            <tbody>
              <tr>
                <td>type / t</td>
                <td>
                  {e.type} · {e.t.toFixed(4)}
                </td>
              </tr>
              <tr>
                <td>triggering event</td>
                <td>{e.parent ?? "none (immigrant or weak attribution)"}</td>
              </tr>
              <tr>
                <td>excitation strength</td>
                <td>{e.excitation?.toFixed(4)}</td>
              </tr>
              <tr>
                <td>λ before / after</td>
                <td>
                  {before.toFixed(3)} → {after.toFixed(3)}
                </td>
              </tr>
              <tr>
                <td>expected descendants</td>
                <td>
                  kernel mass from this type ≈{" "}
                  {lab.params.alpha[EVENT_TYPES.indexOf(e.type)]
                    .reduce((s, a, j) => s + a / lab.params.beta[EVENT_TYPES.indexOf(e.type)][j], 0)
                    .toFixed(3)}{" "}
                  (row sum of K, not a count of named children)
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function HeatmapPage() {
  const { lab } = useLab();
  const grid = heatmap(lab.events, lab.T, 72);
  return (
    <div className="stack">
      <p className="lede">
        Time runs right. Darkness is calm. Magenta density is a cluster. Read buy-side dominance as
        a row lighting up while others stay dim — not as a forecast.
      </p>
      <div className="tile">
        <h3>MARKET ACTIVITY HEATMAP</h3>
        <HeatmapView grid={grid} T={lab.T} />
      </div>
      <Why>
        Bin counts are not intensities. They are realizations. A Hawkes model tries to explain why
        some columns glow together across types.
      </Why>
    </div>
  );
}
