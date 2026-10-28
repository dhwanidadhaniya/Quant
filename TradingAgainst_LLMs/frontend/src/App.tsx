import { BrowserRouter } from "react-router-dom";
import { ResearchProvider } from "./context";
import { Shell } from "./shell";

export function App() {
  return (
    <BrowserRouter>
      <ResearchProvider>
        <Shell />
      </ResearchProvider>
    </BrowserRouter>
  );
}
