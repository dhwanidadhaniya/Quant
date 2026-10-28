import { Explain, Panel, Stat, fmt, fmtInt, pct } from "../components/explain/Explain";
import { LivingBook } from "../components/book/LivingBook";
import { Gauge, LineXY, Spark } from "../components/charts/Charts";
import { useMarket } from "../lib/store";
import { api } from "../lib/api";

export function Overview() {
  const s = useMarket((st) => st.state);
  if (!s) return <Booting />;
  const b = s.book;
  const p10 = s.fill?.horizons?.[2]?.fill;
  const qi = b.imbalance ?? 0;
  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="kicker text-fuchsia">01 · MARKET QUEUE STATE</div>
            <h1 className="font-display text-4xl tracking-tight">
              The market is a <span className="text-pink">living queue</span>
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-mute">
              Given the current limit-order-book queues: what is the probability my order executes, how long will it
              wait, how much liquidity is ahead of me, and how will queue dynamics move price?
            </p>
          </div>
          <div className="kicker bg-fuchsia/20 px-3 py-2 text-fuchsia">{s.source} MARKET</div>
        </div>
      </div>

      <Panel kicker="TOUCH" title="Live order book" className="col-span-12 lg:col-span-7 min-h-[420px]">
        <Explain
          title="Order book as parallel FIFO queues"
          formula="Q_t = Q_{t-Δt} + A_t − D_t − C_t"
          what="Each price is a waiting line. Limit orders arrive, marketable orders consume, cancels vanish."
          why="Displayed depth is the inventory of trading intentions. Price is whatever remains after matching."
          theory="Price-time priority: better price first; FIFO within a price."
          interpretation="Bars are standing size, not a promise of fill. They can cancel before you reach them."
          trading="Your fill depends on queue position at a price, not on 'being in the book' as a Boolean."
          limitation="Single-venue FIFO simulator. No hidden liquidity, no latency, no pro-rata."
        >
          <LivingBook book={b} />
        </Explain>
      </Panel>

      <div className="col-span-12 flex flex-col gap-3 lg:col-span-5">
        <Panel kicker="MONITOR" title="Queue state">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="BEST BID" value={fmt(b.best_bid)} sub={`QUEUE ${fmtInt(b.best_bid_queue)}`} tone="bid" />
            <Stat label="BEST ASK" value={fmt(b.best_ask)} sub={`QUEUE ${fmtInt(b.best_ask_queue)}`} tone="ask" />
            <Stat label="SPREAD" value={fmt(b.spread)} />
            <Stat label="IMBALANCE" value={pct(b.imbalance, 0)} tone={qi >= 0 ? "bid" : "ask"} />
            <Stat label="ARRIVAL λ_L" value={fmt(s.rates.limit, 1)} sub="/ sec" />
            <Stat label="CANCEL" value={fmt(s.rates.cancel, 1)} sub="/ sec" />
            <Stat label="EXECUTION" value={fmt(s.rates.execution, 1)} sub="/ sec" />
            <Stat label="EST. FILL TIME" value={`${fmt(s.fill?.E_T_fill, 1)}s`} tone="fuchsia" />
          </div>
        </Panel>
        <Panel kicker="COMPOSITE" title="Liquidity pressure index">
          <Explain
            title="Model-defined pressure"
            formula="P = w·QI + w·λ_M + w·λ_C + w·σ − w·Depth"
            what="A transparent weighted sum of observables."
            why="Traders often want one number. We show the parts so it cannot hide."
            theory="Composite indicator — not a standard industry metric."
            interpretation={`Net ${fmt(s.pressure?.net, 1)}. Positive is pressure, not a trade signal.`}
            trading="Read the components. A high cancel contribution means displayed size is fragile."
            limitation="Weights are ours. Relabeling it as 'the' liquidity index would be dishonest."
          >
            <div className="space-y-1 font-mono text-[12px]">
              {Object.entries(s.pressure?.components ?? {}).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-mute">{k}</span>
                  <span className={Number(v) >= 0 ? "text-cyan" : "text-pink"}>{Number(v).toFixed(1)}</span>
                </div>
              ))}
              <div className="mt-2 flex justify-between border-t border-pink/20 pt-2 text-mist">
                <span>NET PRESSURE</span>
                <span>{fmt(s.pressure?.net, 1)}</span>
              </div>
            </div>
            <p className="mt-2 font-mono text-[10px] text-mute">{s.pressure?.disclaimer}</p>
          </Explain>
        </Panel>
      </div>

      <Panel kicker="FIFO" title="Queue position" className="col-span-12 md:col-span-4">
        <UserQueue user={s.user} onPlace={() => api.order("bid", 100)} onCancel={() => api.cancel()} />
      </Panel>

      <Panel kicker="P(FILL)" title="Fill probability" className="col-span-12 md:col-span-4">
        <Explain
          title="Horizon fill curve"
          formula="P(fill | X_t) = f(Q_ahead, λ_M, λ_C, σ, spread, t)"
          what="Chance a resting order executes by 1s, 5s, 10s, 30s, 60s."
          why="A limit order is an option on fill. This is its reduced-form moneyness."
          theory="Competing risks: depletion of queue ahead vs adverse price jump."
          interpretation="Rising curve: more time, more chance the opposite flow eats through Q_ahead."
          trading="If the 10s number collapses, waiting is no longer cheap relative to the spread."
          limitation="Educational. Calibrated to this simulator, not a live tape."
          educational
        >
          <div className="space-y-1 font-mono text-[12px]">
            {(s.fill?.horizons ?? []).map((h) => (
              <div key={h.t} className="flex items-center gap-2">
                <span className="w-10 text-mute">{h.t}s</span>
                <div className="h-2 flex-1 bg-white/5">
                  <div className="h-full bg-gradient-to-r from-cyan to-pink" style={{ width: `${h.fill * 100}%` }} />
                </div>
                <span className="w-10 text-right text-mist">{pct(h.fill, 0)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 kicker">10s FILL {pct(p10, 0)}</div>
        </Explain>
      </Panel>

      <Panel kicker="STATE" title="Market regime" className="col-span-12 md:col-span-4">
        <div className="font-display text-2xl uppercase text-fuchsia">{String(s.regime?.current ?? "—").replace(/_/g, " ")}</div>
        <Gauge value={s.regime?.confidence ?? 0} label={`CONFIDENCE ${pct(s.regime?.confidence, 0)}`} />
        <p className="mt-2 text-[12px] text-mute">
          Classification from depth, cancel intensity, market-order rate, |QI|, and realized vol. Model-defined, not a
          vendor regime product.
        </p>
      </Panel>

      <Panel kicker="TIME × PRICE" title="Liquidity heatmap" className="col-span-12 lg:col-span-8">
        <HeatPlaceholder />
      </Panel>

      <Panel kicker="IMPACT / RISK" title="Congestion" className="col-span-12 lg:col-span-4">
        <Explain
          title="Congestion gauge"
          formula="ρ = λ / μ"
          what="Classical utilization, plus queue length, wait, and cancels in a composite."
          why="Congestion stretches waiting time (Little) and makes impact more violent when someone crosses."
          theory="M/M/1 intuition, with an explicit warning that ρ>1 is not 'the book blows up'."
          interpretation={s.congestion?.label}
          trading="In SEVERELY CONGESTED, a marketable order walks farther for the same size."
          limitation={s.congestion?.note}
          educational
        >
          <Gauge value={s.congestion?.index ?? 0} label={s.congestion?.label ?? ""} />
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div>ρ {fmt(s.congestion?.rho, 2)}</div>
            <div>L {fmtInt(s.congestion?.L)}</div>
            <div>λ {fmt(s.congestion?.lambda, 1)}</div>
            <div>μ {fmt(s.congestion?.mu, 1)}</div>
          </div>
        </Explain>
      </Panel>
    </div>
  );
}

function HeatPlaceholder() {
  const s = useMarket((st) => st.state);
  const mid = s?.book.mid ?? 100;
  return (
    <Explain
      title="Liquidity appearing and disappearing"
      formula="intensity(t, p) = displayed size at price p"
      what="A time×price field of queue depth. Bright = standing size."
      why="Liquidity is not a static depth chart. It flickers in and out."
      theory="Spatio-temporal reconstruction of L2 size."
      interpretation="Vertical wash-out is a depletion cascade; refill is replenishment."
      trading="A darkening touch is the first frame of a price change."
      limitation="SIMULATED field. Playback is the live engine, not a historical tape."
    >
      <div className="relative h-40 overflow-hidden bg-black">
        <Spark data={s?.book.bids?.map((l) => l.volume) ?? [1, 2, 3]} color="#3dfff3" height={64} />
        <Spark data={s?.book.asks?.map((l) => l.volume) ?? [1, 2, 3]} color="#ff2d95" height={64} />
        <div className="kicker absolute bottom-2 right-2">LIVE DEPTH SLICE · MID {fmt(mid)}</div>
      </div>
    </Explain>
  );
}

export function UserQueue({
  user,
  onPlace,
  onCancel,
}: {
  user: any;
  onPlace: () => void;
  onCancel: () => void;
}) {
  if (!user || user.remaining === 0) {
    return (
      <div>
        <p className="text-sm text-mute">No resting order. Join the bid queue and watch FIFO.</p>
        <button onClick={onPlace} className="mt-3 kicker bg-cyan px-3 py-2 text-void">
          SUBMIT MY ORDER · BID TOUCH · 100
        </button>
      </div>
    );
  }
  return (
    <div>
      <div className="kicker">YOU ARE #{user.rank} AT {fmt(user.price)}</div>
      <div className="mt-2 max-h-48 overflow-y-auto font-mono text-[11px]">
        {(user.queue ?? []).map((o: any) => (
          <div
            key={o.order_id}
            className={`flex justify-between border-l-2 px-2 py-1 ${
              o.is_user ? "border-white bg-fuchsia/20 text-mist" : "border-transparent text-mute"
            }`}
          >
            <span>
              #{o.rank} {o.is_user ? "◆ YOU" : "●"}
            </span>
            <span>{o.qty}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[11px]">
        <div>AHEAD {fmtInt(user.queue_ahead)}</div>
        <div>BEHIND {fmtInt(user.queue_behind)}</div>
      </div>
      <button onClick={onCancel} className="mt-3 kicker hairline px-3 py-2">
        CANCEL
      </button>
    </div>
  );
}

export function Booting() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="kicker text-fuchsia">INITIALISING EVENT CALENDAR</div>
        <div className="font-display text-3xl">Seeding FIFO queues…</div>
      </div>
    </div>
  );
}
