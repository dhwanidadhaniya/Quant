import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Ipo } from "../lib/api";
import { cr, pct, signedClass, x } from "../lib/format";
import { useMode } from "../state";

export default function MarketMap({ items }: { items: Ipo[] }) {
  const nav = useNavigate();
  const { setSelected, selected } = useMode();
  const [hover, setHover] = useState<Ipo | null>(null);
  const W = 920, H = 520, pad = 48;

  const pts = useMemo(() => {
    const xs = items.map((d) => Number(d.pe_premium)).filter((v) => Number.isFinite(v));
    const ys = items.map((d) => Number(d.sub_total)).filter((v) => Number.isFinite(v) && v >= 0);
    const xmin = Math.min(-0.4, ...(xs.length ? xs : [0]));
    const xmax = Math.max(0.8, ...(xs.length ? xs : [1]));
    const ymin = 0;
    const ymax = Math.max(20, ...ys.map((v) => Math.min(v, 200)));
    return { xmin, xmax, ymin, ymax };
  }, [items]);

  const xOf = (v: number) => pad + ((v - pts.xmin) / (pts.xmax - pts.xmin)) * (W - pad * 2);
  const yOf = (v: number) => H - pad - (Math.min(v, pts.ymax) / pts.ymax) * (H - pad * 2);

  return (
    <div className="relative h-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full bg-chassis" onMouseLeave={() => setHover(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad + t * (H - pad * 2);
          const x = pad + t * (W - pad * 2);
          return (
            <g key={t}>
              <line x1={pad} x2={W - pad} y1={y} y2={y} stroke="#242630" strokeWidth="1" />
              <line x1={x} x2={x} y1={pad} y2={H - pad} stroke="#242630" strokeWidth="1" />
            </g>
          );
        })}
        <text x={W / 2} y={H - 10} fill="#4a4c59" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
          VALUATION PREMIUM VS RECENT SECTOR IPO MEDIAN P/E
        </text>
        <text x={14} y={H / 2} fill="#4a4c59" fontSize="10" fontFamily="JetBrains Mono" transform={`rotate(-90 14 ${H / 2})`}>
          DEMAND STRENGTH · FINAL SUBSCRIPTION
        </text>
        <text x={xOf(0)} y={pad - 8} fill="#9b9ead" fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">PAR</text>
        {items.map((d) => {
          const xp = Number(d.pe_premium);
          const yp = Number(d.sub_total);
          if (!Number.isFinite(yp)) return null;
          const hasPE = Number.isFinite(xp);
          const x = hasPE ? xOf(xp) : 28;
          const y = yOf(yp);
          const size = Math.sqrt(Math.max(d.issue_size_cr || 200, 50)) / 6;
          const g = d.gmp_pct;
          const fill = g == null ? "#4a4c59" : g > 0.15 ? "#45e0a8" : g < 0 ? "#ff5c6c" : "#ffb84d";
          const on = selected === d.id;
          return (
            <g key={d.id}
              onMouseEnter={() => setHover(d)}
              onClick={() => { setSelected(d.id); nav(`/ipo/${d.id}`); }}
              className="cursor-crosshair"
            >
              <rect x={x - size} y={y - size} width={size * 2} height={size * 2}
                fill={fill} fillOpacity={Number.isFinite(xp) ? 0.75 : 0.28}
                stroke={on ? "#ff2da6" : fill} strokeWidth={on ? 2 : 0.6} />
            </g>
          );
        })}
      </svg>
      {hover && (
        <div className="absolute right-3 top-3 w-72 border border-magenta bg-plum p-2 text-[11px] pointer-events-none">
          <div className="micro text-magenta">{hover.ticker} · {hover.sector}</div>
          <div className="text-readout">{hover.name}</div>
          <div className="tabular mt-1">ISSUE {cr(hover.issue_size_cr)}</div>
          <div className={`tabular ${signedClass(hover.gmp_pct)}`}>GMP {pct(hover.gmp_pct)}</div>
          <div className="tabular text-info">SUB {x(hover.sub_total)} · QIB {x(hover.sub_qib)}</div>
          <div className={`tabular ${signedClass(hover.listing_return)}`}>LIST {pct(hover.listing_return)}</div>
          <div className="tabular text-mute">P/E PREM {pct(hover.pe_premium)} · {hover.weather?.label}</div>
        </div>
      )}
    </div>
  );
}
