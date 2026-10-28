import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "./components/layout/Shell";
import { Overview } from "./pages/Overview";
import { OrderBookPage } from "./pages/OrderBookPage";
import { QueueLab } from "./pages/QueueLab";
import { ProbabilityLab } from "./pages/ProbabilityLab";
import { ExecutionLab } from "./pages/ExecutionLab";
import { LiquidityLab } from "./pages/LiquidityLab";
import { OrderFlow } from "./pages/OrderFlow";
import { StochasticLab } from "./pages/StochasticLab";
import { Regimes } from "./pages/Regimes";
import { ScenarioLab } from "./pages/ScenarioLab";
import { Notebook } from "./pages/Notebook";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Overview />} />
          <Route path="book" element={<OrderBookPage />} />
          <Route path="queue" element={<QueueLab />} />
          <Route path="probability" element={<ProbabilityLab />} />
          <Route path="execution" element={<ExecutionLab />} />
          <Route path="liquidity" element={<LiquidityLab />} />
          <Route path="flow" element={<OrderFlow />} />
          <Route path="stochastic" element={<StochasticLab />} />
          <Route path="regimes" element={<Regimes />} />
          <Route path="scenario" element={<ScenarioLab />} />
          <Route path="notebook" element={<Notebook />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
