import { useState } from "react";
import { Explain, Panel } from "../components/explain/Explain";
import { api } from "../lib/api";
import { useMarket } from "../lib/store";
import { LivingBook } from "../components/book/LivingBook";
import { Gauge } from "../components/charts/Charts";
import { fmt, pct } from "../components/explain/Explain";

const SHOCKS = [
  { id: "flash_selling", name: "FLASH SELLING" },
  { id: "flash_buying", name: "FLASH BUYING" },
  { id: "mass_cancellation", name: "MASS CANCELLATION" },
  { id: "liquidity_withdrawal", name: "LIQUIDITY WITHDRAWAL" },
  { id: "market_order_surge", name: "MARKET ORDER SURGE" },
  { id: "volatility_spike", name: "VOLATILITY SPIKE" },
];

const SCENARIOS = [
  { id: "A", name: "High arrival rate", note: "λ_L doubled-class. Queues fatten; wait stretches (Little)." },
  { id: "B", name: "High cancellation", note: "Displayed depth becomes fleeting. Survival of Q_ahead is fragile." },
  { id: "C", name: "High market-order intensity", note: "Touch depletes; price walks; fill odds for resters rise then collapse." },
  { id: "D", name: "Low liquidity", note: "80% of displayed size withdrawn. Impact of the same Q explodes." },
];

const EXPERIMENTS = [
  { n: "01", t: "Double arrival rate", a: () => api.params({ lambda_limit: 90 }) },
  { n: "02", t: "Double cancellation", a: () => api.shock("mass_cancellation", 3) },
  { n: "03", t: "Increase market-order intensity", a: () => api.params({ lambda_market: 50 }) },
  { n: "04", t: "Remove 80% displayed liquidity", a: () => api.shock("liquidity_withdrawal", 1.5) },
  { n: "05", t: "Join back of bid queue", a: () => api.order("bid", 100) },
];

export function ScenarioLab() {
  const s = useMarket((st) => st.state);
  const [note, setNote] = useState("Pick a shock. Watch queues, spread, fill odds, and mid.");

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12">
        <div className="kicker text-fuchsia">10 · SCENARIO LAB</div>
        <h1 className="font-display text-4xl">
          Stress the <span className="text-pink">queues</span>
        </h1>
      </div>

      <Panel kicker="SHOCKS" title="Liquidity shock simulator" className="col-span-12 lg:col-span-5">
        <Explain
          title="Synthetic stress"
          formula="X_t → X_t^{shock} via a temporary intensity jump"
          what="We raise λ_M, λ_C, or yank size, for a few seconds of simulated time."
          why="Resilience, impact, and fill probability are properties of stress, not of the calm book."
          theory="Interrupted point process / regime switch."
          interpretation="Every figure remains SIMULATED. This is a laboratory, not a replay of 2010."
          trading="Ask what happens to your resting order in each shock — that is the experiment."
          limitation="No capital constraints, no multi-venue flight."
        >
          <div className="grid grid-cols-2 gap-2">
            {SHOCKS.map((sh) => (
              <button
                key={sh.id}
                onClick={() => {
                  api.shock(sh.id, 2.8);
                  setNote(sh.name);
                }}
                className="kicker hairline px-2 py-3 hover:bg-pink hover:text-void"
              >
                {sh.name}
              </button>
            ))}
          </div>
        </Explain>
      </Panel>

      <Panel kicker="LIVE" title={`Book under: ${note}`} className="col-span-12 lg:col-span-7">
        {s && <LivingBook book={s.book} compact />}
        <div className="mt-3 grid grid-cols-4 gap-2 font-mono text-[11px]">
          <div>SPD {fmt(s?.book.spread, 3)}</div>
          <div>QI {pct(s?.book.imbalance, 0)}</div>
          <div>P10 {pct(s?.fill?.horizons?.[2]?.fill, 0)}</div>
          <div>{s?.regime?.current}</div>
        </div>
        <Gauge value={s?.congestion?.index ?? 0} label={s?.congestion?.label ?? ""} />
      </Panel>

      <Panel kicker="SCENARIO A–D" title="Named queue scenarios" className="col-span-12 md:col-span-6">
        <ul className="space-y-2">
          {SCENARIOS.map((sc) => (
            <li key={sc.id} className="hairline p-3">
              <div className="flex items-center justify-between">
                <span className="font-display">
                  {sc.id} · {sc.name}
                </span>
                <button onClick={() => api.scenario(sc.id)} className="kicker text-pink">
                  APPLY
                </button>
              </div>
              <p className="mt-1 text-[12px] text-mute">{sc.note}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel kicker="EXPERIMENTS" title="Directed observations" className="col-span-12 md:col-span-6">
        <ul className="space-y-2">
          {EXPERIMENTS.map((ex) => (
            <li key={ex.n} className="flex items-center justify-between hairline p-3">
              <div>
                <div className="kicker">EXPERIMENT {ex.n}</div>
                <div className="text-sm">{ex.t}</div>
              </div>
              <button onClick={ex.a} className="kicker bg-mist px-2 py-1 text-void">
                RUN
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={() =>
            api.params({
              lambda_limit: 42,
              lambda_market: 18,
              lambda_cancel: 0.35,
              hawkes_alpha: 0,
              speed: 1,
            })
          }
          className="mt-3 kicker w-full hairline py-2"
        >
          RESET BASE INTENSITIES
        </button>
      </Panel>
    </div>
  );
}
