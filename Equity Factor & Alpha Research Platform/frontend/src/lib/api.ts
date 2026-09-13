const API = "";

export async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

export const fmt = {
  n: (x?: number | null, d = 2) =>
    x == null || Number.isNaN(x) ? "—" : x.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d }),
  pct: (x?: number | null, d = 1) =>
    x == null || Number.isNaN(x) ? "—" : `${(x * 100).toFixed(d)}%`,
  bp: (x?: number | null) =>
    x == null ? "—" : `${(x * 100).toFixed(2)}%`,
  compact: (x?: number | null) => {
    if (x == null) return "—";
    if (x >= 1e12) return `$${(x / 1e12).toFixed(2)}T`;
    if (x >= 1e9) return `$${(x / 1e9).toFixed(1)}B`;
    if (x >= 1e6) return `$${(x / 1e6).toFixed(1)}M`;
    return `$${x.toFixed(0)}`;
  },
  score: (x?: number | null) => (x == null ? "—" : x.toFixed(1)),
};

export const DEFAULT_W = {
  value: 0.25, momentum: 0.2, quality: 0.2, growth: 0.15, size: 0.1, low_vol: 0.1,
};

export type Weights = typeof DEFAULT_W;
