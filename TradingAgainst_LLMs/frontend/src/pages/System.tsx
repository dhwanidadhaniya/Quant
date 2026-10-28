import { useResearch } from "../context";

export function SystemPage() {
  const { system } = useResearch();
  if (!system) return <div className="deep pad">System endpoint has not answered.</div>;
  const rows: Array<[string, string]> = [
    ["Version", system.version],
    ["Engine", system.engine_version],
    ["Provider", system.provider],
    ["API key configured", system.api_key_configured ? "yes" : "no"],
    ["OpenAI base", system.openai_base_url],
    ["OpenAI model", system.openai_model],
    ["Ollama", system.ollama_base_url],
    ["Ollama model", system.ollama_model],
    ["Concurrency", String(system.max_concurrency)],
    ["Output tokens", String(system.max_output_tokens)],
    ["Retries", String(system.max_retries)],
    ["Database", system.database],
    ["Agent types", system.agent_types.join(", ")],
    ["Prompts", system.prompt_versions.join(", ")],
  ];
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="micro">Keys stay on the server</div>
          <h1>System</h1>
        </div>
      </div>
      <section className="deep pad">
        {rows.map(([key, value]) => (
          <div key={key} className="mono" style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 12 }}>
            <span className="micro">{key}</span>
            <span>{value}</span>
          </div>
        ))}
      </section>
      <p className="micro">{system.disclaimer}</p>
    </div>
  );
}
