import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Shell from "./components/Shell";
import { ModeProvider } from "./state";
import Pulse from "./views/Pulse";
import GmpReality from "./views/GmpReality";
import WhenGmp from "./views/WhenGmp";
import Constellation from "./views/Constellation";
import SectorView from "./views/SectorView";
import QuantLab from "./views/QuantLab";
import BacktestLab from "./views/BacktestLab";
import Universe from "./views/Universe";
import IpoTerminal from "./views/IpoTerminal";

export default function App() {
  return (
    <ModeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/" element={<Pulse />} />
            <Route path="/gmp" element={<GmpReality />} />
            <Route path="/when" element={<WhenGmp />} />
            <Route path="/constellation" element={<Constellation />} />
            <Route path="/sector" element={<SectorView />} />
            <Route path="/quant" element={<QuantLab />} />
            <Route path="/backtest" element={<BacktestLab />} />
            <Route path="/universe" element={<Universe />} />
            <Route path="/ipo/:id" element={<IpoTerminal />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ModeProvider>
  );
}
