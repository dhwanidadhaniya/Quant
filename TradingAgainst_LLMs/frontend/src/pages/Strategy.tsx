import { useResearch } from "../context";
import { num, signed, tone } from "../format";

export function StrategyPage() {
  const { bundle, session, round } = useResearch();
  if (!bundle) return <div className="deep pad">No strategy has been frozen.</div>;
  const params = bundle.protocol.frozen_params;
  const decision = session?.rounds[round]?.strategy;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="micro">Rules chosen by train-set mean PnL. Test sessions did not vote.</div>
          <h1>Strategy lab</h1>
        </div>
        <div className="mono">{bundle.protocol.frozen_variant}</div>
      </div>
      <div className="row">
        <section className="deep pad grow">
          <div className="micro">Train scores of pre-specified variants</div>
          <table className="data">
            <thead><tr><th>Variant</th><th>Train mean PnL</th><th>Selected</th></tr></thead>
            <tbody>
              {bundle.protocol.variants.map((variant) => (
                <tr key={variant.name}>
                  <td>{variant.name}</td>
                  <td className={tone(variant.mean_pnl)}>{signed(variant.mean_pnl)}</td>
                  <td>{variant.name === bundle.protocol.frozen_variant ? "frozen" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="frost pad" style={{ width: 320 }}>
          <div className="micro">Frozen parameters</div>
          {Object.entries(params).map(([key, value]) => (
            <div key={key} className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 6 }}>
              <span>{key}</span><span>{String(value)}</span>
            </div>
          ))}
        </section>
      </div>
      <section className="hud pad">
        <div className="micro">Decision at the replay cursor</div>
        {decision ? (
          <div className="metric-grid" style={{ marginTop: 8 }}>
            <div><div className="micro">Rule</div><div className="mono">{decision.rule_triggered}</div></div>
            <div><div className="micro">Action</div><div className="mono">{decision.action}</div></div>
            <div><div className="micro">Price</div><div className="mono">{num(decision.price, 2)}</div></div>
            <div><div className="micro">Qty</div><div className="mono">{num(decision.quantity, 2)}</div></div>
            <div><div className="micro">Expected edge</div><div className="mono">{num(decision.expected_edge, 3)}</div></div>
            <div><div className="micro">Realized vs terminal truth</div><div className="mono">{num(decision.realized_pnl, 3)}</div></div>
          </div>
        ) : <div className="micro">No decision on this round.</div>}
        <div className="micro" style={{ marginTop: 8 }}>Expected edge uses the public reference. Realized PnL is the fill marked to hidden terminal value, attached after the session.</div>
      </section>
    </div>
  );
}
