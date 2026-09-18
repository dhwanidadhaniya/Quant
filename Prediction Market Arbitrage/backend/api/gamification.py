"""Gamification API — achievements, quizzes, daily challenges."""
from fastapi import APIRouter
from datetime import datetime
import random

router = APIRouter()

ACHIEVEMENTS = [
    {"slug": "first-edge", "name": "First Edge Found", "description": "Analyzed your first arbitrage opportunity", "icon": "🔍", "tier": "bronze", "xp": 50, "category": "arbitrage"},
    {"slug": "arbitrage-hunter", "name": "Arbitrage Hunter", "description": "Analyzed 10 opportunities across venues", "icon": "🎯", "tier": "silver", "xp": 200, "category": "arbitrage"},
    {"slug": "orderbook-detective", "name": "Order Book Detective", "description": "Explored order book depth and understood slippage", "icon": "🔎", "tier": "bronze", "xp": 75, "category": "microstructure"},
    {"slug": "kelly-rookie", "name": "Kelly Rookie", "description": "Used the Kelly Criterion calculator for the first time", "icon": "📊", "tier": "bronze", "xp": 50, "category": "risk"},
    {"slug": "risk-manager", "name": "Risk Manager", "description": "Reviewed the complete risk matrix for an opportunity", "icon": "🛡️", "tier": "silver", "xp": 150, "category": "risk"},
    {"slug": "microstructure-student", "name": "Microstructure Student", "description": "Completed all market microstructure lessons", "icon": "🎓", "tier": "gold", "xp": 300, "category": "education"},
    {"slug": "backtester", "name": "Backtester", "description": "Ran your first historical backtest", "icon": "⏪", "tier": "silver", "xp": 150, "category": "backtesting"},
    {"slug": "efficiency-analyst", "name": "Market Efficiency Analyst", "description": "Studied market efficiency across categories", "icon": "📈", "tier": "gold", "xp": 250, "category": "research"},
    {"slug": "contract-detective", "name": "Contract Detective", "description": "Compared contract equivalence between venues", "icon": "📋", "tier": "silver", "xp": 100, "category": "arbitrage"},
    {"slug": "execution-specialist", "name": "Execution Specialist", "description": "Simulated execution at 5+ different latencies", "icon": "⚡", "tier": "gold", "xp": 200, "category": "execution"},
    {"slug": "quiz-master", "name": "Quiz Master", "description": "Scored 100% on the finance quiz", "icon": "🏆", "tier": "platinum", "xp": 500, "category": "education"},
    {"slug": "false-edge-spotter", "name": "False Edge Spotter", "description": "Correctly identified a false arbitrage in Market Detective mode", "icon": "🕵️", "tier": "gold", "xp": 250, "category": "arbitrage"},
]

QUIZ_QUESTIONS = [
    {"id": "q1", "question": "If a YES contract is priced at $0.60, what is the implied probability?", "choices": [{"id": "a", "text": "40%"}, {"id": "b", "text": "60%"}, {"id": "c", "text": "160%"}, {"id": "d", "text": "Cannot determine"}], "correct": "b", "explanation": "In prediction markets, price ≈ implied probability. $0.60 implies 60% probability.", "concept": "implied_probability"},
    {"id": "q2", "question": "If YES=$0.47 and NO=$0.50, what is the theoretical edge per contract?", "choices": [{"id": "a", "text": "$0.03"}, {"id": "b", "text": "$0.47"}, {"id": "c", "text": "$0.97"}, {"id": "d", "text": "No edge"}], "correct": "a", "explanation": "Edge = $1.00 − ($0.47 + $0.50) = $0.03. Buying both guarantees $1 payout for $0.97 cost.", "concept": "single_venue_arbitrage"},
    {"id": "q3", "question": "Why might a 7% cross-venue spread NOT be arbitrage?", "choices": [{"id": "a", "text": "The spread is too small"}, {"id": "b", "text": "Contracts may have different settlement rules"}, {"id": "c", "text": "7% is always arbitrage"}, {"id": "d", "text": "The venues use different currencies"}], "correct": "b", "explanation": "Contract equivalence is critical. If venues define 'YES' differently or use different resolution sources, the price difference may be justified — not arbitrage.", "concept": "contract_equivalence"},
    {"id": "q4", "question": "What happens to an opportunity when liquidity is very low?", "choices": [{"id": "a", "text": "The edge increases"}, {"id": "b", "text": "Slippage makes execution unprofitable"}, {"id": "c", "text": "Nothing changes"}, {"id": "d", "text": "Fees decrease"}], "correct": "b", "explanation": "Low liquidity means your order will move the price significantly (slippage), potentially consuming the entire edge.", "concept": "liquidity"},
    {"id": "q5", "question": "What does the Kelly Criterion determine?", "choices": [{"id": "a", "text": "The best market to trade"}, {"id": "b", "text": "The optimal fraction of capital to wager"}, {"id": "c", "text": "The probability of winning"}, {"id": "d", "text": "Transaction costs"}], "correct": "b", "explanation": "Kelly determines how much of your capital to bet. It maximizes long-run growth while avoiding ruin.", "concept": "kelly_criterion"},
    {"id": "q6", "question": "What is the difference between gross edge and net edge?", "choices": [{"id": "a", "text": "They are the same thing"}, {"id": "b", "text": "Net edge subtracts transaction costs from gross edge"}, {"id": "c", "text": "Gross edge is always smaller"}, {"id": "d", "text": "Net edge ignores fees"}], "correct": "b", "explanation": "Net Edge = Gross Edge − Fees − Slippage − Spread Cost. Gross edge is theoretical; net edge is what you actually keep.", "concept": "net_edge"},
    {"id": "q7", "question": "What is slippage?", "choices": [{"id": "a", "text": "A type of trading fee"}, {"id": "b", "text": "The difference between expected and actual execution price"}, {"id": "c", "text": "The bid-ask spread"}, {"id": "d", "text": "A blockchain transaction delay"}], "correct": "b", "explanation": "Slippage occurs when your order is larger than the best price level and 'walks the book', getting filled at progressively worse prices.", "concept": "slippage"},
    {"id": "q8", "question": "Why does contract equivalence matter for cross-venue arbitrage?", "choices": [{"id": "a", "text": "It doesn't matter"}, {"id": "b", "text": "Different contracts on the same event may settle differently"}, {"id": "c", "text": "It only matters for sports markets"}, {"id": "d", "text": "All prediction market contracts are identical"}], "correct": "b", "explanation": "Two contracts on 'the same event' may differ in resolution source, settlement rules, or what counts as 'YES'. These differences can cause divergent payouts.", "concept": "contract_equivalence"},
    {"id": "q9", "question": "If the break-even probability for a trade is 65% and you estimate 70%, what is your probability edge?", "choices": [{"id": "a", "text": "5 percentage points"}, {"id": "b", "text": "70%"}, {"id": "c", "text": "35%"}, {"id": "d", "text": "7.7%"}], "correct": "a", "explanation": "Probability edge = Your estimate − Break-even = 70% − 65% = 5 percentage points. This drives your expected value.", "concept": "expected_value"},
    {"id": "q10", "question": "Why is half Kelly often preferred over full Kelly?", "choices": [{"id": "a", "text": "It's simpler to calculate"}, {"id": "b", "text": "Full Kelly is too aggressive when probabilities are uncertain"}, {"id": "c", "text": "Half Kelly always makes more money"}, {"id": "d", "text": "Kelly doesn't work for prediction markets"}], "correct": "b", "explanation": "Full Kelly assumes your probability estimate is exactly correct. In practice, estimates have uncertainty, and full Kelly can lead to extreme drawdowns.", "concept": "kelly_criterion"},
]

DAILY_CHALLENGES = [
    {"question": "Market A shows YES=$0.55 on Polymarket and YES=$0.62 on Kalshi. The gross spread is 7¢. After 1% fees on each leg and estimated 1.5% slippage, is this opportunity still profitable?", "choices": [{"id": "a", "text": "Yes — fees and slippage total about 3.5¢, leaving ~3.5¢ net edge"}, {"id": "b", "text": "No — costs exceed the gross edge"}, {"id": "c", "text": "Cannot determine without more information"}], "correct": "a", "explanation": "On a $100 trade: Gross edge ≈ $7. Fees ≈ $2 (1% × $100 × 2 legs). Slippage ≈ $1.50. Net ≈ $3.50. Profitable, but verify liquidity.", "concept": "net_edge"},
    {"question": "An opportunity shows a 12% gross edge but only $200 of available liquidity. Should you trade $1,000?", "choices": [{"id": "a", "text": "Yes — the edge is large enough"}, {"id": "b", "text": "No — trade size exceeds liquidity and slippage will be extreme"}, {"id": "c", "text": "Trade exactly $200"}], "correct": "b", "explanation": "Trading $1,000 into $200 of liquidity means you'd consume the entire book and face massive slippage. The edge would be completely consumed.", "concept": "liquidity"},
    {"question": "Two markets show identical event names but different resolution sources. Venue A resolves on 'official government data' and Venue B on 'media reports'. Are these equivalent?", "choices": [{"id": "a", "text": "Yes — same event"}, {"id": "b", "text": "No — different resolution sources can produce different outcomes"}, {"id": "c", "text": "It depends on the fee structure"}], "correct": "b", "explanation": "Media reports may declare a result before official data, or may differ from official results entirely. These are NOT equivalent contracts.", "concept": "contract_equivalence"},
]

DETECTIVE_SCENARIOS = [
    {"title": "The Phantom Edge", "description": "This market shows an 8% cross-venue spread. Investigate whether it's a real opportunity.", "clues": {"price_a": 0.45, "price_b": 0.53, "liquidity_a": 150, "liquidity_b": 45000, "fees": "1% per leg", "settlement_a": "AP projection", "settlement_b": "Official certified results"}, "verdict": "false_edge", "explanation": "Two problems: (1) Liquidity on Venue A is only $150 — you can't execute meaningfully. (2) Settlement sources differ — AP projection vs official results could resolve differently.", "lessons": ["Always check liquidity on BOTH sides", "Different settlement sources = different contracts"]},
    {"title": "The Real Deal", "description": "A 4% spread appeared 30 seconds ago with deep liquidity on both sides.", "clues": {"price_a": 0.58, "price_b": 0.62, "liquidity_a": 35000, "liquidity_b": 28000, "fees": "1% per leg", "settlement_a": "BLS official release", "settlement_b": "BLS official release"}, "verdict": "true_opportunity", "explanation": "Same settlement source, deep liquidity on both sides, and a 4% gross spread. After ~2.5% costs, approximately 1.5% net edge remains. Small but executable.", "lessons": ["Matching settlement sources increase equivalence confidence", "Deep liquidity enables execution"]},
    {"title": "The Fee Trap", "description": "An impressive 6% spread between venues. Looks profitable!", "clues": {"price_a": 0.50, "price_b": 0.56, "liquidity_a": 20000, "liquidity_b": 15000, "fees": "3% per leg (high-fee venue)", "settlement_a": "Same source", "settlement_b": "Same source"}, "verdict": "false_edge", "explanation": "With 3% fees per leg, total fee drag is ~6% — exactly the size of the gross spread. The edge vanishes entirely after costs.", "lessons": ["High fees can completely eliminate apparent opportunities", "Always compute NET edge, not just gross"]},
]

@router.get("/achievements")
async def get_achievements():
    return {"achievements": ACHIEVEMENTS, "unlocked": ["first-edge", "kelly-rookie"]}

@router.get("/quiz")
async def get_quiz():
    return {"questions": QUIZ_QUESTIONS, "total": len(QUIZ_QUESTIONS)}

@router.get("/daily-challenge")
async def get_daily_challenge():
    idx = datetime.utcnow().day % len(DAILY_CHALLENGES)
    return {"challenge": DAILY_CHALLENGES[idx], "date": datetime.utcnow().strftime("%Y-%m-%d")}

@router.get("/detective")
async def get_detective_scenarios():
    return {"scenarios": DETECTIVE_SCENARIOS}
