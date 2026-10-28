import { EVENT_TYPES, type EventType, type MarketEvent, mulberry32 } from "./types";
import { mean } from "./hawkes";

export interface BookSnapshot {
  t: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  mid: number;
  spread: number;
  depth: number;
  imbalance: number;
}

export function enrichEvents(events: MarketEvent[], seed = 9): MarketEvent[] {
  const rng = mulberry32(seed);
  let mid = 100;
  let spread = 0.02;
  let bidSize = 200;
  let askSize = 200;
  return events.map((e) => {
    const shock =
      e.type === "BUY" ? 0.004 + rng() * 0.006 : e.type === "SELL" ? -(0.004 + rng() * 0.006) : (rng() - 0.5) * 0.002;
    mid += shock;
    if (e.type === "B_CXL") bidSize = Math.max(20, bidSize * (0.85 + rng() * 0.1));
    else if (e.type === "S_CXL") askSize = Math.max(20, askSize * (0.85 + rng() * 0.1));
    else if (e.type === "BUY") askSize = Math.max(20, askSize - 8 - rng() * 12);
    else bidSize = Math.max(20, bidSize - 8 - rng() * 12);
    bidSize += (200 - bidSize) * 0.04;
    askSize += (200 - askSize) * 0.04;
    spread = Math.max(0.01, 0.016 + 0.04 * (1 / (bidSize + askSize)) * 80 + rng() * 0.004);
    const bid = mid - spread / 2;
    const ask = mid + spread / 2;
    return {
      ...e,
      price: e.type === "BUY" ? ask : e.type === "SELL" ? bid : mid,
      quantity: Math.round(10 + rng() * 90),
      side: e.type === "BUY" || e.type === "B_CXL" ? "buy" : "sell",
      bid,
      ask,
      bidSize,
      askSize,
    };
  });
}

export function snapshots(events: MarketEvent[]): BookSnapshot[] {
  return events
    .filter((e) => e.bid != null && e.ask != null)
    .map((e) => {
      const bid = e.bid!;
      const ask = e.ask!;
      const bidSize = e.bidSize ?? 100;
      const askSize = e.askSize ?? 100;
      const mid = (bid + ask) / 2;
      return {
        t: e.t,
        bid,
        ask,
        bidSize,
        askSize,
        mid,
        spread: ask - bid,
        depth: bidSize + askSize,
        imbalance: (bidSize - askSize) / Math.max(bidSize + askSize, 1e-6),
      };
    });
}

export function realizedVol(snaps: BookSnapshot[], dt = 1): number {
  if (snaps.length < 8) return 0;
  const rets: number[] = [];
  let last = snaps[0];
  for (const s of snaps) {
    if (s.t - last.t >= dt) {
      rets.push(Math.log(s.mid / last.mid));
      last = s;
    }
  }
  if (rets.length < 2) return 0;
  const m = mean(rets);
  return Math.sqrt(rets.reduce((a, r) => a + (r - m) ** 2, 0) / (rets.length - 1));
}

export function conditionalPriceResponse(events: MarketEvent[], horizon = 0.4) {
  const out: Record<EventType, number> = {
    BUY: 0,
    SELL: 0,
    B_CXL: 0,
    S_CXL: 0,
  };
  const n: Record<EventType, number> = { BUY: 0, SELL: 0, B_CXL: 0, S_CXL: 0 };
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.price == null) continue;
    let later = e;
    for (let k = i + 1; k < events.length && events[k].t <= e.t + horizon; k++) later = events[k];
    if (later.price == null) continue;
    out[e.type] += later.price - e.price;
    n[e.type]++;
  }
  for (const t of EVENT_TYPES) out[t] = n[t] ? out[t] / n[t] : 0;
  return { mean: out, n };
}

/**
 * Liquidity Stress Index.
 * Components are z-scored within the sample, then combined with documented weights.
 * Weights are a modelling choice, not a market fact: they encode the assumption that
 * spread widening, cancellation bursts, volatility, and one-sided flow jointly
 * describe a stressed book. Equal-ish weights avoid pretending we know the "true" mix.
 */
export const LSI_WEIGHTS = {
  spread: 0.3,
  cancellation: 0.25,
  volatility: 0.25,
  imbalance: 0.2,
};

export function zscore(xs: number[]): number[] {
  const m = mean(xs);
  const sd = Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) || 1;
  return xs.map((x) => (x - m) / sd);
}

export function liquidityStress(events: MarketEvent[], T: number, bins = 48) {
  const w = T / bins;
  const spread: number[] = [];
  const cxl: number[] = [];
  const vol: number[] = [];
  const imb: number[] = [];
  const snaps = snapshots(events);
  for (let b = 0; b < bins; b++) {
    const t0 = b * w;
    const t1 = t0 + w;
    const slice = events.filter((e) => e.t >= t0 && e.t < t1);
    const ss = snaps.filter((s) => s.t >= t0 && s.t < t1);
    spread.push(ss.length ? mean(ss.map((s) => s.spread)) : 0);
    cxl.push(slice.filter((e) => e.type === "B_CXL" || e.type === "S_CXL").length / w);
    vol.push(ss.length > 2 ? Math.abs(ss[ss.length - 1].mid - ss[0].mid) : 0);
    imb.push(ss.length ? Math.abs(mean(ss.map((s) => s.imbalance))) : 0);
  }
  const zs = zscore(spread);
  const zc = zscore(cxl);
  const zv = zscore(vol);
  const zi = zscore(imb);
  const lsi = zs.map(
    (_, i) =>
      LSI_WEIGHTS.spread * zs[i] +
      LSI_WEIGHTS.cancellation * zc[i] +
      LSI_WEIGHTS.volatility * zv[i] +
      LSI_WEIGHTS.imbalance * zi[i]
  );
  return { t: lsi.map((_, i) => (i + 0.5) * w), spread, cxl, vol, imb, lsi };
}

export type Regime = "QUIET" | "ACTIVE" | "STRESSED" | "ONE_SIDED";

export function classifyRegimes(events: MarketEvent[], T: number, bins = 24): { t0: number; t1: number; regime: Regime }[] {
  const ls = liquidityStress(events, T, bins);
  const rates = ls.t.map((_, i) => {
    const w = T / bins;
    const slice = events.filter((e) => e.t >= i * w && e.t < (i + 1) * w);
    return slice.length / w;
  });
  const meanRate = mean(rates);
  const meanLsi = mean(ls.lsi);
  return ls.t.map((t, i) => {
    const w = T / bins;
    let regime: Regime = "QUIET";
    if (ls.imb[i] > 0.35 && rates[i] > meanRate * 0.8) regime = "ONE_SIDED";
    else if (ls.lsi[i] > meanLsi + 0.6 && ls.vol[i] > mean(ls.vol)) regime = "STRESSED";
    else if (rates[i] > meanRate * 1.15) regime = "ACTIVE";
    return { t0: i * w, t1: (i + 1) * w, regime };
  });
}

export function netOrderFlow(buy: number, sell: number): number {
  return buy - sell;
}
