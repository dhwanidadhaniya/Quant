import { create } from "zustand";
import type { MarketState } from "./types";
import { api } from "./api";

interface Store {
  state: MarketState | null;
  connected: boolean;
  explain: boolean;
  formulaOpen: boolean;
  depthMode: "volume" | "orders" | "notional";
  setState: (s: MarketState) => void;
  setConnected: (v: boolean) => void;
  toggleExplain: () => void;
  toggleFormula: () => void;
  setDepthMode: (m: Store["depthMode"]) => void;
}

export const useMarket = create<Store>((set) => ({
  state: null,
  connected: false,
  explain: true,
  formulaOpen: false,
  depthMode: "volume",
  setState: (state) => set({ state }),
  setConnected: (connected) => set({ connected }),
  toggleExplain: () => set((s) => ({ explain: !s.explain })),
  toggleFormula: () => set((s) => ({ formulaOpen: !s.formulaOpen })),
  setDepthMode: (depthMode) => set({ depthMode }),
}));

export function connectMarket() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  let stopped = false;
  let ws: WebSocket | undefined;
  let timer: number | undefined;

  const ingest = (data: MarketState) => {
    useMarket.getState().setState(data);
    useMarket.getState().setConnected(true);
  };

  const poll = async () => {
    try {
      const data = (await api.state()) as MarketState;
      ingest(data);
    } catch {
      if (!stopped) useMarket.getState().setConnected(false);
    }
    if (!stopped) timer = window.setTimeout(poll, 220);
  };

  const open = () => {
    if (stopped) return;
    ws = new WebSocket(`${proto}://${location.host}/ws/market`);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg?.data) ingest(msg.data);
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => {
      if (!stopped) setTimeout(open, 2000);
    };
  };

  open();
  void poll();
  return {
    close: () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    },
  };
}
