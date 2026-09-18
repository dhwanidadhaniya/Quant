'use client';
import { useState } from 'react';

// ============================================================
// FINANCE QUIZ — "Test Your Market IQ"
// + Market Detective Mode + Daily Challenge
// ============================================================

const QUESTIONS = [
  { id: 1, q: "If a YES contract is priced at $0.60, what is the implied probability?", choices: ["40%", "60%", "160%", "Cannot determine"], correct: 1, explanation: "In prediction markets, price ≈ implied probability. $0.60 implies 60% probability.", concept: "Implied Probability" },
  { id: 2, q: "If YES=$0.47 and NO=$0.50, what is the theoretical edge per contract?", choices: ["$0.03", "$0.47", "$0.97", "No edge"], correct: 0, explanation: "Edge = $1.00 − ($0.47 + $0.50) = $0.03. Buying both guarantees $1 payout for $0.97.", concept: "Single-Venue Arbitrage" },
  { id: 3, q: "Why might a 7% cross-venue spread NOT be arbitrage?", choices: ["Spread is too small", "Contracts may have different settlement rules", "7% is always arbitrage", "Different currencies"], correct: 1, explanation: "Contract equivalence is critical. Different resolution sources can produce different outcomes.", concept: "Contract Equivalence" },
  { id: 4, q: "What happens to an opportunity when liquidity is very low?", choices: ["Edge increases", "Slippage makes execution unprofitable", "Nothing changes", "Fees decrease"], correct: 1, explanation: "Low liquidity = high slippage. Your order moves the price, consuming the edge.", concept: "Liquidity" },
  { id: 5, q: "What does the Kelly Criterion determine?", choices: ["Best market to trade", "Optimal fraction of capital to wager", "Probability of winning", "Transaction costs"], correct: 1, explanation: "Kelly maximizes long-run geometric growth rate while sizing positions appropriately.", concept: "Kelly Criterion" },
  { id: 6, q: "What is the difference between gross edge and net edge?", choices: ["They are the same", "Net edge subtracts transaction costs", "Gross edge is always smaller", "Net edge ignores fees"], correct: 1, explanation: "Net Edge = Gross Edge − Fees − Slippage − Spread Cost. Net is what you keep.", concept: "Transaction Costs" },
  { id: 7, q: "What is slippage?", choices: ["A trading fee", "Difference between expected and actual execution price", "The bid-ask spread", "A blockchain delay"], correct: 1, explanation: "Slippage occurs when your order 'walks the book', filling at progressively worse prices.", concept: "Slippage" },
  { id: 8, q: "Why is half Kelly often preferred over full Kelly?", choices: ["Simpler math", "Full Kelly is too aggressive with uncertain probabilities", "Half Kelly always earns more", "Kelly doesn't work here"], correct: 1, explanation: "Full Kelly assumes perfect probability estimates. Half Kelly is more robust to estimation errors.", concept: "Kelly Criterion" },
  { id: 9, q: "If break-even probability is 65% and you estimate 70%, what is your edge?", choices: ["5 percentage points", "70%", "35%", "7.7%"], correct: 0, explanation: "Edge = Your estimate − Break-even = 70% − 65% = 5pp. This drives your EV.", concept: "Expected Value" },
  { id: 10, q: "A market shows 15% gross edge but $100 liquidity. What should you do?", choices: ["Trade immediately", "Recognize liquidity makes this un-executable", "Increase trade size", "Ignore liquidity"], correct: 1, explanation: "With only $100 liquidity, any meaningful trade will face catastrophic slippage.", concept: "Liquidity" },
];

const DETECTIVE = {
  title: "The Phantom Edge",
  description: "This market shows an 8% cross-venue spread. Something looks wrong. Investigate whether it's a real opportunity.",
  clues: [
    { label: "Polymarket YES", value: "$0.45", type: "price" },
    { label: "Kalshi YES", value: "$0.53", type: "price" },
    { label: "Gross Spread", value: "8¢ (17.8%)", type: "spread" },
    { label: "Polymarket Liquidity", value: "$150", type: "warning" },
    { label: "Kalshi Liquidity", value: "$45,000", type: "ok" },
    { label: "PM Settlement", value: "AP projection", type: "warning" },
    { label: "Kalshi Settlement", value: "Official certified results", type: "warning" },
  ],
  verdict: "FALSE EDGE",
  explanation: "Two problems: (1) Liquidity on Polymarket is only $150 — you can't execute meaningfully. (2) Settlement sources differ — AP projection vs official results could resolve differently. This is NOT arbitrage.",
};

export default function QuizPage() {
  const [tab, setTab] = useState<'quiz' | 'detective'>('quiz');
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [detectiveRevealed, setDetectiveRevealed] = useState(false);
  const [detectiveGuess, setDetectiveGuess] = useState<string | null>(null);

  const handleAnswer = (idx: number) => {
    if (showAnswer) return;
    setSelected(idx);
    setShowAnswer(true);
    if (idx === QUESTIONS[current].correct) setScore(s => s + 1);
  };

  const nextQuestion = () => {
    if (current + 1 >= QUESTIONS.length) { setCompleted(true); return; }
    setCurrent(c => c + 1);
    setSelected(null);
    setShowAnswer(false);
  };

  const q = QUESTIONS[current];

  return (
    <div className="max-w-4xl mx-auto animate-in">
      <h1 className="text-2xl font-bold mb-1">Test Your Market IQ</h1>
      <p className="text-sm text-[var(--text-tertiary)] mb-6">Finance quiz and Market Detective mode</p>

      <div className="tab-group mb-8 inline-flex">
        <button className={`tab ${tab === 'quiz' ? 'active' : ''}`} onClick={() => setTab('quiz')}>📝 Finance Quiz</button>
        <button className={`tab ${tab === 'detective' ? 'active' : ''}`} onClick={() => setTab('detective')}>🕵️ Market Detective</button>
      </div>

      {tab === 'quiz' && !completed && (
        <div className="glass-card-static p-8">
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs text-[var(--text-muted)]">Question {current + 1} of {QUESTIONS.length}</span>
            <span className="text-xs text-[var(--text-muted)]">Score: {score}/{current + (showAnswer ? 1 : 0)}</span>
          </div>
          <div className="mb-2 text-xs text-[var(--cyan)] font-semibold uppercase tracking-wider">{q.concept}</div>
          <h2 className="text-lg font-bold mb-6">{q.q}</h2>
          <div className="space-y-3">
            {q.choices.map((choice, i) => (
              <button key={i} onClick={() => handleAnswer(i)} className={`w-full text-left p-4 rounded-lg border transition-all text-sm ${showAnswer ? (i === q.correct ? 'border-[var(--emerald)] bg-[var(--emerald-dim)]' : i === selected ? 'border-[var(--rose)] bg-[var(--rose-dim)]' : 'border-[var(--border)] opacity-50') : 'border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[rgba(255,255,255,0.02)] cursor-pointer'}`}>
                <span className="text-[var(--text-muted)] mr-3">{String.fromCharCode(65 + i)}.</span>
                {choice}
              </button>
            ))}
          </div>
          {showAnswer && (
            <div className="mt-6">
              <div className={`p-4 rounded-lg ${selected === q.correct ? 'bg-[var(--emerald-dim)] border border-[rgba(16,185,129,0.25)]' : 'bg-[var(--rose-dim)] border border-[rgba(244,63,94,0.15)]'}`}>
                <div className="text-sm font-bold mb-1">{selected === q.correct ? '✓ Correct!' : '✗ Incorrect'}</div>
                <p className="text-sm text-[var(--text-secondary)]">{q.explanation}</p>
              </div>
              <button onClick={nextQuestion} className="btn btn-primary mt-4">{current + 1 >= QUESTIONS.length ? 'See Results' : 'Next Question →'}</button>
            </div>
          )}
        </div>
      )}

      {tab === 'quiz' && completed && (
        <div className="glass-card-static p-8 text-center">
          <div className="text-4xl mb-4">🎓</div>
          <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
          <div className="text-4xl font-bold mono text-[var(--cyan)] mb-2">{score}/{QUESTIONS.length}</div>
          <p className="text-[var(--text-secondary)] mb-4">{score >= 8 ? 'Excellent! You understand market microstructure well.' : score >= 5 ? 'Good foundation. Review the concepts you missed.' : 'Keep studying — the Finance Academy can help!'}</p>
          <button onClick={() => { setCurrent(0); setScore(0); setCompleted(false); setShowAnswer(false); setSelected(null); }} className="btn btn-primary">Retake Quiz</button>
        </div>
      )}

      {tab === 'detective' && (
        <div className="glass-card-static p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🕵️</span>
            <div>
              <h2 className="text-lg font-bold">{DETECTIVE.title}</h2>
              <p className="text-sm text-[var(--text-secondary)]">{DETECTIVE.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {DETECTIVE.clues.map((clue, i) => (
              <div key={i} className={`p-3 rounded-lg border ${clue.type === 'warning' ? 'border-[rgba(245,158,11,0.3)] bg-[var(--amber-dim)]' : 'border-[var(--border)] bg-[var(--bg-tertiary)]'}`}>
                <div className="text-[0.6rem] text-[var(--text-muted)] uppercase tracking-wider">{clue.label}</div>
                <div className={`mono text-sm font-semibold mt-1 ${clue.type === 'warning' ? 'text-[var(--amber)]' : ''}`}>{clue.value}</div>
              </div>
            ))}
          </div>

          {!detectiveRevealed && (
            <div className="flex gap-4 mb-4">
              <button className="btn btn-primary flex-1" onClick={() => { setDetectiveGuess('true'); setDetectiveRevealed(true); }}>✓ TRUE OPPORTUNITY</button>
              <button className="btn btn-ghost flex-1 border-[var(--rose)]" onClick={() => { setDetectiveGuess('false'); setDetectiveRevealed(true); }}>✗ FALSE EDGE</button>
            </div>
          )}

          {detectiveRevealed && (
            <div className={`p-4 rounded-lg ${detectiveGuess === 'false' ? 'bg-[var(--emerald-dim)] border border-[rgba(16,185,129,0.25)]' : 'bg-[var(--rose-dim)] border border-[rgba(244,63,94,0.15)]'}`}>
              <div className="text-sm font-bold mb-2">{detectiveGuess === 'false' ? '🎯 Correct! This is a FALSE EDGE.' : '❌ This is actually a FALSE EDGE.'}</div>
              <p className="text-sm text-[var(--text-secondary)]">{DETECTIVE.explanation}</p>
              <button onClick={() => { setDetectiveRevealed(false); setDetectiveGuess(null); }} className="btn btn-ghost mt-3 text-xs">Try Another Case</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
