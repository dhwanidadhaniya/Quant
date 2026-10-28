import {
  acf,
  branchingMatrix,
  calibrateHawkes,
  clusteringScore,
  endogeneity,
  interarrivals,
  logLikelihood,
  simulateHawkes,
  spectralRadius,
  typeProportions,
} from "../math/hawkes";
import { cloneParams, defaultParams, type HawkesParams, type MarketEvent } from "../math/types";
import { enrichEvents } from "../math/market";

export interface ExperimentSpec {
  id: string;
  title: string;
  question: string;
  hypothesis: string;
  setup: string;
}

export const EXPERIMENTS: ExperimentSpec[] = [
  {
    id: "alpha-up",
    title: "What happens when α increases?",
    question: "Does stronger excitation increase clustering without necessarily breaking stability?",
    hypothesis: "Raising diagonal α increases branching ratios and inter-arrival dispersion while μ is held fixed.",
    setup: "Scale all α_ij by a multiplier in {0.6, 1.0, 1.4} on the baseline kernel, simulate T=80.",
  },
  {
    id: "beta-down",
    title: "What happens when β decreases?",
    question: "Does slower decay create longer memory and more persistent intensity rivers?",
    hypothesis: "Lower β lengthens half-lives, raises K_ij=α/β, and inflates endogeneity even if α is unchanged.",
    setup: "Scale all β_ij by {1.4, 1.0, 0.7}.",
  },
  {
    id: "branching-edge",
    title: "What happens as the branching ratio approaches 1?",
    question: "Does the system become cascade-dominated and statistically fragile?",
    hypothesis: "As ρ(K)→1−, event counts fan out across simulations and long quiet periods alternate with storms.",
    setup: "Scale α toward the stability boundary; report ρ and count variance.",
  },
  {
    id: "cross-dom",
    title: "What happens when cross-excitation dominates self-excitation?",
    question: "Does off-diagonal dominance produce ping-pong buy/sell flow rather than one-sided runs?",
    hypothesis: "Boosting α_ij (i≠j) relative to α_ii increases type-switching in consecutive events.",
    setup: "Compare diagonal-heavy vs off-diagonal-heavy K with similar ρ.",
  },
  {
    id: "buy-vs-sell",
    title: "What happens when buy-side excitation exceeds sell-side?",
    question: "Can asymmetric α produce net buy pressure without changing μ?",
    hypothesis: "Larger α_BUY,BUY than α_SELL,SELL raises Λ_buy/Λ_sell and skews type proportions.",
    setup: "Asymmetric diagonal α, symmetric μ.",
  },
  {
    id: "vs-poisson",
    title: "Can Hawkes reproduce clustered arrivals better than Poisson?",
    question: "On the same mean rate, does Hawkes match empirical dispersion that Poisson cannot?",
    hypothesis: "Poisson understates clustering score; Hawkes recovers it on synthetic truth and typically on real-like tapes.",
    setup: "Match mean rates; compare ID and lag-1 ACF of counts.",
  },
];

export interface ExperimentResult {
  spec: ExperimentSpec;
  notes: string[];
  series: { label: string; rho: number; endo: number; cluster: number; n: number; switchRate: number }[];
  interpretation: string;
  conclusion: string;
  limitation: string;
}

function switchRate(events: MarketEvent[]): number {
  if (events.length < 2) return 0;
  let s = 0;
  for (let i = 1; i < events.length; i++) if (events[i].type !== events[i - 1].type) s++;
  return s / (events.length - 1);
}

function summarize(label: string, p: HawkesParams, events: MarketEvent[]) {
  return {
    label,
    rho: spectralRadius(branchingMatrix(p)),
    endo: endogeneity(p),
    cluster: clusteringScore(interarrivals(events)),
    n: events.length,
    switchRate: switchRate(events),
  };
}

export function runExperiment(id: string, seed = 11): ExperimentResult {
  const spec = EXPERIMENTS.find((e) => e.id === id)!;
  const base = defaultParams();
  const T = 80;
  const notes: string[] = [];
  const series: ExperimentResult["series"] = [];

  if (id === "alpha-up") {
    for (const m of [0.6, 1, 1.4]) {
      const p = cloneParams(base);
      p.alpha = p.alpha.map((r) => r.map((x) => x * m));
      const ev = simulateHawkes(p, T, seed);
      series.push(summarize(`α × ${m}`, p, ev));
    }
    notes.push("μ and β held fixed; only excitation amplitudes move.");
    return {
      spec,
      notes,
      series,
      interpretation:
        "Larger α raises K=α/β and therefore ρ and endogenous share. Clustering (inter-arrival dispersion) typically rises because intensity spends more time in excited states.",
      conclusion:
        "α is not 'volume'. It is the jump size of intensity. Turning it up makes the tape more self-referential until ρ(K) approaches 1.",
      limitation: "Exponential kernels cannot distinguish short HFT aftershocks from slow inventory loops.",
    };
  }

  if (id === "beta-down") {
    for (const m of [1.4, 1, 0.7]) {
      const p = cloneParams(base);
      p.beta = p.beta.map((r) => r.map((x) => x * m));
      const ev = simulateHawkes(p, T, seed);
      series.push(summarize(`β × ${m}`, p, ev));
    }
    notes.push("Smaller β ⇒ longer half-life ln2/β and larger branching masses α/β.");
    return {
      spec,
      notes,
      series,
      interpretation:
        "Decay is memory. Slowing decay (β↓) lets yesterday's event keep lighting today's intensity. Endogeneity can rise even if traders are no 'more aggressive' in α.",
      conclusion: "β is a timescale parameter. Interpreting α without β is a category error.",
      limitation: "A single exponential β cannot be a sum of fast and slow memories.",
    };
  }

  if (id === "branching-edge") {
    for (const m of [0.7, 0.9, 1.05, 1.18]) {
      const p = cloneParams(base);
      p.alpha = p.alpha.map((r) => r.map((x) => x * m));
      const ev = simulateHawkes(p, T, seed);
      series.push(summarize(`scale ${m}`, p, ev));
    }
    notes.push("The last settings may sit near or beyond ρ=1; counts then become unreliable as a stationary statistic.");
    return {
      spec,
      notes,
      series,
      interpretation:
        "Near criticality, a typical event almost replaces itself in expectation. Cascades get long; Monte Carlo variance of N(T) explodes. Crossing 1 is not 'more trading' — it is model breakdown.",
      conclusion:
        "Subcriticality is an empirical question after calibration. If ρ̂≥1, the exponential Hawkes story of this window is not a stationary explanation.",
      limitation: "Finite T hides supercritical explosion; a long enough run would not look like a market.",
    };
  }

  if (id === "cross-dom") {
    const diag = cloneParams(base);
    diag.alpha = diag.alpha.map((r, i) => r.map((_, j) => (i === j ? 0.5 : 0.04)));
    const cross = cloneParams(base);
    cross.alpha = cross.alpha.map((r, i) => r.map((_, j) => (i === j ? 0.08 : 0.22)));
    for (const [label, p] of [
      ["diagonal-heavy", diag],
      ["cross-heavy", cross],
    ] as const) {
      series.push(summarize(label, p, simulateHawkes(p, T, seed + label.length)));
    }
    notes.push("μ,β comparable; we reshuffle where excitation sits.");
    return {
      spec,
      notes,
      series,
      interpretation:
        "Diagonal dominance produces runs of the same type (order splitting, herding). Cross dominance produces type-switching: buy then cancel then sell — a more adversarial, liquidity-withdrawing tape.",
      conclusion: "The location of α in the matrix is economically meaningful, not a rotation of a scalar branching ratio.",
      limitation: "Switch rate is a crude proxy for 'ping-pong' and ignores marks.",
    };
  }

  if (id === "buy-vs-sell") {
    const p = cloneParams(base);
    p.mu = [0.2, 0.2, 0.2, 0.2];
    p.alpha[0][0] = 0.62;
    p.alpha[1][1] = 0.22;
    const ev = simulateHawkes(p, T, seed);
    series.push(summarize("buy-excited", p, ev));
    const pr = typeProportions(ev);
    notes.push(`Empirical share BUY=${(pr.BUY * 100).toFixed(1)}% SELL=${(pr.SELL * 100).toFixed(1)}%`);
    return {
      spec,
      notes,
      series,
      interpretation:
        "Asymmetric self-excitation tilts stationary intensities even when baselines μ_buy=μ_sell. Net order-flow pressure can be a kernel phenomenon.",
      conclusion: "Side imbalance is not automatically 'more bulls'. It can be unequal aftershock structure.",
      limitation: "Without true sides in data, BUY/SELL labels are a modelling choice.",
    };
  }

  const hawkes = simulateHawkes(base, T, seed);
  const poisMu = [0.35, 0.33, 0.4, 0.38];
  const pois: MarketEvent[] = [];
  // reuse simulate via zero alpha
  const pp = cloneParams(base);
  pp.alpha = pp.alpha.map((r) => r.map(() => 0));
  pp.mu = poisMu;
  const poisson = simulateHawkes(pp, T, seed + 3);
  series.push(summarize("Hawkes", base, hawkes));
  series.push(summarize("Poisson (α=0)", pp, poisson));
  notes.push(`Hawkes lag-1 ACF of waits ${acf(interarrivals(hawkes), 1).toFixed(3)} vs Poisson ${acf(interarrivals(poisson), 1).toFixed(3)}`);
  notes.push(`logLik Hawkes ${logLikelihood(base, hawkes, T).toFixed(1)} (true model on its own tape is not a fair contest vs Poisson on a different tape — compare clustering on each).`);
  return {
    spec,
    notes,
    series,
    interpretation:
      "Poisson waits are exponential: ID≈1. Hawkes waits are overdispersed when α>0. If a real tape looks like the Hawkes column, Poisson is the wrong null even if it matches the average rate.",
    conclusion: "Matching mean intensity is cheap. Matching clustering is the test of self-excitation.",
    limitation: "A single Poisson rate per type still allows different means; it cannot create dependence between events.",
  };
}

export function demoDataset(seed = 7, T = 60) {
  const trueParams = defaultParams();
  const events = enrichEvents(simulateHawkes(trueParams, T, seed), seed + 1);
  const fitted = calibrateHawkes(events, T, { steps: 90, sharedBeta: true, init: trueParams });
  return { trueParams, events, T, fitted: fitted.params, ll: fitted.logLik };
}
