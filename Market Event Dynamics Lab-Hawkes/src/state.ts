import { createContext, useContext } from "react";
import type { HawkesParams, MarketEvent } from "./math/types";
import { defaultParams } from "./math/types";

export type SourceMode = "synthetic" | "upload";

export interface LabState {
  mode: SourceMode;
  events: MarketEvent[];
  T: number;
  params: HawkesParams;
  trueParams: HawkesParams | null;
  seed: number;
  ingestNotes: string[];
}

export const initialLab = (): LabState => ({
  mode: "synthetic",
  events: [],
  T: 120,
  params: defaultParams(),
  trueParams: defaultParams(),
  seed: 7,
  ingestNotes: ["Synthetic Hawkes stream — true parameters known."],
});

export const LabContext = createContext<{
  lab: LabState;
  setLab: (l: LabState | ((p: LabState) => LabState)) => void;
}>({ lab: initialLab(), setLab: () => {} });

export function useLab() {
  return useContext(LabContext);
}
