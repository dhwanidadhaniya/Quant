import { useState } from "react";
import { useResearch } from "../context";
import { num, signed, tone } from "../format";
import { Bars, SplitMark, histData } from "../components";
import type { PerformanceBlock } from "../types";

export function BacktestPage() {
  const { bundle } = useResearch();
  const [split, setSplit] = useState<"train" | "test">("test");
  if (!bundle) return <div className="deep pad">No performance yet.</div>;
  const block = bundle.performance[split];
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="micro">Simulation accounting. Not a market-return claim.</div>
          <h1>Backtest</h1>
        </div>
        <div className="row">
          <button className={`btn ${split === "train" ? "primary" : ""}`} onClick={() => setSplit("train")}>Train</button>
          <button className={`btn ${split === "test" ? "primary" : ""}`} onClick={() => setSplit("test")}>Held-out</button>
        </div>
      </div>
      <BlockView block={block} />
    </div>
  );
}

function BlockView({ block }: { block: PerformanceBlock }) {
  return (
    <>
      <div className="row" style={{ alignItems: "center" }}><SplitMark split={block.split === "test" ? "test" : "train"} /></div>
      <div className="metric-grid">
        <Tile k="Total PnL" v={signed(block.total_pnl)} />
        <Tile k="Mean" v={signed(block.mean_pnl)} />
        <Tile k="Median" v={signed(block.median_pnl)} />
        <Tile k="Win fraction" v={num(block.win_rate === null ? null : block.win_rate * 100, 1) + "%"} />
        <Tile k="Loss fraction" v={num(block.loss_rate === null ? null : block.loss_rate * 100, 1) + "%"} />
        <Tile k="Worst drawdown" v={num(block.max_drawdown_worst_session)} />
      </div>
      <div className="micro">{block.win_rate_definition}. {block.drawdown_definition}.</div>
      <div className="micro">Bootstrap 95% {num(block.bootstrap_ci95.low)} to {num(block.bootstrap_ci95.high)}. Student 95% {num(block.student_ci95.low)} to {num(block.student_ci95.high)}.</div>
      <section className="deep pad">
        <div className="micro">Session PnL distribution</div>
        <div className="chart-box"><Bars data={histData(block.histogram)} xKey="round" yKey="count" /></div>
      </section>
      <table className="data">
        <thead><tr><th>Session</th><th>Seed</th><th>PnL</th><th>Max drawdown</th></tr></thead>
        <tbody>
          {block.session_pnls.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.seed}</td>
              <td className={tone(row.pnl)}>{signed(row.pnl)}</td>
              <td>{num(row.max_drawdown)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Tile({ k, v }: { k: string; v: string }) {
  return <div className="frost pad"><div className="micro">{k}</div><div className="mono" style={{ fontSize: 22 }}>{v}</div></div>;
}
