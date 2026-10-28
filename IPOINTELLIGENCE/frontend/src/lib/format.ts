export function n(v: any, d = 2): string {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return Number(v).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function pct(v: any, d = 1): string {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  const x = Number(v) * 100;
  const s = x >= 0 ? "+" : "";
  return `${s}${x.toFixed(d)}%`;
}

export function px(v: any): string {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function cr(v: any): string {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`;
}

export function x(v: any): string {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "—";
  return `${Number(v).toFixed(2)}×`;
}

export function signedClass(v: any): string {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return "text-mute";
  if (Number(v) > 0) return "text-quant";
  if (Number(v) < 0) return "text-risk";
  return "text-mute";
}

export function labelType(t?: string): string {
  if (!t) return "UNAVAILABLE";
  return t;
}
