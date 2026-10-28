import { useResearch } from "../context";
import { num } from "../format";
import { Ladder } from "./Live";

export function BookPage() {
  const { session, round } = useResearch();
  const current = session?.rounds[round];
  if (!current) return <div className="deep pad">No book yet.</div>;
  const book = current.book;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="micro">Price-time priority · unfilled quotes expire at round end</div>
          <h1>Order book</h1>
        </div>
        <div className="mono">Round {current.round}</div>
      </div>
      <div className="row">
        <section className="deep pad" style={{ width: 360 }}>
          <Ladder book={book} />
        </section>
        <section className="frost pad grow">
          <div className="metric-grid">
            <Stat label="Best bid" value={num(book.best_bid, 2)} />
            <Stat label="Best ask" value={num(book.best_ask, 2)} />
            <Stat label="Mid" value={num(book.midpoint, 3)} />
            <Stat label="Spread" value={num(book.spread, 3)} />
            <Stat label="Bid depth" value={num(book.bid_depth, 1)} />
            <Stat label="Ask depth" value={num(book.ask_depth, 1)} />
          </div>
          <table className="data" style={{ marginTop: 16 }}>
            <thead><tr><th>Buyer</th><th>Seller</th><th>Price</th><th>Qty</th><th>Aggressor</th></tr></thead>
            <tbody>
              {current.trades.map((trade, index) => (
                <tr key={index}>
                  <td>{trade.buyer_id}</td>
                  <td>{trade.seller_id}</td>
                  <td>{num(trade.price, 2)}</td>
                  <td>{num(trade.quantity, 2)}</td>
                  <td>{trade.aggressor_side}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {current.trades.length === 0 ? <div className="micro">No fills this round.</div> : null}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="hud pad"><div className="micro">{label}</div><div className="mono" style={{ fontSize: 22 }}>{value}</div></div>;
}
