import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import { num } from "./format";

export function GlassTip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="float" style={{ padding: "8px 10px" }}>
      <div className="micro">Round {label}</div>
      {payload.map((item) => (
        <div key={item.name} className="mono" style={{ color: item.color, fontSize: 12 }}>
          {item.name} {typeof item.value === "number" ? num(item.value, 3) : "—"}
        </div>
      ))}
    </div>
  );
}

export function PriceChart({
  rows,
  cursor,
  onPickRound,
}: {
  rows: Array<{ round: number; true_value: number | null; midpoint: number | null; best_bid: number | null; best_ask: number | null; news_event?: string }>;
  cursor?: number;
  onPickRound?: (round: number) => void;
}) {
  const news = rows.filter((row) => row.news_event && row.news_event !== "NO_NEWS");
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={rows}
        margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
        onClick={(state) => {
          if (!onPickRound || state?.activeLabel === undefined || state.activeLabel === null) return;
          const next = Number(state.activeLabel);
          if (Number.isFinite(next)) onPickRound(next);
        }}
        style={{ cursor: onPickRound ? "crosshair" : "default" }}
      >
        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="round" tick={{ fill: "#5e6a7b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#5e6a7b", fontSize: 11 }} axisLine={false} tickLine={false} width={48} domain={["auto", "auto"]} />
        <Tooltip content={<GlassTip />} />
        {news.map((row) => (
          <ReferenceLine key={row.round} x={row.round} stroke="rgba(226,181,106,0.35)" />
        ))}
        {cursor !== undefined ? <ReferenceLine x={cursor} stroke="rgba(126,224,214,0.8)" /> : null}
        <Line type="monotone" dataKey="true_value" name="Ground truth" stroke="#e2b56a" dot={false} strokeDasharray="4 4" strokeWidth={1.4} connectNulls />
        <Line type="monotone" dataKey="midpoint" name="Mid" stroke="#7ee0d6" dot={false} strokeWidth={1.8} connectNulls />
        <Line type="monotone" dataKey="best_bid" name="Bid" stroke="#6dcaa8" dot={false} strokeWidth={1} strokeOpacity={0.7} connectNulls />
        <Line type="monotone" dataKey="best_ask" name="Ask" stroke="#e08b7d" dot={false} strokeWidth={1} strokeOpacity={0.7} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function Bars({ data, xKey, yKey }: { data: Array<Record<string, string | number>>; xKey: string; yKey: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: "#5e6a7b", fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#5e6a7b", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip content={<GlassTip />} />
        <Bar dataKey={yKey} fill="#7ee0d6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SplitMark({ split }: { split: string }) {
  const cls = split === "train" ? "split split-train" : split === "test" ? "split split-test" : "split split-other";
  const label = split === "train" ? "TRAIN" : split === "test" ? "HELD-OUT TEST" : split.toUpperCase();
  return <span className={cls}>{label}</span>;
}

export function histData(hist?: { counts: number[]; edges: number[] }) {
  if (!hist?.counts?.length) return [];
  return hist.counts.map((count, index) => ({
    round: `${hist.edges[index].toFixed(1)}`,
    count,
  }));
}
