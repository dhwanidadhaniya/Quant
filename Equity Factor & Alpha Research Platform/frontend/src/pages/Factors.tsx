import { useEffect, useState } from "react";
import { get, fmt } from "../lib/api";
import { FACTOR_PROSE, METRICS } from "../lib/copy";
import { Why } from "../components/ui/Meta";

const F = ["value", "momentum", "quality", "size", "growth", "low_vol"] as const;

export default function Factors() {
  const [d, setD] = useState<any>(null);
  const [sel, setSel] = useState<(typeof F)[number]>("value");
  useEffect(() => { get("/api/factors/overview").then(setD); }, []);
  if (!d) return <p className="text-sm text-mute">Loading factor book…</p>;
  const m = METRICS[sel] || METRICS.value;
  return (
    <div className="pb-16">
      <h1 className="display text-3xl">Factor research lab</h1>
      <p className="mt-1 max-w-2xl text-sm text-mute">
        Six characteristics. Each one is a research question, not a product name. Pick a node, read the definition, then look at who actually sits in the sleeve.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {F.map((f) => (
          <button key={f} onClick={() => setSel(f)} className={`px-3 py-1.5 text-sm ${sel === f ? "bg-ink text-ivory" : "glass"}`}>
            {f.replace("_", " ")}
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <article className="glass p-5">
          <h2 className="display text-2xl">{m.title}</h2>
          <p className="mt-2 text-sm leading-relaxed">{m.simple}</p>
          <p className="mt-3 text-xs uppercase tracking-wide text-violet">Technical</p>
          <p className="text-sm text-mute">{m.technical}</p>
          <p className="num mt-3 text-sm text-teal">{m.formula}</p>
          <p className="mt-1 text-xs text-mute">{m.vars}</p>
          <p className="mt-3 text-sm leading-relaxed">{m.intuition}</p>
          <p className="mt-2 text-xs text-mute"><b>How it is used.</b> {m.use}</p>
          <p className="mt-1 text-xs text-mute"><b>Limits.</b> {m.limits}</p>
          <p className="mt-1 text-xs text-mute"><b>Example.</b> {m.example}</p>
          <Why id={sel} />
        </article>
        <div className="space-y-3">
          <div className="glass p-4">
            <p className="text-[11px] text-mute">Top of sleeve</p>
            {(d.tops[sel] || []).map((r: any) => (
              <div key={r.ticker} className="flex justify-between py-0.5 text-sm">
                <span>{r.ticker} <span className="text-[10px] text-mute">{r.sector}</span></span>
                <span className="num">{fmt.score(r.score)}</span>
              </div>
            ))}
          </div>
          <div className="glass p-4">
            <p className="text-[11px] text-mute">Bottom of sleeve</p>
            {(d.bottoms[sel] || []).map((r: any) => (
              <div key={r.ticker} className="flex justify-between py-0.5 text-sm">
                <span>{r.ticker}</span><span className="num">{fmt.score(r.score)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <h3 className="display mt-10 text-xl">Pairwise correlation of scores</h3>
      <p className="text-xs text-mute">If two factors are 0.7 correlated, a “multi-factor” book is mostly one bet. Check this before you celebrate diversification.</p>
      <div className="mt-3 overflow-auto glass p-3">
        <table className="text-xs">
          <thead><tr><th></th>{F.map((f) => <th key={f} className="px-2 py-1">{f}</th>)}</tr></thead>
          <tbody>
            {F.map((a) => (
              <tr key={a}>
                <td className="pr-2 font-medium">{a}</td>
                {F.map((b) => {
                  const v = d.correlation[a]?.[b] ?? 0;
                  return <td key={b} className="num px-2 py-1" style={{ background: `rgba(83,65,120,${Math.abs(v) * 0.35})` }}>{v.toFixed(2)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="display mt-8 text-xl">Sector exposure of scores (mean)</h3>
      <div className="mt-2 overflow-auto glass">
        <table className="min-w-[720px] text-left text-xs">
          <thead><tr className="text-mute">{["sector", ...F].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {(d.sector_exposure || []).map((r: any) => (
              <tr key={r.sector} className="border-t border-ink/5">
                <td className="px-3 py-1">{r.sector}</td>
                {F.map((f) => <td key={f} className="num px-3">{fmt.n(r[f], 0)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 max-w-xl text-xs text-mute">{FACTOR_PROSE[sel]} Historical performance of tradable factor portfolios lives in Backtesting Studio — this page is the cross-section as of sample end.</p>
    </div>
  );
}
