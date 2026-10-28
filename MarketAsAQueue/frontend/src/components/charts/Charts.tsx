export function Spark({
  data,
  color = "#ff2d95",
  height = 56,
  fill = true,
}: {
  data: number[];
  color?: string;
  height?: number;
  fill?: boolean;
}) {
  if (!data.length) return <div style={{ height }} className="bg-white/5" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const w = 320;
  const pts = data.map((y, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const yy = height - ((y - min) / span) * (height - 6) - 3;
    return `${x},${yy}`;
  });
  const d = `M ${pts.join(" L ")}`;
  const area = `${d} L ${w},${height} L 0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-full w-full" preserveAspectRatio="none">
      {fill && <path d={area} fill={color} opacity={0.12} />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}

export function DistChart({
  x,
  y,
  color = "#3dfff3",
  height = 140,
}: {
  x: number[];
  y: number[];
  color?: string;
  height?: number;
}) {
  if (!x.length) return null;
  const w = 420;
  const max = Math.max(...y, 1e-9);
  const bw = w / x.length;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
      {y.map((v, i) => (
        <rect
          key={i}
          x={i * bw + 1}
          y={height - (v / max) * (height - 8) - 2}
          width={Math.max(1, bw - 2)}
          height={(v / max) * (height - 8)}
          fill={color}
          opacity={0.85}
        />
      ))}
    </svg>
  );
}

export function LineXY({
  pts,
  color = "#ff4ecd",
  height = 160,
  yMax,
}: {
  pts: { x: number; y: number }[];
  color?: string;
  height?: number;
  yMax?: number;
}) {
  if (!pts.length) return <div style={{ height }} />;
  const w = 480;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = 0;
  const maxY = yMax ?? Math.max(...ys, 1e-6);
  const path = pts
    .map((p, i) => {
      const x = ((p.x - minX) / (maxX - minX || 1)) * w;
      const y = height - (p.y / (maxY - minY || 1)) * (height - 8) - 4;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

export function HeatGrid({
  x,
  y,
  z,
  xLabel,
  yLabel,
}: {
  x: number[];
  y: number[];
  z: (number | null)[][];
  xLabel: string;
  yLabel: string;
}) {
  const flat = z.flat().filter((v): v is number => v !== null && Number.isFinite(v));
  const max = Math.max(...flat, 1e-9);
  return (
    <div>
      <div className="kicker mb-2">
        {yLabel} ↑ · {xLabel} →
      </div>
      <div className="inline-grid" style={{ gridTemplateColumns: `repeat(${x.length}, 28px)` }}>
        {z
          .slice()
          .reverse()
          .map((row, ri) =>
            row.map((v, ci) => {
              const t = v === null || !Number.isFinite(v) ? 0 : v / max;
              return (
                <div
                  key={`${ri}-${ci}`}
                  title={`${x[ci]}, ${y[y.length - 1 - ri]} → ${v ?? "∞"}`}
                  style={{
                    width: 28,
                    height: 22,
                    background: `rgba(255,45,149,${0.08 + 0.85 * t})`,
                    border: "1px solid #050308",
                  }}
                />
              );
            })
          )}
      </div>
    </div>
  );
}

export function Gauge({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div>
      <div className="kicker mb-1">{label}</div>
      <div className="relative h-3 bg-white/5">
        <div
          className="h-full"
          style={{
            width: `${v * 100}%`,
            background: "linear-gradient(90deg,#3dfff3,#ff4ecd,#ff2d95)",
          }}
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[9px] text-mute">
        <span>LOW</span>
        <span>MODERATE</span>
        <span>HIGH</span>
        <span>CRITICAL</span>
      </div>
    </div>
  );
}
