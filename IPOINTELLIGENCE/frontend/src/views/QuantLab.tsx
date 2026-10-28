import { useEffect, useState } from "react";
import { Scatter } from "../charts/Echarts";
import Learn from "../components/Learn";
import { api, type Ipo } from "../lib/api";
import { n } from "../lib/format";
import { useMode } from "../state";

const PAIRS = [
  ["gmp_pct", "listing_return"],
  ["sub_total", "listing_return"],
  ["sub_qib", "listing_return"],
  ["pe_premium", "listing_return"],
];

export default function QuantLab() {
  const [pair, setPair] = useState(PAIRS[0]);
  const [reg, setReg] = useState<any>(null);
  const [items, setItems] = useState<Ipo[]>([]);
  const [models, setModels] = useState<any>(null);
  const [demand, setDemand] = useState<any>(null);
  const { mode } = useMode();

  useEffect(() => {
    api.ipos("?limit=400").then((r) => setItems(r.items));
    api.query("gmp reliability").then(() => {});
    fetch("/api/research/demand").then((r) => r.json()).then(setDemand);
  }, []);
  useEffect(() => {
    api.regression(pair[0], pair[1]).then(setReg);
  }, [pair]);

  const scatter = items
    .filter((d) => d[pair[0]] != null && d[pair[1]] != null)
    .map((d) => [d[pair[0]], d[pair[1]], d.ticker] as [number, number, string]);

  return (
    <div className="h-full grid grid-cols-[1fr_380px] min-h-0">
      <div className="flex flex-col min-h-0 border-r border-line">
        <div className="px-3 py-2 border-b border-line flex gap-2 items-center">
          <span className="micro text-magenta">QUANT RESEARCH LAB</span>
          {PAIRS.map((p) => (
            <button key={p.join()} onClick={() => setPair(p)} className={`micro px-2 py-0.5 border ${pair === p ? "border-magenta text-magenta" : "border-line text-dim"}`}>
              {p[0]} → {p[1]}
            </button>
          ))}
          <button className="micro px-2 py-0.5 border border-line" onClick={() => api.models("listing_return").then(setModels)}>FIT OOS MODELS</button>
        </div>
        <div className="flex-1 min-h-0">
          <Scatter data={scatter} xName={pair[0]} yName={pair[1]} />
        </div>
      </div>
      <div className="overflow-auto p-3 text-[12px] space-y-3 font-mono">
        <div className="micro">OLS · HC3 ROBUST ERRORS</div>
        {reg?.status === "ok" ? (
          <pre className="text-[11px] text-readout leading-5 whitespace-pre-wrap">
{`n          ${reg.n}
alpha      ${n(reg.alpha, 4)}  (se ${n(reg.se_alpha, 4)})  p=${n(reg.p_alpha, 3)}
beta       ${n(reg.beta, 4)}  (se ${n(reg.se_beta, 4)})  p=${n(reg.p_beta, 3)}
95% CI     [${n(reg.ci_beta?.[0], 3)}, ${n(reg.ci_beta?.[1], 3)}]
R²         ${n(reg.r2, 3)}
adj R²     ${n(reg.adj_r2, 3)}`}
          </pre>
        ) : (
          <div className="text-mute">{reg?.status || "…"}</div>
        )}
        <div className="text-mute text-[11px] font-sans">{reg?.interpretation}</div>
        {mode.learn && <Learn id="correlation" />}
        {models && (
          <div>
            <div className="micro mt-2">CHRONOLOGICAL 75/25 MODELS</div>
            <pre className="text-[10px] text-mute whitespace-pre-wrap">{JSON.stringify(models.models, null, 2)}</pre>
            <div className="text-[11px] font-sans text-amber">{models.interpretation}</div>
          </div>
        )}
        {demand && <div className="text-[11px] font-sans text-mute">{demand.interpretation}</div>}
      </div>
    </div>
  );
}
