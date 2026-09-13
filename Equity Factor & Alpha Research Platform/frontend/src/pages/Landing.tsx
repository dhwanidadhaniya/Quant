import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

function MiniFactor() {
  const nodes = ["VAL", "MOM", "QUAL", "SIZE", "GR", "LV"];
  return (
    <svg viewBox="0 0 260 140" className="h-full w-full">
      {nodes.map((n, i) => {
        const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
        const x = 130 + Math.cos(a) * 52;
        const y = 70 + Math.sin(a) * 38;
        return (
          <g key={n}>
            <line x1="130" y1="70" x2={x} y2={y} stroke="#534178" strokeOpacity="0.35" />
            <circle cx={x} cy={y} r="11" fill="#fbf7f0" stroke="#1e6e63" />
            <text x={x} y={y + 3} textAnchor="middle" fontSize="7" fill="#1b2430">{n}</text>
          </g>
        );
      })}
      {[...Array(12)].map((_, i) => (
        <circle key={i} cx={130 + (i % 6) * 9 - 22} cy={70 + (i % 4) * 6 - 8} r="2.2" fill="#534178" opacity={0.45} />
      ))}
    </svg>
  );
}

function MiniRank() {
  const rows = [
    ["TCS.NS", 84], ["V", 81], ["HINDUNILVR.NS", 79], ["MSFT", 76], ["JPM", 71],
  ];
  return (
    <div className="space-y-1 p-3">
      {rows.map((r, i) => (
        <div key={r[0]} className="flex items-center gap-2 text-[11px]">
          <span className="w-4 text-mute">{i + 1}</span>
          <span className="w-24">{r[0]}</span>
          <div className="h-1.5 flex-1 bg-mist">
            <div className="h-1.5 bg-teal" style={{ width: `${r[1]}%` }} />
          </div>
          <span className="num w-8">{r[1]}</span>
        </div>
      ))}
    </div>
  );
}

function MiniCurve() {
  const d = [100, 98, 86, 94, 110, 104, 118, 126, 119, 138, 144];
  const max = Math.max(...d), min = Math.min(...d);
  const pts = d.map((v, i) => `${8 + i * 22},${70 - ((v - min) / (max - min)) * 50}`).join(" ");
  return (
    <svg viewBox="0 0 240 80" className="h-full w-full">
      <polyline fill="none" stroke="#1e6e63" strokeWidth="2" points={pts} />
      <polyline fill="none" stroke="#534178" strokeWidth="1.2" strokeDasharray="3 3" points="8,48 228,28" />
    </svg>
  );
}

export default function Landing() {
  return (
    <div className="mx-auto max-w-5xl pb-16 pt-6">
      <p className="text-[11px] uppercase tracking-[0.18em] text-violet">Undergraduate research laboratory</p>
      <h1 className="display mt-3 max-w-3xl text-4xl leading-tight text-ink md:text-[2.7rem]">
        Equity Factor &amp; Alpha Research
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-mute">
        Understand what drives equity returns. Discover factor opportunities. Test whether alpha survives risk, time and market regimes.
      </p>
      <div className="mt-8 flex flex-wrap items-end gap-4">
        <Link to="/lab" className="bg-ink px-5 py-2.5 text-sm text-ivory">
          Start Research
        </Link>
        <Link to="/theory" className="text-sm text-teal underline-offset-4 hover:underline">
          Read the theory notes first →
        </Link>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          ["Factor map", <MiniFactor />],
          ["Stock ranking", <MiniRank />],
          ["Portfolio path", <MiniCurve />],
        ].map(([label, node], i) => (
          <motion.div
            key={String(label)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="glass h-40 overflow-hidden"
          >
            <p className="px-3 pt-2 text-[11px] text-mute">{label as string}</p>
            <div className="h-[7.5rem]">{node as ReactNode}</div>
          </motion.div>
        ))}
      </div>

      <section className="mt-14 max-w-2xl">
        <h2 className="display text-2xl">What is factor investing?</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/85">
          A factor is a shared characteristic — cheapness, profitability, recent strength — that has historically
          lined up with differences in return. You are not trying to out-narrate a single stock. You are asking
          whether a <em>characteristic</em> has been paid, after costs, after risk, and after the regime changes.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-mute">
          This lab uses a mixed US + India sample so NIFTY and the S&amp;P can sit on the same canvas. Scores are
          transparent weighted ranks, not a model that “predicts the market”. If a backtest looks too neat, open the
          limitations panel before you write the conclusion.
        </p>
      </section>
    </div>
  );
}
