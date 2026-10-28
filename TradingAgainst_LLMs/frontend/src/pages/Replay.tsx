import { useResearch } from "../context";
import { num } from "../format";
import { SplitMark } from "../components";
import { Filmstrip, SessionStrip } from "./Live";

export function ReplayPage() {
  const { session, round, setRound, bundle } = useResearch();
  if (!session || !bundle) return <div className="deep pad">Nothing to replay.</div>;
  const current = session.rounds[round];
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="micro">Scrub a stored session. The tape follows the cursor.</div>
          <h1>Replay</h1>
        </div>
        <SplitMark split={session.split} />
      </div>
      <SessionStrip />
      <Filmstrip />
      <input
        type="range"
        min={0}
        max={session.rounds.length - 1}
        value={round}
        onChange={(event) => setRound(Number(event.target.value))}
      />
      <div className="row">
        <section className="deep pad grow">
          <div className="micro">Round {current.round}</div>
          <div className="mono" style={{ fontSize: 28 }}>Truth {num(current.true_value, 3)}</div>
          <div className="mono">Mid {num(current.book.midpoint, 3)} · spread {num(current.book.spread, 3)}</div>
          <div className="mono">{current.news_event} {current.news_magnitude ? num(current.news_magnitude, 2) : ""}</div>
          <div className="mono">Strategy {current.strategy?.rule_triggered} / {current.strategy?.action}</div>
        </section>
        <section className="frost pad grow">
          <div className="micro">Fills</div>
          {current.trades.length === 0 ? <div className="micro">None</div> : current.trades.map((trade, index) => (
            <div className="mono" key={index}>{trade.buyer_id} bought {num(trade.quantity, 1)} from {trade.seller_id} @ {num(trade.price, 2)}</div>
          ))}
        </section>
      </div>
    </div>
  );
}
