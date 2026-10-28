import { useEffect, useState } from "react";
import { useResearch } from "../context";
import { signed, tone } from "../format";

const FIELDS = [
  ["name", "text"],
  ["seed", "number"],
  ["train_sessions", "number"],
  ["test_sessions", "number"],
  ["rounds", "number"],
  ["agents", "number"],
  ["temperature", "number"],
  ["signal_noise", "number"],
  ["news_probability", "number"],
  ["news_shock", "number"],
  ["transaction_cost", "number"],
  ["volatility", "number"],
] as const;

export function ExperimentsPage() {
  const { system, experiments, bundle, openExperiment, runExperiment, busy } = useResearch();
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (system && !form) {
      setForm({
        ...system.default_experiment,
        provider: system.default_experiment.provider ?? system.provider,
      });
    }
  }, [system, form]);
  if (!form) return <div className="deep pad">Waiting for system defaults.</div>;
  const set = (key: string, value: string, kind: string) => {
    setForm({ ...form, [key]: kind === "number" ? Number(value) : value });
  };
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="micro">Configurations are stored with every run</div>
          <h1>Experiments</h1>
        </div>
      </div>
      <section className="deep pad">
        <div className="form-grid">
          {FIELDS.map(([key, kind]) => (
            <label className="field" key={key}>
              <span className="micro">{key.replaceAll("_", " ")}</span>
              <input value={String(form[key] ?? "")} onChange={(event) => set(key, event.target.value, kind)} />
            </label>
          ))}
          <label className="field">
            <span className="micro">model</span>
            <select value={String(form.model)} onChange={(event) => set("model", event.target.value, "text")}>
              {system?.available_models.map((model) => <option key={model}>{model}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="micro">provider</span>
            <select value={String(form.provider ?? system?.provider)} onChange={(event) => set("provider", event.target.value, "text")}>
              {system?.available_providers.map((provider) => <option key={provider}>{provider}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="micro">prompt</span>
            <select value={String(form.prompt_version)} onChange={(event) => set("prompt_version", event.target.value, "text")}>
              {system?.prompt_versions.map((prompt) => <option key={prompt}>{prompt}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="micro">agent mix</span>
            <select value={String(form.agent_mix)} onChange={(event) => set("agent_mix", event.target.value, "text")}>
              <option value="llm">llm</option>
              <option value="rules">rules</option>
              <option value="mixed">mixed</option>
            </select>
          </label>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" disabled={!!busy} onClick={() => runExperiment(form)}>Run experiment</button>
          <div className="micro">Live providers stay idle unless confirm_llm_cost is set and a key exists. Mock is the default.</div>
        </div>
      </section>
      <section className="frost pad">
        <table className="data">
          <thead><tr><th>Name</th><th>Model</th><th>Frozen</th><th>Held-out mean</th><th>Sessions</th></tr></thead>
          <tbody>
            {experiments.map((item) => (
              <tr key={item.id} onClick={() => openExperiment(item.id)} style={{ cursor: "pointer" }}>
                <td>{item.name}{bundle?.id === item.id ? " · open" : ""}</td>
                <td>{item.model}</td>
                <td>{item.frozen_variant}</td>
                <td className={tone(item.test_mean_pnl)}>{signed(item.test_mean_pnl)}</td>
                <td>{item.train_sessions}/{item.test_sessions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
