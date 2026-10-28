import type { EventType, MarketEvent } from "../math/types";
import { EVENT_TYPES } from "../math/types";

export interface ColumnMap {
  timestamp: string;
  event_type?: string;
  price?: string;
  quantity?: string;
  side?: string;
  bid?: string;
  ask?: string;
  bid_size?: string;
  ask_size?: string;
}

export interface IngestReport {
  steps: { name: string; why: string; detail: string }[];
  events: MarketEvent[];
  dropped: number;
  T: number;
}

const TYPE_MAP: Record<string, EventType> = {
  buy: "BUY",
  buy_mo: "BUY",
  market_buy: "BUY",
  buy_market: "BUY",
  sell: "SELL",
  sell_mo: "SELL",
  market_sell: "SELL",
  sell_market: "SELL",
  b_cxl: "B_CXL",
  buy_cxl: "B_CXL",
  buy_cancel: "B_CXL",
  cancel_buy: "B_CXL",
  s_cxl: "S_CXL",
  sell_cxl: "S_CXL",
  sell_cancel: "S_CXL",
  cancel_sell: "S_CXL",
  buy_lo: "BUY",
  sell_lo: "SELL",
  limit_buy: "BUY",
  limit_sell: "SELL",
};

function parseType(raw: string, side?: string): EventType | null {
  const k = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (TYPE_MAP[k]) return TYPE_MAP[k];
  if (k.includes("cancel") && (k.includes("buy") || side === "buy")) return "B_CXL";
  if (k.includes("cancel") && (k.includes("sell") || side === "sell")) return "S_CXL";
  if (k.includes("buy")) return "BUY";
  if (k.includes("sell")) return "SELL";
  if (side === "buy") return "BUY";
  if (side === "sell") return "SELL";
  return null;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length);
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map(splitCsvLine);
  return { headers, rows };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') q = !q;
    else if (c === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function parseTime(v: string): number | null {
  const n = Number(v);
  if (Number.isFinite(n)) return n;
  const d = Date.parse(v);
  if (Number.isFinite(d)) return d / 1000;
  return null;
}

export function ingestCsv(text: string, map: ColumnMap): IngestReport {
  const steps: IngestReport["steps"] = [];
  const { headers, rows } = parseCsv(text);
  steps.push({
    name: "RAW DATA",
    why: "Event-level records are the atomic observations of a point process. Aggregated bars destroy the clustering structure Hawkes is designed to explain.",
    detail: `${rows.length} rows, columns: ${headers.join(", ")}`,
  });

  const idx = (name?: string) => (name ? headers.indexOf(name) : -1);
  const ti = idx(map.timestamp);
  const ei = idx(map.event_type);
  const pi = idx(map.price);
  const qi = idx(map.quantity);
  const si = idx(map.side);
  const bi = idx(map.bid);
  const ai = idx(map.ask);
  const bsi = idx(map.bid_size);
  const asi = idx(map.ask_size);

  let dropped = 0;
  const raw: MarketEvent[] = [];
  for (const row of rows) {
    const t = parseTime(row[ti] ?? "");
    if (t == null) {
      dropped++;
      continue;
    }
    const side = si >= 0 ? row[si]?.trim().toLowerCase() : undefined;
    const type = parseType(ei >= 0 ? row[ei] ?? "" : side ?? "", side);
    if (!type) {
      dropped++;
      continue;
    }
    raw.push({
      t,
      type,
      price: pi >= 0 ? Number(row[pi]) : undefined,
      quantity: qi >= 0 ? Number(row[qi]) : undefined,
      side: side === "buy" || side === "sell" ? side : undefined,
      bid: bi >= 0 ? Number(row[bi]) : undefined,
      ask: ai >= 0 ? Number(row[ai]) : undefined,
      bidSize: bsi >= 0 ? Number(row[bsi]) : undefined,
      askSize: asi >= 0 ? Number(row[asi]) : undefined,
    });
  }
  steps.push({
    name: "Timestamp Validation",
    why: "A point process is defined on a totally ordered time axis. Unparseable timestamps are not events; they are missing observations.",
    detail: `${raw.length} valid timestamps, ${dropped} rejected`,
  });

  raw.sort((a, b) => a.t - b.t);
  steps.push({
    name: "Sorting",
    why: "Conditional intensity λ(t | ℋ_t) is measurable with respect to the history of previous events. Estimation is only well-defined on an ordered filtration.",
    detail: "Events ordered by increasing t",
  });

  const dedup: MarketEvent[] = [];
  let dups = 0;
  for (const e of raw) {
    const prev = dedup[dedup.length - 1];
    if (prev && Math.abs(prev.t - e.t) < 1e-12 && prev.type === e.type) {
      dups++;
      continue;
    }
    dedup.push(e);
  }
  steps.push({
    name: "Duplicate Detection",
    why: "Exact duplicate (time, type) pairs usually reflect feed artifacts, not two distinct market actions. Leaving them inflates self-excitation.",
    detail: `${dups} duplicates removed`,
  });
  dropped += dups;

  const cleaned = dedup.map((e) => ({
    ...e,
    price: e.price != null && Number.isFinite(e.price) ? e.price : undefined,
    quantity: e.quantity != null && Number.isFinite(e.quantity) ? e.quantity : undefined,
  }));
  steps.push({
    name: "Missing Value Handling",
    why: "Point-process likelihood needs times and types. Price and size are used only in impact and liquidity modules; they must not silently become zeros.",
    detail: "Non-finite optional fields dropped to undefined",
  });

  steps.push({
    name: "Event Classification",
    why: "The multivariate Hawkes model is a statement about typed events. Mislabeling buy as sell reverses the estimated cross-excitation α_ij.",
    detail: EVENT_TYPES.map(
      (t) => `${t}: ${cleaned.filter((e) => e.type === t).length}`
    ).join(" · "),
  });

  steps.push({
    name: "Market Session Filtering",
    why: "Overnight gaps and auctions are different point processes. Mixing them into a continuous-time Hawkes on [0, T] confuses baseline intensity with calendar effects.",
    detail: "Continuous window retained as uploaded (user-controlled session cut)",
  });

  const t0 = cleaned[0]?.t ?? 0;
  const events = cleaned.map((e) => ({ ...e, t: e.t - t0 }));
  const T = events.length ? events[events.length - 1].t : 1;
  steps.push({
    name: "Event-Time Conversion",
    why: "Hawkes kernels live in elapsed time, not wall-clock labels. Shifting the first event to 0 makes μ a rate per unit of the uploaded clock.",
    detail: `T = ${T.toFixed(4)} after origin shift`,
  });

  steps.push({
    name: "Clean Event Stream",
    why: "Calibration, residual analysis, and simulation all consume the same ordered marked point process.",
    detail: `${events.length} events ready`,
  });

  return { steps, events, dropped, T: Math.max(T, 1e-6) };
}

export function guessMap(headers: string[]): ColumnMap {
  const find = (...cands: string[]) =>
    headers.find((h) => cands.some((c) => h.toLowerCase().includes(c))) ?? headers[0];
  return {
    timestamp: find("time", "stamp", "date"),
    event_type: headers.find((h) => /type|event/.test(h.toLowerCase())),
    price: headers.find((h) => h.toLowerCase().includes("price")),
    quantity: headers.find((h) => /qty|quantity|size|volume/.test(h.toLowerCase()) && !/bid|ask/.test(h.toLowerCase())),
    side: headers.find((h) => h.toLowerCase() === "side"),
    bid: headers.find((h) => h.toLowerCase() === "bid"),
    ask: headers.find((h) => h.toLowerCase() === "ask"),
    bid_size: headers.find((h) => /bid.*size|bid_size/.test(h.toLowerCase())),
    ask_size: headers.find((h) => /ask.*size|ask_size/.test(h.toLowerCase())),
  };
}
