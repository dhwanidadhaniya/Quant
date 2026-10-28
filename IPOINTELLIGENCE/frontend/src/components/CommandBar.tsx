import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const HINTS = [
  "compare GMP reliability for tech IPOs",
  "show IPOs with GMP > 20% and QIB > 10x",
  "gmp reliability",
  "gmp > 15 and qib > 5",
];

export default function CommandBar() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        document.getElementById("cmd")?.focus();
      }
      if (e.key === "Escape") (e.target as HTMLElement)?.blur();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function run(e: FormEvent) {
    e.preventDefault();
    const text = q.trim();
    if (!text) return;
    if (text.startsWith("open ")) {
      nav(`/ipo/${text.slice(5).trim()}`);
      return;
    }
    const res = await api.query(text);
    if (res.type === "gmp-reliability") nav("/gmp");
    else nav(`/universe?q=${encodeURIComponent(text)}`);
  }

  return (
    <form onSubmit={run} className="relative flex items-center gap-2 px-3 h-9 shrink-0 border-b border-line bg-chassis">
      <span className="text-magenta tabular text-[12px]">{">"}</span>
      <span className="micro text-magenta">ALPHA_QUERY</span>
      <input
        id="cmd"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder="compare GMP reliability for tech IPOs"
        className="flex-1 bg-transparent outline-none tabular text-[12px] text-readout placeholder:text-dim"
        autoComplete="off"
      />
      <span className="micro">[/] FOCUS · ENTER EXEC</span>
      {open && (
        <div className="absolute top-9 left-0 right-0 z-40 border-b border-mutedp bg-graphite">
          {HINTS.map((h) => (
            <button
              type="button"
              key={h}
              className="block w-full text-left px-8 py-1 tabular text-[11px] text-mute hover:text-magenta hover:bg-plum"
              onMouseDown={() => setQ(h)}
            >
              {h}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
