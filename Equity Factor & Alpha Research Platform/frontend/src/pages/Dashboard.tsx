import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { get, fmt, DEFAULT_W, type Weights } from "../lib/api";
import { Signed, Why } from "../components/ui/Meta";

type Pulse = { ticker: string; name: string; value: number; change: number; spark: number[]; note: string };
type Pt = {
  ticker: string; name: string; sector: string; market_cap: number;
  risk: number; return: number; alpha_score: number;
};

function Spark({ data }: { data: number[] }) {
  if (!data?.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 72},${18 - ((v - min) / (max - min || 1)) * 16}`).join(" ");
  return <svg width="76" height="20"><polyline fill="none" stroke="currentColor" strokeWidth="1.2" points={pts} /></svg>;
}

export default function Dashboard() {
  const nav = useNavigate();
  const [pulse, setPulse] = useState<Pulse[]>([]);
  const [pts, setPts] = useState<Pt[]>([]);
  const [sector, setSector] = useState("All");
  const [period, setPeriod] = useState("1Y");
  const [w] = useState<Weights>(DEFAULT_W);

  useEffect(() => {
    get<{ series: Pulse[] }>("/api/market/pulse").then((d) => setPulse(d.series));
  }, []);
  useEffect(() => {
    const q = new URLSearchParams(Object.entries(w).map(([k, v]) => [k, String(v)]));
    get<{ points: Pt[] }>(`/api/landscape?${q}`).then((d) => setPts(d.points));
  }, [w]);

  const sectors = useMemo(() => ["All", ...Array.from(new Set(pts.map((p) => p.sector)))], [pts]);
  const shown = pts.filter((p) => sector === "All" || p.sector === sector);

  return (
    <div className="pb-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-violet">Research canvas</p>
          <h1 className="display mt-1 text-3xl">Market pulse &amp; alpha landscape</h1>
        </div>
        <p className="max-w-sm text-right text-xs text-mute">
          Not four KPI tiles. The canvas is the book — macro on the left, cross-section in the middle.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {!pulse.length && <p className="col-span-2 text-xs text-mute">Loading the pulse strip…</p>}
        {pulse.map((p) => (
          <div key={p.ticker} className="glass p-3">
            <p className="text-[11px] text-mute">{p.name}</p>
            <p className="num mt-1 text-lg">{p.ticker === "^TNX" || p.ticker === "INDIAVIX" || p.ticker === "USDINR" ? fmt.n(p.value, 2) : fmt.n(p.value, 0)}</p>
            <div className="mt-1 flex items-center justify-between text-mute">
              <Signed v={p.change} />
              <Spark data={p.spark} />
            </div>
            <p className="mt-2 line-clamp-2 text-[10px] leading-snug text-mute">{p.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_16rem]">
        <div className="glass p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="display text-xl">Alpha landscape</h2>
              <p className="text-xs text-mute">X = 1Y realised vol · Y = 1Y return · size = market cap · colour = alpha score</p>
            </div>
            <div className="flex gap-2">
              <select className="border border-ink/15 bg-white/50 px-2 py-1 text-xs" value={sector} onChange={(e) => setSector(e.target.value)}>
                {sectors.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select className="border border-ink/15 bg-white/50 px-2 py-1 text-xs" value={period} onChange={(e) => setPeriod(e.target.value)}>
                {["1Y", "3Y", "Sample"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-2 h-[420px]">
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid stroke="#e4dfd4" />
                <XAxis type="number" dataKey="risk" name="Risk" domain={[0.15, "auto"]} tickCount={6} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} />
                <YAxis type="number" dataKey="return" name="Return" tickCount={6} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} />
                <ZAxis dataKey="market_cap" range={[40, 280]} />
                <Tooltip
                  content={({ payload }) => {
                    const p = payload?.[0]?.payload as Pt | undefined;
                    if (!p) return null;
                    return (
                      <div className="border border-ink/10 bg-paper p-2 text-xs">
                        <p className="font-medium">{p.ticker} · {p.name}</p>
                        <p>Return {fmt.pct(p.return)} · Vol {fmt.pct(p.risk)}</p>
                        <p>Alpha score {fmt.score(p.alpha_score)}</p>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={shown}
                  onClick={(d) => d?.ticker && nav(`/company/${encodeURIComponent(d.ticker)}`)}
                  fill="#1e6e63"
                  fillOpacity={0.75}
                  shape={(props: any) => {
                    const a = props.payload.alpha_score / 100;
                    return <circle cx={props.cx} cy={props.cy} r={Math.max(4, (props.size || 40) / 18)} fill={`rgba(30,110,99,${0.25 + a * 0.7})`} stroke="#534178" strokeWidth={0.6} />;
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <Why>A name in the top-left is the rare useful combination: return without a lot of realised vol. Top-right is a lottery ticket until you check drawdown.</Why>
        </div>
        <div className="space-y-3">
          <div className="glass p-3">
            <p className="text-[11px] text-mute">How to read this</p>
            <p className="mt-1 text-sm leading-relaxed">Click a bubble to open the company panel. Colour intensity is the current multi-factor rank, not a predicted return.</p>
          </div>
          <div className="glass p-3">
            <p className="text-[11px] text-mute">Sample note</p>
            <p className="mt-1 text-sm leading-relaxed text-mute">India VIX and the 10Y are here because they change factor leadership. If both are rising, growth duration is usually the first thing to re-check.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
