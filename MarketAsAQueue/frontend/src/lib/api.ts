const API = "/api";

export async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json();
}

export async function postJSON<T>(path: string, body: unknown = {}): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json();
}

export const api = {
  state: () => getJSON("/market/state"),
  params: (body: Record<string, number>) => postJSON("/params", body),
  order: (side: string, quantity: number, price?: number) => postJSON("/order", { side, quantity, price }),
  cancel: () => postJSON("/order/cancel"),
  shock: (type: string, duration = 2.5) => postJSON("/shock", { type, duration }),
  scenario: (name: string) => postJSON("/scenario", { name }),
  little: (body: { L?: number; lambda?: number; W?: number }) => postJSON("/little", body),
  monteCarlo: (n = 600) => postJSON("/monte-carlo", { n }),
  modelCheck: (lam: number, mu: number) => getJSON(`/model-check?lam=${lam}&mu=${mu}`),
  queueAnalysis: (lam: number, mu: number) => getJSON(`/queue-analysis?lam=${lam}&mu=${mu}`),
  hawkes: (mu: number, alpha: number, beta: number) => getJSON(`/hawkes?mu=${mu}&alpha=${alpha}&beta=${beta}`),
  imbalance: () => getJSON("/imbalance-signal?horizon=1"),
  impact: (quantity: number, side: string) => getJSON(`/market-impact?quantity=${quantity}&side=${side}`),
  execution: () => getJSON("/execution/compare"),
  decision: () => getJSON("/decision"),
  distributions: (name: string, a: number, b = 1) => getJSON(`/distributions?name=${name}&a=${a}&b=${b}`),
  heatWait: () => getJSON("/heatmaps/waiting"),
  heatFill: () => getJSON("/heatmaps/fill"),
  notebook: () => getJSON("/notebook"),
  history: () => getJSON("/history"),
  liquidity: () => getJSON("/liquidity"),
  orderflow: () => getJSON("/orderflow"),
  reconstruct: (events: unknown[]) => postJSON("/reconstruct", { events, tick_size: 0.01 }),
  selectAsset: (symbol: string) => postJSON(`/asset/${symbol}`),
  pause: (paused: boolean) => postJSON(`/pause?paused=${paused}`),
};
