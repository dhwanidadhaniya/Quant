import { useEffect, useState } from "react";
import { get } from "../lib/api";
import { Why } from "../components/ui/Meta";

export default function Theory() {
  const [entries, setEntries] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  useEffect(() => {
    get<{ entries: any[] }>("/api/theory").then((d) => {
      setEntries(d.entries);
      setSel(d.entries[0]);
    });
  }, []);
  return (
    <div className="pb-16">
      <h1 className="display text-3xl">Financial theory library</h1>
      <p className="mt-1 max-w-xl text-sm text-mute">Beginner sentence first, then the identity. Written like a study group, not a textbook publisher.</p>
      <div className="mt-6 grid gap-6 md:grid-cols-[16rem_1fr]">
        <nav className="space-y-1">
          {entries.map((e) => (
            <button key={e.id} onClick={() => setSel(e)} className={`block w-full px-2 py-1 text-left text-sm ${sel?.id === e.id ? "bg-ink text-ivory" : "text-mute"}`}>
              {e.title}
            </button>
          ))}
        </nav>
        {sel && (
          <article className="glass p-6">
            <h2 className="display text-2xl">{sel.title}</h2>
            <p className="mt-3 text-[15px] leading-relaxed">{sel.simple}</p>
            <p className="mt-4 text-xs uppercase tracking-wide text-violet">Technical</p>
            <p className="text-sm text-mute">{sel.technical}</p>
            <p className="num mt-3 text-sm text-teal">{sel.formula}</p>
            <p className="text-xs text-mute">{sel.variables}</p>
            <p className="mt-3 text-sm">{sel.intuition}</p>
            <p className="mt-2 text-xs text-mute"><b>Use.</b> {sel.use}</p>
            <p className="mt-1 text-xs text-mute"><b>Limits.</b> {sel.limits}</p>
            <p className="mt-1 text-xs text-mute"><b>Example.</b> {sel.example}</p>
            <Why>{sel.intuition}</Why>
          </article>
        )}
      </div>
    </div>
  );
}
