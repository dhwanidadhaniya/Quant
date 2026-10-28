export const API = "/api";

export type Ipo = Record<string, any>;

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${path}`, init);
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

export const api = {
  ipos: (q = "") => j<{ n: number; items: Ipo[]; data_mode: string }>(`/ipos${q}`),
  ipo: (id: string) => j<Ipo>(`/ipos/${id}`),
  valuation: (id: string) => j<any>(`/ipos/${id}/valuation`),
  fundamentals: (id: string) => j<any>(`/ipos/${id}/fundamentals`),
  gmp: (id: string) => j<any>(`/ipos/${id}/gmp`),
  subscription: (id: string) => j<any>(`/ipos/${id}/subscription`),
  performance: (id: string) => j<any>(`/ipos/${id}/performance`),
  risk: (id: string) => j<any>(`/ipos/${id}/risk`),
  analogues: (id: string) => j<any>(`/ipos/${id}/analogues`),
  peers: (id: string) => j<any>(`/ipos/${id}/peers`),
  research: () => j<any>(`/research/gmp-reliability`),
  eventStudy: () => j<any>(`/research/event-study`),
  regression: (x: string, y: string) => j<any>(`/research/regression?x=${x}&y=${y}`),
  models: (t = "listing_return") => j<any>(`/research/models?target=${t}`),
  formulas: () => j<any>(`/research/formulas`),
  backtest: (body: any) => j<any>(`/backtest`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  presets: () => j<any>(`/backtest/presets`),
  query: (q: string) => j<any>(`/query?q=${encodeURIComponent(q)}`),
  health: () => j<any>(`/health`),
};
