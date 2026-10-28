import { FORMULAS, type Formula } from "../../theory/formulas";
import { useMarket } from "../../lib/store";
import { useMemo, useState } from "react";

const CATS = ["QUEUEING", "PROBABILITY", "MICROSTRUCTURE", "EXECUTION", "LIQUIDITY", "IMPACT"] as const;

export function FormulaDrawer() {
  const open = useMarket((s) => s.formulaOpen);
  const toggle = useMarket((s) => s.toggleFormula);
  const [cat, setCat] = useState<(typeof CATS)[number]>("QUEUEING");
  const [id, setId] = useState("little");
  const items = useMemo(() => FORMULAS.filter((f) => f.cat === cat), [cat]);
  const f = FORMULAS.find((x) => x.id === id) ?? items[0];
  if (!open) return null;
  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-[min(520px,100vw)] flex-col border-l border-pink/25 bg-[#07050b]/95 shadow-glow">
      <header className="flex items-center justify-between border-b border-pink/20 px-4 py-3">
        <div>
          <div className="kicker">FORMULA EXPLORER</div>
          <div className="font-display text-xl">Equations that earn their place</div>
        </div>
        <button onClick={toggle} className="kicker text-pink">
          CLOSE
        </button>
      </header>
      <div className="flex gap-1 overflow-x-auto border-b border-pink/10 px-3 py-2">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => {
              setCat(c);
              const first = FORMULAS.find((x) => x.cat === c);
              if (first) setId(first.id);
            }}
            className={`kicker whitespace-nowrap px-2 py-1 ${cat === c ? "bg-pink text-void" : "text-mute"}`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1">
        <ul className="w-40 overflow-y-auto border-r border-pink/10 p-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setId(item.id)}
                className={`w-full px-2 py-2 text-left font-mono text-[11px] ${
                  f?.id === item.id ? "bg-pink/20 text-mist" : "text-mute"
                }`}
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>
        {f && <FormulaBody f={f} />}
      </div>
    </aside>
  );
}

function FormulaBody({ f }: { f: Formula }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 text-[13px] leading-relaxed">
      {f.educational && <div className="kicker mb-2 text-fuchsia">EDUCATIONAL SIMPLIFICATION</div>}
      <h3 className="font-display text-2xl">{f.name}</h3>
      <div className="mt-3 border border-cyan/30 bg-cyan/5 p-3 font-mono text-cyan">{f.eq}</div>
      {f.vars.length > 0 && (
        <dl className="mt-4 space-y-1">
          {f.vars.map((v) => (
            <div key={v.s} className="flex gap-3">
              <dt className="w-28 font-mono text-pink">{v.s}</dt>
              <dd className="text-mist/80">{v.d}</dd>
            </div>
          ))}
        </dl>
      )}
      {f.example && <p className="mt-3 font-mono text-fuchsia">Example · {f.example}</p>}
      <Block t="WHAT?" b={f.what} />
      <Block t="WHY?" b={f.why} />
      <Block t="THEORY?" b={f.theory} />
      <Block t="INTERPRETATION?" b={f.interpretation} />
      <Block t="TRADING IMPLICATION?" b={f.trading} />
      <Block t="LIMITATION?" b={f.limitation} />
    </div>
  );
}

function Block({ t, b }: { t: string; b: string }) {
  return (
    <div className="mt-3">
      <div className="kicker text-pink">{t}</div>
      <p className="mt-1 text-mist/85">{b}</p>
    </div>
  );
}
