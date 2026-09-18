'use client';
import { useState } from 'react';

// ============================================================
// PRESENTATION MODE — Slide-by-slide walkthrough
// ============================================================

const SLIDES = [
  {
    title: 'Prediction Market Arbitrage\n& Market Microstructure',
    subtitle: '"Same Event. Different Prices. Find the Edge."',
    content: 'A quantitative finance research project studying price discrepancies across prediction market venues.',
    bg: 'gradient',
  },
  {
    title: 'The Core Question',
    subtitle: '',
    content: '"Do prediction markets temporarily disagree on the probability of the same real-world event, and can those price differences represent economically meaningful arbitrage opportunities after costs?"',
    bg: 'dark',
  },
  {
    title: 'Key Distinction',
    subtitle: 'Price Difference ≠ Arbitrage',
    content: '• A 7¢ cross-venue spread is a PRICE DIFFERENCE\n• After fees, slippage, and spread costs, it becomes a 3.5¢ NET EDGE\n• Only if contracts are equivalent and liquidity supports execution\n  is it EXECUTABLE ARBITRAGE',
    bg: 'dark',
  },
  {
    title: 'Classification Pipeline',
    subtitle: '5 stages from observation to action',
    content: '1. Price Difference — raw price gap detected\n2. Mispricing — contracts verified as equivalent\n3. Theoretical Arbitrage — positive gross edge\n4. Practical Arbitrage — positive net edge after costs\n5. Executable Arbitrage — sufficient liquidity',
    bg: 'dark',
  },
  {
    title: 'Transaction Cost Waterfall',
    subtitle: 'Where the edge goes',
    content: '• Gross Edge: 7.0¢\n• Trading Fees: −2.0¢\n• Slippage: −1.2¢\n• Spread Cost: −0.3¢\n• NET EDGE: 3.5¢\n\n50% of gross edge is consumed by execution costs.',
    bg: 'dark',
  },
  {
    title: 'Key Findings',
    subtitle: '10 research observations',
    content: '1. Gross vs Net: Transaction costs compressed 60% of theoretical edges\n2. Liquidity is the dominant constraint on execution\n3. Contract settlement rules created false arbitrage signals\n4. Half Kelly outperformed Full Kelly on risk-adjusted basis\n5. Political markets showed more persistent inefficiencies',
    bg: 'dark',
  },
  {
    title: 'Mistakes We Made',
    subtitle: 'And what we learned from them',
    content: '⚠ Used linear slippage model (should be square-root)\n⚠ Treated all price differences as arbitrage\n⚠ Ignored contract equivalence initially\n\n"The mistakes were as educational as the findings."',
    bg: 'dark',
  },
  {
    title: 'Market Efficiency',
    subtitle: 'Score: 24/100',
    content: '"Prediction markets are generally efficient but exhibit temporary, category-dependent inefficiencies that are largely compressed by transaction costs."\n\nCrypto: 42/100 · Politics: 28/100 · Economics: 18/100 · Sports: 12/100',
    bg: 'dark',
  },
  {
    title: 'Technical Architecture',
    subtitle: '',
    content: '• Backend: Python + FastAPI + SQLAlchemy\n• Frontend: Next.js + TypeScript + Recharts\n• Quant Engine: 12 financial modules\n• 21+ interactive pages\n• 25 chart components\n• Full glossary and formula library',
    bg: 'dark',
  },
  {
    title: 'Thank You',
    subtitle: '"The finance is the star. The technology is the engine.\nThe dashboard is the story."',
    content: 'Prediction Market Arbitrage & Market Microstructure Terminal\nA quantitative finance research project',
    bg: 'gradient',
  },
];

export default function PresentationPage() {
  const [current, setCurrent] = useState(0);
  const slide = SLIDES[current];

  return (
    <div className="max-w-5xl mx-auto animate-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold">Presentation Mode</h1>
        <span className="text-xs text-[var(--text-muted)]">{current + 1} / {SLIDES.length}</span>
      </div>

      <div className={`glass-card-static p-12 min-h-[500px] flex flex-col justify-center items-center text-center mb-6 ${slide.bg === 'gradient' ? 'bg-gradient-to-br from-[rgba(34,211,238,0.08)] to-[rgba(139,92,246,0.08)]' : ''}`}>
        <h2 className="text-3xl font-black mb-3 text-[var(--text-primary)] whitespace-pre-line">{slide.title}</h2>
        {slide.subtitle && <p className="text-lg text-[var(--cyan)] mb-6 whitespace-pre-line">{slide.subtitle}</p>}
        <div className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl whitespace-pre-line">{slide.content}</div>
      </div>

      <div className="flex items-center justify-between">
        <button className="btn btn-ghost" onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}>← Previous</button>
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? 'bg-[var(--cyan)] scale-125' : 'bg-[var(--text-muted)]'}`} />
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setCurrent(Math.min(SLIDES.length - 1, current + 1))} disabled={current === SLIDES.length - 1}>Next →</button>
      </div>
    </div>
  );
}
