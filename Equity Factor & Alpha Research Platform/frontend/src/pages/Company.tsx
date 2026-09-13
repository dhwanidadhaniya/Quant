import { useEffect, useState, type ReactNode } from "react";
import { useParams, Link } from "react-router-dom";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { get, fmt } from "../lib/api";
import { Signed, Tip, Why } from "../components/ui/Meta";

const FACS = ["value", "momentum", "quality", "size", "growth", "low_vol"] as const;

export default function Company() {
  const { ticker = "" } = useParams();
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    get(`/api/companies/${encodeURIComponent(ticker)}`).then(setD).catch(() => setD(null));
  }, [ticker]);
  if (!d) return <p className="text-sm text-mute">Loading company note…</p>;
  const fin = d.financials || {};
  const fac = d.factors || {};
  return (
    <div className="mx-auto max-w-5xl pb-20">
      <p className="text-[11px] uppercase tracking-[0.14em] text-violet">{d.sector} · {d.industry} · {d.exchange}</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <h1 className="display text-3xl">{d.name} <span className="text-xl text-mute">{d.ticker}</span></h1>
        <div className="text-right">
          <p className="num text-2xl">{fmt.n(d.price, 2)}</p>
          <Signed v={d.change} />
        </div>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed">{d.description}</p>

      <div className="mt-8 grid gap-4 md:grid-cols-[1.2fr_.8fr]">
        <div className="glass p-4">
          <p className="text-[11px] text-mute">Sample price path</p>
          <div className="h-48">
            <ResponsiveContainer>
              <LineChart data={d.spark}>
                <XAxis dataKey="date" hide />
                <YAxis domain={["auto", "auto"]} hide />
                <Tooltip />
                <Line type="monotone" dataKey="close" stroke="#1e6e63" dot={false} strokeWidth={1.6} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass p-4">
          <p className="text-[11px] text-mute">Factor profile</p>
          <svg viewBox="0 0 220 200" className="mx-auto mt-1 h-48">
            {FACS.map((f, i) => {
              const a = (i / FACS.length) * Math.PI * 2 - Math.PI / 2;
              const v = (fac[f] || 0) / 100;
              const x = 110 + Math.cos(a) * (20 + v * 70);
              const y = 100 + Math.sin(a) * (20 + v * 70);
              const lx = 110 + Math.cos(a) * 92;
              const ly = 100 + Math.sin(a) * 92;
              return (
                <g key={f}>
                  <line x1="110" y1="100" x2={lx} y2={ly} stroke="#e4dfd4" />
                  <circle cx={x} cy={y} r="5" fill="#1e6e63" />
                  <text x={lx} y={ly} fontSize="8" textAnchor="middle" fill="#5b6572">{f.replace("_", " ")}</text>
                </g>
              );
            })}
          </svg>
          <Why id="alpha" />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Block title="Valuation">
          <KV k="PE" v={fmt.n(fin.pe, 1)} id="pe" />
          <KV k="PB" v={fmt.n(fin.pb, 1)} id="pb" />
          <KV k="EV/EBITDA" v={fmt.n(fin.ev_ebitda, 1)} />
          <KV k="PEG" v={fmt.n(fin.peg, 2)} />
        </Block>
        <Block title="Profitability">
          <KV k="ROE" v={fmt.pct(fin.roe)} id="roe" />
          <KV k="ROA" v={fmt.pct(fin.roa)} id="roa" />
          <KV k="Op. margin" v={fmt.pct(fin.operating_margin)} />
          <KV k="Net margin" v={fmt.pct(fin.net_margin)} />
        </Block>
        <Block title="Growth">
          <KV k="Revenue growth" v={fmt.pct(fin.revenue_growth)} />
          <KV k="EPS growth" v={fmt.pct(fin.eps_growth)} />
          <KV k="Earnings CAGR" v={fmt.pct(fin.earnings_cagr)} />
        </Block>
        <Block title="Financial strength">
          <KV k="Debt / Equity" v={fmt.n(fin.debt_equity, 2)} />
          <KV k="Interest cover" v={fmt.n(fin.interest_coverage, 1)} />
          <KV k="Current ratio" v={fmt.n(fin.current_ratio, 2)} />
          <KV k="Dividend yield" v={fmt.pct(fin.dividend_yield)} />
        </Block>
      </div>
      <div className="mt-4 glass p-4">
        <p className="text-[11px] text-mute">Market behaviour (sample window)</p>
        <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
          <div>Vol <span className="num">{fmt.pct(d.market?.volatility)}</span></div>
          <div>Drawdown <span className="num">{fmt.pct(d.market?.drawdown)}</span><Tip id="drawdown" /></div>
          <div>Path return <span className="num">{fmt.pct(d.market?.momentum)}</span></div>
        </div>
      </div>
      <div className="mt-4 glass p-4">
        <p className="text-[11px] text-mute">Why the rank looks like this</p>
        <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed">
          {(d.why || []).map((x: string) => <li key={x}>{x}</li>)}
        </ul>
        <Link className="mt-3 inline-block text-sm text-teal" to="/alpha">Open in Alpha Discovery →</Link>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return <div className="glass p-4"><p className="text-[11px] text-mute">{title}</p><div className="mt-2 space-y-1">{children}</div></div>;
}
function KV({ k, v, id }: { k: string; v: string; id?: string }) {
  return <div className="flex justify-between text-sm"><span>{k}{id && <Tip id={id} />}</span><span className="num">{v}</span></div>;
}
