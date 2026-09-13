import { useEffect, useState } from "react";
import { get, post } from "../lib/api";

export default function Notebook() {
  const [notes, setNotes] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", body: "", attached_type: "stock", attached_id: "" });
  const load = () => get<any[]>("/api/notes").then(setNotes);
  useEffect(() => { load(); }, []);

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <h1 className="display text-3xl">Research notebook</h1>
      <p className="mt-1 text-sm text-mute">
        Attach a sentence to a stock, a factor, a backtest. The lab should look like someone actually sat here.
      </p>
      <form
        className="glass mt-5 space-y-2 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          await post("/api/notes", form);
          setForm({ ...form, title: "", body: "" });
          load();
        }}
      >
        <input className="w-full border-b border-ink/10 bg-transparent py-1 text-sm" placeholder="Title — e.g. Quality held up in the vol spike"
          value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="w-full bg-transparent text-sm" rows={3} placeholder="Momentum exposure increased after the latest rebalance."
          value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <div className="flex gap-2 text-xs">
          <select value={form.attached_type} onChange={(e) => setForm({ ...form, attached_type: e.target.value })} className="glass px-2 py-1">
            {["stock", "factor", "portfolio", "chart", "backtest"].map((t) => <option key={t}>{t}</option>)}
          </select>
          <input className="glass flex-1 px-2 py-1" placeholder="ticker / factor / id" value={form.attached_id}
            onChange={(e) => setForm({ ...form, attached_id: e.target.value })} />
          <button className="bg-ink px-3 py-1 text-ivory">Pin note</button>
        </div>
      </form>
      <div className="mt-6 space-y-3">
        {notes.map((n) => (
          <article key={n.id} className="border-l-2 border-teal pl-4">
            <p className="text-[11px] text-mute">{n.attached_type} · {n.attached_id} · {n.created_at?.slice(0, 16)}</p>
            <h3 className="display text-lg">{n.title}</h3>
            <p className="text-sm leading-relaxed">{n.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
