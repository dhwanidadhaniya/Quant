import type { BookSnap, Level } from "../../lib/types";
import { useMarket } from "../../lib/store";
import { fmt, fmtInt } from "../explain/Explain";

export function LivingBook({ book, compact = false }: { book: BookSnap; compact?: boolean }) {
  const mode = useMarket((s) => s.depthMode);
  const setMode = useMarket((s) => s.setDepthMode);
  const asks = [...(book.asks ?? [])].slice().reverse();
  const bids = book.bids ?? [];
  const maxV = Math.max(1, ...asks.map(vOf), ...bids.map(vOf));

  function vOf(l: Level) {
    if (mode === "orders") return l.n_orders;
    if (mode === "notional") return l.notional;
    return l.volume;
  }

  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-between">
        <div className="kicker text-pink">ASK FLOW ↓</div>
        <div className="flex gap-1">
          {(["volume", "orders", "notional"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`kicker px-2 py-0.5 ${mode === m ? "bg-pink text-void" : "text-mute"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="font-mono text-[12px]">
        {asks.map((l) => (
          <Row key={`a${l.price_ticks}`} l={l} max={maxV} val={vOf(l)} side="ask" compact={compact} />
        ))}
        <div className="my-1 flex items-center gap-3 border-y border-mist/20 py-1">
          <div className="kicker text-mist">MID</div>
          <div className="num text-xl text-mist">{fmt(book.mid, 2)}</div>
          <div className="kicker">SPREAD {fmt(book.spread, 2)}</div>
        </div>
        {bids.map((l) => (
          <Row key={`b${l.price_ticks}`} l={l} max={maxV} val={vOf(l)} side="bid" compact={compact} />
        ))}
      </div>
      <div className="mt-2 kicker text-cyan">↑ BID FLOW</div>
    </div>
  );
}

function Row({
  l,
  max,
  val,
  side,
  compact,
}: {
  l: Level;
  max: number;
  val: number;
  side: "bid" | "ask";
  compact?: boolean;
}) {
  const pctW = Math.max(2, (val / max) * 100);
  const hasUser = l.has_user || l.orders?.some((o) => o.is_user);
  return (
    <div className={`relative flex items-center gap-2 py-[3px] ${hasUser ? "bg-fuchsia/10" : ""}`}>
      <div className={`w-16 text-right ${side === "ask" ? "text-pink" : "text-cyan"}`}>{l.price.toFixed(2)}</div>
      <div className="relative h-4 flex-1 overflow-hidden bg-white/5">
        <div
          className="h-full"
          style={{
            width: `${pctW}%`,
            background:
              side === "ask"
                ? "linear-gradient(90deg, #ff2d95, #e100ff)"
                : "linear-gradient(90deg, #3dfff3, #9b5cff)",
            opacity: 0.85,
          }}
        />
        {hasUser && (
          <div className="absolute inset-y-0 left-[40%] w-[2px] bg-white shadow-[0_0_8px_#fff]" title="YOUR ORDER" />
        )}
      </div>
      <div className="w-16 text-right text-mist">{fmtInt(l.volume)}</div>
      {!compact && <div className="w-10 text-right text-mute">{l.n_orders}</div>}
    </div>
  );
}
