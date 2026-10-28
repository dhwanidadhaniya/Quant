import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { n, pct } from "../lib/format";

export default function SectorView() {
  const [r, setR] = useState<any>(null);
  const nav = useNavigate();
  useEffect(() => { api.research().then(setR); }, []);
  return (
    <div className="h-full overflow-auto p-3">
      <div className="micro text-magenta">SECTOR ALPHA MAP</div>
      <div className="text-xl mb-2">SECTOR ANALYTICS</div>
      <p className="text-[12px] text-mute mb-3 max-w-3xl">IPO count, listing, GMP accuracy and post-listing means by sector. Post-listing columns populate only after Yahoo enrichment.</p>
      <table className="w-full text-[11px] panel">
        <thead>
          <tr className="micro text-left border-b border-line">
            {["SECTOR","N","AVG LIST","MED LIST","AVG GMP","GMP MAE","DIR ACC","AVG SUB","P/E PREM","30D","90D","1Y","1Y α"].map((h) => (
              <th key={h} className="px-2 py-1">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(r?.sectors || []).map((s: any) => (
            <tr key={s.sector} className="hover:bg-graphite cursor-pointer" onClick={() => nav(`/universe?q=${encodeURIComponent(s.sector)}`)}>
              <td className="px-2 py-0.5 text-readout">{s.sector}</td>
              <td className="tabular">{s.n}</td>
              <td className="tabular">{pct(s.avg_listing)}</td>
              <td className="tabular">{pct(s.med_listing)}</td>
              <td className="tabular">{pct(s.avg_gmp)}</td>
              <td className="tabular">{s.gmp_mae != null ? n(s.gmp_mae * 100, 1) + "pp" : "—"}</td>
              <td className="tabular">{pct(s.gmp_dir_acc)}</td>
              <td className="tabular">{n(s.avg_sub, 1)}×</td>
              <td className="tabular">{pct(s.avg_pe_premium)}</td>
              <td className="tabular">{pct(s.avg_30d)}</td>
              <td className="tabular">{pct(s.avg_90d)}</td>
              <td className="tabular">{pct(s.avg_1y)}</td>
              <td className="tabular">{pct(s.avg_alpha_1y)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
