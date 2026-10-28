import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type Mode = { research: boolean; learn: boolean };
const Ctx = createContext<{
  mode: Mode;
  setMode: (m: Partial<Mode>) => void;
  selected: string | null;
  setSelected: (id: string | null) => void;
} | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, set] = useState<Mode>({ research: true, learn: false });
  const [selected, setSelected] = useState<string | null>(null);
  const v = useMemo(
    () => ({
      mode,
      setMode: (m: Partial<Mode>) => set((s) => ({ ...s, ...m })),
      selected,
      setSelected,
    }),
    [mode, selected]
  );
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useMode() {
  const c = useContext(Ctx);
  if (!c) throw new Error("mode");
  return c;
}
