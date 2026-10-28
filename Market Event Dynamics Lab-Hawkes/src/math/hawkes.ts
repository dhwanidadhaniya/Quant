import {
  D,
  EVENT_TYPES,
  type EventType,
  type HawkesParams,
  type MarketEvent,
  type UnivariateParams,
  mulberry32,
  typeIndex,
  zeros,
  zeros2,
} from "./types";

export function branchingMatrix(p: HawkesParams): number[][] {
  return p.alpha.map((row, i) => row.map((a, j) => a / Math.max(p.beta[i][j], 1e-12)));
}

export function spectralRadius(K: number[][]): number {
  const n = K.length;
  let v = Array.from({ length: n }, () => 1 / Math.sqrt(n));
  let rho = 0;
  for (let it = 0; it < 80; it++) {
    const w = zeros(n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) w[i] += K[i][j] * v[j];
    const norm = Math.hypot(...w) || 1e-12;
    v = w.map((x) => x / norm);
    rho = 0;
    const Kv = zeros(n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) Kv[i] += K[i][j] * v[j];
    rho = v.reduce((s, vi, i) => s + vi * Kv[i], 0);
  }
  return Math.max(0, rho);
}

export function univariateBranching(p: UnivariateParams): number {
  return p.alpha / Math.max(p.beta, 1e-12);
}

export function halfLife(beta: number): number {
  return Math.log(2) / Math.max(beta, 1e-12);
}

/** Stationary mean intensity Λ = (I − K)^{−1} μ */
export function stationaryIntensity(p: HawkesParams): number[] {
  const K = branchingMatrix(p);
  const n = K.length;
  const A = zeros2(n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) A[i][j] = (i === j ? 1 : 0) - K[i][j];
  }
  return solve(A, p.mu);
}

function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r;
    [M[i], M[piv]] = [M[piv], M[i]];
    const d = M[i][i] || 1e-12;
    for (let c = i; c <= n; c++) M[i][c] /= d;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = M[r][i];
      for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c];
    }
  }
  return M.map((row) => row[n]);
}

/**
 * Endogenous share in the branching representation:
 * total rate Λ = μ + K Λ  ⇒  endogenous = 1 − (1ᵀμ) / (1ᵀΛ) when ρ(K)<1.
 * This is statistical attribution, not causality.
 */
export function endogeneity(p: HawkesParams): number {
  const rho = spectralRadius(branchingMatrix(p));
  if (rho >= 0.999) return 0.999;
  const lam = stationaryIntensity(p);
  const exo = p.mu.reduce((a, b) => a + b, 0);
  const tot = lam.reduce((a, b) => a + b, 0);
  if (tot <= 1e-12) return 0;
  return Math.min(0.999, Math.max(0, 1 - exo / tot));
}

export function intensityAt(
  t: number,
  events: MarketEvent[],
  p: HawkesParams,
  type: EventType
): number {
  const i = typeIndex(type);
  let lam = p.mu[i];
  for (const e of events) {
    if (e.t >= t) break;
    const j = typeIndex(e.type);
    lam += p.alpha[i][j] * Math.exp(-p.beta[i][j] * (t - e.t));
  }
  return lam;
}

export function intensityVector(t: number, events: MarketEvent[], p: HawkesParams): number[] {
  return EVENT_TYPES.map((ty) => intensityAt(t, events, p, ty));
}

export function univariateIntensity(t: number, times: number[], p: UnivariateParams): number {
  let lam = p.mu;
  for (const ti of times) {
    if (ti >= t) break;
    lam += p.alpha * Math.exp(-p.beta * (t - ti));
  }
  return lam;
}

/**
 * Ogata thinning for a multivariate exponential Hawkes process.
 * Between events intensity only decays, so the current sum of intensities
 * is a valid upper bound on [t, ∞) until the next accepted event.
 */
export function simulateHawkes(
  p: HawkesParams,
  T: number,
  seed = 1,
  t0 = 0
): MarketEvent[] {
  const rng = mulberry32(seed);
  const events: MarketEvent[] = [];
  const R = zeros2(D);
  let t = t0;

  const lambda = () => {
    const lam = zeros(D);
    for (let i = 0; i < D; i++) {
      lam[i] = p.mu[i];
      for (let j = 0; j < D; j++) lam[i] += p.alpha[i][j] * R[i][j];
    }
    return lam;
  };

  while (t < T) {
    const lam = lambda();
    const bound = Math.max(lam.reduce((a, b) => a + b, 0), 1e-12);
    const wait = -Math.log(Math.max(rng(), 1e-15)) / bound;
    t += wait;
    if (t >= T) break;
    for (let i = 0; i < D; i++)
      for (let j = 0; j < D; j++) R[i][j] *= Math.exp(-p.beta[i][j] * wait);
    const lam2 = lambda();
    const sum2 = lam2.reduce((a, b) => a + b, 0);
    if (rng() * bound > sum2) continue;
    let u = rng() * sum2;
    let k = 0;
    for (; k < D; k++) {
      u -= lam2[k];
      if (u <= 0) break;
    }
    k = Math.min(k, D - 1);
    events.push({ t, type: EVENT_TYPES[k] });
    for (let i = 0; i < D; i++) R[i][k] += 1;
  }
  return events;
}

export function simulatePoisson(mu: number[], T: number, seed = 2): MarketEvent[] {
  const rng = mulberry32(seed);
  const events: MarketEvent[] = [];
  for (let k = 0; k < D; k++) {
    let t = 0;
    const rate = Math.max(mu[k], 1e-12);
    while (true) {
      t += -Math.log(Math.max(rng(), 1e-15)) / rate;
      if (t >= T) break;
      events.push({ t, type: EVENT_TYPES[k] });
    }
  }
  events.sort((a, b) => a.t - b.t);
  return events;
}

export function simulateUnivariate(p: UnivariateParams, T: number, seed = 3): number[] {
  const hp: HawkesParams = {
    mu: [p.mu, 0.0001, 0.0001, 0.0001],
    alpha: [
      [p.alpha, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    beta: [
      [p.beta, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1],
    ],
  };
  return simulateHawkes(hp, T, seed)
    .filter((e) => e.type === "BUY")
    .map((e) => e.t);
}

/** Closed-form compensator for exponential kernels. */
export function compensator(p: HawkesParams, events: MarketEvent[], T: number): number {
  let integ = 0;
  for (let i = 0; i < D; i++) {
    integ += p.mu[i] * T;
    const byType: number[][] = Array.from({ length: D }, () => []);
    for (const e of events) byType[typeIndex(e.type)].push(e.t);
    for (let j = 0; j < D; j++) {
      const ab = p.alpha[i][j] / Math.max(p.beta[i][j], 1e-12);
      for (const tk of byType[j]) integ += ab * (1 - Math.exp(-p.beta[i][j] * (T - tk)));
    }
  }
  return integ;
}

export function logLikelihood(p: HawkesParams, events: MarketEvent[], T: number): number {
  if (events.length === 0) return -compensator(p, events, T);
  const R = zeros2(D);
  let tPrev = 0;
  let ll = 0;
  for (const e of events) {
    const dt = e.t - tPrev;
    for (let i = 0; i < D; i++)
      for (let j = 0; j < D; j++) R[i][j] *= Math.exp(-p.beta[i][j] * dt);
    const i = typeIndex(e.type);
    let lam = p.mu[i];
    for (let j = 0; j < D; j++) lam += p.alpha[i][j] * R[i][j];
    ll += Math.log(Math.max(lam, 1e-15));
    for (let r = 0; r < D; r++) R[r][i] += 1;
    tPrev = e.t;
  }
  ll -= compensator(p, events, T);
  return ll;
}

export function univariateLogLik(p: UnivariateParams, times: number[], T: number): number {
  let R = 0;
  let tPrev = 0;
  let ll = 0;
  for (const t of times) {
    R *= Math.exp(-p.beta * (t - tPrev));
    const lam = p.mu + p.alpha * R;
    ll += Math.log(Math.max(lam, 1e-15));
    R += 1;
    tPrev = t;
  }
  let integ = p.mu * T;
  const ab = p.alpha / Math.max(p.beta, 1e-12);
  for (const tk of times) integ += ab * (1 - Math.exp(-p.beta * (T - tk)));
  return ll - integ;
}

export function aic(ll: number, k: number): number {
  return -2 * ll + 2 * k;
}

export function bic(ll: number, k: number, n: number): number {
  return -2 * ll + k * Math.log(Math.max(n, 2));
}

export function paramCount(kind: "poisson" | "indpois" | "univ" | "multi"): number {
  if (kind === "poisson") return 1;
  if (kind === "indpois") return D;
  if (kind === "univ") return 3;
  return D + D * D + D * D;
}

function pack(p: HawkesParams, sharedBeta: boolean): number[] {
  const x: number[] = p.mu.map((m) => Math.log(Math.max(m, 1e-8)));
  for (let i = 0; i < D; i++)
    for (let j = 0; j < D; j++) x.push(Math.log(Math.max(p.alpha[i][j], 1e-8)));
  if (sharedBeta) {
    for (let j = 0; j < D; j++) x.push(Math.log(Math.max(p.beta[0][j], 1e-8)));
  } else {
    for (let i = 0; i < D; i++)
      for (let j = 0; j < D; j++) x.push(Math.log(Math.max(p.beta[i][j], 1e-8)));
  }
  return x;
}

function unpack(x: number[], sharedBeta: boolean): HawkesParams {
  let k = 0;
  const mu = zeros(D);
  for (let i = 0; i < D; i++) mu[i] = Math.exp(x[k++]);
  const alpha = zeros2(D);
  for (let i = 0; i < D; i++)
    for (let j = 0; j < D; j++) alpha[i][j] = Math.exp(x[k++]);
  const beta = zeros2(D);
  if (sharedBeta) {
    const bj = zeros(D);
    for (let j = 0; j < D; j++) bj[j] = Math.exp(x[k++]);
    for (let i = 0; i < D; i++) for (let j = 0; j < D; j++) beta[i][j] = bj[j];
  } else {
    for (let i = 0; i < D; i++)
      for (let j = 0; j < D; j++) beta[i][j] = Math.exp(x[k++]);
  }
  return { mu, alpha, beta };
}

function nll(x: number[], events: MarketEvent[], T: number, sharedBeta: boolean): number {
  const p = unpack(x, sharedBeta);
  const ll = logLikelihood(p, events, T);
  if (!Number.isFinite(ll)) return 1e12;
  return -ll;
}

/** Adam on unconstrained log-parameters. sharedBeta keeps the search tractable. */
export function calibrateHawkes(
  events: MarketEvent[],
  T: number,
  opts?: { steps?: number; sharedBeta?: boolean; init?: HawkesParams }
): { params: HawkesParams; logLik: number; history: number[] } {
  const sharedBeta = opts?.sharedBeta ?? true;
  const steps = opts?.steps ?? 180;
  let x = pack(opts?.init ?? heuristicInit(events, T), sharedBeta);
  const m = x.map(() => 0);
  const v = x.map(() => 0);
  const lr = 0.04;
  const history: number[] = [];
  for (let s = 0; s < steps; s++) {
    const g = grad(x, events, T, sharedBeta);
    for (let i = 0; i < x.length; i++) {
      m[i] = 0.9 * m[i] + 0.1 * g[i];
      v[i] = 0.999 * v[i] + 0.001 * g[i] * g[i];
      const mh = m[i] / (1 - Math.pow(0.9, s + 1));
      const vh = v[i] / (1 - Math.pow(0.999, s + 1));
      x[i] -= (lr * mh) / (Math.sqrt(vh) + 1e-8);
      x[i] = Math.max(-8, Math.min(4, x[i]));
    }
    if (s % 8 === 0) history.push(-nll(x, events, T, sharedBeta));
  }
  const params = unpack(x, sharedBeta);
  return { params, logLik: logLikelihood(params, events, T), history };
}

export function calibrateUnivariate(
  times: number[],
  T: number,
  steps = 220
): { params: UnivariateParams; logLik: number } {
  let mu = Math.log(Math.max(times.length / Math.max(T, 1e-6) * 0.4, 0.01));
  let a = Math.log(0.4);
  let b = Math.log(1.6);
  const m = [0, 0, 0];
  const v = [0, 0, 0];
  const lr = 0.05;
  const nllU = (x: number[]) =>
    -univariateLogLik({ mu: Math.exp(x[0]), alpha: Math.exp(x[1]), beta: Math.exp(x[2]) }, times, T);
  for (let s = 0; s < steps; s++) {
    const x = [mu, a, b];
    const g = [0, 0, 0];
    const eps = 1e-4;
    const f0 = nllU(x);
    for (let i = 0; i < 3; i++) {
      const xp = [...x];
      xp[i] += eps;
      g[i] = (nllU(xp) - f0) / eps;
    }
    const p = [mu, a, b];
    for (let i = 0; i < 3; i++) {
      m[i] = 0.9 * m[i] + 0.1 * g[i];
      v[i] = 0.999 * v[i] + 0.001 * g[i] * g[i];
      p[i] -= (lr * m[i]) / (Math.sqrt(v[i]) + 1e-8);
      p[i] = Math.max(-6, Math.min(3.5, p[i]));
    }
    [mu, a, b] = p;
  }
  const params = { mu: Math.exp(mu), alpha: Math.exp(a), beta: Math.exp(b) };
  return { params, logLik: univariateLogLik(params, times, T) };
}

function heuristicInit(events: MarketEvent[], T: number): HawkesParams {
  const counts = zeros(D);
  for (const e of events) counts[typeIndex(e.type)]++;
  const mu = counts.map((c) => Math.max(0.05, (0.45 * c) / Math.max(T, 1)));
  const alpha = zeros2(D);
  const beta = zeros2(D);
  for (let i = 0; i < D; i++)
    for (let j = 0; j < D; j++) {
      alpha[i][j] = i === j ? 0.35 : 0.08;
      beta[i][j] = 1.8;
    }
  return { mu, alpha, beta };
}

function grad(x: number[], events: MarketEvent[], T: number, sharedBeta: boolean): number[] {
  const eps = 1e-4;
  const f0 = nll(x, events, T, sharedBeta);
  return x.map((_, i) => {
    const xp = [...x];
    xp[i] += eps;
    return (nll(xp, events, T, sharedBeta) - f0) / eps;
  });
}

export function timeRescaling(events: MarketEvent[], p: HawkesParams): number[] {
  const taus: number[] = [];
  const last = zeros(D);
  const R = zeros2(D);
  let tPrev = 0;
  for (const e of events) {
    const dt = e.t - tPrev;
    const i = typeIndex(e.type);
    let integ = p.mu[i] * dt;
    for (let j = 0; j < D; j++) {
      const decay = 1 - Math.exp(-p.beta[i][j] * dt);
      integ += (p.alpha[i][j] / Math.max(p.beta[i][j], 1e-12)) * R[i][j] * decay;
      R[i][j] *= Math.exp(-p.beta[i][j] * dt);
    }
    for (let r = 0; r < D; r++) {
      if (r === i) continue;
      for (let j = 0; j < D; j++) R[r][j] *= Math.exp(-p.beta[r][j] * dt);
    }
    taus.push(integ);
    last[i] = e.t;
    for (let r = 0; r < D; r++) R[r][i] += 1;
    tPrev = e.t;
  }
  return taus.filter((x) => x > 0 && Number.isFinite(x));
}

export function ksExponential(samples: number[]): { d: number; pApprox: number } {
  const n = samples.length;
  if (n < 8) return { d: 1, pApprox: 0 };
  const s = [...samples].sort((a, b) => a - b);
  let d = 0;
  for (let i = 0; i < n; i++) {
    const cdf = 1 - Math.exp(-s[i]);
    d = Math.max(d, Math.abs((i + 1) / n - cdf), Math.abs(i / n - cdf));
  }
  const lam = (Math.sqrt(n) + 0.12 + 0.11 / Math.sqrt(n)) * d;
  const p = Math.max(0, Math.min(1, 2 * Math.exp(-2 * lam * lam)));
  return { d, pApprox: p };
}

export function acf(xs: number[], lag: number): number {
  if (xs.length < lag + 8) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) den += (xs[i] - m) ** 2;
  for (let i = 0; i < xs.length - lag; i++) num += (xs[i] - m) * (xs[i + lag] - m);
  return num / Math.max(den, 1e-12);
}

export function interarrivals(events: MarketEvent[]): number[] {
  const d: number[] = [];
  for (let i = 1; i < events.length; i++) d.push(events[i].t - events[i - 1].t);
  return d;
}

export function clusteringScore(dts: number[]): number {
  if (dts.length < 10) return 0;
  const m = dts.reduce((a, b) => a + b, 0) / dts.length;
  const v = dts.reduce((s, x) => s + (x - m) ** 2, 0) / dts.length;
  return v / Math.max(m * m, 1e-12);
}

export function typeProportions(events: MarketEvent[]): Record<EventType, number> {
  const c = Object.fromEntries(EVENT_TYPES.map((t) => [t, 0])) as Record<EventType, number>;
  for (const e of events) c[e.type]++;
  const n = Math.max(events.length, 1);
  for (const t of EVENT_TYPES) c[t] /= n;
  return c;
}

export function quantile(xs: number[], q: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))));
  return s[i];
}

export function mean(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function intensitySeries(
  events: MarketEvent[],
  p: HawkesParams,
  T: number,
  steps = 240
): { t: number; buy: number; sell: number; cxl: number; total: number }[] {
  const out = [];
  for (let k = 0; k <= steps; k++) {
    const t = (k / steps) * T;
    const buy = intensityAt(t, events, p, "BUY");
    const sell = intensityAt(t, events, p, "SELL");
    const cxl = intensityAt(t, events, p, "B_CXL") + intensityAt(t, events, p, "S_CXL");
    out.push({ t, buy, sell, cxl, total: buy + sell + cxl });
  }
  return out;
}

export function heatmap(
  events: MarketEvent[],
  T: number,
  bins = 64
): Record<EventType, number[]> {
  const h = Object.fromEntries(EVENT_TYPES.map((t) => [t, zeros(bins)])) as Record<
    EventType,
    number[]
  >;
  const w = T / bins;
  for (const e of events) {
    const b = Math.min(bins - 1, Math.max(0, Math.floor(e.t / w)));
    h[e.type][b]++;
  }
  return h;
}

export function attachParents(events: MarketEvent[], p: HawkesParams): MarketEvent[] {
  return events.map((e, idx) => {
    const i = typeIndex(e.type);
    let best = -1;
    let bestW = 0;
    const mu = p.mu[i];
    let exo = mu;
    let endo = 0;
    for (let k = 0; k < idx; k++) {
      const j = typeIndex(events[k].type);
      const w = p.alpha[i][j] * Math.exp(-p.beta[i][j] * (e.t - events[k].t));
      endo += w;
      if (w > bestW) {
        bestW = w;
        best = k;
      }
    }
    const tot = exo + endo;
    const parent = tot > 0 && bestW / tot > 0.15 && best >= 0 ? best : undefined;
    return { ...e, parent, excitation: bestW };
  });
}
