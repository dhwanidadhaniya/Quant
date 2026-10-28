import { useEffect, useState } from "react";
import { Explain, Panel, Stat, fmt } from "../components/explain/Explain";
import { LineXY } from "../components/charts/Charts";
import { api } from "../lib/api";
import { useMarket } from "../lib/store";

export function StochasticLab() {
  const s = useMarket((st) => st.state);
  const [lam, setLam] = useState(16);
  const [mu, setMu] = useState(22);
  const [ana, setAna] = useState<any>(null);
  const [mc, setMc] = useState<any>(null);
  const [recon, setRecon] = useState<any>(null);

  useEffect(() => {
    api.queueAnalysis(lam, mu).then(setAna);
  }, [lam, mu]);

  const P: number[][] = ana?.markov?.P ?? [];
  const labels: string[] = ana?.markov?.labels ?? [];
  const pi: number[] = ana?.markov?.pi ?? [];

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12">
        <div className="kicker text-fuchsia">08 · STOCHASTIC LAB</div>
        <h1 className="font-display text-4xl">
          State, memory, and <span className="text-pink">many futures</span>
        </h1>
      </div>

      <Panel kicker="MARKOV" title="Liquidity-state chain" className="col-span-12 lg:col-span-7">
        <Explain
          title="Markov assumption"
          formula="P_{ij} = P(X_{t+1}=j | X_t=i)"
          what="Next coarse state depends on the current one, not the full history."
          why="A useful reduced model of empty / low / normal / deep / very deep."
          theory="Finite Markov chain. Stationary π satisfies π P = π."
          interpretation="π is the long-run occupancy of those labels in the toy chain — not of the live book."
          trading="Useful language. Dangerous if you forget clustering (need Hawkes / history)."
          limitation="Order flow has memory. Markov is an educational cut."
          educational
        >
          <div className="flex gap-4">
            <div>
              <label className="kicker">λ {lam}</label>
              <input type="range" min={4} max={40} value={lam} onChange={(e) => setLam(+e.target.value)} />
            </div>
            <div>
              <label className="kicker">μ {mu}</label>
              <input type="range" min={4} max={50} value={mu} onChange={(e) => setMu(+e.target.value)} />
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="font-mono text-[11px]">
              <thead>
                <tr>
                  <th />
                  {labels.map((l) => (
                    <th key={l} className="px-2 text-mute">
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {P.map((row, i) => (
                  <tr key={i}>
                    <td className="pr-2 text-pink">{labels[i]}</td>
                    {row.map((v, j) => (
                      <td key={j} className="px-2">
                        {v.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-2">
            {labels.map((l, i) => (
              <div key={l} className="flex-1">
                <div className="bg-fuchsia" style={{ height: `${(pi[i] || 0) * 80}px` }} />
                <div className="kicker mt-1">{l}</div>
                <div className="font-mono text-[10px]">{fmt(pi[i], 2)}</div>
              </div>
            ))}
          </div>
        </Explain>
      </Panel>

      <Panel kicker="π P = π" title="What 'stationary' means" className="col-span-12 lg:col-span-5">
        <p className="text-sm text-mute">
          A distribution π is stationary when, if you start the chain in π, you stay in π. It is a long-run occupancy,
          not a forecast that tomorrow looks like today. Non-stationary intensities (open, news, close) break it. This
          simulator is locally stationary between shocks.
        </p>
        <div className="mt-4 font-mono text-[12px] text-mist">
          EMPTY · LOW · NORMAL · DEEP · VERY DEEP
        </div>
      </Panel>

      <Panel kicker="MONTE CARLO" title="1,000 possible queue futures" className="col-span-12">
        <button onClick={() => api.monteCarlo(1000).then(setMc)} className="kicker bg-cyan px-3 py-2 text-void">
          DRAW 1,000 PATHS OF Q_AHEAD
        </button>
        {mc?.mc && (
          <div className="mt-3">
            <div className="grid grid-cols-4 gap-3">
              <Stat label="P(FILL)" value={fmt(mc.mc.p_fill, 2)} />
              <Stat label="MEAN T" value={fmt(mc.mc.mean, 1)} />
              <Stat label="MEDIAN" value={fmt(mc.mc.median, 1)} />
              <Stat label="CENSORED" value={`${mc.mc.n_censored}`} />
            </div>
            <PathField paths={mc.mc.paths} />
          </div>
        )}
      </Panel>

      <Panel kicker="RECONSTRUCTION" title="Raw events vs rebuilt book" className="col-span-12">
        <Explain
          title="L2 reconstruction"
          formula="add / cancel / execute → FIFO queues"
          what="The visible book is always a reconstruction of a message tape."
          why="This is how a research stack should treat data — even simulated data."
          theory="Event-sourced LOB."
          interpretation="Raw tape on the left (live log). Rebuilt snapshot after POST /reconstruct."
          trading="Never confuse a snapshot with the engine that produced it."
          limitation="Schema is ready for HISTORICAL/LIVE later. Today every bit is SIMULATED."
        >
          <button
            className="kicker hairline px-3 py-2"
            onClick={() => api.reconstruct(s?.events ?? []).then(setRecon)}
          >
            RECONSTRUCT FROM LAST EVENTS
          </button>
          {recon && (
            <pre className="mt-3 max-h-48 overflow-auto font-mono text-[10px] text-mute">
              {JSON.stringify({ source: recon.source, n: recon.n_events, book: recon.book }, null, 2)}
            </pre>
          )}
        </Explain>
      </Panel>
    </div>
  );
}

function PathField({ paths }: { paths: { t: number; qa: number }[][] }) {
  const w = 640;
  const h = 180;
  const tmax = Math.max(1, ...paths.flatMap((p) => p.map((x) => x.t)));
  const qmax = Math.max(1, ...paths.flatMap((p) => p.map((x) => x.qa)));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 w-full bg-black">
      {paths.map((path, i) => {
        const d = path
          .map((p, j) => {
            const x = (p.t / tmax) * w;
            const y = h - (p.qa / qmax) * (h - 8) - 4;
            return `${j ? "L" : "M"} ${x} ${y}`;
          })
          .join(" ");
        return <path key={i} d={d} fill="none" stroke="#ff2d95" strokeOpacity={0.25} strokeWidth="1" />;
      })}
    </svg>
  );
}
