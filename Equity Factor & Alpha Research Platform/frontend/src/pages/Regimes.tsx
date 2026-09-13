import { useEffect, useState } from "react";
import { get, fmt } from "../lib/api";
import { Why } from "../components/ui/Meta";

const F = ["value", "momentum", "quality", "size", "growth", "low_vol"];

export default function Regimes() {
  const [d, setD] = useState<any>(null);
  const [sel, setSel] = useState<any>(null);
  useEffect(() => { get("/api/regimes").then(setD); }, []);
  const heat = d?.factors?.heatmap || [];
  return (
    <div className="pb-16">
      <h1 className="display text-3xl">Market regime map</h1>
      <p className="mt-1 max-w-xl text-sm text-mute">
        Windows are hand-labelled the way a student notebook would be — COVID air-pocket, 2022 hike, recovery — then we measure factor sleeves inside each.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {(d?.map || []).map((w: any) => (
          <button key={w.start} onClick={() => setSel(w)} className="glass max-w-[14rem] px-3 py-2 text-left text-xs">
            <span className="text-violet">{w.regime}</span>
            <span className="mt-1 block text-mute">{w.start} → {w.end}</span>
          </button>
        ))}
      </div>
      {sel && (
        <div className="glass mt-4 max-w-lg p-4 text-sm">
          <p className="display text-xl">{sel.regime}</p>
          <p className="mt-1 text-mute">{sel.note}</p>
        </div>
      )}
      <div className="mt-6 overflow-auto glass">
        <table className="min-w-[720px] text-left text-sm">
          <thead>
            <tr className="text-xs text-mute">
              <th className="px-3 py-2">Regime</th>
              {F.map((f) => <th key={f} className="px-3">{f}</th>)}
            </tr>
          </thead>
          <tbody>
            {heat.map((r: any) => (
              <tr key={r.regime} className="border-t border-ink/10">
                <td className="px-3 py-2">{r.regime}</td>
                {F.map((f) => (
                  <td key={f} className={`num px-3 ${r[f] >= 0 ? "up" : "down"}`}>{fmt.pct(r[f], 1)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Why>Momentum's usual humiliation is the high-vol window. If it doesn't show up negative there, the seed process (or the engine) is lying.</Why>
    </div>
  );
}
