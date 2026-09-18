'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// ============================================================
// LANDING PAGE — Hero Visualization
// "Prediction Markets Are Information Machines."
// ============================================================

function AnimatedCounter({ end, duration = 2000, prefix = '', suffix = '', decimals = 0 }: { end: number; duration?: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  return <span className="mono">{prefix}{count.toFixed(decimals)}{suffix}</span>;
}

function PriceDisplay({ venue, price, className = '' }: { venue: string; price: number; className?: string }) {
  return (
    <div className={`glass-card-static p-6 text-center ${className}`}>
      <div className="text-[0.65rem] font-bold tracking-[0.12em] uppercase text-[var(--text-tertiary)] mb-2">{venue}</div>
      <div className="text-3xl font-bold mono text-[var(--text-primary)]">${price.toFixed(2)}</div>
      <div className="text-sm text-[var(--text-secondary)] mt-1">Implied probability: {(price * 100).toFixed(0)}%</div>
    </div>
  );
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <section className="pt-12 pb-16 text-center animate-in">
        <div className="badge badge-simulated mb-6 mx-auto">⬡ Research Platform · Simulated Data</div>
        
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--cyan)] via-[var(--blue)] to-[var(--violet)]">
            PREDICTION MARKETS
          </span>
          <br />
          <span className="text-[var(--text-primary)]">ARE INFORMATION MACHINES.</span>
        </h1>
        
        <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-12 leading-relaxed">
          Researching price discrepancies, arbitrage, liquidity and market efficiency across prediction venues.
        </p>

        {/* Central Hero Visualization — Same Event, Different Prices */}
        <div className="glass-card-static p-8 mb-8 max-w-3xl mx-auto">
          <div className="text-[0.6rem] font-bold tracking-[0.15em] uppercase text-[var(--text-muted)] mb-3">Event</div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">
            &ldquo;Will the Fed cut rates in September 2024?&rdquo;
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mb-6">
            <PriceDisplay venue="Polymarket" price={0.55} className="border-l-2 border-l-[var(--cyan)]" />
            
            <div className="flex flex-col items-center">
              <div className="text-[0.6rem] font-bold tracking-[0.12em] uppercase text-[var(--amber)] mb-1">Divergence</div>
              <div className="text-4xl font-black mono text-[var(--amber)]">7¢</div>
              <div className="text-xs text-[var(--text-tertiary)] mt-1">12.7% percentage divergence</div>
              <div className="mt-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--amber)] animate-pulse" />
                <span className="text-[0.65rem] text-[var(--amber)] font-semibold">PRICE DISAGREEMENT</span>
              </div>
            </div>

            <PriceDisplay venue="Kalshi" price={0.62} className="border-l-2 border-l-[var(--violet)]" />
          </div>
          
          <div className="text-[0.7rem] text-[var(--text-tertiary)] italic">
            &ldquo;But is a price difference actually arbitrage? That&apos;s what we&apos;re researching.&rdquo;
          </div>
        </div>

        {/* The Pipeline Flow */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12 text-[0.7rem] font-semibold">
          {['MARKET DISAGREEMENT', 'POTENTIAL MISPRICING', 'LIQUIDITY CHECK', 'COST CHECK', 'EXECUTION CHECK', 'NET EDGE'].map((step, i) => (
            <div key={step} className="flex items-center gap-3" style={{ animationDelay: `${i * 100}ms` }}>
              <span className={`px-3 py-1.5 rounded-md ${i === 5 ? 'bg-[var(--emerald-dim)] text-[var(--emerald)] border border-[rgba(16,185,129,0.25)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>
                {step}
              </span>
              {i < 5 && <span className="text-[var(--text-muted)]">→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Animated Statistics */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {mounted && [
          { label: 'Markets Tracked', value: 12, suffix: '' },
          { label: 'Active Opportunities', value: 8, suffix: '' },
          { label: 'Avg Gross Spread', value: 4.2, suffix: '¢', decimals: 1 },
          { label: 'Avg Net Edge', value: 1.1, suffix: '¢', decimals: 1 },
          { label: 'Total Liquidity', value: 342, prefix: '$', suffix: 'K' },
          { label: 'Avg Spread', value: 3.8, suffix: '%', decimals: 1 },
          { label: 'Median Duration', value: 47, suffix: 's' },
          { label: 'Executable Opps', value: 4, suffix: '' },
        ].map((stat) => (
          <div key={stat.label} className="kpi-card">
            <div className="kpi-label">{stat.label}</div>
            <div className="kpi-value text-[var(--text-primary)]">
              <AnimatedCounter end={stat.value} prefix={stat.prefix || ''} suffix={stat.suffix} decimals={stat.decimals || 0} />
            </div>
          </div>
        ))}
      </section>

      {/* Core Research Question */}
      <section className="glass-card-static p-8 mb-8">
        <div className="text-[0.6rem] font-bold tracking-[0.15em] uppercase text-[var(--cyan)] mb-3">Core Research Question</div>
        <blockquote className="text-lg text-[var(--text-secondary)] leading-relaxed italic border-l-2 border-[var(--cyan-muted)] pl-6">
          &ldquo;Do prediction markets temporarily disagree on the probability of the same real-world event, and can those price differences represent economically meaningful and executable arbitrage opportunities after accounting for contract equivalence, liquidity, transaction costs, slippage, execution risk and settlement risk?&rdquo;
        </blockquote>
      </section>

      {/* Key Distinction */}
      <section className="grid md:grid-cols-2 gap-6 mb-12">
        <div className="research-note">
          <div className="note-label">Central Distinction</div>
          <div className="space-y-2 text-[var(--text-secondary)]">
            <p><span className="text-[var(--text-primary)] font-semibold">PRICE DIFFERENCE ≠ ARBITRAGE</span></p>
            <p><span className="text-[var(--text-primary)] font-semibold">GROSS EDGE ≠ NET EDGE</span></p>
            <p><span className="text-[var(--text-primary)] font-semibold">THEORETICAL ≠ EXECUTABLE</span></p>
          </div>
          <p className="mt-3 text-xs text-[var(--text-tertiary)]">
            This distinction is the central intellectual theme of our research.
          </p>
        </div>

        <div className="insight-box">
          <div className="insight-label">What We Learned</div>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            &ldquo;The largest gross spread was not necessarily the best opportunity once liquidity and fees were considered. 
            Some small-spread opportunities in liquid markets had better risk-adjusted expected returns than 
            large-spread opportunities in thin markets.&rdquo;
          </p>
        </div>
      </section>

      {/* Classification Pipeline */}
      <section className="glass-card-static p-8 mb-12">
        <div className="text-[0.6rem] font-bold tracking-[0.15em] uppercase text-[var(--text-muted)] mb-6">Classification Pipeline</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { label: 'PRICE DIFFERENCE', desc: 'Raw price gap', color: 'var(--text-tertiary)', bg: 'var(--bg-tertiary)' },
            { label: 'MISPRICING', desc: 'Contracts are equivalent', color: 'var(--amber)', bg: 'var(--amber-dim)' },
            { label: 'THEORETICAL ARB', desc: 'Positive gross edge', color: 'var(--violet)', bg: 'var(--violet-dim)' },
            { label: 'PRACTICAL ARB', desc: 'Positive net edge', color: 'var(--blue)', bg: 'rgba(59,130,246,0.12)' },
            { label: 'EXECUTABLE ARB', desc: 'Sufficient liquidity + feasible', color: 'var(--emerald)', bg: 'var(--emerald-dim)' },
          ].map((stage, i) => (
            <div key={stage.label} className="text-center">
              <div className="rounded-lg p-4 border border-[var(--border)]" style={{ background: stage.bg }}>
                <div className="text-[0.65rem] font-bold tracking-wider" style={{ color: stage.color }}>{stage.label}</div>
                <div className="text-[0.7rem] text-[var(--text-tertiary)] mt-1">{stage.desc}</div>
              </div>
              {i < 4 && <div className="text-[var(--text-muted)] text-lg mt-2 hidden md:block">↓</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Quick Access */}
      <section className="grid md:grid-cols-3 gap-4 mb-12">
        {[
          { href: '/dashboard', title: 'Finance Dashboard', desc: 'Live opportunities, KPIs, and market overview', icon: '◈' },
          { href: '/heatmap', title: 'Opportunity Heatmap', desc: 'Interactive visualization of arbitrage intensity', icon: '▦' },
          { href: '/arbitrage-lab', title: 'Arbitrage Lab', desc: 'Single-venue and cross-venue analysis tools', icon: '⇄' },
          { href: '/what-if', title: 'What-If Lab', desc: 'Interactive sandbox for trade simulation', icon: '⟐' },
          { href: '/backtest', title: 'Backtesting Engine', desc: 'Historical simulation with execution modeling', icon: '↻' },
          { href: '/quiz', title: 'Test Your Market IQ', desc: 'Finance quiz and Market Detective mode', icon: '?' },
        ].map((card) => (
          <Link key={card.href} href={card.href} className="glass-card p-6 block group">
            <div className="text-2xl mb-3 opacity-50 group-hover:opacity-100 transition-opacity">{card.icon}</div>
            <div className="text-sm font-bold text-[var(--text-primary)] mb-1">{card.title}</div>
            <div className="text-xs text-[var(--text-tertiary)]">{card.desc}</div>
          </Link>
        ))}
      </section>

      {/* Footer Research Note */}
      <section className="mistake-box mb-8">
        <div className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--amber)] mb-2">Something We Initially Got Wrong</div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          &ldquo;We treated every cross-venue price difference as arbitrage. Contract settlement rules made several of these opportunities non-equivalent. 
          A market pricing &apos;official results&apos; vs &apos;media projection&apos; can diverge legitimately — that&apos;s not mispricing, that&apos;s a different contract.&rdquo;
        </p>
      </section>

      <footer className="text-center text-[0.65rem] text-[var(--text-muted)] pb-8">
        Built as a quantitative finance research project · All data is simulated for educational purposes
      </footer>
    </div>
  );
}
