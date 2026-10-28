import { useEffect, useRef, useState } from "react";
import { Explain, Panel, Stat, fmt, fmtInt } from "../components/explain/Explain";
import { HeatGrid, LineXY } from "../components/charts/Charts";
import { api } from "../lib/api";
import { useMarket } from "../lib/store";
import { LivingBook } from "../components/book/LivingBook";

export function LiquidityLab() {
  const s = useMarket((st) => st.state);
  const [qty, setQty] = useState(400);
  const [side, setSide] = useState("bid");
  const [impact, setImpact] = useState<any>(null);
  const [liq, setLiq] = useState<any>(null);
  const [hw, setHw] = useState<any>(null);
  const [hf, setHf] = useState<any>(null);

  useEffect(() => {
    api.impact(qty, side).then(setImpact);
  }, [qty, side, s?.t && Math.floor(s.t)]);
  useEffect(() => {
    api.liquidity().then(setLiq);
    api.heatWait().then(setHw);
    api.heatFill().then(setHf);
  }, []);

  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12">
        <div className="kicker text-fuchsia">06 · LIQUIDITY LAB</div>
        <h1 className="font-display text-4xl">
          Depth, depletion, <span className="text-pink">impact</span>
        </h1>
      </div>

      <Panel kicker="WALK THE BOOK" title="Market-impact lab" className="col-span-12 lg:col-span-7">
        <Explain
          title="How a queue becomes a price"
          formula="Impact = f(Q, L, σ)"
          what="An aggressive quantity Q consumes displayed liquidity L, possibly several prices deep."
          why="That walk is the mechanical core of market impact and of mid-price moves."
          theory="Book walk (exact for displayed size if nothing else happens) plus optional square-root impact."
          interpretation="Same Q, thinner L → farther walk. Volatility scales the reduced-form term, not the walk itself."
          trading="Child size should be a statement about L in front of you."
          limitation="Hidden liquidity and concurrent cancels omitted from the walk. Square-root is empirical, not a theorem."
        >
          <div className="flex gap-2">
            {["bid", "ask"].map((x) => (
              <button key={x} onClick={() => setSide(x)} className={`kicker px-2 py-1 ${side === x ? "bg-pink text-void" : "hairline"}`}>
                AGGRESSIVE {x === "bid" ? "BUY" : "SELL"}
              </button>
            ))}
          </div>
          <label className="mt-3 block kicker">ORDER SIZE {qty}</label>
          <input type="range" min={50} max={5000} step={50} value={qty} onChange={(e) => setQty(+e.target.value)} className="w-full" />
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Stat label="FILLED" value={fmtInt(impact?.walk?.filled)} />
            <Stat label="VWAP" value={fmt(impact?.walk?.vwap, 3)} />
            <Stat label="WALK" value={fmt(impact?.walk?.impact_ticks_proxy, 3)} />
          </div>
          <ol className="mt-3 space-y-1 font-mono text-[11px]">
            {(impact?.walk?.levels ?? []).map((l: any, i: number) => (
              <li key={i} className={l.left === 0 ? "text-pink" : "text-mist"}>
                {l.price.toFixed(2)} take {l.take} {l.left === 0 ? "DEPLETED" : `left ${l.left}`}
              </li>
            ))}
          </ol>
          <div className="mt-2 font-mono text-[11px] text-mute">square-root proxy {fmt(impact?.square_root, 5)}</div>
        </Explain>
      </Panel>

      <Panel kicker="CASCADE" title="Queue depletion engine" className="col-span-12 lg:col-span-5">
        <p className="text-[12px] text-mute">
          Liquidity at best bid → aggressive sells → bid queue depletion → best bid removed → next level becomes best
          bid → mid moves. Replenishment is a different clock.
        </p>
        {s && <LivingBook book={s.book} compact />}
        <button
          onClick={() => api.shock("flash_selling", 2)}
          className="mt-3 kicker w-full bg-pink py-2 text-void"
        >
          TRIGGER FLASH SELL (SIMULATED)
        </button>
      </Panel>

      <Panel kicker="RESILIENCE" title="T_recovery after a shock" className="col-span-12 md:col-span-6">
        <Explain
          title="Liquidity resilience"
          formula="T_recovery = inf{t : L_{shock+t} ≥ γ L_before}"
          what="Time to reclaim a fraction of pre-shock depth."
          why="Fragility is dynamic. Depth can look large and still refill slowly."
          theory="Resilience as a liquidity dimension besides tightness and depth."
          interpretation={
            s?.resilience?.recovered
              ? `Recovered in ${fmt(s.resilience.t_recovery, 2)}s`
              : "No completed recovery in the current window (or no shock yet)."
          }
          trading="Impact of a sliced order depends on replenishment between slices."
          limitation="Shocks here are synthetic."
        >
          <div className="grid grid-cols-3 gap-3">
            <Stat label="BEFORE" value={fmtInt(s?.resilience?.before)} />
            <Stat label="TROUGH" value={fmtInt(s?.resilience?.trough)} />
            <Stat label="NOW" value={fmtInt(s?.resilience?.after)} />
          </div>
          <div className="mt-2 font-mono text-[11px] text-mute">
            BEFORE → SHOCK → DEPLETION → REPLENISHMENT → RECOVERY
          </div>
        </Explain>
      </Panel>

      <Panel kicker="SPREAD" title="Spread regime" className="col-span-12 md:col-span-6">
        <Stat label="SPREAD" value={fmt(s?.book.spread, 3)} />
        <p className="mt-2 text-[12px] text-mute">
          Spread_t = Ask_t − Bid_t. It widens when the touch thins, cancels accelerate, market-order pressure rises, or
          volatility jumps. A one-tick spread with ten shares is not a tight market — depth is the rest of the sentence.
        </p>
      </Panel>

      <Panel kicker="PARAMETER HEATMAPS" title="Waiting time and fill probability" className="col-span-12 lg:col-span-6">
        {hw && <HeatGrid x={hw.x} y={hw.y} z={hw.z} xLabel="λ" yLabel="μ" />}
        <p className="mt-2 font-mono text-[10px] text-mute">{hw?.label}</p>
      </Panel>
      <Panel kicker="Q_AHEAD × λ_M" title="P(fill ≤ 10s)" className="col-span-12 lg:col-span-6">
        {hf && <HeatGrid x={hf.x} y={hf.y} z={hf.z} xLabel="queue ahead" yLabel="market intensity" />}
        <p className="mt-2 font-mono text-[10px] text-mute">{hf?.label}</p>
      </Panel>

      <Panel kicker="TIME × PRICE" title="Liquidity field (SIMULATED)" className="col-span-12">
        <LiquidityCanvas frames={liq?.heatmap ?? []} />
      </Panel>
    </div>
  );
}

function LiquidityCanvas({ frames }: { frames: any[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !frames.length) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const w = c.width;
    const h = c.height;
    ctx.fillStyle = "#050308";
    ctx.fillRect(0, 0, w, h);
    const prices = new Set<number>();
    frames.forEach((f) => {
      f.bids?.forEach((b: any) => prices.add(b.px));
      f.asks?.forEach((a: any) => prices.add(a.px));
    });
    const plist = [...prices].sort((a, b) => a - b);
    const pmin = plist[0];
    const pmax = plist[plist.length - 1];
    frames.forEach((f, i) => {
      const x = (i / frames.length) * w;
      const draw = (rows: any[], ask: boolean) => {
        rows.forEach((r: any) => {
          const y = h - ((r.px - pmin) / (pmax - pmin || 1)) * h;
          const a = Math.min(1, r.v / 1200);
          ctx.fillStyle = ask ? `rgba(255,45,149,${a})` : `rgba(61,255,243,${a})`;
          ctx.fillRect(x, y - 2, Math.max(2, w / frames.length + 1), 4);
        });
      };
      draw(f.bids ?? [], false);
      draw(f.asks ?? [], true);
      if (f.mid) {
        const y = h - ((f.mid - pmin) / (pmax - pmin || 1)) * h;
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillRect(x, y, 1, 1);
      }
    });
  }, [frames]);
  return (
    <Explain
      title="Liquidity time×price heatmap"
      formula="color(t, p) ∝ displayed size"
      what="X = time, Y = price, intensity = queue depth. White dots: mid."
      why="This is the picture of liquidity appearing, vanishing, depleting, replenishing."
      theory="L2 reconstruction over a rolling window."
      interpretation="A vertical scar is a cascade. A re-brightening is replenishment."
      trading="Watch the touch darken before you send a large child."
      limitation="SIMULATED. Not a historical exchange heatmap."
    >
      <canvas ref={ref} width={1100} height={280} className="w-full bg-black" />
    </Explain>
  );
}
