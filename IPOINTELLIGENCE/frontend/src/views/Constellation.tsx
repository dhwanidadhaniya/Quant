import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Ipo } from "../lib/api";
import { pct, signedClass } from "../lib/format";

const SECTOR_COLOR: Record<string, string> = {
  Finance: "#61A8FF",
  "Technology Services": "#FF2DA6",
  "Health Technology": "#45E0A8",
  "Consumer Services": "#FFB84D",
  "Producer Manufacturing": "#D946EF",
  Retail: "#FF5C6C",
};

export default function Constellation() {
  const [items, setItems] = useState<Ipo[]>([]);
  const [hover, setHover] = useState<Ipo | null>(null);
  const nav = useNavigate();
  useEffect(() => { api.ipos("?limit=400").then((r) => setItems(r.items)); }, []);
  const W = 1100, H = 620, pad = 50;
  const pts = useMemo(() => {
    const ys = items.map((d) => d.listing_return).filter((v) => v != null);
    const ymin = Math.min(-0.4, ...ys);
    const ymax = Math.max(1.2, ...ys);
    return { ymin, ymax };
  }, [items]);
  const xOf = (i: number) => pad + (i / Math.max(items.length - 1, 1)) * (W - pad * 2);
  const yOf = (v: number) => H - pad - ((v - pts.ymin) / (pts.ymax - pts.ymin)) * (H - pad * 2);

  return (
    <div className="h-full relative bg-void">
      <div className="absolute left-3 top-2 z-10">
        <div className="micro text-magenta">SIGNATURE</div>
        <div className="text-lg">IPO CONSTELLATION</div>
        <div className="text-[11px] text-mute">Each star is an IPO. Y = listing return. Size = issue size. Glow = |GMP error| (tighter error → brighter magenta).</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
        <line x1={pad} x2={W - pad} y1={yOf(0)} y2={yOf(0)} stroke="#242630" />
        {items.map((d, i) => {
          const y = d.listing_return;
          if (y == null) return null;
          const r = Math.sqrt(Math.max(d.issue_size_cr || 100, 40)) / 9;
          const err = d.gmp_error;
          const glow = err == null ? 0.15 : Math.max(0.15, 1 - Math.min(Math.abs(err) / 0.4, 1));
          const fill = SECTOR_COLOR[d.sector] || "#9b9ead";
          return (
            <g key={d.id} onMouseEnter={() => setHover(d)} onClick={() => nav(`/ipo/${d.id}`)} className="cursor-crosshair">
              <circle cx={xOf(i)} cy={yOf(y)} r={r + 4} fill="#ff2da6" fillOpacity={glow * 0.25} />
              <circle cx={xOf(i)} cy={yOf(y)} r={r} fill={fill} fillOpacity={0.9} />
            </g>
          );
        })}
      </svg>
      {hover && (
        <div className="absolute right-4 bottom-4 w-64 border border-magenta bg-plum p-2 text-[11px]">
          <div className="tabular text-magenta">{hover.ticker}</div>
          <div>{hover.name}</div>
          <div className={signedClass(hover.listing_return)}>LIST {pct(hover.listing_return)}</div>
          <div>GMP {pct(hover.gmp_pct)} · ERR {pct(hover.gmp_error)}</div>
          <div className="text-mute">{hover.sector} · {hover.listing_date}</div>
        </div>
      )}
    </div>
  );
}
