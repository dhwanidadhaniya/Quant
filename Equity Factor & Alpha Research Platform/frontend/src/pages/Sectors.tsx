import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { get, fmt } from "../lib/api";

const F = ["value", "momentum", "quality", "growth", "size", "low_vol"];

export default function Sectors() {
  const nav = useNavigate();
  const [d, setD] = useState<any>(null);
  useEffect(() => { get("/api/sectors").then(setD); }, []);
  const rows = d?.sectors || [];
  return (
    <div className="pb-16">
      <h1 className="display text-3xl">Sector intelligence</h1>
      <p className="mt-1 text-sm text-mute">Valuation-ish scores, growth, quality and realised risk in one grid. Rotation here is a heatmap, not a trading signal.</p>
      <div className="mt-5 overflow-auto glass">
        <table className="min-w-[800px] text-left text-xs">
          <thead>
            <tr className="text-mute">
              {["sector", "n", "alpha", "ret", "risk", ...F].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.sector} className="border-t border-ink/5">
                <td className="px-3 py-1 font-medium">{r.sector}</td>
                <td className="num px-3">{r.n}</td>
                <td className="num px-3">{fmt.n(r.alpha, 0)}</td>
                <td className="num px-3">{fmt.pct(r.ret)}</td>
                <td className="num px-3">{fmt.pct(r.risk)}</td>
                {F.map((f) => <td key={f} className="num px-3" style={{ background: `rgba(30,110,99,${(r[f] || 0) / 180})` }}>{fmt.n(r[f], 0)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 glass p-3">
        <p className="text-[11px] text-mute">Risk–return by sector (bubble = names inside)</p>
        <div className="h-72">
          <ResponsiveContainer>
            <ScatterChart>
              <XAxis type="number" dataKey="risk" tickCount={5} tickFormatter={(v) => fmt.pct(v, 0)} />
              <YAxis type="number" dataKey="return" tickCount={5} tickFormatter={(v) => fmt.pct(v, 0)} />
              <Tooltip />
              <Scatter data={d?.names || []} fill="#534178" fillOpacity={0.5} onClick={(x: any) => x?.ticker && nav(`/company/${encodeURIComponent(x.ticker)}`)} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
