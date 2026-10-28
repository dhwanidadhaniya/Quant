import { signedClass } from "../lib/format";

export function Num({ v, fmt, className = "" }: { v: any; fmt: (x: any) => string; className?: string }) {
  return <span className={`tabular ${signedClass(v)} ${className}`}>{fmt(v)}</span>;
}

export function Badge({ text, tone = "dim" }: { text: string; tone?: string }) {
  const c: Record<string, string> = {
    dim: "text-dim border-line",
    mag: "text-magenta border-magenta/40 bg-magenta/10",
    quant: "text-quant border-quant/40",
    risk: "text-risk border-risk/40",
    amber: "text-amber border-amber/40",
    info: "text-info border-info/40",
  };
  return <span className={`micro px-1 border ${c[tone] || c.dim}`}>{text}</span>;
}
