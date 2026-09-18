'use client';
import { useState } from 'react';

// ============================================================
// OPPORTUNITY HEATMAP
// Interactive heatmap showing arbitrage intensity by event × time
// ============================================================

const EVENTS = [
  'Fed rate cut', 'Election 2024', 'Bitcoin $100K', 'S&P 5,500',
  'CPI > 3.0%', 'Govt shutdown', 'SpaceX orbital', 'EU EV tariffs',
  'GDP > 2.5%', 'OpenAI GPT-5', 'RM Champions', 'Hurricane Cat5'
];

const TIME_LABELS = ['09:00', '13:00', '17:00', '21:00', '01:00', '05:00', '09:00', '13:00', '17:00', '21:00', '01:00', '05:00', '09:00', '13:00', '17:00', '21:00', '01:00', '05:00', '09:00', '13:00', '17:00', '21:00', '01:00', '05:00'];

// Generate heatmap data with realistic patterns
function generateHeatmapData(metric: string) {
  const data: { event: number; time: number; value: number; raw: number }[] = [];
  const seed = metric === 'net_edge' ? 1 : metric === 'gross_edge' ? 2 : metric === 'liquidity' ? 3 : 4;
  
  for (let e = 0; e < EVENTS.length; e++) {
    for (let t = 0; t < TIME_LABELS.length; t++) {
      let base = Math.sin(e * 0.7 + seed) * 0.3 + Math.cos(t * 0.5) * 0.2 + 0.3;
      base += (Math.sin(e + t * 0.3 + seed) + 1) * 0.2;
      const value = Math.max(0, Math.min(1, base + (Math.random() - 0.5) * 0.3));
      const raw = metric === 'liquidity' ? value * 80000 : metric === 'duration' ? value * 300 : value * 0.08;
      data.push({ event: e, time: t, value: +value.toFixed(2), raw: +raw.toFixed(2) });
    }
  }
  return data;
}

function getHeatColor(value: number): string {
  if (value < 0.1) return 'rgba(139, 149, 176, 0.05)';
  if (value < 0.25) return 'rgba(34, 211, 238, 0.1)';
  if (value < 0.4) return 'rgba(34, 211, 238, 0.25)';
  if (value < 0.55) return 'rgba(16, 185, 129, 0.3)';
  if (value < 0.7) return 'rgba(16, 185, 129, 0.5)';
  if (value < 0.85) return 'rgba(245, 158, 11, 0.5)';
  return 'rgba(244, 63, 94, 0.6)';
}

export default function HeatmapPage() {
  const [metric, setMetric] = useState('net_edge');
  const [hoveredCell, setHoveredCell] = useState<{ event: number; time: number; value: number; raw: number } | null>(null);
  const data = generateHeatmapData(metric);
  
  const metricLabels: Record<string, string> = {
    net_edge: 'Net Edge ($)', gross_edge: 'Gross Edge ($)',
    liquidity: 'Liquidity ($)', duration: 'Duration (s)', frequency: 'Opportunity Frequency',
  };

  return (
    <div className="max-w-7xl mx-auto animate-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Arbitrage Opportunity Heatmap</h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            Heatmap intensity represents the magnitude of observed opportunities under the selected methodology.
          </p>
        </div>
        <span className="badge badge-simulated">⬡ SIMULATED</span>
      </div>

      {/* Metric Toggle */}
      <div className="flex items-center gap-2 mb-6">
        <div className="tab-group">
          {Object.entries(metricLabels).map(([key, label]) => (
            <button key={key} className={`tab ${metric === key ? 'active' : ''}`} onClick={() => setMetric(key)}>
              {label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <div className="glass-card-static p-6 mb-6 overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Time axis */}
          <div className="flex ml-[140px] mb-2">
            {TIME_LABELS.map((t, i) => (
              <div key={i} className="flex-1 text-center text-[0.55rem] text-[var(--text-muted)]">
                {i % 3 === 0 ? t : ''}
              </div>
            ))}
          </div>

          {/* Grid */}
          {EVENTS.map((event, ei) => (
            <div key={ei} className="flex items-center mb-1">
              <div className="w-[140px] text-[0.7rem] text-[var(--text-secondary)] truncate pr-3 text-right">{event}</div>
              <div className="flex flex-1 gap-[2px]">
                {TIME_LABELS.map((_, ti) => {
                  const cell = data.find(d => d.event === ei && d.time === ti);
                  const value = cell?.value || 0;
                  return (
                    <div
                      key={ti}
                      className="heatmap-cell flex-1 h-7 relative"
                      style={{ backgroundColor: getHeatColor(value) }}
                      onMouseEnter={() => setHoveredCell(cell || null)}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {hoveredCell?.event === ei && hoveredCell?.time === ti && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 glass-card-static p-3 text-xs whitespace-nowrap">
                          <div className="font-bold text-[var(--text-primary)] mb-1">{EVENTS[ei]}</div>
                          <div className="text-[var(--text-tertiary)]">Time: {TIME_LABELS[ti]}</div>
                          <div className="text-[var(--text-secondary)]">
                            {metric === 'liquidity' ? `$${hoveredCell.raw.toLocaleString()}` :
                             metric === 'duration' ? `${hoveredCell.raw}s` :
                             `${(hoveredCell.raw * 100).toFixed(1)}¢`}
                          </div>
                          <div className="text-[var(--text-tertiary)]">Intensity: {(hoveredCell.value * 100).toFixed(0)}%</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Color legend */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <span className="text-[0.6rem] text-[var(--text-muted)]">Low</span>
            <div className="flex gap-1">
              {[0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95].map(v => (
                <div key={v} className="w-8 h-4 rounded-sm" style={{ backgroundColor: getHeatColor(v) }} />
              ))}
            </div>
            <span className="text-[0.6rem] text-[var(--text-muted)]">High</span>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="research-note">
        <div className="note-label">Methodology Note</div>
        <p className="text-sm text-[var(--text-secondary)]">
          Heatmap intensity represents the magnitude/frequency of observed opportunities under the selected metric.
          Colors are normalized relative to the maximum observed value. Hover over any cell for details.
          This visualization helps identify which markets and time periods exhibit the most pricing discrepancies.
        </p>
      </div>
    </div>
  );
}
