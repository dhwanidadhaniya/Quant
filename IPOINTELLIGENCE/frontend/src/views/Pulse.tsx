import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MarketMap from "../charts/MarketMap";
import { Badge } from "../components/Bits";
import Learn from "../components/Learn";
import { api, type Ipo } from "../lib/api";
import { n, pct, signedClass, x } from "../lib/format";
import { useMode } from "../state";

export default function Pulse() {
  const [items, setItems] = useState<Ipo[]>([]);
  const [research, setResearch] = useState<any>(null);
  const nav = useNavigate();
  const { setSelected, selected, mode } = useMode();

  useEffect(() => {
    api.ipos("?limit=400").then((r) => setItems(r.items));
    api.research().then(setResearch);
  }, []);

  const live = useMemo(() => items.filter((d) => d.gmp != null).slice(-18).reverse(), [items]);
  const g = research?.gmp_overall;

  return (
    <div className="grid grid-cols-[340px_1fr] h-full min-h-0">
      <div className="border-r border-line overflow-auto">
        <div className="micro px-2 py-1 border-b border-line">ACTIVE BOOK · GMP TELEMETRY · HISTORICAL EXTRACT</div>
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-chassis">
            <tr className="micro text-left">
              <th className="px-2 py-1">TICKER</th>
              <th>GMP</th>
              <th>QIB</th>
              <th>SUB</th>
              <th>LIST</th>
            </tr>
          </thead>
          <tbody>
            {live.map((d) => (
              <tr key={d.id} className={`cursor-pointer hover:bg-graphite ${selected === d.id ? "bg-plum border-l-2 border-magenta" : ""}`}
                onClick={() => { setSelected(d.id); nav(`/ipo/${d.id}`); }}>
                <td className="px-2 py-1 tabular text-readout">{d.ticker}</td>
                <td className={`tabular ${signedClass(d.gmp_pct)}`}>{pct(d.gmp_pct)}</td>
                <td className="tabular text-info">{x(d.sub_qib)}</td>
                <td className="tabular">{x(d.sub_total)}</td>
                <td className={`tabular ${signedClass(d.listing_return)}`}>{pct(d.listing_return)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {mode.learn && <div className="p-2"><Learn id="gmp_expected_return" /></div>}
        <div className="p-2 border-t border-line text-[11px] text-mute">
          Click a name to open the IPO terminal. Map X is P/E premium vs prior-36m sector IPO median (only when post-issue shares can be estimated). Hollow/dim points lack a multiple.
        </div>
      </div>
      <div className="flex flex-col min-h-0">
        <div className="micro px-2 py-1 border-b border-line flex gap-3">
          <span>IPO MARKET MAP</span>
          <span className="text-dim">X VALUATION PREMIUM · Y DEMAND · SIZE ISSUE · COLOR GMP</span>
          <Badge text="HISTORICAL" tone="amber" />
        </div>
        <div className="flex-1 min-h-0">
          <MarketMap items={items} />
        </div>
        <div className="h-8 border-t border-line flex items-center gap-4 px-3 tabular text-[11px] overflow-hidden">
          <span className="micro">READOUT</span>
          <span>N={research?.n ?? "—"}</span>
          <span className="text-magenta">GMP n={research?.n_gmp ?? "—"}</span>
          <span>DIR ACC {g ? pct(g.directional_accuracy, 1) : "—"}</span>
          <span>MAE {g ? n(g.mae * 100, 1) + "pp" : "—"}</span>
          <span>ρ {g?.pearson != null ? n(g.pearson, 2) : "—"}</span>
          <span className={signedClass(g?.median_listing_return)}>MED LIST {pct(g?.median_listing_return)}</span>
          <span className="text-dim">NOT LIVE FEED</span>
        </div>
      </div>
    </div>
  );
}
