import { useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { attachParents, simulateHawkes } from "./math/hawkes";
import { defaultParams } from "./math/types";
import { enrichEvents } from "./math/market";
import { LabContext, initialLab, type LabState } from "./state";
import Landing from "./pages/Landing";
import Shell from "./pages/Shell";
import HomeLab from "./pages/HomeLab";
import Theory from "./pages/Theory";
import { CascadePage, HeatmapPage, MatrixPage, RiverPage, UniversePage } from "./pages/VizPages";
import { CalibratePage, ComparePage, DataPage, EndoPage, OgataPage } from "./pages/ResearchPages";
import {
  ExperimentsPage,
  FlowPage,
  ImpactPage,
  LiquidityPage,
  MonteCarloPage,
  NotebookPage,
  RegimesPage,
  ResidualsPage,
  SensitivityPage,
} from "./pages/MicroPages";

function Provider({ children }: { children: import("react").ReactNode }) {
  const boot = useMemo(() => {
    const s = initialLab();
    const ev = enrichEvents(simulateHawkes(defaultParams(), s.T, s.seed), s.seed);
    return { ...s, events: attachParents(ev, s.params) };
  }, []);
  const [lab, setLab] = useState<LabState>(boot);
  return <LabContext.Provider value={{ lab, setLab }}>{children}</LabContext.Provider>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Provider>
        <div className="grain" />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<Shell />}>
            <Route path="/lab" element={<HomeLab />} />
            <Route path="/theory" element={<Theory />} />
            <Route path="/universe" element={<UniversePage />} />
            <Route path="/river" element={<RiverPage />} />
            <Route path="/matrix" element={<MatrixPage />} />
            <Route path="/cascade" element={<CascadePage />} />
            <Route path="/heatmap" element={<HeatmapPage />} />
            <Route path="/data" element={<DataPage />} />
            <Route path="/calibrate" element={<CalibratePage />} />
            <Route path="/ogata" element={<OgataPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/residuals" element={<ResidualsPage />} />
            <Route path="/endo" element={<EndoPage />} />
            <Route path="/flow" element={<FlowPage />} />
            <Route path="/impact" element={<ImpactPage />} />
            <Route path="/liquidity" element={<LiquidityPage />} />
            <Route path="/regimes" element={<RegimesPage />} />
            <Route path="/montecarlo" element={<MonteCarloPage />} />
            <Route path="/experiments" element={<ExperimentsPage />} />
            <Route path="/sensitivity" element={<SensitivityPage />} />
            <Route path="/notebook" element={<NotebookPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Provider>
    </BrowserRouter>
  );
}
