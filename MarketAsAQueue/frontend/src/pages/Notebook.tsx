import { useEffect, useState } from "react";
import { Panel } from "../components/explain/Explain";
import { api } from "../lib/api";

export function Notebook() {
  const [nb, setNb] = useState<any>(null);
  const [obs, setObs] = useState("");
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("maq-notes") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    api.notebook().then(setNb);
  }, []);

  function save() {
    if (!obs.trim()) return;
    const next = [obs.trim(), ...saved].slice(0, 40);
    setSaved(next);
    localStorage.setItem("maq-notes", JSON.stringify(next));
    setObs("");
  }

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12">
        <div className="kicker text-fuchsia">11 · RESEARCH NOTEBOOK</div>
        <h1 className="font-display text-4xl">
          Theory, assumptions, <span className="text-pink">limitations</span>
        </h1>
        <p className="text-sm text-mute">{nb?.source} · equations that answer a financial question, or they are omitted.</p>
      </div>

      {(nb?.sections ?? []).map((sec: any) => (
        <Panel key={sec.id} kicker={sec.id.toUpperCase()} title={sec.title} className="col-span-12 md:col-span-6">
          {sec.formula && sec.formula !== "—" && (
            <div className="mb-3 border border-cyan/30 bg-cyan/5 p-2 font-mono text-cyan">{sec.formula}</div>
          )}
          {(sec.body ?? []).map((p: string, i: number) => (
            <p key={i} className="mb-2 text-[13px] leading-relaxed text-mist/85">
              {p}
            </p>
          ))}
          <div className="kicker mt-2 text-pink">LIMITATION</div>
          <p className="text-[12px] text-mute">{sec.limitation}</p>
        </Panel>
      ))}

      <Panel kicker="OBSERVATIONS" title="Save what you saw" className="col-span-12">
        <textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          className="h-24 w-full bg-black/50 p-3 font-mono text-[12px] text-mist outline-none hairline"
          placeholder="Queue ahead halved and 10s fill rose 12pp, but a mass-cancel shock then stranded the order…"
        />
        <button onClick={save} className="mt-2 kicker bg-pink px-3 py-2 text-void">
          SAVE LOCALLY
        </button>
        <ul className="mt-3 space-y-2">
          {saved.map((n, i) => (
            <li key={i} className="hairline p-2 font-mono text-[12px] text-mute">
              {n}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
