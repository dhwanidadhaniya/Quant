async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const detail = body?.detail;
    const message = typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : response.statusText;
    throw new Error(message);
  }
  return body as T;
}

export const api = {
  system: () => request<import("./types").SystemInfo>("/api/system"),
  experiments: () => request<{ experiments: import("./types").ExperimentListItem[] }>("/api/experiments"),
  experiment: (id: string) => request<import("./types").ExperimentBundle>(`/api/experiments/${id}`),
  create: (config: Record<string, unknown>) =>
    request<import("./types").ExperimentBundle>("/api/experiments", { method: "POST", body: JSON.stringify(config) }),
  session: (id: string) => request<import("./types").SessionDetail>(`/api/sessions/${id}`),
  quotes: (id: string, offset: number, failures: boolean) =>
    request<{ total: number; rows: Array<Record<string, unknown>> }>(
      `/api/experiments/${id}/quotes?limit=40&offset=${offset}&failures_only=${failures}`,
    ),
  falsify: (id: string) =>
    request<import("./types").Falsification>(`/api/experiments/${id}/falsify`, { method: "POST", body: "{}" }),
  falsification: (id: string) => request<import("./types").Falsification>(`/api/experiments/${id}/falsification`),
  exportParquet: (id: string) =>
    request<{ files: string[] }>(`/api/experiments/${id}/export`, { method: "POST", body: "{}" }),
};
