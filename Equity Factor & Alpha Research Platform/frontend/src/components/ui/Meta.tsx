import { useState } from "react";
import { METRICS } from "../../lib/copy";

export function Tip({ id }: { id: string }) {
  const m = METRICS[id];
  const [open, setOpen] = useState(false);
  if (!m) return null;
  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        aria-label={`About ${m.title}`}
        onClick={() => setOpen((o) => !o)}
        className="ml-1 h-4 w-4 rounded-full border border-ink/20 text-[10px] leading-4 text-mute hover:bg-white"
      >
        i
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-72 rounded-md border border-ink/10 bg-paper p-3 text-left text-xs shadow-glass">
          <p className="font-medium text-ink">{m.title}</p>
          <p className="mt-1 text-mute">{m.simple}</p>
          <p className="mt-2 num text-[11px] text-violet">{m.formula}</p>
          <button className="mt-2 text-teal" onClick={() => setOpen(false)}>close</button>
        </div>
      )}
    </span>
  );
}

export function Why({ id, children }: { id?: string; children?: string }) {
  const [open, setOpen] = useState(false);
  const text = children || (id && METRICS[id]?.why) || "";
  return (
    <div className="mt-2">
      <button className="text-[11px] tracking-wide text-violet underline-offset-2 hover:underline" onClick={() => setOpen(!open)}>
        Why does this matter?
      </button>
      {open && <p className="mt-1 max-w-prose text-xs leading-relaxed text-mute">{text}</p>}
    </div>
  );
}

export function Banner() {
  return (
    <p className="rounded-sm border border-ink/10 bg-white/40 px-3 py-1.5 text-[11px] text-mute">
      Data shown is for educational/research purposes. Sample path, not a live feed — and not a forecast.
    </p>
  );
}

export function Signed({ v, pct = true }: { v?: number | null; pct?: boolean }) {
  if (v == null || Number.isNaN(v)) return <span>—</span>;
  const cls = v >= 0 ? "up" : "down";
  const t = pct ? `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%` : v.toFixed(2);
  return <span className={`num ${cls}`}>{t}</span>;
}
