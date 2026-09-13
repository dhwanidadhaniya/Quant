import { useMemo, useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { post, fmt } from "../lib/api";
import { Tip, Why } from "../components/ui/Meta";

const STRATS = ["Value", "Momentum", "Quality", "Size", "Growth", "Low Volatility", "Multi-Factor", "Custom Factor Strategy"];

export default function Backtest() {
  const [form, setForm] = useState({
    strategy: "Multi-Factor", start: "2020-01-02", end: "2025-12-31",
    benchmark: "^GSPC", rebalance: "quarterly", transaction_cost: 0.001,
    initial_capital: 1000000, n_holdings: 15,
  });
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const run = async (patch: Partial<typeof form> = {}) => {
    setBusy(true);
    try {
      const body = { ...form, ...patch };
      setForm(body);
      setRes(await post("/api/backtests/run", body));
    } finally { setBusy(false); }
  };

  const years = ["2020", "2021", "2022", "2023", "2024", "2025"];

  return (
    <div className="pb-16">
      <h1 className="display text-3xl text-ivory md:text-ivory" style={{ color: "#f6f1e8" }}>Backtesting studio</h1>
      <p className="mt-1 max-w-xl text-sm" style={{ color: "#c5c0b4" }}>
        A path, not a promise. Drag the window, watch CAGR and the hole change together. Holdings use full-sample scores — look-ahead is labelled on purpose.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <select className="bg-white/10 px-2 py-2 text-sm text-ivory" value={form.strategy} onChange={(e) => run({ strategy: e.target.value })}>
          {STRATS.map((s) => <option key={s} className="text-ink">{s}</option>)}
        </select>
        <select className="bg-white/10 px-2 py-2 text-sm text-ivory" value={form.benchmark} onChange={(e) => run({ benchmark: e.target.value })}>
          <option className="text-ink" value="^GSPC">S&P 500</option>
          <option className="text-ink" value="^NSEI">NIFTY 50</option>
          <option className="text-ink" value="^IXIC">NASDAQ</option>
        </select>
        <select className="bg-white/10 px-2 py-2 text-sm text-ivory" value={form.rebalance} onChange={(e) => run({ rebalance: e.target.value })}>
          <option className="text-ink">monthly</option><option className="text-ink">quarterly</option><option className="text-ink">annual</option>
        </select>
        <button className="bg-teal px-3 py-2 text-sm text-ivory" onClick={() => run()} disabled={busy}>{busy ? "Running…" : "Run backtest"}</button>
      </div>

      <Timeline years={years} start={form.start} end={form.end} events={res?.events || []}
        onChange={(start, end) => run({ start, end })} />

      {res && (
        <>
          <div className="mt-4 h-64 rounded-sm bg-[#0c1522] p-3">
            <ResponsiveContainer>
              <LineChart data={res.curve}>
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip />
                <Line dataKey="strategy" stroke="#7dcec3" dot={false} strokeWidth={2} />
                <Line dataKey="benchmark" stroke="#c4b5e8" dot={false} strokeWidth={1.2} />
                <Line dataKey="equal_weight" stroke="#e8d5a3" dot={false} strokeWidth={1} strokeDasharray="4 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-[11px]" style={{ color: "#9aa3b0" }}>Teal = strategy · violet = benchmark · dashed = equal-weight book</p>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
            <M k="CAGR" v={fmt.pct(res.metrics.cagr)} />
            <M k="Alpha" v={fmt.pct(res.metrics.alpha)} id="alpha" />
            <M k="Beta" v={fmt.n(res.metrics.beta, 2)} id="beta" />
            <M k="Sharpe" v={fmt.n(res.metrics.sharpe, 2)} id="sharpe" />
            <M k="Sortino" v={fmt.n(res.metrics.sortino, 2)} id="sortino" />
            <M k="IR" v={fmt.n(res.metrics.information_ratio, 2)} id="ir" />
            <M k="Vol" v={fmt.pct(res.metrics.volatility)} />
            <M k="Max DD" v={fmt.pct(res.metrics.max_drawdown)} id="drawdown" />
            <M k="Win rate" v={fmt.pct(res.metrics.win_rate)} />
            <M k="Turnover" v={fmt.pct(res.turnover)} />
          </div>
          <p className="mt-3 max-w-2xl text-xs" style={{ color: "#c5c0b4" }}>{res.look_ahead_warning}</p>
          <Why>If you shorten the window to skip 2020, Sharpe will flatter you. Leave 2020 in before you write the report.</Why>
        </>
      )}
    </div>
  );
}

function M({ k, v, id }: { k: string; v: string; id?: string }) {
  return (
    <div className="bg-white/5 px-3 py-2 text-ivory">
      <p className="text-[10px] text-[#9aa3b0]">{k}{id && <Tip id={id} />}</p>
      <p className="num text-lg">{v}</p>
    </div>
  );
}

function Timeline({ years, start, end, events, onChange }: any) {
  return (
    <div className="mt-6">
      <div className="flex justify-between text-[11px] text-[#c5c0b4]">
        {years.map((y: string) => <button key={y} onClick={() => onChange(`${y}-01-02`, end)}>{y}</button>)}
      </div>
      <div className="relative mt-2 h-16 rounded-sm bg-white/5">
        <input type="range" min={2020} max={2025} value={+start.slice(0, 4)} className="absolute left-0 top-2 w-full"
          onChange={(e) => onChange(`${e.target.value}-01-02`, end)} />
        <input type="range" min={2020} max={2025} value={+end.slice(0, 4)} className="absolute left-0 top-7 w-full"
          onChange={(e) => onChange(start, `${e.target.value}-12-31`)} />
        <div className="absolute bottom-1 left-2 right-2 flex gap-2 overflow-hidden">
          {events.slice(0, 6).map((e: any) => (
            <span key={e.date + e.type} className="truncate text-[10px] text-[#e8d5a3]">{e.date.slice(0, 7)} · {e.type}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
