import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { n, pct } from "../lib/format";
import Learn from "../components/Learn";
import { useMode } from "../state";

export default function WhenGmp() {
  const [r, setR] = useState<any>(null);
  const { mode } = useMode();
  useEffect(() => { api.research().then(setR); }, []);
  if (!r) return <div className="p-4 micro">LOADING RESEARCH CACHE</div>;
  return (
    <div className="h-full overflow-auto p-3 space-y-4">
      <div>
        <div className="micro text-magenta">CENTRAL EMPIRICAL ENGINE</div>
        <div className="text-xl">WHEN DOES GMP WORK?</div>
        <p className="text-[12px] text-mute max-w-4xl mt-1">
          Segment last-GMP forecast error by size, GMP level, subscription, QIB snapshot, market regime and sector.
          These are historical associations in this extract. They are not a trading rule and not a universal law.
        </p>
      </div>
      {mode.learn && <Learn id="gmp_error" />}
      {Object.entries(r.segments || {}).map(([name, groups]: any) => (
        <div key={name} className="panel">
          <div className="micro px-2 py-1 border-b border-line">{name}</div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="micro text-left">
                {["BUCKET", "N", "PEARSON", "SPEARMAN", "MAE", "RMSE", "DIR ACC", "R² vs GMP", "AVG LIST", "MED LIST"].map((h) => (
                  <th key={h} className="px-2 py-1">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(groups).map(([k, v]: any) => (
                <tr key={k} className="hover:bg-graphite">
                  <td className="px-2 py-0.5 text-readout">{k}</td>
                  <td className="tabular">{v.n}</td>
                  <td className="tabular">{n(v.pearson, 2)}</td>
                  <td className="tabular">{n(v.spearman, 2)}</td>
                  <td className="tabular">{v.mae != null ? n(v.mae * 100, 1) + "pp" : "—"}</td>
                  <td className="tabular">{v.rmse != null ? n(v.rmse * 100, 1) + "pp" : "—"}</td>
                  <td className="tabular text-quant">{pct(v.directional_accuracy)}</td>
                  <td className="tabular">{n(v.r2_vs_identity, 2)}</td>
                  <td className="tabular">{pct(v.mean_listing_return)}</td>
                  <td className="tabular">{pct(v.median_listing_return)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
