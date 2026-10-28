export type Side = "bid" | "ask";

export interface Level {
  price: number;
  price_ticks: number;
  volume: number;
  n_orders: number;
  cumulative: number;
  notional: number;
  side?: Side;
  arrival_rate?: number;
  cancel_rate?: number;
  exec_rate?: number;
  est_wait?: number;
  est_fill_p?: number;
  has_user?: boolean;
  orders?: { order_id: string; qty: number; is_user: boolean; status?: string }[];
}

export interface BookSnap {
  best_bid: number | null;
  best_ask: number | null;
  best_bid_queue: number;
  best_ask_queue: number;
  mid: number | null;
  spread: number | null;
  imbalance: number | null;
  bid_depth: number;
  ask_depth: number;
  bids: Level[];
  asks: Level[];
}

export interface FillState {
  horizons: { t: number; survival: number; fill: number }[];
  curve: { t: number; h: number; S: number; F: number; f: number }[];
  E_T_fill: number;
  P_fill_60: number;
  delta: number;
  kappa: number;
  why?: {
    previous: number;
    current: number;
    drivers: { name: string; contrib: number; raw_delta: number }[];
  };
  inputs?: Record<string, number | string>;
}

export interface MarketState {
  source: string;
  symbol: string;
  t: number;
  book: BookSnap;
  levels: Level[];
  rates: { limit: number; market: number; cancel: number; execution: number };
  user: any;
  fill: FillState;
  regime: any;
  congestion: any;
  pressure: any;
  events: any[];
  resilience: any;
  params: Record<string, number>;
  hawkes: number;
  metrics: Record<string, number>;
  ticker: { symbol: string; mid: number; spread: number; depth: number; imbalance: number; active: boolean; source: string }[];
  active: string;
}

export const NAV = [
  { to: "/", n: "01", label: "MARKET", sub: "Overview" },
  { to: "/book", n: "02", label: "ORDER BOOK", sub: "Living queues" },
  { to: "/queue", n: "03", label: "QUEUE LAB", sub: "λ μ ρ L W" },
  { to: "/probability", n: "04", label: "PROBABILITY", sub: "S(t) h(t)" },
  { to: "/execution", n: "05", label: "EXECUTION", sub: "Fill & wait" },
  { to: "/liquidity", n: "06", label: "LIQUIDITY", sub: "Impact" },
  { to: "/flow", n: "07", label: "ORDER FLOW", sub: "Arrivals" },
  { to: "/stochastic", n: "08", label: "STOCHASTIC", sub: "Markov · MC" },
  { to: "/regimes", n: "09", label: "REGIMES", sub: "States" },
  { to: "/scenario", n: "10", label: "SCENARIO", sub: "Shocks" },
  { to: "/notebook", n: "11", label: "NOTEBOOK", sub: "Theory" },
];
