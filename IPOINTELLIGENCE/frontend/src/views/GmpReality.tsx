import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hist, Scatter } from "../charts/Echarts";
import Learn from "../components/Learn";
import { api, type Ipo } from "../lib/api";
import { n, pct, signedClass } from "../lib/format";
import { useMode } from "../state";

export default function GmpReality() {
  const [items, setItems] = useState<Ipo[]>([]);
  const [research, setResearch] = useState<any>(null);
  const nav = useNavigate();
  const { mode } = useMode();

  useEffect(() => {
    api.ipos("?limit=400").then((r) => setItems(r.items.filter((d) => d.gmp != null)));
    api.research().then(setResearch);
  }, []);

  const scatter = useMemo(
    () => items.filter((d) => d.gmp_pct != null && d.listing_return != null).map((d) => [d.gmp_pct, d.listing_return, d.ticker] as [number, number, string]),
    [items]
  );
  const errors = items.map((d) => d.gmp_error).filter((v) => v != null);
  const g = research?.gmp_overall;

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="px-3 py-2 border-b border-line flex items-end justify-between">
        <div>
          <div className="micro text-magenta">FLAGSHIP</div>
          <div className="text-xl tracking-tight">GMP VS REALITY</div>
          <div className="text-[12px] text-mute max-w-3xl">
            Last published grey-market premium versus NSE listing open. This is a short-horizon forecast error study, not a proof of market quality. T-10 paths are not in the sourced extract.
          </div>
        </div>
        <div className="flex gap-6 tabular text-[12px]">
          <Stat k="N PAIRED" v={String(g?.n ?? "—")} />
          <Stat k="MAE" v={g ? `${n(g.mae * 100, 1)}pp` : "—"} />
          <Stat k="RMSE" v={g ? `${n(g.rmse * 100, 1)}pp` : "—"} />
          <Stat k="DIR ACC" v={pct(g?.directional_accuracy)} />
          <Stat k="PEARSON" v={n(g?.pearson, 2)} />
        </div>
      </div>
      {mode.learn && <div className="px-3"><Learn id="gmp_error" /></div>}
      <div className="grid grid-cols-2 flex-1 min-h-0">
        <div className="border-r border-line">
          <Scatter data={scatter} xName="GMP implied listing return" yName="Actual listing open return" identity />
        </div>
        <div>
          <Hist values={errors} name="PREDICTION ERROR  actual − gmp implied" />
        </div>
      </div>
      <div className="h-48 overflow-auto border-t border-line">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-chassis micro">
            <tr>
              {["TICKER", "NAME", "GMP ₹", "GMP %", "EXP LIST", "ACT LIST", "ERROR", "SUB", "SECTOR"].map((h) => (
                <th key={h} className="px-2 py-1 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.slice().sort((a, b) => Math.abs(b.gmp_error || 0) - Math.abs(a.gmp_error || 0)).slice(0, 80).map((d) => (
              <tr key={d.id} className="hover:bg-graphite cursor-pointer" onClick={() => nav(`/ipo/${d.id}`)}>
                <td className="px-2 py-0.5 tabular text-magenta">{d.ticker}</td>
                <td className="truncate max-w-[220px]">{d.name}</td>
                <td className="tabular">{n(d.gmp, 0)}</td>
                <td className={`tabular ${signedClass(d.gmp_pct)}`}>{pct(d.gmp_pct)}</td>
                <td className="tabular">{n((d.issue_price || 0) + (d.gmp || 0), 1)}</td>
                <td className="tabular">{n(d.listing_open, 1)}</td>
                <td className={`tabular ${signedClass(d.gmp_error)}`}>{pct(d.gmp_error)}</td>
                <td className="tabular">{n(d.sub_total, 1)}×</td>
                <td className="text-mute">{d.sector}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="micro">{k}</div>
      <div className="tabular text-readout">{v}</div>
    </div>
  );
}
