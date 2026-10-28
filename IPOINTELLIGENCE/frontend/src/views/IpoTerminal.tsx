import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { cr, n, pct, signedClass, x } from "../lib/format";
import Learn from "../components/Learn";
import { Badge } from "../components/Bits";
import { useMode } from "../state";

const TABS = ["OVERVIEW","VALUATION","FUNDAMENTALS","GMP","SUBSCRIPTION","PEERS","QUANT","RISK","POST-LISTING","ANALOGUES"] as const;

export default function IpoTerminal() {
  const { id } = useParams();
  const [tab, setTab] = useState<(typeof TABS)[number]>("OVERVIEW");
  const [ipo, setIpo] = useState<any>(null);
  const [extra, setExtra] = useState<any>({});
  const nav = useNavigate();
  const { mode } = useMode();

  useEffect(() => {
    if (!id) return;
    api.ipo(id).then(setIpo);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const load: Record<string, () => Promise<any>> = {
      VALUATION: () => api.valuation(id),
      FUNDAMENTALS: () => api.fundamentals(id),
      GMP: () => api.gmp(id),
      SUBSCRIPTION: () => api.subscription(id),
      PEERS: () => api.peers(id),
      RISK: () => api.risk(id),
      "POST-LISTING": () => api.performance(id),
      ANALOGUES: () => api.analogues(id),
    };
    load[tab]?.().then((d) => setExtra((s: any) => ({ ...s, [tab]: d })));
  }, [id, tab]);

  if (!ipo) return <div className="p-4 micro">LOADING TERMINAL…</div>;

  return (
    <div className="h-full flex flex-col min-h-0">
            <div className="px-3 py-2 border-b border-line flex items-start justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <div className="micro text-magenta">{ipo.ticker} · {ipo.sector} · {ipo.industry}</div>
          <div className="text-xl truncate">{ipo.name}</div>
          <div className="flex gap-2 mt-1 flex-wrap">
            <Badge text={ipo.data_labels?.gmp === "ACTUAL" ? "GMP ACTUAL" : "GMP UNAVAILABLE"} tone={ipo.gmp != null ? "mag" : "amber"} />
            <Badge text={`FUND ${ipo.fund_quality}`} tone={ipo.fund_quality === "HIGH" ? "quant" : "amber"} />
            <Badge text={ipo.market_regime || "REGIME —"} tone="info" />
            <Badge text={ipo.weather?.label || ""} tone="amber" />
            <Badge text={ipo.shares_basis === "ESTIMATED_from_promoter_float" ? "MCAP ESTIMATED" : "MCAP WITHHELD"} tone="amber" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 tabular text-[12px] shrink-0">
          <M k="IPO PX" v={px(ipo.issue_price)} />
          <M k="GMP" v={pct(ipo.gmp_pct)} c={signedClass(ipo.gmp_pct)} />
          <M k="SUB" v={x(ipo.sub_total)} />
          <M k="LIST" v={pct(ipo.listing_return)} c={signedClass(ipo.listing_return)} />
        </div>
      </div>
      <div className="flex border-b border-line overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`micro px-3 py-1.5 border-r border-line ${tab === t ? "text-magenta bg-plum" : "text-dim"}`}>{t}</button>
        ))}
        <button className="micro px-3 text-dim ml-auto" onClick={() => nav("/")}>ESC PULSE</button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {tab === "OVERVIEW" && <Overview ipo={ipo} />}
        {tab === "VALUATION" && <Valuation ipo={ipo} data={extra.VALUATION} learn={mode.learn} />}
        {tab === "FUNDAMENTALS" && <Fundamentals data={extra.FUNDAMENTALS} />}
        {tab === "GMP" && <Gmp ipo={ipo} data={extra.GMP} />}
        {tab === "SUBSCRIPTION" && <Sub data={extra.SUBSCRIPTION} />}
        {tab === "PEERS" && <Peers data={extra.PEERS} />}
        {tab === "QUANT" && <QuantNote ipo={ipo} />}
        {tab === "RISK" && <Risk data={extra.RISK} />}
        {tab === "POST-LISTING" && <Post data={extra["POST-LISTING"]} />}
        {tab === "ANALOGUES" && <Analogues data={extra.ANALOGUES} onOpen={(x) => nav(`/ipo/${x}`)} />}
      </div>
    </div>
  );
}

function M({ k, v, c }: { k: string; v: string; c?: string }) {
  return <div><div className="micro">{k}</div><div className={c}>{v}</div></div>;
}

function Overview({ ipo }: { ipo: any }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-[12px]">
      <div className="panel p-3 space-y-1">
        <div className="micro">ISSUE STRUCTURE</div>
        <Row a="Open / Close / List" b={`${ipo.open_date} → ${ipo.close_date} → ${ipo.listing_date}`} />
        <Row a="Band" b={`${px(ipo.price_band_lo)} – ${px(ipo.price_band_hi)}`} />
        <Row a="Issue / Fresh / OFS" b={`${cr(ipo.issue_size_cr)} / ${cr(ipo.fresh_issue_cr)} / ${cr(ipo.ofs_cr)}`} />
        <Row a="Promoter pre → post" b={`${pct(ipo.promoter_pre)} → ${pct(ipo.promoter_post)}`} />
        <Row a="Face / Lot" b={`${ipo.face_value} / ${ipo.lot_size}`} />
      </div>
      <div className="panel p-3 space-y-1">
        <div className="micro">RESEARCH SNAPSHOT</div>
        <Row a="QIB / NII / Retail snapshots" b={`${x(ipo.sub_qib)} / ${x(ipo.sub_nii)} / ${x(ipo.sub_retail)}`} />
        <Row a="GMP error" b={pct(ipo.gmp_error)} />
        <Row a="P/E (if mcap estimated)" b={n(ipo.pe, 1)} />
        <Row a="Signal" b={ipo.signal?.label} />
        <div className="text-[11px] text-mute pt-2">{ipo.signal?.disclaimer}</div>
      </div>
      <div className="panel p-3 col-span-2">
        <div className="micro mb-2">IPO RESEARCH MAP</div>
        <div className="flex items-center gap-2 text-[11px] tabular flex-wrap">
          {["FUNDAMENTALS","VALUATION","GMP","DEMAND","LISTING","PERFORMANCE"].map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span className="border border-magenta px-2 py-1 bg-plum">{s}</span>
              {i < 5 && <span className="text-magenta">→</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Valuation({ ipo, data, learn }: { ipo: any; data: any; learn: boolean }) {
  const dcf = data?.dcf;
  const m = data?.multiples || {};
  return (
    <div className="space-y-3 text-[12px]">
      <div className="text-lg">WHAT ARE INVESTORS PAYING FOR?</div>
      {learn && <Learn id="pe" />}
      <div className="grid grid-cols-4 gap-2">
        <Card k="IPO P/E" v={n(m.pe, 1)} />
        <Card k="PEER MEDIAN P/E" v={n(m.peer_pe, 1)} />
        <Card k="PREMIUM" v={pct(m.pe_premium)} />
        <Card k="EV/SALES" v={n(m.ev_sales, 2)} />
      </div>
      <div className="text-[11px] text-amber">{(m.flags || []).join(" · ")}</div>
      {dcf?.status === "ok" && (
        <div className="panel p-3">
          <div className="micro mb-2">DCF LABORATORY · PAT→FCF CONVERSION · MODEL OUTPUT</div>
          <div className="grid grid-cols-3 gap-2">
            {["BEAR","BASE","BULL"].map((s) => (
              <div key={s} className="border border-line p-2">
                <div className="micro">{s}</div>
                <div className="tabular text-lg">{px(dcf.scenarios[s].fair_value_per_share)}</div>
                <div className={signedClass(dcf.scenarios[s].implied_upside_vs_ipo)}>{pct(dcf.scenarios[s].implied_upside_vs_ipo)} vs IPO</div>
                <div className="text-mute text-[11px]">WACC {pct(dcf.scenarios[s].wacc,0)} · g {pct(dcf.scenarios[s].terminal_g,0)}</div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-mute mt-2">{dcf.notes?.[0]}</div>
        </div>
      )}
      {dcf?.status === "undefined" && <div className="text-amber">{dcf.reason}</div>}
    </div>
  );
}

function Fundamentals({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-2 text-[12px]">
      <div className="micro">RHP EXTRACT · UNITS ₹ CR · QUALITY {data.quality}</div>
      {(data.notes || []).map((n: string) => <div key={n} className="text-amber text-[11px]">{n}</div>)}
      <div className="grid grid-cols-3 gap-2">
        <Card k="REVENUE" v={cr(data.revenue)} />
        <Card k="REV GROWTH" v={pct(data.rev_growth)} />
        <Card k="PAT" v={cr(data.pat)} />
        <Card k="PAT MARGIN" v={pct(data.pat_margin)} />
        <Card k="ROE" v={pct(data.roe)} />
        <Card k="D/E" v={n(data.de_ratio, 2)} />
      </div>
    </div>
  );
}

function Gmp({ ipo, data }: { ipo: any; data: any }) {
  return (
    <div className="space-y-3 text-[12px]">
      <Learn id="gmp_expected_return" />
      <div className="grid grid-cols-4 gap-2">
        <Card k="GMP ₹" v={n(data?.gmp, 1)} />
        <Card k="IMPLIED RET" v={pct(data?.expected_listing_return)} />
        <Card k="ACTUAL LIST" v={pct(data?.actual_listing_return)} />
        <Card k="ERROR" v={pct(data?.prediction_error)} />
      </div>
      <div className="panel p-3">
        <div className="micro mb-2">TRAJECTORY (SPARSE)</div>
        <div className="flex items-center gap-4">
          {(data?.trajectory || []).map((t: any) => (
            <div key={t.t} className="border border-magenta px-3 py-2">
              <div className="micro">{t.t}</div>
              <div className="tabular">{px(t.implied_price)}</div>
              <div className="micro">{t.data_type}</div>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-mute mt-2">{data?.trajectory_note}</div>
      </div>
      <div className="panel p-3">
        <div className="micro">GMP SIGNAL RELIABILITY</div>
        <div className="text-lg text-magenta">{ipo.signal?.label}</div>
        <ul className="text-[11px] text-mute list-disc pl-4">
          {(ipo.signal?.reasons || []).map((r: string) => <li key={r}>{r}</li>)}
        </ul>
      </div>
    </div>
  );
}

function Sub({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-3 text-[12px]">
      <Learn id="subscription_velocity" />
      {data.path_incomplete && <div className="text-amber text-[11px]">Last daily print is far below final total — typically missing last-day QIB.</div>}
      <table className="w-full text-[11px] panel">
        <thead><tr className="micro">{["DAY","QIB","NII","RETAIL","TOTAL","VEL","ACC"].map((h) => <th key={h} className="px-2 text-left">{h}</th>)}</tr></thead>
        <tbody>
          {(data.days || []).map((d: any) => (
            <tr key={d.day}>
              <td className="px-2">{d.day}</td>
              <td className="tabular">{x(d.qib)}</td>
              <td className="tabular">{x(d.nii)}</td>
              <td className="tabular">{x(d.retail)}</td>
              <td className="tabular">{x(d.total)}</td>
              <td className="tabular">{n(d.velocity, 2)}</td>
              <td className="tabular">{n(d.acceleration, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>FINAL TOTAL {x(data.final_total)} · HHI {n(data.concentration?.hhi, 2)}</div>
      <DemandFlow qib={data.final_qib} nii={data.final_nii} retail={data.final_retail} />
    </div>
  );
}

function DemandFlow({ qib, nii, retail }: { qib: number; nii: number; retail: number }) {
  const tot = (qib || 0) + (nii || 0) + (retail || 0) || 1;
  return (
    <div>
      <div className="micro mb-1">DEMAND FLOW · THICKNESS = LAST SNAPSHOT</div>
      <div className="flex h-8">
        <div className="bg-info" style={{ width: `${((qib || 0) / tot) * 100}%` }} title="QIB" />
        <div className="bg-magenta" style={{ width: `${((nii || 0) / tot) * 100}%` }} title="NII" />
        <div className="bg-quant" style={{ width: `${((retail || 0) / tot) * 100}%` }} title="RETAIL" />
      </div>
      <div className="micro mt-1">QIB INFO · NII MAGENTA · RETAIL QUANT</div>
    </div>
  );
}

function Peers({ data }: { data: any }) {
  return (
    <div className="text-[12px] space-y-2">
      <div className="text-mute text-[11px]">{data?.peer_definition}</div>
      <table className="w-full text-[11px] panel">
        <thead><tr className="micro">{["TICKER","P/E","EV/S","LIST","GROWTH"].map((h) => <th key={h} className="px-2 text-left">{h}</th>)}</tr></thead>
        <tbody>
          {(data?.items || []).map((p: any) => (
            <tr key={p.id}><td className="px-2 text-magenta">{p.ticker}</td><td className="tabular">{n(p.pe,1)}</td><td className="tabular">{n(p.ev_sales,1)}</td><td className="tabular">{pct(p.listing_return)}</td><td className="tabular">{pct(p.rev_growth)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuantNote({ ipo }: { ipo: any }) {
  const [reg, setReg] = useState<any>(null);
  useEffect(() => { api.regression("gmp_pct", "listing_return").then(setReg); }, []);
  return (
    <div className="font-mono text-[12px] space-y-2">
      <div className="micro">CROSS-SECTION CONTEXT FOR THIS NAME</div>
      <div>This IPO listing return {pct(ipo.listing_return)} vs GMP implied {pct(ipo.gmp_pct)}.</div>
      {reg?.interpretation && <div className="text-mute font-sans">{reg.interpretation}</div>}
      <Learn id="correlation" />
    </div>
  );
}

function Risk({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-2">
      <div className="text-lg">SCENARIO BIAS · {data.scenario_bias}</div>
      {Object.entries(data.factors || {}).map(([k, v]: any) => (
        <div key={k}>
          <div className="micro">{k} · {n(v.score, 0)}</div>
          <div className="h-1 bg-graphite"><div className="h-1 bg-magenta" style={{ width: `${v.score}%` }} /></div>
          <div className="text-[11px] text-mute">{v.note}</div>
        </div>
      ))}
      <div className="text-[11px] text-amber">{data.disclaimer}</div>
    </div>
  );
}

function Post({ data }: { data: any }) {
  if (!data) return null;
  const keys = ["listing_return","ret_1d","ret_5d","ret_30d","ret_90d","ret_180d","ret_1y"];
  return (
    <div className="space-y-2 text-[12px]">
      <Learn id="ar" />
      <div className="grid grid-cols-4 gap-2">
        {keys.map((k) => <Card key={k} k={k} v={pct(data[k])} />)}
        <Card k="α 30D" v={pct(data.alpha_30d)} />
        <Card k="α 1Y" v={pct(data.alpha_1y)} />
        <Card k="β 1Y" v={n(data.beta_1y, 2)} />
        <Card k="MDD" v={pct(data.mdd_1y)} />
      </div>
      <div className="text-[11px] text-mute">data_type: {data.data_type || "UNAVAILABLE"} · Yahoo enrichment required for horizons beyond listing day.</div>
    </div>
  );
}

function Analogues({ data, onOpen }: { data: any; onOpen: (id: string) => void }) {
  return (
    <div className="space-y-2 text-[12px]">
      <div className="text-amber text-[11px]">{data?.disclaimer}</div>
      <table className="w-full text-[11px] panel">
        <thead><tr className="micro">{["TICKER","DIST","GMP","SUB","LIST","30D","1Y","α1Y"].map((h) => <th key={h} className="px-2 text-left">{h}</th>)}</tr></thead>
        <tbody>
          {(data?.matches || []).map((m: any) => (
            <tr key={m.id} className="cursor-pointer hover:bg-graphite" onClick={() => onOpen(m.id)}>
              <td className="px-2 text-magenta">{m.ticker}</td>
              <td className="tabular">{n(m.distance, 2)}</td>
              <td className="tabular">{pct(m.gmp_pct)}</td>
              <td className="tabular">{x(m.sub_total)}</td>
              <td className="tabular">{pct(m.listing_return)}</td>
              <td className="tabular">{pct(m.ret_30d)}</td>
              <td className="tabular">{pct(m.ret_1y)}</td>
              <td className="tabular">{pct(m.alpha_1y)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ a, b }: { a: string; b: string }) {
  return <div className="flex justify-between gap-4"><span className="text-mute">{a}</span><span className="tabular">{b}</span></div>;
}
function Card({ k, v }: { k: string; v: string }) {
  return <div className="panel p-2"><div className="micro">{k}</div><div className="tabular text-[15px]">{v}</div></div>;
}
function px(v: any) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  return `₹${Number(v).toLocaleString("en-IN")}`;
}
