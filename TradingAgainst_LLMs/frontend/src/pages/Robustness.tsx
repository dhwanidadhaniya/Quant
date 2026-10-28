import { useResearch } from "../context";
import { num, signed, tone } from "../format";

export function RobustnessPage() {
  const { falsification, bundle, runFalsification, busy } = useResearch();
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="micro">Frozen rules. No re-tuning. A miss is a result.</div>
          <h1>Robustness</h1>
        </div>
        <button className="btn primary" disabled={!bundle || !!busy} onClick={runFalsification}>Run falsification</button>
      </div>
      {falsification?.disclaimer ? <div className="micro">{falsification.disclaimer}</div> : <div className="deep pad">Falsification has not been run for this experiment.</div>}
      {falsification?.baseline_test ? (
        <div className="frost pad">
          <div className="micro">Original held-out mean, before perturbations</div>
          <div className={`mono ${tone(falsification.baseline_test.mean_pnl)}`} style={{ fontSize: 28 }}>{signed(falsification.baseline_test.mean_pnl)}</div>
        </div>
      ) : null}
      {falsification?.cells?.length ? (
        <table className="data">
          <thead>
            <tr><th>Cell</th><th>Mean PnL</th><th>95% bootstrap</th><th>Anchoring p</th><th>PnL</th><th>Bias</th></tr>
          </thead>
          <tbody>
            {falsification.cells.map((cell) => (
              <tr key={cell.id}>
                <td>{cell.label}</td>
                <td className={tone(cell.mean_pnl)}>{signed(cell.mean_pnl)}</td>
                <td>{num(cell.bootstrap_ci95.low)} – {num(cell.bootstrap_ci95.high)}</td>
                <td>{num(cell.anchoring_p_value, 4)}</td>
                <td>{cell.pnl_survives ? "survives" : "does not survive"}</td>
                <td>{cell.bias_survives ? "survives" : "does not survive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {falsification?.cells?.map((cell) => (
        <div key={cell.id} className="micro">{cell.label}: {cell.interpretation}</div>
      ))}
    </div>
  );
}
