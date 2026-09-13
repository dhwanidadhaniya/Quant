import { useEffect, useState } from "react";
import { post, fmt } from "../lib/api";
import { METRICS } from "../lib/copy";
import { Tip, Why } from "../components/ui/Meta";

const ITEMS = [
  ["volatility", "Standard Deviation", "σ of returns, annualised. The blunt instrument."],
  ["beta", "Beta", "Volume knob versus the S&P sample series."],
  ["alpha", "Alpha", "Leftover after CAPM. Model-relative."],
  ["sharpe", "Sharpe Ratio", METRICS.sharpe.simple],
  ["sortino", "Sortino Ratio", METRICS.sortino.simple],
  ["treynor", "Treynor Ratio", "(Rp − Rf) / β. Pain measured in market units."],
  ["information_ratio", "Information Ratio", METRICS.ir.simple],
  ["tracking_error", "Tracking Error", "σ of active return versus the benchmark."],
  ["max_drawdown", "Maximum Drawdown", METRICS.drawdown.simple],
  ["var_95", "VaR 95%", METRICS.var.simple],
  ["cvar_95", "CVaR 95%", METRICS.cvar.simple],
];

export default function Risk() {
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    post("/api/backtests/run", { strategy: "Multi-Factor", start: "2020-01-02", end: "2025-12-31" }).then(setD);
  }, []);
  const m = d?.metrics || {};
  return (
    <div className="pb-20">
      <h1 className="display text-3xl">Risk analytics</h1>
      <p className="mt-1 max-w-xl text-sm text-mute">Formulas first, then the sample multi-factor sleeve so the numbers have a body.</p>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {ITEMS.map(([key, title, note]) => (
          <div key={key} className="glass flex items-start justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium">{title} <Tip id={key === "volatility" ? "sharpe" : key === "treynor" ? "beta" : key === "tracking_error" ? "ir" : key === "var_95" ? "var" : key === "cvar_95" ? "cvar" : key === "max_drawdown" ? "drawdown" : key} /></p>
              <p className="mt-1 text-xs text-mute">{note}</p>
            </div>
            <p className="num text-xl">{fmtPctish(key, m[key])}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 glass p-5 text-sm leading-relaxed">
        <p className="display text-xl">Identities used in the engine</p>
        <pre className="mt-3 overflow-auto text-xs text-violet">{`Return = (P1 − P0 + Dividend) / P0
CAGR   = (Ending / Beginning)^(1/n) − 1
Sharpe = (Rp − Rf) / σp
Beta   = Cov(Rp, Rm) / Var(Rm)
Alpha  = Rp − [Rf + β(Rm − Rf)]
IR     = (Rp − Rb) / Tracking Error`}</pre>
        <p className="mt-3 text-xs text-mute">Rf is 4.2% in this lab as a sample-period stand-in. Dividends are not modelled separately in the seed — total-return approximation via price path only. That is a limitation, not a footnote to hide.</p>
        <Why id="var" />
      </div>
    </div>
  );
}

function fmtPctish(k: string, v?: number) {
  if (v == null) return "—";
  if (["beta", "sharpe", "sortino", "treynor", "information_ratio"].includes(k)) return v.toFixed(2);
  return `${(v * 100).toFixed(2)}%`;
}
