import type { ReactNode } from "react";
import { TERMS, type Term } from "../glossary/terms";

export function Why({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <details className="why">
      <summary>{title ?? "Why does this matter?"}</summary>
      <div className="why-body">{children}</div>
    </details>
  );
}

export function Formula({ children }: { children: ReactNode }) {
  return <div className="formula">{children}</div>;
}

export function TermCard({ term, open }: { term: Term; open?: boolean }) {
  return (
    <details className="term" open={open}>
      <summary>
        <div className="tag">GLOSSARY</div>
        <h4>{term.name}</h4>
      </summary>
      <p>
        <b style={{ color: "#f6e6ee" }}>Definition. </b>
        {term.definition}
      </p>
      <p>
        <b style={{ color: "#f6e6ee" }}>Financial intuition. </b>
        {term.intuition}
      </p>
      <p>
        <b style={{ color: "#f6e6ee" }}>Mathematics. </b>
        {term.math}
      </p>
      <div className="formula" style={{ fontSize: 18 }}>
        {term.formula}
      </div>
      <p>
        <b style={{ color: "#f6e6ee" }}>Example. </b>
        {term.example}
      </p>
      <p>
        <b style={{ color: "#f6e6ee" }}>Why a quant cares. </b>
        {term.why}
      </p>
    </details>
  );
}

export function GlossaryGrid({ ids }: { ids?: string[] }) {
  const list = ids ? TERMS.filter((t) => ids.includes(t.id)) : TERMS;
  return (
    <div className="term-grid">
      {list.map((t) => (
        <TermCard key={t.id} term={t} />
      ))}
    </div>
  );
}

export function Gauge({ rho }: { rho: number }) {
  const x = Math.max(0, Math.min(1.4, rho)) / 1.4;
  const label = rho < 1 ? "STABLE / SUBCRITICAL" : rho === 1 ? "CRITICAL" : "UNSTABLE";
  return (
    <div>
      <div className="g-lab">
        <span>0</span>
        <span>STABLE</span>
        <span>1</span>
        <span>CRITICAL+</span>
      </div>
      <div className="gauge">
        <div className="needle" style={{ left: `${x * 100}%` }} />
      </div>
      <div className="chip">
        ρ(K) = {rho.toFixed(3)} · {label}
      </div>
    </div>
  );
}
