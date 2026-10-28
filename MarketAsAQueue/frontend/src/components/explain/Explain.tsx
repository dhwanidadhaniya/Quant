import { useState, type ReactNode } from "react";
import { useMarket } from "../../lib/store";

export function Explain({
  title,
  formula,
  what,
  why,
  theory,
  interpretation,
  trading,
  limitation,
  educational,
  children,
}: {
  title: string;
  formula?: string;
  what: string;
  why: string;
  theory: string;
  interpretation: string;
  trading: string;
  limitation: string;
  educational?: boolean;
  children?: ReactNode;
}) {
  const explain = useMarket((s) => s.explain);
  const [open, setOpen] = useState(false);
  if (!explain) return <>{children}</>;
  return (
    <div className="relative">
      {children}
      <button
        onClick={() => setOpen((v) => !v)}
        className="kicker mt-2 text-fuchsia hover:text-mist"
      >
        {open ? "▾ MICROSTRUCTURE EXPLAIN" : "▸ MICROSTRUCTURE EXPLAIN"} — {title}
      </button>
      {open && (
        <div className="mt-2 grid gap-2 border border-pink/20 bg-void/80 p-3 text-[12px] leading-relaxed text-mist/90">
          {educational && (
            <div className="kicker text-fuchsia">EDUCATIONAL SIMPLIFICATION</div>
          )}
          {formula && (
            <div className="font-mono text-[13px] text-cyan">{formula}</div>
          )}
          <Row k="WHAT?" v={what} />
          <Row k="WHY?" v={why} />
          <Row k="THEORY?" v={theory} />
          <Row k="INTERPRETATION?" v={interpretation} />
          <Row k="TRADING IMPLICATION?" v={trading} />
          <Row k="LIMITATION?" v={limitation} />
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <span className="kicker text-pink">{k}</span>
      <p className="mt-0.5">{v}</p>
    </div>
  );
}

export function Panel({
  kicker,
  title,
  right,
  children,
  className = "",
}: {
  kicker?: string;
  title: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass relative p-4 ${className}`}>
      <header className="mb-3 flex items-end justify-between gap-3">
        <div>
          {kicker && <div className="kicker mb-1">{kicker}</div>}
          <h2 className="font-display text-lg tracking-wide text-mist">{title}</h2>
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "mist",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "mist" | "bid" | "ask" | "fuchsia";
}) {
  const c =
    tone === "bid" ? "text-cyan" : tone === "ask" ? "text-pink" : tone === "fuchsia" ? "text-fuchsia" : "text-mist";
  return (
    <div className="min-w-0">
      <div className="kicker">{label}</div>
      <div className={`num mt-1 text-2xl ${c}`}>{value}</div>
      {sub && <div className="mt-0.5 font-mono text-[10px] text-mute">{sub}</div>}
    </div>
  );
}

export function fmt(n: number | null | undefined, d = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (!Number.isFinite(n)) return "∞";
  return n.toFixed(d);
}

export function fmtInt(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Math.round(n).toLocaleString();
}

export function pct(n: number | null | undefined, d = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(d)}%`;
}
