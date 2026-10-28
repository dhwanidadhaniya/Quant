import { useResearch } from "../context";
import { num, signed, tone } from "../format";
import { SplitMark } from "../components";

export function AgentsPage() {
  const { session, round, bundle, openSession, focusAgent, setFocusAgent } = useResearch();
  const current = session?.rounds[round];
  if (!session || !current || !bundle) return <div className="deep pad">No session loaded.</div>;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="micro">Quotes the agents actually sent</div>
          <h1>Agents</h1>
        </div>
        <div className="row">
          <SplitMark split={session.split} />
          <select className="btn" value={session.id} onChange={(event) => openSession(event.target.value)}>
            {bundle.sessions.map((item) => <option key={item.id} value={item.id}>{item.split} · {item.seed}</option>)}
          </select>
        </div>
      </div>
      <div className="deep pad" style={{ overflow: "auto" }}>
        <table className="data">
          <thead>
            <tr>
              <th>Agent</th><th>Persona</th><th>Signal</th><th>Error</th><th>Bid</th><th>Ask</th><th>Inv</th><th>PnL mid</th><th>PnL truth</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {current.quotes.map((quote) => {
              const book = current.portfolios[quote.agent_id];
              return (
                <tr
                  key={quote.agent_id}
                  className={focusAgent === quote.agent_id ? "picked" : ""}
                  onClick={() => setFocusAgent(focusAgent === quote.agent_id ? null : quote.agent_id)}
                >
                  <td>{quote.agent_id}</td>
                  <td>{quote.persona}</td>
                  <td>{num(quote.private_signal, 2)}</td>
                  <td>{num(quote.signal_error, 2)}</td>
                  <td>{num(quote.bid, 2)}</td>
                  <td>{num(quote.ask, 2)}</td>
                  <td>{num(quote.inventory, 1)}</td>
                  <td className={tone(book?.pnl_vs_mid)}>{signed(book?.pnl_vs_mid)}</td>
                  <td className={tone(book?.pnl_vs_truth)}>{signed(book?.pnl_vs_truth)}</td>
                  <td>{quote.accepted ? "accepted" : quote.error}</td>
                </tr>
              );
            })}
            {current.portfolios.STRAT ? (
              <tr className={focusAgent === "STRAT" ? "picked" : ""} onClick={() => setFocusAgent(focusAgent === "STRAT" ? null : "STRAT")}>
                <td>STRAT</td>
                <td>{current.strategy?.rule_triggered}</td>
                <td>—</td>
                <td>—</td>
                <td>{num(current.strategy?.price, 2)}</td>
                <td>{current.strategy?.action}</td>
                <td>{num(current.portfolios.STRAT.inventory, 1)}</td>
                <td className={tone(current.portfolios.STRAT.pnl_vs_mid)}>{signed(current.portfolios.STRAT.pnl_vs_mid)}</td>
                <td className={tone(current.portfolios.STRAT.pnl_vs_truth)}>{signed(current.portfolios.STRAT.pnl_vs_truth)}</td>
                <td>rule</td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div className="micro" style={{ marginTop: 8 }}>Click a row to pin that trader. Signal error is private signal minus hidden value, shown only here.</div>
        {focusAgent ? <AgentCard agentId={focusAgent} /> : null}
      </div>
    </div>
  );
}

function AgentCard({ agentId }: { agentId: string }) {
  const { session, round } = useResearch();
  const current = session?.rounds[round];
  if (!current) return null;
  const quote = current.quotes.find((item) => item.agent_id === agentId);
  const book = current.portfolios[agentId];
  return (
    <div className="float inspector">
      <div className="micro">Pinned trader</div>
      <div className="mono" style={{ fontSize: 22 }}>{agentId}</div>
      {quote ? (
        <>
          <div className="mono">{quote.persona} · {quote.model}</div>
          <div className="mono">Bid {num(quote.bid, 2)} / ask {num(quote.ask, 2)}</div>
          <div className="mono">Signal {num(quote.private_signal, 2)} · error {num(quote.signal_error, 2)}</div>
          <div className="mono">Inventory at quote {num(quote.inventory, 1)}</div>
        </>
      ) : (
        <div className="mono">{current.strategy?.rule_triggered} · {current.strategy?.action}</div>
      )}
      <div className={`mono ${tone(book?.pnl_vs_truth)}`}>Truth mark {signed(book?.pnl_vs_truth)}</div>
      <div className="mono">Inventory after the round {num(book?.inventory, 1)}</div>
    </div>
  );
}
