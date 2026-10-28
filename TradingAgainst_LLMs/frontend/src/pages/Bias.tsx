import { useState } from "react";
import { useResearch } from "../context";
import { num, pval } from "../format";
import { Bars, histData } from "../components";

export function BiasPage() {
  const { bundle } = useResearch();
  const [split, setSplit] = useState<"train" | "test">("test");
  const [id, setId] = useState("round_number_anchoring");
  if (!bundle) return <div className="deep pad">No experiment loaded.</div>;
  const tests = bundle.biases[split];
  const current = tests.find((item) => item.id === id) ?? tests[0];
  const hist = current?.series.excess_proximity || current?.series.gap;
  const horizons = current?.series.horizons;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="micro">Estimates, intervals, and sample size. No unlabeled bias stamp.</div>
          <h1>Bias lab</h1>
        </div>
        <div className="row">
          <button className={`btn ${split === "train" ? "primary" : ""}`} onClick={() => setSplit("train")}>Train</button>
          <button className={`btn ${split === "test" ? "primary" : ""}`} onClick={() => setSplit("test")}>Held-out</button>
        </div>
      </div>
      <div className="row">
        <div className="stack-list" style={{ width: 240 }}>
          {tests.map((item) => (
            <button key={item.id} className={`pick frost ${item.id === current?.id ? "on" : ""}`} onClick={() => setId(item.id)}>
              <div>{item.title}</div>
              <div className="micro">p {pval(item.p_value)}</div>
            </button>
          ))}
        </div>
        {current ? (
          <section className="deep pad grow">
            <div className="micro">{split === "test" ? "Held-out replication" : "Discovery sample"}</div>
            <h2 style={{ fontWeight: 500, margin: "6px 0 8px" }}>{current.title}</h2>
            <div className="metric-grid">
              <Cell k="n" v={String(current.n)} />
              <Cell k={current.statistic_name ?? "statistic"} v={num(current.statistic, 3)} />
              <Cell k="p-value" v={pval(current.p_value)} />
              <Cell k={current.effect_size_name ?? "effect"} v={num(current.effect_size, 3)} />
              <Cell k="estimate" v={num(current.ci95.estimate, 3)} />
              <Cell k="95% CI" v={`${num(current.ci95.low, 3)} – ${num(current.ci95.high, 3)}`} />
            </div>
            <p style={{ color: "var(--muted)", lineHeight: 1.55 }}>{current.interpretation}</p>
            <div className="micro">Null · {current.null_hypothesis}</div>
            <div className="micro">Alternative · {current.alternative}</div>
            {current.insufficient_data ? <div className="micro">Insufficient sample. No test statistic is shown as a finding.</div> : null}
            {hist ? <div className="chart-box"><Bars data={histData(hist)} xKey="round" yKey="count" /></div> : null}
            {horizons ? (
              <div className="chart-box">
                <Bars
                  data={horizons.map((item) => ({ round: `h${item.horizon}`, count: item.mean_adjustment ?? 0 }))}
                  xKey="round"
                  yKey="count"
                />
              </div>
            ) : null}
            {current.id === "herding" || current.id === "first_price_anchoring" || current.id === "inventory" ? <Coefs extra={current.extra} /> : null}
          </section>
        ) : null}
      </div>
      {bundle.prompt_sensitivity ? (
        <section className="frost pad">
          <div className="micro">Prompt sensitivity · not used to choose rules</div>
          <p>{bundle.prompt_sensitivity.interpretation}</p>
        </section>
      ) : null}
    </div>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return <div className="hud pad"><div className="micro">{k}</div><div className="mono">{v}</div></div>;
}

function Coefs({ extra }: { extra?: Record<string, unknown> }) {
  const block = (extra?.coefficients ? extra : extra?.offset_on_inventory) as { coefficients?: Array<Record<string, number | string>> } | undefined;
  const rows = block?.coefficients;
  if (!rows?.length) return null;
  return (
    <table className="data">
      <thead><tr><th>Term</th><th>Coef</th><th>SE</th><th>p</th><th>CI</th></tr></thead>
      <tbody>
        {rows.map((row) => (
          <tr key={String(row.name)}>
            <td>{row.name}</td>
            <td>{num(Number(row.coef), 3)}</td>
            <td>{num(Number(row.std_err), 3)}</td>
            <td>{num(Number(row.p_value), 4)}</td>
            <td>{num(Number(row.ci95_low), 3)} – {num(Number(row.ci95_high), 3)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
