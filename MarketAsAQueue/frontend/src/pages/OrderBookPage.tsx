import { useState } from "react";
import { LivingBook } from "../components/book/LivingBook";
import { Explain, Panel, Stat, fmt, fmtInt } from "../components/explain/Explain";
import { UserQueue, Booting } from "./Overview";
import { useMarket } from "../lib/store";
import { api } from "../lib/api";

export function OrderBookPage() {
  const s = useMarket((st) => st.state);
  const [side, setSide] = useState<"bid" | "ask">("bid");
  const [qty, setQty] = useState(100);
  if (!s) return <Booting />;
  const b = s.book;

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12">
        <div className="kicker text-fuchsia">02 · LEVEL-2 AS QUEUES</div>
        <h1 className="font-display text-4xl">
          Central <span className="text-pink">order book</span>
        </h1>
        <p className="text-sm text-mute">
          Limit orders enter from the sides. They wait. Market orders attack the opposite queue. Cancels disappear.
          When a touch queue hits zero, the next price becomes the market.
        </p>
      </div>

      <Panel kicker="THE MARKET QUEUE" title={`${s.symbol} · living ladder`} className="col-span-12 lg:col-span-8">
        <Explain
          title="Price-time priority"
          formula="better price ≻ earlier timestamp"
          what="FIFO at a price. A market buy of 3 units fills A, B, C; D waits."
          why="This is how most equity and futures books decide who trades."
          theory="Price-time matching as a network of FIFO servers coupled at the touch."
          interpretation="Queue position is a scarce resource. Joining the back of a fat queue is a different order from joining a thin one."
          trading="Improving by one tick jumps the entire FIFO line at the old price — at the cost of a worse (more aggressive) price."
          limitation="Some markets are pro-rata. This lab is FIFO only."
        >
          <LivingBook book={b} />
        </Explain>
      </Panel>

      <div className="col-span-12 flex flex-col gap-3 lg:col-span-4">
        <Panel kicker="SUBMIT" title="My order">
          <div className="flex gap-2">
            {(["bid", "ask"] as const).map((x) => (
              <button key={x} onClick={() => setSide(x)} className={`kicker px-3 py-1 ${side === x ? (x === "bid" ? "bg-cyan text-void" : "bg-pink text-void") : "hairline"}`}>
                {x.toUpperCase()}
              </button>
            ))}
          </div>
          <label className="mt-3 block kicker">SIZE {qty}</label>
          <input type="range" min={20} max={800} value={qty} onChange={(e) => setQty(+e.target.value)} className="w-full" />
          <button
            onClick={() => api.order(side, qty)}
            className="mt-3 kicker w-full bg-mist py-2 text-void"
          >
            JOIN {side.toUpperCase()} TOUCH
          </button>
          <div className="mt-4">
            <UserQueue user={s.user} onPlace={() => api.order(side, qty)} onCancel={() => api.cancel()} />
          </div>
        </Panel>
        <Panel kicker="MATCHING ENGINE" title="How a market order is served">
          <ol className="space-y-1 font-mono text-[11px] text-mute">
            <li className="text-pink">BUY MARKET ORDER</li>
            <li>↓ MATCH ENGINE</li>
            <li>↓ BEST ASK QUEUE #1</li>
            <li>↓ QUEUE #2</li>
            <li>↓ QUEUE #3 if needed</li>
            <li className="text-mist">ORDER FILLED or BOOK EXHAUSTED</li>
          </ol>
          <p className="mt-2 text-[12px] text-mute">
            If the best ask is consumed entirely, that price is depleted and the next ask is the new touch. Mid ticks
            up. That is price formation, not a separate residual.
          </p>
        </Panel>
      </div>

      <Panel kicker="LEVEL STATS" title="Every price is its own queue" className="col-span-12">
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-[11px]">
            <thead className="text-mute">
              <tr className="border-b border-pink/20 text-left">
                <th className="py-2">SIDE</th>
                <th>PRICE</th>
                <th>SIZE</th>
                <th>N</th>
                <th>λ_arr</th>
                <th>λ_cx</th>
                <th>λ_ex</th>
                <th>E[W]</th>
                <th>P(fill)</th>
              </tr>
            </thead>
            <tbody>
              {s.levels.map((l) => (
                <tr key={`${l.side}-${l.price_ticks}`} className="border-b border-white/5">
                  <td className={l.side === "ask" ? "text-pink" : "text-cyan"}>{l.side}</td>
                  <td>{fmt(l.price)}</td>
                  <td>{fmtInt(l.volume)}</td>
                  <td>{l.n_orders}</td>
                  <td>{fmt(l.arrival_rate, 2)}</td>
                  <td>{fmt(l.cancel_rate, 2)}</td>
                  <td>{fmt(l.exec_rate, 2)}</td>
                  <td>{fmt(l.est_wait, 1)}s</td>
                  <td>{fmt((l.est_fill_p ?? 0) * 100, 0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel kicker="LIFECYCLE" title="Click-through states of an order" className="col-span-12 md:col-span-6">
        <div className="font-mono text-[12px] leading-7 text-mute">
          CREATED → SUBMITTED → QUEUED → WAITING → PARTIAL FILL → FILLED
          <br />
          or CREATED → SUBMITTED → QUEUED → CANCELLED
        </div>
        {s.user?.lifecycle && (
          <ul className="mt-3 space-y-1 font-mono text-[11px]">
            {s.user.lifecycle.map((x: any, i: number) => (
              <li key={i} className="text-mist">
                t={fmt(x.t, 3)} · {x.status} · rem {x.remaining} · {x.note}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel kicker="EVENTS" title="Matching tape" className="col-span-12 md:col-span-6">
        <ul className="max-h-56 overflow-y-auto font-mono text-[11px]">
          {s.events.map((e, i) => (
            <li key={i} className="flex gap-3 border-b border-white/5 py-1">
              <span className="text-mute">{fmt(e.t, 3)}</span>
              <span className="text-fuchsia">{e.type}</span>
              <span>{e.side}</span>
              <span>{e.quantity}</span>
              <span className="text-mute">{e.note}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
