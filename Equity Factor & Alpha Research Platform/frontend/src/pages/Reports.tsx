import { useState } from "react";
import { post } from "../lib/api";

export default function Reports() {
  const [md, setMd] = useState("");
  const [files, setFiles] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ strategy: "Multi-Factor", start: "2020-01-02", end: "2025-12-31", benchmark: "^GSPC", rebalance: "quarterly", transaction_cost: 0.001, initial_capital: 1000000 });

  const go = async () => {
    setBusy(true);
    const r: any = await post("/api/reports/generate", form);
    setMd(r.report_md);
    setFiles(r.files);
    setBusy(false);
  };

  const pdf = () => {
    const w = window.open("", "_blank")!;
    w.document.write(`<pre style="font-family:Georgia,serif;padding:32px;white-space:pre-wrap">${md.replace(/</g, "&lt;")}</pre>`);
    w.print();
  };

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <h1 className="display text-3xl">Research report</h1>
      <p className="mt-1 text-sm text-mute">A structured write-up a finance professor can mark. Export markdown/CSV; print to PDF from the browser.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <select className="glass px-2 py-1 text-sm" value={form.strategy} onChange={(e) => setForm({ ...form, strategy: e.target.value })}>
          {["Value", "Momentum", "Quality", "Multi-Factor"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="bg-ink px-3 py-1 text-sm text-ivory" onClick={go} disabled={busy}>{busy ? "Writing…" : "Generate"}</button>
        {md && <button className="glass px-3 py-1 text-sm" onClick={pdf}>Print / PDF</button>}
        {files && (
          <>
            <a className="glass px-3 py-1 text-sm" href={`/api/reports/files/${files.markdown}`}>Markdown</a>
            <a className="glass px-3 py-1 text-sm" href={`/api/reports/files/${files.csv}`}>Holdings CSV</a>
          </>
        )}
      </div>
      {md && (
        <article className="mt-6 bg-[#f7f0e3] p-8 shadow-glass" style={{ fontFamily: "Georgia, serif" }}>
          <pre className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{md}</pre>
        </article>
      )}
    </div>
  );
}
