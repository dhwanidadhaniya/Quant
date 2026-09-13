import { useEffect, useMemo, useState } from "react";
import { get, post, fmt } from "../lib/api";
import { Tip, Why } from "../components/ui/Meta";

export default function Portfolio() {
  const [uni, setUni] = useState<any[]>([]);
  const [hold, setHold] = useState<{ ticker: string; weight: number; name?: string }[]>([]);
  const [method, setMethod] = useState("equal");
  const [stats, setStats] = useState<any>(null);
  const [sectorCap, setSectorCap] = useState(40);
  const [rebal, setRebal] = useState("quarterly");

  useEffect(() => { get<{ items: any[] }>("/api/companies").then((d) => setUni(d.items)); }, []);

  const applyMethod = (m: string, base = hold) => {
    setMethod(m);
    if (!base.length) return;
    if (m === "equal") setHold(base.map((h) => ({ ...h, weight: 1 / base.length })));
    if (m === "cap") {
      const tot = base.reduce((s, h) => s + (uni.find((u) => u.ticker === h.ticker)?.market_cap || 1), 0);
      setHold(base.map((h) => ({ ...h, weight: (uni.find((u) => u.ticker === h.ticker)?.market_cap || 1) / tot })));
    }
    if (m === "factor") {
      const tot = base.reduce((s, h) => s + (uni.find((u) => u.ticker === h.ticker)?.alpha_score || 1), 0);
      setHold(base.map((h) => ({ ...h, weight: (uni.find((u) => u.ticker === h.ticker)?.alpha_score || 1) / tot })));
    }
  };

  const add = (ticker: string) => {
    if (hold.find((h) => h.ticker === ticker)) return;
    const next = [...hold, { ticker, weight: 1, name: uni.find((u) => u.ticker === ticker)?.name }];
    applyMethod(method, next);
  };

  useEffect(() => {
    if (hold.length < 2) { setStats(null); return; }
    post("/api/portfolios/analytics", { name: "live", method, holdings: hold }).then(setStats);
  }, [hold, method]);

  const m = stats?.metrics || {};
  const sectors = stats?.sector_exposure || {};

  return (
    <div className="pb-16">
      <h1 className="display text-3xl">Portfolio builder</h1>
      <p className="mt-1 max-w-xl text-sm text-mute">Drag weights. The live strip is the point — expected path, vol, Sharpe, factor tilt. Sector cap is a reminder, not an optimiser.</p>
      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        {["equal", "cap", "factor"].map((x) => (
          <button key={x} onClick={() => applyMethod(x)} className={`px-3 py-1 ${method === x ? "bg-ink text-ivory" : "glass"}`}>{x} weight</button>
        ))}
        <label className="glass px-2 py-1">sector cap {sectorCap}%
          <input type="range" min={15} max={60} value={sectorCap} onChange={(e) => setSectorCap(+e.target.value)} />
        </label>
        <select className="glass px-2 py-1" value={rebal} onChange={(e) => setRebal(e.target.value)}>
          <option>monthly</option><option>quarterly</option><option>annual</option>
        </select>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[18rem_1fr_16rem]">
        <div className="glass max-h-[540px] overflow-auto p-2">
          {uni.slice(0, 80).map((u) => (
            <button key={u.ticker} onClick={() => add(u.ticker)} className="flex w-full justify-between px-2 py-1 text-left text-xs hover:bg-white/50">
              <span>{u.ticker}</span><span className="text-mute">{u.sector}</span>
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {hold.map((h) => (
            <div key={h.ticker} className="glass flex items-center gap-3 px-3 py-2">
              <span className="w-24 text-sm">{h.ticker}</span>
              <input className="flex-1" type="range" min={1} max={40} value={Math.round(h.weight * 100)}
                onChange={(e) => setHold(hold.map((x) => x.ticker === h.ticker ? { ...x, weight: +e.target.value / 100 } : x))} />
              <span className="num w-10 text-xs">{(h.weight * 100).toFixed(0)}%</span>
              <button className="text-xs text-down" onClick={() => setHold(hold.filter((x) => x.ticker !== h.ticker))}>×</button>
            </div>
          ))}
          {!hold.length && <p className="text-sm text-mute">Add eight to twelve names. Equal-weight is the honest student default.</p>}
        </div>
        <div className="glass p-4 text-sm">
          <KV k="CAGR (sample)" v={fmt.pct(m.cagr)} />
          <KV k="Volatility" v={fmt.pct(m.volatility)} />
          <KV k="Sharpe" v={fmt.n(m.sharpe, 2)} id="sharpe" />
          <KV k="Beta" v={fmt.n(m.beta, 2)} id="beta" />
          <KV k="Alpha" v={fmt.pct(m.alpha)} id="alpha" />
          <KV k="Max DD" v={fmt.pct(m.max_drawdown)} id="drawdown" />
          <KV k="Div. score" v={fmt.n(stats?.diversification, 2)} />
          <Why>Changing one weight should move Sharpe and the factor bars together. If it doesn't, the name wasn't actually in the return panel.</Why>
        </div>
      </div>
      {stats && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="glass p-4">
            <p className="text-[11px] text-mute">Factor exposure (weighted scores)</p>
            {Object.entries(stats.factor_exposure || {}).map(([k, v]) => (
              <div key={k} className="mt-1 flex items-center gap-2 text-xs">
                <span className="w-20">{k}</span>
                <div className="h-1.5 flex-1 bg-mist"><div className="h-1.5 bg-teal" style={{ width: `${v as number}%` }} /></div>
                <span className="num w-10">{fmt.n(v as number, 0)}</span>
              </div>
            ))}
          </div>
          <div className="glass p-4">
            <p className="text-[11px] text-mute">Sector mix</p>
            {Object.entries(sectors).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span>{k} {(v as number) * 100 > sectorCap ? "· over cap" : ""}</span>
                <span className="num">{fmt.pct(v as number)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KV({ k, v, id }: { k: string; v: string; id?: string }) {
  return <div className="flex justify-between py-0.5"><span>{k}{id && <Tip id={id} />}</span><span className="num">{v}</span></div>;
}
