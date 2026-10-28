import { Link, NavLink, Outlet } from "react-router-dom";
import { useLab } from "../state";

const LINKS = [
  ["lab", "LAB"],
  ["theory", "THY"],
  ["universe", "UNI"],
  ["river", "RIV"],
  ["matrix", "MAT"],
  ["cascade", "CAS"],
  ["heatmap", "MAP"],
  ["data", "DAT"],
  ["calibrate", "MLE"],
  ["ogata", "OGA"],
  ["compare", "CMP"],
  ["residuals", "GOF"],
  ["endo", "END"],
  ["flow", "NOF"],
  ["impact", "IMP"],
  ["liquidity", "LIQ"],
  ["regimes", "REG"],
  ["montecarlo", "MC"],
  ["experiments", "EXP"],
  ["sensitivity", "αβ"],
  ["notebook", "NB"],
];

export default function Shell() {
  const { lab } = useLab();
  return (
    <div className="shell">
      <aside className="rail">
        <Link to="/" className="mark">
          MEDL
        </Link>
        {LINKS.map(([to, lab_]) => (
          <NavLink
            key={to}
            to={`/${to}`}
            title={to}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            {lab_}
          </NavLink>
        ))}
      </aside>
      <div className="stage">
        <div className="topbar">
          <h1>
            Market Event <span>Dynamics</span> Lab
          </h1>
          <div className="meta">
            mode {lab.mode}
            <br />
            events {lab.events.length} · T {lab.T.toFixed(2)}
            <br />
            source {lab.trueParams ? "synthetic (θ* known)" : "empirical / uploaded"}
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
