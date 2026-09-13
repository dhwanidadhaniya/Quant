import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get } from "../lib/api";

const FACS = ["value", "momentum", "quality", "size", "growth", "low_vol"] as const;
const LABELS: Record<string, string> = { value: "VALUE", momentum: "MOMENTUM", quality: "QUALITY", size: "SIZE", growth: "GROWTH", low_vol: "LOW VOL" };

export default function Constellation() {
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);
  const [focus, setFocus] = useState<string | null>(null);
  useEffect(() => { get("/api/factors/constellation").then(setData); }, []);

  const layout = useMemo(() => {
    if (!data) return { factors: [] as any[], cos: [] as any[] };
    const R = 210, cx = 320, cy = 260;
    const factors = FACS.map((f, i) => {
      const a = (i / FACS.length) * Math.PI * 2 - Math.PI / 2;
      return { id: f, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R };
    });
    const fmap = Object.fromEntries(factors.map((f) => [f.id, f]));
    const cos = data.companies.map((c: any) => {
      let x = 0, y = 0, w = 0;
      for (const f of FACS) {
        const e = c.exposures[f];
        const boost = focus === f ? 1.8 : 1;
        x += fmap[f].x * e * boost;
        y += fmap[f].y * e * boost;
        w += e * boost;
      }
      return { ...c, x: x / w, y: y / w };
    });
    return { factors, cos };
  }, [data, focus]);

  if (!data) return <p className="text-sm text-mute">Placing the constellation…</p>;

  return (
    <div className="pb-12">
      <h1 className="display text-3xl">Factor constellation</h1>
      <p className="mt-1 max-w-2xl text-sm text-mute">
        Names sit near the characteristics they actually load on. A quality-and-momentum compounder should drift toward those two nodes. Click a factor to pull the field.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className={`px-2 py-1 text-xs ${!focus ? "bg-ink text-ivory" : "glass"}`} onClick={() => setFocus(null)}>all factors</button>
        {FACS.map((f) => (
          <button key={f} className={`px-2 py-1 text-xs ${focus === f ? "bg-violet text-ivory" : "glass"}`} onClick={() => setFocus(f)}>{LABELS[f]}</button>
        ))}
      </div>
      <svg viewBox="0 0 640 520" className="mt-4 w-full glass">
        {layout.factors.map((f) => (
          <g key={f.id} onClick={() => setFocus(f.id)} className="cursor-pointer">
            <circle cx={f.x} cy={f.y} r={focus === f.id ? 28 : 24} fill="#fbf7f0" stroke={focus === f.id ? "#534178" : "#1e6e63"} strokeWidth="1.6" />
            <text x={f.x} y={f.y + 3} textAnchor="middle" fontSize="8" fill="#1b2430">{LABELS[f.id]}</text>
          </g>
        ))}
        {layout.cos.map((c: any) => (
          <g key={c.ticker} onClick={() => nav(`/company/${encodeURIComponent(c.ticker)}`)} className="cursor-pointer">
            <circle cx={c.x} cy={c.y} r={3.2 + c.alpha / 80} fill="#1e6e63" fillOpacity={0.55} />
            <title>{c.ticker} · {c.name}</title>
          </g>
        ))}
      </svg>
      <p className="mt-2 text-[11px] text-mute">Position is a weighted average of factor-node coordinates by 0–1 exposure. It is a map, not a physics engine — useful for spotting clusters, not for pricing.</p>
    </div>
  );
}
