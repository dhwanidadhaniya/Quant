import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { get, fmt } from "../lib/api";
import { Tip } from "../components/ui/Meta";

type Row = Record<string, any>;

const COLS: [string, string, string?][] = [
  ["ticker", "Company"],
  ["price", "Price"],
  ["market_cap", "Mkt cap"],
  ["pe", "PE", "pe"],
  ["pb", "PB", "pb"],
  ["roe", "ROE", "roe"],
  ["eps_growth", "Growth"],
  ["momentum", "Mom", "momentum"],
  ["quality", "Qual", "quality"],
  ["value", "Val", "value"],
  ["alpha_score", "Alpha", "alpha"],
];

export default function Explorer() {
  const [rows, setRows] = useState<Row[]>([]);
  const [sort, setSort] = useState("alpha_score");
  const [dir, setDir] = useState<-1 | 1>(-1);
  const [sector, setSector] = useState("All");
  const [q, setQ] = useState("");
  const [f, setF] = useState({ pe: 80, pb: 20, roe: 0, mcap: 0 });

  useEffect(() => {
    get<{ items: Row[] }>("/api/companies").then((d) => setRows(d.items));
  }, []);

  const sectors = useMemo(() => ["All", ...Array.from(new Set(rows.map((r) => r.sector)))], [rows]);
  const shown = rows
    .filter((r) => sector === "All" || r.sector === sector)
    .filter((r) => !q || `${r.ticker} ${r.name}`.toLowerCase().includes(q.toLowerCase()))
    .filter((r) => (r.pe ?? 99) <= f.pe && (r.pb ?? 99) <= f.pb && (r.roe ?? 0) >= f.roe / 100)
    .sort((a, b) => ((a[sort] ?? 0) - (b[sort] ?? 0)) * dir);

  const click = (k: string) => {
    if (sort === k) setDir(dir === 1 ? -1 : 1);
    else { setSort(k); setDir(-1); }
  };

  return (
    <div className="pb-16">
      <h1 className="display text-3xl">Stock explorer</h1>
      <p className="mt-1 max-w-xl text-sm text-mute">
        Screen the sample universe. Every column is a characteristic, not a recommendation. Sort freely — then open the name.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <input className="glass px-3 py-2 text-sm" placeholder="Search ticker or name" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="glass px-3 py-2 text-sm" value={sector} onChange={(e) => setSector(e.target.value)}>
          {sectors.map((s) => <option key={s}>{s}</option>)}
        </select>
        <label className="glass px-3 py-2 text-xs">PE ≤ {f.pe}
          <input type="range" min={8} max={80} value={f.pe} onChange={(e) => setF({ ...f, pe: +e.target.value })} className="w-full" />
        </label>
        <label className="glass px-3 py-2 text-xs">ROE ≥ {f.roe}%
          <input type="range" min={0} max={30} value={f.roe} onChange={(e) => setF({ ...f, roe: +e.target.value })} className="w-full" />
        </label>
      </div>
      <div className="mt-4 overflow-auto glass">
        <table className="w-full min-w-[900px] text-left text-[12.5px]">
          <thead className="border-b border-ink/10 text-[11px] text-mute">
            <tr>
              {COLS.map(([k, lab, tip]) => (
                <th key={k} className="cursor-pointer px-3 py-2 font-medium" onClick={() => click(k)}>
                  {lab}{tip && <Tip id={tip} />} {sort === k ? (dir < 0 ? "↓" : "↑") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.ticker} className="border-b border-ink/5 hover:bg-white/40">
                <td className="px-3 py-2">
                  <Link className="text-teal" to={`/company/${encodeURIComponent(r.ticker)}`}>{r.ticker}</Link>
                  <div className="text-[10px] text-mute">{r.name}</div>
                </td>
                <td className="num px-3">{fmt.n(r.price ?? r.close, 1)}</td>
                <td className="num px-3">{fmt.compact(r.market_cap)}</td>
                <td className="num px-3">{fmt.n(r.pe, 1)}</td>
                <td className="num px-3">{fmt.n(r.pb, 1)}</td>
                <td className="num px-3">{fmt.pct(r.roe)}</td>
                <td className="num px-3">{fmt.pct(r.eps_growth)}</td>
                <td className="num px-3">{fmt.score(r.momentum)}</td>
                <td className="num px-3">{fmt.score(r.quality)}</td>
                <td className="num px-3">{fmt.score(r.value)}</td>
                <td className="num px-3 font-medium">{fmt.score(r.alpha_score)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-mute">{shown.length} names after filters. Price column uses last sample close when loaded from the company endpoint; ranks are as-of sample end.</p>
    </div>
  );
}
