export const EVENT_TYPES = ["BUY", "SELL", "B_CXL", "S_CXL"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_LABEL: Record<EventType, string> = {
  BUY: "Buy Market Order",
  SELL: "Sell Market Order",
  B_CXL: "Buy Cancellation",
  S_CXL: "Sell Cancellation",
};

export const EVENT_SHORT: Record<EventType, string> = {
  BUY: "BUY",
  SELL: "SELL",
  B_CXL: "B-CXL",
  S_CXL: "S-CXL",
};

export interface MarketEvent {
  t: number;
  type: EventType;
  price?: number;
  quantity?: number;
  side?: "buy" | "sell";
  bid?: number;
  ask?: number;
  bidSize?: number;
  askSize?: number;
  parent?: number;
  excitation?: number;
}

export interface HawkesParams {
  mu: number[];
  alpha: number[][];
  beta: number[][];
}

export interface UnivariateParams {
  mu: number;
  alpha: number;
  beta: number;
}

export const D = EVENT_TYPES.length;

export function zeros(n: number): number[] {
  return Array.from({ length: n }, () => 0);
}

export function zeros2(n: number): number[][] {
  return Array.from({ length: n }, () => zeros(n));
}

export function cloneParams(p: HawkesParams): HawkesParams {
  return {
    mu: [...p.mu],
    alpha: p.alpha.map((r) => [...r]),
    beta: p.beta.map((r) => [...r]),
  };
}

export function defaultParams(): HawkesParams {
  const mu = [0.18, 0.17, 0.22, 0.2];
  const alpha = [
    [0.42, 0.08, 0.12, 0.04],
    [0.09, 0.4, 0.05, 0.11],
    [0.18, 0.06, 0.35, 0.07],
    [0.05, 0.16, 0.08, 0.33],
  ];
  const beta = [
    [1.8, 2.2, 2.0, 2.4],
    [2.1, 1.7, 2.3, 1.9],
    [2.0, 2.4, 1.6, 2.2],
    [2.3, 1.9, 2.1, 1.65],
  ];
  return { mu, alpha, beta };
}

export function poissonParams(): HawkesParams {
  return {
    mu: [0.35, 0.33, 0.4, 0.38],
    alpha: zeros2(D),
    beta: Array.from({ length: D }, () => Array.from({ length: D }, () => 1)),
  };
}

export function typeIndex(t: EventType): number {
  return EVENT_TYPES.indexOf(t);
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
