import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type { ExperimentBundle, ExperimentListItem, Falsification, SessionDetail, SystemInfo } from "./types";

type ResearchState = {
  system: SystemInfo | null;
  experiments: ExperimentListItem[];
  bundle: ExperimentBundle | null;
  session: SessionDetail | null;
  falsification: Falsification | null;
  round: number;
  playing: boolean;
  speed: number;
  busy: string | null;
  error: string | null;
  railOpen: boolean;
  intelOpen: boolean;
  paletteOpen: boolean;
  focusAgent: string | null;
  setFocusAgent: (id: string | null) => void;
  setPaletteOpen: (open: boolean) => void;
  setRailOpen: (open: boolean) => void;
  setIntelOpen: (open: boolean) => void;
  setRound: (round: number) => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  refresh: () => Promise<ExperimentListItem[]>;
  openExperiment: (id: string) => Promise<void>;
  openSession: (id: string) => Promise<void>;
  runExperiment: (config: Record<string, unknown>) => Promise<void>;
  runFalsification: () => Promise<void>;
};

const Research = createContext<ResearchState | null>(null);

export function ResearchProvider({ children }: { children: React.ReactNode }) {
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [experiments, setExperiments] = useState<ExperimentListItem[]>([]);
  const [bundle, setBundle] = useState<ExperimentBundle | null>(null);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [falsification, setFalsification] = useState<Falsification | null>(null);
  const [round, setRound] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(true);
  const [intelOpen, setIntelOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [focusAgent, setFocusAgent] = useState<string | null>(null);

  async function refresh() {
    const [sys, list] = await Promise.all([api.system(), api.experiments()]);
    setSystem(sys);
    setExperiments(list.experiments);
    return list.experiments;
  }

  async function openExperiment(id: string) {
    setBusy("Loading experiment");
    setError(null);
    try {
      const next = await api.experiment(id);
      setBundle(next);
      const fals = await api.falsification(id);
      setFalsification(fals.cells?.length ? fals : null);
      const preferred = next.sessions.find((item) => item.split === "test") ?? next.sessions[0];
      if (preferred) await openSession(preferred.id, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load experiment");
    } finally {
      setBusy(null);
    }
  }

  async function openSession(id: string, toggleBusy = true) {
    if (toggleBusy) setBusy("Loading session");
    try {
      const detail = await api.session(id);
      setSession(detail);
      setRound(0);
      setPlaying(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      if (toggleBusy) setBusy(null);
    }
  }

  async function runExperiment(config: Record<string, unknown>) {
    setBusy("Running controlled sessions");
    setError(null);
    try {
      const next = await api.create(config);
      setBundle(next);
      setFalsification(null);
      await refresh();
      const preferred = next.sessions.find((item) => item.split === "test") ?? next.sessions[0];
      if (preferred) await openSession(preferred.id, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Experiment failed");
    } finally {
      setBusy(null);
    }
  }

  async function runFalsification() {
    if (!bundle) return;
    setBusy("Running frozen-rule falsification");
    setError(null);
    try {
      const payload = await api.falsify(bundle.id);
      setFalsification(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falsification failed");
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    refresh()
      .then((list) => {
        if (list[0]) return openExperiment(list[0].id);
        return undefined;
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Backend unavailable"));
    // Load the newest stored experiment once on entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!playing || !session) return;
    const delay = Math.max(80, 700 / speed);
    const timer = window.setTimeout(() => {
      setRound((current) => {
        if (current >= session.rounds.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [playing, round, session, speed]);

  const value = useMemo(
    () => ({
      system,
      experiments,
      bundle,
      session,
      falsification,
      round,
      playing,
      speed,
      busy,
      error,
      railOpen,
      intelOpen,
      paletteOpen,
      focusAgent,
      setFocusAgent,
      setPaletteOpen,
      setRailOpen,
      setIntelOpen,
      setRound,
      setPlaying,
      setSpeed,
      refresh,
      openExperiment,
      openSession,
      runExperiment,
      runFalsification,
    }),
    [system, experiments, bundle, session, falsification, round, playing, speed, busy, error, railOpen, intelOpen, paletteOpen, focusAgent],
  );

  return <Research.Provider value={value}>{children}</Research.Provider>;
}

export function useResearch() {
  const ctx = useContext(Research);
  if (!ctx) throw new Error("Research context missing");
  return ctx;
}
