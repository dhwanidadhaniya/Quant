import { Link } from "react-router-dom";
import { LandingField } from "../components/viz";

const STEPS = [
  { n: "01", t: "Market Events", d: "The tape is a point process: typed timestamps, not candles. Buys, sells, cancellations are the atoms." },
  { n: "02", t: "Event Clusters", d: "Arrivals bunch. Quiet stretches break into storms. Poisson cannot explain that as structure — only as luck." },
  { n: "03", t: "Self-Excitation", d: "An event raises the probability of more events. Order splitting, herding, and liquidity fade all look like aftershocks." },
  { n: "04", t: "Hawkes Process", d: "λ(t) = μ + Σ φ(t − tᵢ). Intensity has a baseline and a memory. Exponential kernels make that memory a half-life." },
  { n: "05", t: "Calibration", d: "Maximum likelihood on the observed stream. Parameters are not decorations; they are estimated objects with error." },
  { n: "06", t: "Simulation", d: "Ogata thinning draws synthetic markets from the fitted law. If clustering does not reappear, the model failed." },
  { n: "07", t: "Market Dynamics", d: "Compare real vs simulated order flow, endogeneity, regimes, and conditional price response — without claiming causality." },
];

export default function Landing() {
  return (
    <div className="landing">
      <section className="hero">
        <LandingField />
        <div className="hero-copy">
          <div className="kicker">Market Event Dynamics Lab · Hawkes · Microstructure</div>
          <h1>
            MARKETS DON'T MOVE.
            <br />
            THEY <em>CASCADE.</em>
          </h1>
          <p className="sub">
            An empirical laboratory for modeling the self-exciting dynamics of financial markets.
          </p>
          <div className="cta-row">
            <Link to="/lab" className="btn solid">
              Enter the laboratory
            </Link>
            <Link to="/theory" className="btn ghost">
              Read the theory first
            </Link>
          </div>
        </div>
      </section>
      <div className="scroll-path">
        {STEPS.map((s) => (
          <div className="path-step" key={s.n}>
            <div className="path-idx">{s.n}</div>
            <div>
              <h2>{s.t}</h2>
              <p>{s.d}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="question-band">
        <div className="kicker">Core research question</div>
        <h2>To what extent can the clustering and interaction of financial market events be explained by self-exciting point processes?</h2>
        <p>
          This is not a trading bot, not a Sharpe optimiser, and not a price-prediction demo. It is a market
          microstructure + stochastic process + empirical research instrument: calibrate Hawkes kernels from
          event data, simulate order flow, and ask whether the market is mostly news — or mostly itself.
        </p>
        <div className="cta-row" style={{ justifyContent: "flex-start" }}>
          <Link to="/lab" className="btn solid">
            Open the lab
          </Link>
        </div>
      </div>
    </div>
  );
}
