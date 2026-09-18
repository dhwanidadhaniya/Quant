'use client';

// ============================================================
// ACHIEVEMENTS & GAMIFICATION
// ============================================================

const ACHIEVEMENTS = [
  { name: "First Edge Found", desc: "Analyzed your first arbitrage opportunity", icon: "🔍", tier: "bronze", xp: 50, unlocked: true },
  { name: "Arbitrage Hunter", desc: "Analyzed 10 opportunities across venues", icon: "🎯", tier: "silver", xp: 200, unlocked: false },
  { name: "Order Book Detective", desc: "Explored order book depth and understood slippage", icon: "🔎", tier: "bronze", xp: 75, unlocked: true },
  { name: "Kelly Rookie", desc: "Used the Kelly Criterion calculator", icon: "📊", tier: "bronze", xp: 50, unlocked: true },
  { name: "Risk Manager", desc: "Reviewed the complete risk matrix", icon: "🛡️", tier: "silver", xp: 150, unlocked: false },
  { name: "Microstructure Student", desc: "Completed all market microstructure lessons", icon: "🎓", tier: "gold", xp: 300, unlocked: false },
  { name: "Backtester", desc: "Ran your first historical backtest", icon: "⏪", tier: "silver", xp: 150, unlocked: false },
  { name: "Efficiency Analyst", desc: "Studied market efficiency across categories", icon: "📈", tier: "gold", xp: 250, unlocked: false },
  { name: "Contract Detective", desc: "Compared contract equivalence between venues", icon: "📋", tier: "silver", xp: 100, unlocked: false },
  { name: "Execution Specialist", desc: "Simulated execution at 5+ different latencies", icon: "⚡", tier: "gold", xp: 200, unlocked: false },
  { name: "Quiz Master", desc: "Scored 100% on the finance quiz", icon: "🏆", tier: "platinum", xp: 500, unlocked: false },
  { name: "False Edge Spotter", desc: "Correctly identified a false arbitrage", icon: "🕵️", tier: "gold", xp: 250, unlocked: false },
];

const tierColors: Record<string, string> = {
  bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', platinum: '#e5e4e2',
};

export default function AchievementsPage() {
  const totalXP = ACHIEVEMENTS.filter(a => a.unlocked).reduce((s, a) => s + a.xp, 0);
  const maxXP = ACHIEVEMENTS.reduce((s, a) => s + a.xp, 0);
  const level = Math.floor(totalXP / 100) + 1;

  return (
    <div className="max-w-4xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-1">Achievements</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-6">Track your progress through the research platform</p>

      {/* XP Bar */}
      <div className="glass-card-static p-6 mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--text-muted)]">Level</span>
            <span className="text-2xl font-bold mono text-[var(--cyan)] ml-2">{level}</span>
          </div>
          <div className="text-right">
            <span className="mono text-sm text-[var(--text-secondary)]">{totalXP} / {maxXP} XP</span>
          </div>
        </div>
        <div className="h-3 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[var(--cyan-muted)] to-[var(--cyan)] transition-all duration-1000" style={{ width: `${(totalXP / maxXP) * 100}%` }} />
        </div>
        <div className="text-xs text-[var(--text-muted)] mt-1">{ACHIEVEMENTS.filter(a => a.unlocked).length} of {ACHIEVEMENTS.length} achievements unlocked</div>
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ACHIEVEMENTS.map((a, i) => (
          <div key={i} className={`glass-card-static p-5 flex items-start gap-4 ${a.unlocked ? '' : 'opacity-40'}`} style={a.unlocked ? { borderLeft: `3px solid ${tierColors[a.tier]}` } : {}}>
            <div className="text-3xl">{a.unlocked ? a.icon : '🔒'}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-[var(--text-primary)]">{a.name}</span>
                <span className="text-[0.55rem] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: `${tierColors[a.tier]}20`, color: tierColors[a.tier] }}>
                  {a.tier}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">{a.desc}</p>
              <div className="text-[0.6rem] text-[var(--text-muted)] mt-1">+{a.xp} XP</div>
            </div>
            {a.unlocked && <span className="text-[var(--emerald)] text-lg">✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
