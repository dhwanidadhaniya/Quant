import { useResearch } from "../context";
import { num, signed, tone } from "../format";
import { PriceChart, SplitMark } from "../components";

type Level = { price: number; size: number; agent_ids?: string[] };

export function LiveMarket() {
  const { bundle, session, round, openSession, setRound, setPlaying, focusAgent } = useResearch();
  const current = session?.rounds[round];
  if (!bundle || !session || !current) {
    return <div className="deep pad">Load or run an experiment to replay a session from stored rounds.</div>;
  }
  const rows = session.rounds.map((item) => ({
    round: item.round,
    true_value: item.true_value,
    midpoint: item.book.midpoint,
    best_bid: item.book.best_bid,
    best_ask: item.book.best_ask,
    news_event: item.news_event,
  }));
  const jump = (next: number) => {
    setPlaying(false);
    setRound(next);
  };
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="micro">Click the chart or a round tick. Space plays.</div>
          <h1>Market path</h1>
        </div>
        <SplitMark split={session.split} />
      </div>
      <SessionStrip />
      {current.news_event !== "NO_NEWS" ? (
        <div className="news-banner shock-in">
          <strong>{current.news_event}</strong>
          <span className="mono">Public shock {num(current.news_magnitude, 2)} · hidden value {num(current.true_value, 3)}</span>
        </div>
      ) : null}
      <div className="row">
        <section className="deep pad grow">
          <div className="chart-box tall">
            <PriceChart rows={rows} cursor={round} onPickRound={jump} />
          </div>
          <Filmstrip />
        </section>
        <section className="frost pad" style={{ width: 300 }}>
          <div className="micro">Round {current.round} book · hover a level</div>
          <Ladder book={current.book} focusAgent={focusAgent} />
        </section>
      </div>
    </div>
  );
}

export function SessionStrip() {
  const { bundle, session, openSession } = useResearch();
  if (!bundle || !session) return null;
  return (
    <div className="chips">
      {bundle.sessions.map((item) => (
        <button
          key={item.id}
          className={`chip ${item.id === session.id ? "on" : ""} ${item.split === "test" ? "test" : "train"}`}
          onClick={() => openSession(item.id)}
        >
          <span>{item.split === "test" ? "TEST" : "TRAIN"}</span>
          <b className={tone(item.strategy_pnl_vs_truth)}>{signed(item.strategy_pnl_vs_truth, 1)}</b>
          <em>seed {item.seed}</em>
        </button>
      ))}
    </div>
  );
}

export function Filmstrip() {
  const { session, round, setRound, setPlaying } = useResearch();
  if (!session) return null;
  return (
    <div className="film" role="slider" aria-valuenow={round} aria-valuemax={session.rounds.length - 1}>
      {session.rounds.map((item) => (
        <button
          key={item.round}
          className={`tick ${item.round === round ? "now" : ""} ${item.news_event !== "NO_NEWS" ? "news" : ""}`}
          title={item.news_event === "NO_NEWS" ? `Round ${item.round}` : `${item.news_event} ${item.news_magnitude}`}
          onClick={() => {
            setPlaying(false);
            setRound(item.round);
          }}
        />
      ))}
    </div>
  );
}

export function Ladder({
  book,
  focusAgent,
}: {
  book: { asks: Level[]; bids: Level[]; midpoint: number | null; spread: number | null };
  focusAgent?: string | null;
}) {
  const { setFocusAgent } = useResearch();
  const asks = [...book.asks].reverse();
  const maxSize = Math.max(1, ...book.asks.map((level) => level.size), ...book.bids.map((level) => level.size));
  const row = (level: Level, side: "ask" | "bid") => {
    const ids = level.agent_ids ?? [];
    const hot = focusAgent ? ids.includes(focusAgent) : false;
    return (
      <button
        key={`${side}-${level.price}`}
        className={`level ${side} ${hot ? "hot" : ""}`}
        onClick={() => ids[0] && setFocusAgent(ids[0] === focusAgent ? null : ids[0])}
      >
        <span className="depth" style={{ width: `${(level.size / maxSize) * 100}%` }} />
        <span>{num(level.price, 2)}</span>
        <span>{num(level.size, 1)}</span>
        <span className="who">{ids.join(" ") || "—"}</span>
      </button>
    );
  };
  return (
    <div className="ladder" style={{ marginTop: 10 }}>
      {asks.map((level) => row(level, "ask"))}
      <div className="midline">MID {num(book.midpoint, 3)} · SPR {num(book.spread, 3)}</div>
      {book.bids.map((level) => row(level, "bid"))}
      {book.asks.length + book.bids.length === 0 ? <div className="micro">Empty book</div> : null}
    </div>
  );
}
