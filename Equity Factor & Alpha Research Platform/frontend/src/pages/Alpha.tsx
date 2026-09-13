import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { get, fmt, DEFAULT_W, type Weights } from "../lib/api";
import { Why } from "../components/ui/Meta";

const KEYS = Object.keys(DEFAULT_W) as (keyof Weights)[];

export default function Alpha() {
  const [w, setW] = useState<Weights>({ ...DEFAULT_W });
  const [items, setItems] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);

  const qs = useMemo(() => new URLSearchParams(KEYS.map((k) => [k, String(w[k])])).toString(), [w]);
  useEffect(() => {
    get<{ items: any[] }>(`/api/alpha/rankings?${qs}`).then((d) => {
      setItems(d.items);
      setSel(d.items[0]);
    });
  }, [qs]);

  const tot = KEYS.reduce((s, k) => s + w[k], 0);
  const top = sel;

  return (
    <div className="pb-16">
      <h1 className="display text-3xl">Alpha discovery</h1>
      <p className="mt-1 max-w-2xl text-sm text-mute">
        A weighted rank of six characteristics. Move a slider, the book re-orders. This is not a black-box forecast and it is not guaranteed future return.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[18rem_1fr_20rem]">
        <div className="glass p-4">
          <p className="text-[11px] text-mute">Weights (auto-normalised in the engine)</p>
          {KEYS.map((k) => (
            <label key={k} className="mt-3 block text-xs">
              <span className="flex justify-between"><span>{k.replace("_", " ")}</span><span className="num">{Math.round((w[k] / tot) * 100)}%</span></span>
              <input type="range" min={0} max={40} value={Math.round(w[k] * 100)} onChange={(e) => setW({ ...w, [k]: +e.target.value / 100 })} className="w-full" />
            </label>
          ))}
          <button className="mt-3 text-xs text-teal" onClick={() => setW({ ...DEFAULT_W })}>reset 25/20/20/15/10/10</button>
          <Why>Changing Value from 25% to 40% will pull cheap cyclicals up the list and usually raise the book's realised vol. Watch the scorecard on the right.</Why>
        </div>

        <div>
          {top && <Scorecard row={top} w={w} tot={tot} />}
          <div className="mt-4 glass max-h-[420px] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-paper/90 text-mute"><tr>{["#", "Name", "Alpha", "Val", "Mom", "Qual"].map((h) => <th key={h} className="px-2 py-2">{h}</th>)}</tr></thead>
              <tbody>
                {items.slice(0, 25).map((r, i) => (
                  <tr key={r.ticker} onClick={() => setSel(r)} className={`cursor-pointer border-t border-ink/5 ${sel?.ticker === r.ticker ? "bg-white/60" : ""}`}>
                    <td className="px-2 py-1">{i + 1}</td>
                    <td className="px-2 py-1"><Link to={`/company/${encodeURIComponent(r.ticker)}`} className="text-teal">{r.ticker}</Link> <span className="text-mute">{r.name}</span></td>
                    <td className="num px-2">{fmt.score(r.alpha_score)}</td>
                    <td className="num px-2">{fmt.n(r.value, 0)}</td>
                    <td className="num px-2">{fmt.n(r.momentum, 0)}</td>
                    <td className="num px-2">{fmt.n(r.quality, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="glass p-4">
          <p className="text-[11px] text-mute">Why is this name high?</p>
          {top ? (
            <>
              <p className="mt-1 display text-xl">{top.ticker}</p>
              <ul className="mt-2 list-disc pl-4 text-sm leading-relaxed">
                {(top.why || []).map((x: string) => <li key={x}>{x}</li>)}
              </ul>
              <p className="mt-3 text-xs text-mute">1Y sample return {fmt.pct(top.return)} · vol {fmt.pct(top.risk)}</p>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Scorecard({ row, w, tot }: { row: any; w: Weights; tot: number }) {
  const parts = KEYS.map((k) => ({ k, v: (w[k] / tot) * (row[k] || 0), p: w[k] / tot }));
  const score = parts.reduce((s, p) => s + p.v, 0);
  let ang = 0;
  return (
    <div className="glass flex items-center gap-6 p-4">
      <svg viewBox="0 0 120 120" className="h-36 w-36">
        {parts.map((p, i) => {
          const a0 = ang;
          const a1 = ang + p.p * Math.PI * 2;
          ang = a1;
          const arc = describe(60, 60, 44, a0, a1);
          return <path key={p.k} d={arc} fill="none" stroke={i % 2 ? "#534178" : "#1e6e63"} strokeWidth="10" />;
        })}
        <text x="60" y="58" textAnchor="middle" fontSize="22" fontFamily="IBM Plex Mono">{score.toFixed(1)}</text>
        <text x="60" y="74" textAnchor="middle" fontSize="8" fill="#5b6572">Alpha Potential</text>
      </svg>
      <div className="text-sm">
        <p className="max-w-sm text-mute">
          {score >= 75 ? "High factor alignment with the current weights — still a characteristic mix, not a target price."
            : score >= 55 ? "Mid-pack. The sleeves are mixed; read the contribution before promoting it."
            : "Low alignment. Either the weights don't match the name, or the name doesn't match the research question."}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-x-4 text-xs">
          {parts.map((p) => (
            <div key={p.k} className="flex justify-between gap-3"><span>{p.k}</span><span className="num">{p.v.toFixed(1)}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function describe(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = [cx + r * Math.cos(a0 - Math.PI / 2), cy + r * Math.sin(a0 - Math.PI / 2)];
  const p1 = [cx + r * Math.cos(a1 - Math.PI / 2), cy + r * Math.sin(a1 - Math.PI / 2)];
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${p0[0]} ${p0[1]} A ${r} ${r} 0 ${large} 1 ${p1[0]} ${p1[1]}`;
}
