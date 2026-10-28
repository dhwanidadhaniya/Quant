import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, type Ipo } from "../lib/api";
import { cr, n, pct, signedClass, x } from "../lib/format";

export default function Universe() {
  const [items, setItems] = useState<Ipo[]>([]);
  const [sort, setSort] = useState("listing_date");
  const [dir, setDir] = useState<-1 | 1>(-1);
  const [filter, setFilter] = useState("");
  const [params] = useSearchParams();
  const nav = useNavigate();
  useEffect(() => { api.ipos("?limit=400").then((r) => setItems(r.items)); }, []);
  useEffect(() => { const q = params.get("q"); if (q) setFilter(q); }, [params]);

  const rows = useMemo(() => {
    let x = items;
    if (filter) {
      const f = filter.toLowerCase();
      x = x.filter((d) => JSON.stringify(d).toLowerCase().includes(f));
    }
    x = [...x].sort((a, b) => {
      const av = a[sort], bv = b[sort];
      if (av == null) return 1;
      if (bv == null) return -1;
      return av > bv ? dir : av < bv ? -dir : 0;
    });
    return x;
  }, [items, sort, dir, filter]);

  function col(k: string) {
    setSort(k);
    setDir((d) => (sort === k ? (d === 1 ? -1 : 1) : -1));
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-8 border-b border-line flex items-center gap-2 px-2">
        <span className="micro">UNIVERSE</span>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="filter" className="bg-void border border-line px-2 py-0.5 tabular text-[11px] outline-none focus:border-magenta" />
        <span className="micro">{rows.length} ROWS</span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-chassis">
            <tr className="micro text-left">
              {[["ticker","TICKER"],["name","NAME"],["listing_date","LISTED"],["sector","SECTOR"],["issue_size_cr","ISSUE"],["gmp_pct","GMP"],["sub_total","SUB"],["sub_qib","QIB"],["listing_return","LIST"],["pe","P/E"],["fund_quality","FUND Q"]].map(([k,l]) => (
                <th key={k} className="px-2 py-1 cursor-pointer" onClick={() => col(k)}>{l}{sort===k ? (dir>0?" ▲":" ▼") : ""}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="hover:bg-graphite cursor-pointer" onClick={() => nav(`/ipo/${d.id}`)}>
                <td className="px-2 py-0.5 tabular text-magenta">{d.ticker}</td>
                <td className="truncate max-w-[220px]">{d.name}</td>
                <td className="tabular text-mute">{String(d.listing_date).slice(0,10)}</td>
                <td className="text-mute">{d.sector}</td>
                <td className="tabular">{cr(d.issue_size_cr)}</td>
                <td className={`tabular ${signedClass(d.gmp_pct)}`}>{pct(d.gmp_pct)}</td>
                <td className="tabular">{x(d.sub_total)}</td>
                <td className="tabular">{x(d.sub_qib)}</td>
                <td className={`tabular ${signedClass(d.listing_return)}`}>{pct(d.listing_return)}</td>
                <td className="tabular">{n(d.pe, 1)}</td>
                <td className="micro">{d.fund_quality}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
