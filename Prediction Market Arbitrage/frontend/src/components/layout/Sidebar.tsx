'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_SECTIONS = [
  {
    label: 'Core',
    items: [
      { href: '/', label: 'Home', icon: '◆' },
      { href: '/dashboard', label: 'Dashboard', icon: '◈' },
      { href: '/scanner', label: 'Market Scanner', icon: '⊙' },
      { href: '/heatmap', label: 'Opportunity Heatmap', icon: '▦' },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { href: '/arbitrage-lab', label: 'Arbitrage Lab', icon: '⇄' },
      { href: '/market/fed-rate-cut-september-2024', label: 'Market Detail', icon: '◉' },
      { href: '/orderbook', label: 'Order Book', icon: '▥' },
      { href: '/execution', label: 'Execution Simulator', icon: '⚡' },
      { href: '/what-if', label: 'What-If Lab', icon: '⟐' },
    ],
  },
  {
    label: 'Portfolio',
    items: [
      { href: '/backtest', label: 'Backtesting', icon: '↻' },
      { href: '/pnl', label: 'P&L Analytics', icon: '◭' },
      { href: '/risk', label: 'Risk Analytics', icon: '⊘' },
    ],
  },
  {
    label: 'Research',
    items: [
      { href: '/efficiency', label: 'Market Efficiency', icon: '∿' },
      { href: '/venue-comparison', label: 'Venue Comparison', icon: '⊞' },
      { href: '/research', label: 'Research Notebook', icon: '✎' },
    ],
  },
  {
    label: 'Learn',
    items: [
      { href: '/academy', label: 'Finance Academy', icon: '◎' },
      { href: '/formulas', label: 'Formula Library', icon: 'ƒ' },
      { href: '/quiz', label: 'Finance Quiz', icon: '?' },
      { href: '/achievements', label: 'Achievements', icon: '★' },
    ],
  },
  {
    label: 'Project',
    items: [
      { href: '/methodology', label: 'Methodology', icon: '⊿' },
      { href: '/limitations', label: 'Limitations', icon: '⊘' },
      { href: '/presentation', label: 'Presentation', icon: '▶' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="px-5 pb-4 mb-2 border-b border-[var(--border)]">
        <div className="text-[0.65rem] font-bold tracking-[0.15em] uppercase text-[var(--cyan)]">
          Prediction Market
        </div>
        <div className="text-[0.82rem] font-bold text-[var(--text-primary)] mt-0.5">
          Arbitrage Terminal
        </div>
        <div className="text-[0.6rem] text-[var(--text-muted)] mt-1 italic">
          &ldquo;Same Event. Different Prices.&rdquo;
        </div>
      </div>

      {/* Navigation */}
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <div className="sidebar-section">{section.label}</div>
          {section.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
            >
              <span className="text-xs opacity-60">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      ))}

      {/* Data mode indicator */}
      <div className="mt-6 mx-5 p-3 rounded-lg bg-[rgba(139,92,246,0.06)] border border-[rgba(139,92,246,0.15)]">
        <div className="flex items-center gap-2 text-[0.65rem] font-semibold text-[var(--violet)] uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-[var(--violet)]" />
          Simulated Data
        </div>
        <div className="text-[0.6rem] text-[var(--text-tertiary)] mt-1">
          All data is generated for research purposes
        </div>
      </div>

      {/* Easter egg hint */}
      <div className="mt-4 px-5 text-[0.55rem] text-[var(--text-muted)] italic">
        Try pressing Ctrl+Shift+M ✨
      </div>
    </nav>
  );
}
