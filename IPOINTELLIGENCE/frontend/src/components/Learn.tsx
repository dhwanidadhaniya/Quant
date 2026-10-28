import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Learn({ id }: { id: string }) {
  const [f, setF] = useState<any>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    api.formulas().then(setF).catch(() => {});
  }, []);
  if (!f?.[id]) return null;
  const x = f[id];
  return (
    <div className="border border-line bg-plum/40 my-2">
      <button className="micro w-full text-left px-2 py-1 text-magenta" onClick={() => setOpen((s) => !s)}>
        {open ? "▾" : "▸"} LEARN · {x.name}
      </button>
      {open && (
        <div className="px-2 pb-2 text-[12px] space-y-1 text-mute">
          <div><span className="text-dim">WHAT</span> {x.what}</div>
          <div className="tabular text-readout">{x.formula}</div>
          <div><span className="text-dim">WHY</span> {x.why}</div>
          <div><span className="text-dim">INTERPRETATION</span> {x.interpretation}</div>
          <div><span className="text-amber">LIMITATION</span> {x.limitations}</div>
        </div>
      )}
    </div>
  );
}
