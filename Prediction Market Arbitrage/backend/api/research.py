"""Research API — notes, observations, formulas, glossary."""
from fastapi import APIRouter
router = APIRouter()

OBSERVATIONS = [
    {"number": 1, "title": "Gross vs Net Edge", "content": "The largest gross spread did not always generate the largest net edge. Transaction costs materially compressed many opportunities.", "type": "finding", "concept": "transaction_costs"},
    {"number": 2, "title": "Liquidity Constraint", "content": "Liquidity appears to be a major constraint on executable arbitrage. Many apparent opportunities exist only at illiquid price levels.", "type": "finding", "concept": "liquidity"},
    {"number": 3, "title": "Contract Equivalence", "content": "Contract wording can make apparently identical markets economically different. Settlement rules caused several opportunities to be non-equivalent.", "type": "mistake", "concept": "contract_equivalence"},
    {"number": 4, "title": "Cost Compression", "content": "Transaction costs materially compress theoretical opportunities. The median gross opportunity was 4.2%, but the median NET opportunity was 1.1%.", "type": "finding", "concept": "fees"},
    {"number": 5, "title": "Duration Matters", "content": "Opportunities with the longest duration were not the most profitable — they often persisted because liquidity was too thin to exploit.", "type": "insight", "concept": "duration"},
    {"number": 6, "title": "Category Effects", "content": "Political markets showed more persistent pricing discrepancies than economic indicator markets, possibly due to less-informed trading.", "type": "finding", "concept": "efficiency"},
    {"number": 7, "title": "Slippage Underestimation", "content": "We initially used a linear slippage model, which massively understated slippage for large orders. The square-root model is standard in market microstructure.", "type": "mistake", "concept": "slippage"},
    {"number": 8, "title": "Kelly Sensitivity", "content": "Full Kelly produced spectacular returns in the backtest but with enormous drawdowns. Half Kelly was more robust to probability estimation errors.", "type": "finding", "concept": "kelly"},
    {"number": 9, "title": "Fee Structure Asymmetry", "content": "Different fee structures across venues (taker vs maker) significantly affected which direction was optimal for execution.", "type": "insight", "concept": "fees"},
    {"number": 10, "title": "Convergence Speed", "content": "Prices converged faster in high-liquidity markets (~15 seconds) vs low-liquidity markets (~5+ minutes), suggesting liquidity providers arbitrage away the difference.", "type": "finding", "concept": "efficiency"},
]

FORMULAS = [
    {"name": "Implied Probability", "formula": "p ≈ Price", "explanation": "In prediction markets, the contract price approximates the market's implied probability.", "variables": [{"symbol": "p", "meaning": "Implied probability"}, {"symbol": "Price", "meaning": "Contract price ($0-$1)"}], "example": "Price = $0.62 → Implied probability = 62%", "common_mistake": "Treating price as exact probability. Prices include risk premia and liquidity effects."},
    {"name": "Single-Venue Edge", "formula": "Edge = 1 − (YES + NO)", "explanation": "In binary markets, YES + NO should equal $1. Any discount represents theoretical edge.", "variables": [{"symbol": "YES", "meaning": "YES contract price"}, {"symbol": "NO", "meaning": "NO contract price"}], "example": "YES=$0.47, NO=$0.50 → Edge = 1 − 0.97 = $0.03", "common_mistake": "Forgetting to subtract fees on BOTH legs."},
    {"name": "Cross-Venue Spread", "formula": "Spread = |P_A − P_B|", "explanation": "The absolute price difference between two venues on the same event.", "variables": [{"symbol": "P_A", "meaning": "Price on Venue A"}, {"symbol": "P_B", "meaning": "Price on Venue B"}], "example": "Polymarket=$0.55, Kalshi=$0.62 → Spread = $0.07", "common_mistake": "Assuming spread = profit. Spread is GROSS — costs must be subtracted."},
    {"name": "Percentage Divergence", "formula": "Div% = (P_high − P_low) / P_low × 100", "explanation": "Normalizes the spread relative to the lower price for comparability.", "variables": [{"symbol": "P_high", "meaning": "Higher price"}, {"symbol": "P_low", "meaning": "Lower price"}], "example": "$0.62 vs $0.55 → (0.07/0.55)×100 = 12.7%", "common_mistake": "Comparing absolute spreads across markets at different price levels."},
    {"name": "Expected Value", "formula": "EV = p × R − C", "explanation": "The average outcome if you could repeat the trade infinitely.", "variables": [{"symbol": "p", "meaning": "Probability of winning"}, {"symbol": "R", "meaning": "Reward if correct"}, {"symbol": "C", "meaning": "Cost of the position"}], "example": "p=0.68, R=$0.38, C=$0.62 → EV = 0.68×0.38 − 0.32×0.62 = +$0.06", "common_mistake": "Using the market's probability instead of YOUR probability."},
    {"name": "Kelly Criterion", "formula": "f* = (bp − q) / b", "explanation": "The fraction of capital that maximizes long-run geometric growth.", "variables": [{"symbol": "f*", "meaning": "Optimal fraction of capital"}, {"symbol": "b", "meaning": "Odds received (payout/cost − 1)"}, {"symbol": "p", "meaning": "Probability of winning"}, {"symbol": "q", "meaning": "Probability of losing (1−p)"}], "example": "p=0.68, price=$0.62, b=0.613 → f*=15.8%", "common_mistake": "Using full Kelly with uncertain probabilities. Use half or quarter Kelly."},
    {"name": "Return on Investment", "formula": "ROI = Profit / Capital × 100%", "explanation": "How much you earned relative to what you invested.", "variables": [{"symbol": "Profit", "meaning": "Net profit ($)"}, {"symbol": "Capital", "meaning": "Capital invested ($)"}], "example": "Profit=$47, Capital=$1000 → ROI=4.7%", "common_mistake": "Comparing ROI without adjusting for holding period."},
    {"name": "Maximum Drawdown", "formula": "MDD = (Peak − Trough) / Peak", "explanation": "The largest peak-to-trough decline in portfolio value.", "variables": [{"symbol": "Peak", "meaning": "Highest portfolio value before decline"}, {"symbol": "Trough", "meaning": "Lowest value during decline"}], "example": "Peak=$10,500, Trough=$9,200 → MDD=12.4%", "common_mistake": "Ignoring drawdown entirely. A strategy with high returns but 50% drawdown is very risky."},
]

GLOSSARY = {
    "arbitrage": {"definition": "Simultaneously buying and selling equivalent assets to profit from price differences.", "why_matters": "The core concept — prediction markets may price the same event differently.", "formula": "Profit = Price_high − Price_low − Costs", "example": "Buy YES at $0.55 on Polymarket, sell YES at $0.62 on Kalshi.", "common_mistake": "Treating every price difference as arbitrage without checking contract equivalence."},
    "implied_probability": {"definition": "The probability of an event implied by the market price of a contract.", "why_matters": "Converts prices into probabilities for comparison across venues.", "formula": "p ≈ Price", "example": "YES price = $0.62 implies 62% probability.", "common_mistake": "Assuming implied probability equals true probability."},
    "spread": {"definition": "The difference between two prices — either bid/ask or cross-venue.", "why_matters": "Represents either the cost of trading (bid-ask) or the potential edge (cross-venue).", "formula": "Spread = Ask − Bid (or |P_A − P_B|)", "example": "Best bid $0.54, best ask $0.56 → spread = $0.02", "common_mistake": "Confusing bid-ask spread (cost) with cross-venue spread (opportunity)."},
    "slippage": {"definition": "The difference between expected execution price and actual execution price.", "why_matters": "Reduces the edge you can capture, especially for larger trades.", "formula": "Slippage ≈ σ × √(OrderSize / Liquidity)", "example": "$1,000 order in $25,000 liquidity → ~2% slippage", "common_mistake": "Ignoring slippage when the order is large relative to available liquidity."},
    "liquidity": {"definition": "The ability to buy or sell without significantly impacting the price.", "why_matters": "Determines the maximum trade size and execution quality.", "formula": "Measured by order book depth, volume, and bid-ask spread", "example": "$50,000 total depth → can comfortably trade ~$5,000", "common_mistake": "Assuming quoted price is available for any trade size."},
    "kelly_criterion": {"definition": "A formula that determines the optimal fraction of capital to wager.", "why_matters": "Prevents over-betting (ruin) and under-betting (missed growth).", "formula": "f* = (bp − q) / b", "example": "68% edge, price $0.62 → Kelly says bet 15.8% of capital", "common_mistake": "Using full Kelly with uncertain probability estimates."},
    "expected_value": {"definition": "The average outcome of a decision if repeated many times.", "why_matters": "Determines whether a trade is worth taking in the long run.", "formula": "EV = p × Reward − (1−p) × Cost", "example": "68% chance of winning $0.38, 32% chance of losing $0.62 → EV = +$0.06", "common_mistake": "Positive EV doesn't mean every trade wins — you need many trades."},
    "order_book": {"definition": "A list of all buy and sell orders at various prices.", "why_matters": "Shows the true market structure — where liquidity exists and at what prices.", "formula": "Best Bid / Best Ask / Spread / Depth", "example": "Bid: $0.54 (400 contracts), Ask: $0.56 (300 contracts)", "common_mistake": "Only looking at best bid/ask without checking depth behind them."},
    "market_maker": {"definition": "A participant who provides liquidity by posting both buy and sell orders.", "why_matters": "Market makers profit from the spread and provide liquidity to other traders.", "formula": "MM Profit ≈ Spread × Volume − Inventory Risk", "example": "Bidding $0.54 and asking $0.56, earning $0.02 per round trip.", "common_mistake": "Assuming market makers always win — they face adverse selection risk."},
    "overround": {"definition": "When YES + NO prices sum to more than $1.00, representing the venue's implicit fee.", "why_matters": "A positive overround means the venue takes a cut; negative overround = potential arbitrage.", "formula": "Overround = (YES + NO) − 1.0", "example": "YES=$0.52, NO=$0.51 → Overround = 3%", "common_mistake": "Ignoring the overround when comparing probabilities across venues."},
    "drawdown": {"definition": "The peak-to-trough decline in portfolio value.", "why_matters": "Measures the worst-case loss you'd experience.", "formula": "DD = (Peak − Trough) / Peak", "example": "Portfolio drops from $10,500 to $9,200 → 12.4% drawdown", "common_mistake": "Focusing only on returns without considering drawdown risk."},
    "net_edge": {"definition": "The edge remaining after all transaction costs are subtracted.", "why_matters": "This is what actually matters — gross edge is meaningless if costs consume it.", "formula": "Net Edge = Gross Edge − Fees − Slippage − Spread Cost", "example": "Gross: 7¢, Fees: 2¢, Slippage: 1.5¢ → Net: 3.5¢", "common_mistake": "Confusing gross edge with profit."},
}

@router.get("/research/observations")
async def get_observations():
    return {"observations": OBSERVATIONS}

@router.get("/research/formulas")
async def get_formulas():
    return {"formulas": FORMULAS}

@router.get("/research/glossary")
async def get_glossary():
    return {"glossary": GLOSSARY}

@router.get("/research/glossary/{term}")
async def get_glossary_term(term: str):
    entry = GLOSSARY.get(term)
    if entry:
        return {"term": term, **entry}
    return {"error": f"Term '{term}' not found"}
