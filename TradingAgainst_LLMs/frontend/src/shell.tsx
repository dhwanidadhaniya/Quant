import { useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import {
  Activity,
  BookOpen,
  Cpu,
  Crosshair,
  Database,
  FlaskConical,
  LineChart,
  Orbit,
  PanelLeft,
  PanelRight,
  Pause,
  Play,
  Rewind,
  ScanSearch,
  Shield,
  SkipBack,
  SkipForward,
  Users,
} from "lucide-react";
import { useResearch } from "./context";
import { num } from "./format";
import { SplitMark } from "./components";
import { Overview } from "./pages/Overview";
import { LiveMarket } from "./pages/Live";
import { AgentsPage } from "./pages/Agents";
import { BookPage } from "./pages/Book";
import { ExperimentsPage } from "./pages/Experiments";
import { BiasPage } from "./pages/Bias";
import { StrategyPage } from "./pages/Strategy";
import { BacktestPage } from "./pages/Backtest";
import { RobustnessPage } from "./pages/Robustness";
import { ReplayPage } from "./pages/Replay";
import { DataPage } from "./pages/Data";
import { SystemPage } from "./pages/System";

const NAV = [
  { to: "/", label: "Overview", key: "1", icon: Orbit },
  { to: "/live", label: "Live Market", key: "2", icon: Activity },
  { to: "/agents", label: "Agents", key: "3", icon: Users },
  { to: "/book", label: "Order Book", key: "4", icon: BookOpen },
  { to: "/experiments", label: "Experiments", key: "5", icon: FlaskConical },
  { to: "/bias", label: "Bias Lab", key: "6", icon: ScanSearch },
  { to: "/strategy", label: "Strategy Lab", key: "7", icon: Crosshair },
  { to: "/backtest", label: "Backtest", key: "8", icon: LineChart },
  { to: "/robustness", label: "Robustness", key: "9", icon: Shield },
  { to: "/replay", label: "Replay", key: "0", icon: Rewind },
  { to: "/data", label: "Data", key: "D", icon: Database },
  { to: "/system", label: "System", key: "S", icon: Cpu },
];

function Ambient() {
  useEffect(() => {
    const canvas = document.getElementById("field") as HTMLCanvasElement | null;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dots = Array.from({ length: 42 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.3,
      s: Math.random() * 0.00015 + 0.00005,
    }));
    let frame = 0;
    const draw = () => {
      const w = (canvas.width = window.innerWidth);
      const h = (canvas.height = window.innerHeight);
      ctx.clearRect(0, 0, w, h);
      dots.forEach((dot) => {
        dot.y -= dot.s;
        if (dot.y < 0) dot.y = 1;
        ctx.fillStyle = "rgba(180, 200, 210, 0.35)";
        ctx.beginPath();
        ctx.arc(dot.x * w, dot.y * h, dot.r, 0, Math.PI * 2);
        ctx.fill();
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div className="ambient">
      <canvas id="field" />
      <div className="grain" />
    </div>
  );
}

export function Shell() {
  const research = useResearch();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [clock, setClock] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [shock, setShock] = useState(false);
  const round = research.session?.rounds[research.round];
  const prints = useMemo(() => {
    if (!research.session) return [];
    return research.session.rounds
      .slice(0, research.round + 1)
      .flatMap((item) => item.trades)
      .slice(-10);
  }, [research.session, research.round]);

  useEffect(() => {
    const tick = () => setClock(new Date().toISOString().slice(11, 19) + " UTC");
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!round || round.news_event === "NO_NEWS") return;
    setShock(true);
    const timer = window.setTimeout(() => setShock(false), 700);
    return () => window.clearTimeout(timer);
  }, [round?.round, round?.news_event]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        research.setPaletteOpen(!research.paletteOpen);
        return;
      }
      if (typing) return;
      const hit = NAV.find((item) => item.key.toLowerCase() === event.key.toLowerCase());
      if (hit) navigate(hit.to);
      if (event.key === " ") {
        event.preventDefault();
        research.setPlaying(!research.playing);
      }
      if (event.key === "?") setHelpOpen((open) => !open);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, research]);

  const matches = NAV.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className={`terminal ${research.intelOpen ? "intel-open" : ""} ${shock ? "news-shock" : ""}`} data-rail={research.railOpen ? "open" : "closed"} data-intel={research.intelOpen ? "open" : "closed"}>
      <Ambient />
      <header className="topbar">
        <div className="brand">
          <b>TAL</b>
          <span>LAB</span>
        </div>
        <div className="pulse" />
        <div className="hud-cluster">
          <div className="hud-item">
            <span className="micro">Experiment</span>
            <strong>{research.bundle?.name ?? "No run"}</strong>
          </div>
          <div className="hud-item">
            <span className="micro">Provider</span>
            <strong>{research.bundle ? `${research.bundle.protocol.provider} / ${research.bundle.protocol.model}` : research.system?.provider ?? "—"}</strong>
          </div>
          <div className="hud-item">
            <span className="micro">Seed</span>
            <strong>{String(research.bundle?.config.seed ?? "—")}</strong>
          </div>
          <div className="hud-item">
            <span className="micro">Frozen rule</span>
            <strong>{research.bundle?.protocol.frozen_variant ?? "—"}</strong>
          </div>
          <div className="hud-item">
            <span className="micro">Clock</span>
            <strong>{clock}</strong>
          </div>
        </div>
        <div className="top-actions">
          <button className="btn" onClick={() => setHelpOpen(true)}>?</button>
          <button className="btn" onClick={() => research.setPaletteOpen(true)}>Ctrl K</button>
          <button className="btn" onClick={() => research.setIntelOpen(!research.intelOpen)}><PanelRight size={14} /></button>
        </div>
      </header>
      <div className="workspace">
        <nav className="rail">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}>
              <item.icon />
              <span>{item.label}</span>
              <em className="k">{item.key}</em>
            </NavLink>
          ))}
          <div className="rail-foot">
            <button className="nav-btn" onClick={() => research.setRailOpen(!research.railOpen)}>
              <PanelLeft />
              <span>Collapse</span>
            </button>
          </div>
        </nav>
        <main className="canvas">
          {research.error ? <div className="error" style={{ marginBottom: 10 }}>{research.error}</div> : null}
          {research.busy ? <div className="micro" style={{ marginBottom: 10 }}>{research.busy}</div> : null}
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/live" element={<LiveMarket />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/book" element={<BookPage />} />
            <Route path="/experiments" element={<ExperimentsPage />} />
            <Route path="/bias" element={<BiasPage />} />
            <Route path="/strategy" element={<StrategyPage />} />
            <Route path="/backtest" element={<BacktestPage />} />
            <Route path="/robustness" element={<RobustnessPage />} />
            <Route path="/replay" element={<ReplayPage />} />
            <Route path="/data" element={<DataPage />} />
            <Route path="/system" element={<SystemPage />} />
          </Routes>
        </main>
        <aside className="intel">
          <div className="micro">Contextual intelligence</div>
          <div className="truth" style={{ marginTop: 12 }}>
            <div className="micro">Researcher only · ground truth</div>
            <div className="mono" style={{ fontSize: 28, marginTop: 6 }}>{num(round?.true_value, 3)}</div>
            <div className="micro" style={{ marginTop: 6 }}>Hidden value this round. Agents do not receive it.</div>
          </div>
          <div className="frost pad" style={{ marginTop: 12 }}>
            <div className="micro">Session</div>
            <div style={{ marginTop: 8 }}>{research.session ? <SplitMark split={research.session.split} /> : "—"}</div>
            <div className="mono" style={{ marginTop: 8, fontSize: 12 }}>Seed {research.session?.seed ?? "—"}</div>
            <div className="mono" style={{ fontSize: 12 }}>Round {research.session ? `${research.round + 1}/${research.session.rounds.length}` : "—"}</div>
          </div>
          <div className="hud pad" style={{ marginTop: 12 }}>
            <div className="micro">Market</div>
            <div className="mono" style={{ marginTop: 8 }}>Mid {num(round?.book.midpoint, 3)}</div>
            <div className="mono">Bid {num(round?.book.best_bid, 3)}</div>
            <div className="mono">Ask {num(round?.book.best_ask, 3)}</div>
            <div className="mono">Spread {num(round?.book.spread, 3)}</div>
            <div className="mono">News {round?.news_event ?? "—"} {round && round.news_magnitude ? num(round.news_magnitude, 2) : ""}</div>
          </div>
          <div className="deep pad" style={{ marginTop: 12 }}>
            <div className="micro">Strategy this round</div>
            <div className="mono" style={{ marginTop: 8 }}>{round?.strategy?.rule_triggered ?? "—"}</div>
            <div className="mono">Action {round?.strategy?.action ?? "—"}</div>
            <div className="mono">Expected edge {num(round?.strategy?.expected_edge, 3)}</div>
            <div className="mono">Realized vs truth {num(round?.strategy?.realized_pnl, 3)}</div>
          </div>
          {research.focusAgent ? (
            <div className="float pad" style={{ marginTop: 12 }}>
              <div className="micro">Pinned</div>
              <div className="mono" style={{ fontSize: 18 }}>{research.focusAgent}</div>
              <button className="btn" style={{ marginTop: 8 }} onClick={() => research.setFocusAgent(null)}>Release</button>
            </div>
          ) : null}
          {research.bundle ? <p className="micro" style={{ marginTop: 14, lineHeight: 1.5 }}>{research.bundle.disclaimer}</p> : null}
        </aside>
      </div>
      <footer className="tape">
        <div className="transport">
          <button className="btn" onClick={() => research.setRound(0)}><SkipBack size={14} /></button>
          <button className="btn" onClick={() => research.setRound(Math.max(0, research.round - 1))}><Rewind size={14} /></button>
          <button className="btn primary" onClick={() => research.setPlaying(!research.playing)}>
            {research.playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button className="btn" onClick={() => research.session && research.setRound(Math.min(research.session.rounds.length - 1, research.round + 1))}><SkipForward size={14} /></button>
          <select className="btn" value={research.speed} onChange={(event) => research.setSpeed(Number(event.target.value))}>
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </div>
        <div className="prints">
          {prints.map((trade, index) => (
            <button
              className={`print ${research.focusAgent && (trade.buyer_id === research.focusAgent || trade.seller_id === research.focusAgent) ? "hot" : ""}`}
              key={`${trade.round}-${trade.buyer_id}-${trade.seller_id}-${index}`}
              onClick={() => {
                research.setPlaying(false);
                research.setRound(trade.round);
              }}
            >
              r{trade.round} <b className={trade.aggressor_side === "buy" ? "tone-up" : "tone-down"}>{num(trade.price, 2)}</b> × {num(trade.quantity, 1)} {trade.buyer_id}←{trade.seller_id}
            </button>
          ))}
        </div>
      </footer>
      {helpOpen ? (
        <div className="palette-back" onClick={() => setHelpOpen(false)}>
          <div className="palette float help" onClick={(event) => event.stopPropagation()}>
            <div className="micro">Keys</div>
            <p>1–9 and 0 jump between rooms. D data, S system.</p>
            <p>Space plays and pauses the stored session.</p>
            <p>Click the price chart, a round tick, or a tape print to move the cursor.</p>
            <p>Click a book level or an agent row to pin that trader.</p>
            <p>Ctrl K opens the room list.</p>
          </div>
        </div>
      ) : null}
      {research.paletteOpen ? (
        <div className="palette-back" onClick={() => research.setPaletteOpen(false)}>
          <div className="palette float" onClick={(event) => event.stopPropagation()}>
            <input autoFocus placeholder="Jump to a surface" value={query} onChange={(event) => setQuery(event.target.value)} />
            {matches.map((item) => (
              <button
                key={item.to}
                className="hit"
                onClick={() => {
                  navigate(item.to);
                  research.setPaletteOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
