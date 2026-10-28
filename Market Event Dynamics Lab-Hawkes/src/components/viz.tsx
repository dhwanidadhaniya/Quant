import { useEffect, useRef } from "react";
import { EVENT_TYPES, type EventType, type HawkesParams, type MarketEvent } from "../math/types";
import { intensitySeries } from "../math/hawkes";

const COL: Record<EventType, string> = {
  BUY: "#ff4ecd",
  SELL: "#7aa2ff",
  B_CXL: "#ffd36a",
  S_CXL: "#e8b4c8",
};

export function LandingField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    const nodes = Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00035,
      vy: (Math.random() - 0.5) * 0.00035,
      k: Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3,
    }));
    const types = EVENT_TYPES;
    const loop = () => {
      const { width: w, height: h } = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (c.width !== w * dpr) {
        c.width = w * dpr;
        c.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i],
            b = nodes[j];
          const dx = (a.x - b.x) * w;
          const dy = (a.y - b.y) * h;
          const d = Math.hypot(dx, dy);
          if (d < 140) {
            ctx.strokeStyle = `rgba(255,45,149,${0.18 * (1 - d / 140)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        const x = n.x * w,
          y = n.y * h;
        ctx.fillStyle = COL[types[n.k]];
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        if (n.k === 0) ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        else if (n.k === 1) {
          ctx.moveTo(x, y - 4);
          ctx.lineTo(x + 3.5, y);
          ctx.lineTo(x, y + 4);
          ctx.lineTo(x - 3.5, y);
          ctx.closePath();
        } else if (n.k === 2) {
          ctx.arc(x, y, 4.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = "destination-out";
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";
          continue;
        } else ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} />;
}

export function EventUniverse({
  events,
  onPick,
}: {
  events: MarketEvent[];
  onPick?: (e: MarketEvent, i: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pick = useRef(onPick);
  pick.current = onPick;
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    const t0 = performance.now();
    const subset = events.slice(0, 420);
    const loop = () => {
      const { width: w, height: h } = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (c.width !== w * dpr) {
        c.width = w * dpr;
        c.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#100814";
      ctx.fillRect(0, 0, w, h);
      const T = Math.max(subset[subset.length - 1]?.t ?? 1, 1);
      const t = (performance.now() - t0) / 1000;
      for (let i = 0; i < subset.length; i++) {
        const e = subset[i];
        const u = e.t / T;
        const ang = u * Math.PI * 6 + t * 0.08;
        const rad = 40 + u * Math.min(w, h) * 0.42;
        const x = w / 2 + Math.cos(ang) * rad;
        const y = h / 2 + Math.sin(ang) * rad * 0.62 + Math.sin(t + i) * 2;
        if (e.parent != null && e.parent < subset.length) {
          const p = subset[e.parent];
          const up = p.t / T;
          const ap = up * Math.PI * 6 + t * 0.08;
          const rp = 40 + up * Math.min(w, h) * 0.42;
          const px = w / 2 + Math.cos(ap) * rp;
          const py = h / 2 + Math.sin(ap) * rp * 0.62;
          ctx.strokeStyle = "rgba(255,45,149,0.16)";
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        ctx.fillStyle = COL[e.type];
        ctx.beginPath();
        if (e.type === "BUY") ctx.arc(x, y, 3.4, 0, Math.PI * 2);
        else if (e.type === "SELL") {
          ctx.moveTo(x, y - 4);
          ctx.lineTo(x + 3.4, y);
          ctx.lineTo(x, y + 4);
          ctx.lineTo(x - 3.4, y);
          ctx.closePath();
        } else if (e.type.endsWith("CXL")) {
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.strokeStyle = COL[e.type];
          ctx.stroke();
          continue;
        } else ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    const onClick = (ev: MouseEvent) => {
      const r = c.getBoundingClientRect();
      const x = ev.clientX - r.left;
      const y = ev.clientY - r.top;
      const T = Math.max(subset[subset.length - 1]?.t ?? 1, 1);
      const t = (performance.now() - t0) / 1000;
      let best = -1,
        bd = 1e9;
      for (let i = 0; i < subset.length; i++) {
        const e = subset[i];
        const u = e.t / T;
        const ang = u * Math.PI * 6 + t * 0.08;
        const rad = 40 + u * Math.min(r.width, r.height) * 0.42;
        const px = r.width / 2 + Math.cos(ang) * rad;
        const py = r.height / 2 + Math.sin(ang) * rad * 0.62;
        const d = Math.hypot(px - x, py - y);
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      if (best >= 0 && bd < 18) pick.current?.(subset[best], best);
    };
    c.addEventListener("click", onClick);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      c.removeEventListener("click", onClick);
    };
  }, [events]);
  return <canvas className="viz" ref={ref} style={{ height: 420 }} />;
}

export function IntensityRiver({
  events,
  params,
  T,
}: {
  events: MarketEvent[];
  params: HawkesParams;
  T: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const series = intensitySeries(events, params as HawkesParams, T, 220);
    let raf = 0;
    const t0 = performance.now();
    const loop = () => {
      const { width: w, height: h } = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (c.width !== w * dpr) {
        c.width = w * dpr;
        c.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#110814";
      ctx.fillRect(0, 0, w, h);
      const max = Math.max(...series.map((s) => s.buy + s.sell + s.cxl), 0.01);
      const pulse = 0.92 + 0.08 * Math.sin((performance.now() - t0) / 280);
      const draw = (key: "buy" | "sell" | "cxl", color: string, yOff: number) => {
        ctx.beginPath();
        series.forEach((s, i) => {
          const x = (i / (series.length - 1)) * w;
          const y = h - 16 - ((s[key] / max) * (h - 36) * pulse + yOff);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      };
      draw("cxl", "#ffd36a", 0);
      draw("sell", "#7aa2ff", 0);
      draw("buy", "#ff4ecd", 0);
      ctx.font = "11px IBM Plex Mono";
      ctx.fillStyle = "#e8b4c8";
      ctx.fillText("λ_buy", 12, 18);
      ctx.fillStyle = "#7aa2ff";
      ctx.fillText("λ_sell", 70, 18);
      ctx.fillStyle = "#ffd36a";
      ctx.fillText("λ_cancel", 140, 18);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [events, params, T]);
  return <canvas className="viz" ref={ref} style={{ height: 280 }} />;
}

export function HeatmapView({
  grid,
  T,
}: {
  grid: Record<EventType, number[]>;
  T: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const { width: w, height: h } = { width: 900, height: 220 };
    const dpr = 2;
    c.width = w * dpr;
    c.height = h * dpr;
    c.style.width = "100%";
    c.style.height = "220px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#110814";
    ctx.fillRect(0, 0, w, h);
    const rows = EVENT_TYPES;
    const bins = grid.BUY.length;
    const max = Math.max(...rows.flatMap((r) => grid[r]), 1);
    rows.forEach((r, i) => {
      const y = 28 + i * 44;
      ctx.fillStyle = "#b0899c";
      ctx.font = "11px IBM Plex Mono";
      ctx.fillText(r, 8, y + 18);
      for (let b = 0; b < bins; b++) {
        const v = grid[r][b] / max;
        ctx.fillStyle = `rgba(255,45,149,${0.08 + 0.9 * v})`;
        const x = 70 + (b / bins) * (w - 90);
        ctx.fillRect(x, y, (w - 90) / bins + 0.4, 34);
      }
    });
    ctx.fillStyle = "#6e4d62";
    ctx.fillText(`t = 0 → T = ${T.toFixed(1)}`, 70, 16);
  }, [grid, T]);
  return <canvas className="viz" ref={ref} />;
}

export function CascadeCanvas({ events }: { events: MarketEvent[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const roots = events.map((e, i) => i).filter((i) => events[i].parent == null);
    const root = roots[Math.floor(roots.length / 3)] ?? 0;
    const children: number[][] = events.map(() => []);
    events.forEach((e, i) => {
      if (e.parent != null) children[e.parent].push(i);
    });
    const vis = new Set<number>();
    const walk = (i: number, d = 0) => {
      if (d > 4 || vis.has(i)) return;
      vis.add(i);
      children[i].slice(0, 4).forEach((ch) => walk(ch, d + 1));
    };
    walk(root);
    let raf = 0;
    const t0 = performance.now();
    const loop = () => {
      const { width: w, height: h } = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (c.width !== w * dpr) {
        c.width = w * dpr;
        c.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#100814";
      ctx.fillRect(0, 0, w, h);
      const nodes = [...vis];
      const depth = new Map<number, number>();
      depth.set(root, 0);
      const q = [root];
      while (q.length) {
        const u = q.shift()!;
        for (const v of children[u]) {
          if (!vis.has(v) || depth.has(v)) continue;
          depth.set(v, (depth.get(u) ?? 0) + 1);
          q.push(v);
        }
      }
      const byD: number[][] = [[], [], [], [], []];
      for (const i of nodes) byD[Math.min(4, depth.get(i) ?? 0)].push(i);
      const pos = new Map<number, { x: number; y: number }>();
      byD.forEach((row, d) => {
        row.forEach((i, k) => {
          pos.set(i, {
            x: w * ((k + 1) / (row.length + 1)),
            y: 40 + d * ((h - 60) / 4),
          });
        });
      });
      const phase = ((performance.now() - t0) / 900) % 1;
      ctx.strokeStyle = "rgba(255,45,149,0.35)";
      for (const i of nodes) {
        const p = pos.get(i)!;
        for (const ch of children[i]) {
          if (!pos.has(ch)) continue;
          const q2 = pos.get(ch)!;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q2.x, q2.y);
          ctx.stroke();
          const mx = p.x + (q2.x - p.x) * phase;
          const my = p.y + (q2.y - p.y) * phase;
          ctx.fillStyle = "#ff2d95";
          ctx.beginPath();
          ctx.arc(mx, my, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (const i of nodes) {
        const p = pos.get(i)!;
        const e = events[i];
        ctx.fillStyle = COL[e.type];
        ctx.beginPath();
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a0412";
        ctx.font = "8px IBM Plex Mono";
        ctx.textAlign = "center";
        ctx.fillText(e.type.slice(0, 1), p.x, p.y + 3);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [events]);
  return <canvas className="viz" ref={ref} style={{ height: 360 }} />;
}

export function OgataViz({
  events,
  params,
  T,
}: {
  events: MarketEvent[];
  params: HawkesParams;
  T: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const series = intensitySeries(events, params as HawkesParams, Math.min(T, 12), 180);
    const t0 = performance.now();
    let raf = 0;
    const loop = () => {
      const { width: w, height: h } = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (c.width !== w * dpr) {
        c.width = w * dpr;
        c.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#110814";
      ctx.fillRect(0, 0, w, h);
      const max = Math.max(...series.map((s) => s.total), 0.1);
      const u = ((performance.now() - t0) / 8000) % 1;
      ctx.beginPath();
      series.forEach((s, i) => {
        const x = (i / (series.length - 1)) * w;
        const y = h - 20 - (s.total / max) * (h - 40);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#ff4ecd";
      ctx.stroke();
      const x = u * w;
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      const idx = Math.min(series.length - 1, Math.floor(u * (series.length - 1)));
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x, h - 20 - (series[idx].total / max) * (h - 40), 4, 0, Math.PI * 2);
      ctx.fill();
      const windowT = Math.min(T, 12);
      for (const e of events) {
        if (e.t > windowT) break;
        const ex = (e.t / windowT) * w;
        ctx.fillStyle = COL[e.type];
        ctx.fillRect(ex, h - 12, 2, 8);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [events, params, T]);
  return <canvas className="viz" ref={ref} style={{ height: 240 }} />;
}
