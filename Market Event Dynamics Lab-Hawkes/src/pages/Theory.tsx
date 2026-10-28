import { Formula, GlossaryGrid, Why } from "../components/ui";

export default function Theory() {
  return (
    <div className="stack">
      <p className="lede">
        Every object in this laboratory is a claim about markets. Read the claim before the chart.
      </p>
      <div className="tile">
        <h3>UNIVARIATE HAWKES</h3>
        <p className="lede" style={{ marginBottom: 8 }}>
          Intensity is the instantaneous expected rate at which another event occurs, conditional on
          the history of previous events.
        </p>
        <Formula>λ(t) = μ + Σᵢ φ(t − tᵢ)</Formula>
        <p style={{ color: "var(--blush)", lineHeight: 1.65 }}>
          μ is baseline intensity — exogenous arrivals the model does not explain with prior events.
          φ is the kernel — how much a past event still contributes.
        </p>
        <Formula>φ(t) = α exp(−β t), t &gt; 0</Formula>
        <p style={{ color: "var(--blush)", lineHeight: 1.65 }}>
          α tells us how strongly an event affects future event activity. β determines how quickly
          that influence disappears. Half-life = ln 2 / β.
        </p>
        <Why>
          If α = 0 the model collapses to Poisson: no clustering beyond chance. If β is huge,
          memory dies before the next event — again Poisson-like. Self-excitation is a joint
          statement about amplitude and duration.
        </Why>
      </div>
      <div className="tile">
        <h3>MULTIVARIATE HAWKES</h3>
        <p className="lede" style={{ marginBottom: 8 }}>
          Event types interact. i is the receiving type, j the triggering type.
        </p>
        <Formula>
          {"λᵢ(t) = μᵢ + Σⱼ Σ_{tₖʲ < t} αᵢⱼ exp[−βᵢⱼ (t − tₖʲ)]"}
        </Formula>
        <ul style={{ color: "var(--blush)", lineHeight: 1.7, paddingLeft: 18 }}>
          <li>μᵢ — baseline intensity of event i</li>
          <li>αᵢⱼ — how strongly event j excites event i</li>
          <li>βᵢⱼ — how quickly that influence decays</li>
        </ul>
        <Why>
          Buy trades increasing subsequent buy trades is diagonal self-excitation. Buys raising sell
          intensity is cross-excitation. Asymmetry of those two numbers is a microstructure finding,
          not a UI flourish.
        </Why>
      </div>
      <div className="tile">
        <h3>ASSUMPTIONS (THE ONES THAT CAN KILL THE RESULT)</h3>
        <p style={{ color: "var(--blush)", lineHeight: 1.7 }}>
          Linear intensity; exponential memory; no marks in the kernel (size does not change φ);
          no diurnal baseline; simple point process (no exact simultaneous events); stationarity if
          we interpret ρ(K) as an equilibrium branching ratio. Violate any of these and θ̂ remains
          a number — just not the number you think it is.
        </p>
      </div>
      <h2 className="display" style={{ fontSize: 42, marginTop: 12 }}>
        Lexicon
      </h2>
      <GlossaryGrid />
    </div>
  );
}
