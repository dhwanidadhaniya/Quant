import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { pct } from "../lib/format";
import Learn from "../components/Learn";

export default function BacktestLab() {
  const [presets, setPresets] = useState<any>({});
  const [res, setRes] = useState<any>(null);
  const [horizon, setHorizon] = useState("listing_return");
  const [fill, setFill] = useState("listing_open");
  useEffect(() => { api.presets().then(setPresets); }, []);

  async function run(preset: string) {
    const out = await api.backtest({ preset, horizon, fill, cost_bps: 20 });
    setRes(out);
  }

  return (
    <div className="h-full overflow-auto p-3 space-y-3">
      <div>
        <div className="micro text-magenta">IPO BACKTEST LAB</div>
        <div className="text-xl">EVENT-TIME RULES · PRE-LISTING INFORMATION ONLY</div>
      </div>
      <div className="flex gap-2 items-center">
        <span className="micro">HORIZON</span>
        {["listing_return", "ret_30d", "ret_90d", "ret_1y"].map((h) => (
          <button key={h} onClick={() => setHorizon(h)} className={`micro px-2 border ${horizon === h ? "border-magenta text-magenta" : "border-line"}`}>{h}</button>
        ))}
        <span className="micro ml-4">FILL</span>
        {["listing_open", "allotment"].map((h) => (
          <button key={h} onClick={() => setFill(h)} className={`micro px-2 border ${fill === h ? "border-magenta text-magenta" : "border-line"}`}>{h}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(presets).map(([k, v]: any) => (
          <button key={k} onClick={() => run(k)} className="panel p-2 text-left hover:border-magenta">
            <div className="micro text-magenta">STRATEGY {k}</div>
            <div>{v.name}</div>
            <div className="text-[11px] text-mute">{v.note}</div>
          </button>
        ))}
      </div>
      {res?.status === "ok" && (
        <div className="panel p-3 tabular text-[12px] grid grid-cols-4 gap-2">
          <K k="N" v={String(res.n)} />
          <K k="HIT RATE" v={pct(res.hit_rate)} />
          <K k="MEAN" v={pct(res.mean_return)} />
          <K k="MEDIAN" v={pct(res.median_return)} />
          <K k="MDD" v={pct(res.max_drawdown_event)} />
          <K k="α vs NIFTY" v={pct(res.alpha_vs_nifty_same_window)} />
          <K k="COST" v={`${res.cost_bps} bps`} />
          <K k="FILL" v={res.fill} />
        </div>
      )}
      {res?.warnings && (
        <ul className="text-[11px] text-amber list-disc pl-5 space-y-1">
          {res.warnings.map((w: string) => <li key={w}>{w}</li>)}
        </ul>
      )}
      {res?.status === "rejected" && <div className="text-risk">{res.reason}</div>}
      {horizon !== "listing_return" && <div className="text-[11px] text-mute">Post-listing horizons are empty until Yahoo prices are cached (`python -m app.data.ingest`).</div>}
      <Learn id="sharpe" />
    </div>
  );
}

function K({ k, v }: { k: string; v: string }) {
  return <div><div className="micro">{k}</div><div>{v}</div></div>;
}
