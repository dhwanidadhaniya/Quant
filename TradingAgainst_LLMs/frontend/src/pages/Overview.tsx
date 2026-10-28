import { useResearch } from "../context";
import { compact, num, pval, signed, tone } from "../format";
import { Bars, PriceChart, SplitMark, histData } from "../components";

export function Overview() {
  const { bundle, system, runExperiment, busy } = useResearch();
  if (!bundle) {
    return (
      <div className="empty-stage deep">
        <div className="micro">Controlled research simulation</div>
        <h1>Trading against LLM agents</h1>
        <p style={{ color: "var(--muted)", maxWidth: 620, lineHeight: 1.55 }}>
          The system knows the hidden value. The agents do not. A seeded run discovers quoting behavior on training sessions,
          freezes a transparent rule set, and scores it only on held-out sessions.
        </p>
        <button
          className="btn primary"
          disabled={!system || !!busy}
          onClick={() => system && runExperiment(system.default_experiment)}
        >
          Run seeded experiment
        </button>
        <div className="micro" style={{ marginTop: 14 }}>Defaults come from the backend. No figures are drawn until that run returns.</div>
      </div>
    );
  }
  const test = bundle.performance.test;
  const train = bundle.performance.train;
  const featured = bundle.sessions.find((session) => session.split === "test") ?? bundle.sessions[0];
  const pnlBars = test.session_pnls.map((row) => ({ round: String(row.seed), count: row.pnl }));
  return (
    <div className="page">
      <div className="protocol deep">
        <div className="step frost">
          <div className="micro">Discovery</div>
          <div className="mono" style={{ fontSize: 20 }}>{train.n_sessions} train</div>
          <SplitMark split="train" />
        </div>
        <div className="arrow">→</div>
        <div className="step frost">
          <div className="micro">Frozen on train PnL</div>
          <div className="mono" style={{ fontSize: 20 }}>{bundle.protocol.frozen_variant}</div>
          <div className="micro">{bundle.protocol.selection_metric}</div>
        </div>
        <div className="arrow">→</div>
        <div className="step frost">
          <div className="micro">Confirmation</div>
          <div className="mono" style={{ fontSize: 20 }}>{test.n_sessions} held-out</div>
          <SplitMark split="test" />
        </div>
      </div>
      <div className="metrics">
        <section className="deep pad">
          <div className="micro">Held-out mean terminal PnL</div>
          <div className={`hero-num ${tone(test.mean_pnl)}`}>{signed(test.mean_pnl, 2)}</div>
          <div className="mono" style={{ color: "var(--muted)", marginTop: 8 }}>
            Bootstrap 95% {num(test.bootstrap_ci95.low, 2)} to {num(test.bootstrap_ci95.high, 2)} · n={test.n_sessions}
          </div>
          <div className="micro" style={{ marginTop: 8 }}>{test.label}</div>
          <div className="micro">Student t interval {num(test.student_ci95.low, 2)} to {num(test.student_ci95.high, 2)}</div>
        </section>
        <section className="metric-grid">
          <div className="frost pad"><div className="micro">Train mean</div><div className={`mono ${tone(train.mean_pnl)}`} style={{ fontSize: 22 }}>{signed(train.mean_pnl)}</div></div>
          <div className="frost pad"><div className="micro">Held-out win fraction</div><div className="mono" style={{ fontSize: 22 }}>{num(test.win_rate === null ? null : test.win_rate * 100, 1)}%</div><div className="micro">{test.win_rate_definition}</div></div>
          <div className="frost pad"><div className="micro">Worst session drawdown</div><div className="mono" style={{ fontSize: 22 }}>{num(test.max_drawdown_worst_session)}</div></div>
          <div className="frost pad"><div className="micro">Profitable / losing</div><div className="mono" style={{ fontSize: 22 }}>{test.profitable_sessions} / {test.losing_sessions}</div></div>
        </section>
      </div>
      <div className="row">
        <section className="deep pad grow">
          <div className="micro">Held-out session PnL by seed</div>
          <div className="chart-box"><Bars data={pnlBars} xKey="round" yKey="count" /></div>
        </section>
        <section className="deep pad grow">
          <div className="micro">Featured held-out path · ground truth vs book</div>
          <div className="chart-box">{featured ? <PriceChart rows={featured.path} /> : null}</div>
        </section>
      </div>
      <div className="bias-grid">
        {bundle.biases.test.map((testItem) => (
          <article key={testItem.id} className="frost pad">
            <div className="micro">{testItem.title}</div>
            <div className="mono" style={{ fontSize: 22, margin: "8px 0" }}>{compact(testItem.ci95.estimate)}</div>
            <div className="micro">p {pval(testItem.p_value)} · n {testItem.n}</div>
            <div className="micro">{testItem.insufficient_data ? "Insufficient sample" : testItem.ci95.estimate_name}</div>
          </article>
        ))}
      </div>
    </div>
  );
}
