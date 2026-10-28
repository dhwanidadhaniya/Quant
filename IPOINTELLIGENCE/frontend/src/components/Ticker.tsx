import { pct, x } from "../lib/format";
import type { Ipo } from "../lib/api";

export default function Ticker({ items }: { items: Ipo[] }) {
  const row = items.slice(0, 40);
  const tape = [...row, ...row];
  return (
    <div className="h-7 shrink-0 overflow-hidden border-b border-line bg-void">
      <div className="tape flex whitespace-nowrap h-7 items-center w-max">
        {tape.map((i, idx) => (
          <span key={idx} className="px-3 tabular text-[11px] border-r border-mutedp">
            <span className="text-readout">{i.ticker}</span>
            <span className={(i.gmp_pct ?? 0) >= 0 ? "text-quant ml-2" : "text-risk ml-2"}>GMP {pct(i.gmp_pct)}</span>
            <span className="text-info ml-2">QIB {x(i.sub_qib)}</span>
            <span className="text-mute ml-2">NII {x(i.sub_nii)}</span>
            <span className={(i.listing_return ?? 0) >= 0 ? "text-quant ml-2" : "text-risk ml-2"}>LIST {pct(i.listing_return)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
