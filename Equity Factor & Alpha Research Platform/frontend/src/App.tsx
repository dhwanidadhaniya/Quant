import { Route, Routes } from "react-router-dom";
import Shell from "./components/layout/Shell";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Explorer from "./pages/Explorer";
import Company from "./pages/Company";
import Factors from "./pages/Factors";
import Constellation from "./pages/Constellation";
import Alpha from "./pages/Alpha";
import Portfolio from "./pages/Portfolio";
import Backtest from "./pages/Backtest";
import Risk from "./pages/Risk";
import Regimes from "./pages/Regimes";
import Sectors from "./pages/Sectors";
import Notebook from "./pages/Notebook";
import Reports from "./pages/Reports";
import Theory from "./pages/Theory";

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Landing />} />
        <Route path="/lab" element={<Dashboard />} />
        <Route path="/explorer" element={<Explorer />} />
        <Route path="/company/:ticker" element={<Company />} />
        <Route path="/factors" element={<Factors />} />
        <Route path="/constellation" element={<Constellation />} />
        <Route path="/alpha" element={<Alpha />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/backtest" element={<Backtest />} />
        <Route path="/risk" element={<Risk />} />
        <Route path="/regimes" element={<Regimes />} />
        <Route path="/sectors" element={<Sectors />} />
        <Route path="/notebook" element={<Notebook />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/theory" element={<Theory />} />
      </Route>
    </Routes>
  );
}
