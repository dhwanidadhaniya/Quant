import { useEffect, useState } from "react";
import { api } from "../api";
import { useResearch } from "../context";
import { num } from "../format";

export function DataPage() {
  const { bundle } = useResearch();
  const [offset, setOffset] = useState(0);
  const [failures, setFailures] = useState(false);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = useState(0);
  const [files, setFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bundle) return;
    api.quotes(bundle.id, offset, failures).then((payload) => {
      setRows(payload.rows);
      setTotal(payload.total);
    }).catch((err) => setError(err instanceof Error ? err.message : "Quote log failed"));
  }, [bundle, offset, failures]);

  if (!bundle) return <div className="deep pad">No experiment to export.</div>;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="micro">SQLite log · parquet export of the same rows</div>
          <h1>Data</h1>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setFailures((value) => !value)}>{failures ? "Failures only" : "All quotes"}</button>
          <button className="btn primary" onClick={() => api.exportParquet(bundle.id).then((payload) => setFiles(payload.files)).catch((err) => setError(String(err)))}>Export parquet</button>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}
      {files.length ? <div className="micro">{files.join(" · ")}</div> : null}
      <div className="micro">{total} rows</div>
      <div className="deep pad" style={{ overflow: "auto" }}>
        <table className="data">
          <thead>
            <tr><th>Session</th><th>Split</th><th>Rnd</th><th>Agent</th><th>Signal</th><th>Bid</th><th>Ask</th><th>Error</th><th>News</th></tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td>{String(row.session_id).slice(-6)}</td>
                <td>{String(row.split)}</td>
                <td>{String(row.round_idx)}</td>
                <td>{String(row.agent_id)}</td>
                <td>{num(Number(row.private_signal), 2)}</td>
                <td>{num(row.bid === null ? null : Number(row.bid), 2)}</td>
                <td>{num(row.ask === null ? null : Number(row.ask), 2)}</td>
                <td>{row.error ? String(row.error) : ""}</td>
                <td>{String(row.news_event)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row">
        <button className="btn" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 40))}>Prev</button>
        <button className="btn" disabled={offset + 40 >= total} onClick={() => setOffset(offset + 40)}>Next</button>
      </div>
    </div>
  );
}
