import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Banner } from "../ui/Meta";

const LINKS = [
  ["/", "Welcome", "overview"],
  ["/lab", "Canvas", "overview"],
  ["/explorer", "Stocks", "stock"],
  ["/factors", "Factors", "factors"],
  ["/constellation", "Constellation", "factors"],
  ["/alpha", "Alpha", "factors"],
  ["/portfolio", "Portfolio", "portfolio"],
  ["/backtest", "Backtest", "backtest"],
  ["/risk", "Risk", "risk"],
  ["/regimes", "Regimes", "risk"],
  ["/sectors", "Sectors", "overview"],
  ["/notebook", "Notebook", "stock"],
  ["/reports", "Reports", "report"],
  ["/theory", "Theory", "stock"],
];

export default function Shell() {
  const loc = useLocation();
  const env = LINKS.find(([p]) => (p === "/" ? loc.pathname === "/" : loc.pathname.startsWith(p)))?.[2] || "overview";
  return (
    <div className={`min-h-screen env-${env}`}>
      <aside className="fixed left-0 top-0 z-20 flex h-full w-[9.5rem] flex-col border-r border-ink/10 bg-[#f7f3ea]/80 px-3 py-5 backdrop-blur-md">
        <p className="display text-[13px] leading-tight text-ink">
          Factor
          <br />
          Research Lab
        </p>
        <p className="mt-1 text-[10px] text-mute">Student book · sample data</p>
        <nav className="mt-6 flex flex-1 flex-col gap-0.5 overflow-auto pr-1">
          {LINKS.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `rounded-sm px-2 py-1 text-[12.5px] ${isActive ? "bg-ink text-ivory" : "text-mute hover:text-ink"}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="text-[10px] leading-snug text-mute">Not investment advice. Factors crowd. Premia fade.</p>
      </aside>
      <main className="ml-[9.5rem] min-h-screen px-6 py-5 md:px-10">
        <Banner />
        <div className="mt-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
