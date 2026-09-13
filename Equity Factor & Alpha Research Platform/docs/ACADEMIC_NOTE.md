# Equity Factor & Alpha Research Laboratory
### Academic note (undergraduate finance)

**Data shown is for educational/research purposes.** The price paths and ratios are a realistic historical-style sample constructed so that factor behaviour can be studied end-to-end. They are not a live market feed and must not be cited as vendor data.

---

## Abstract

This project is a working equity-factor research laboratory. A mixed universe of about seventy-five US and Indian listed companies is scored on six well-known characteristics — value, momentum, quality, size, growth and low volatility — then combined into a transparent weighted rank. Users can screen names, read a company through an investment lens, tilt the weights, construct a long-only book, and backtest the sleeve against S&P 500, Nifty 50 and NASDAQ, with equal-weight and cap-weight comparisons sitting next to the strategy path. Risk is reported with the usual identities (Sharpe, Sortino, Treynor, information ratio, VaR, CVaR, maximum drawdown). Market windows are labelled by regime so that a factor’s average is never the only sentence in the conclusion.

The claim is modest on purpose. We do not “find alpha”. We build a place where a finance student can *see* why a name scored 82, what that score is made of, and whether the leftover after beta still looks interesting once 2020 and 2022 are left in the sample.

---

## Introduction

Most student dashboards stop at a PE table and a line chart of a stock. Practitioners, even junior ones, are asked a different question: *what characteristic am I being paid for, and does that pay survive costs and regimes?* Factor investing is the language for that question. It is also easy to fake — a colourful “AI score” with no formula is not research.

This laboratory keeps the formula on the page. The Alpha Score is a weighted percentile. Jensen alpha is a regression leftover. They are not the same thing, and the interface refuses to blur them.

---

## Problem statement

Undergraduate courses teach CAPM, then Fama–French, then a slide on momentum. The jump to “build a book and test it” is usually a spreadsheet that nobody can audit. There is no shared place to:

1. rank a universe on several characteristics at once,
2. explain a rank in sentences a viva panel would accept,
3. construct and rebalance a long-only sleeve,
4. compare it with honest alternatives (benchmark, equal weight, cap weight),
5. watch the same sleeve through a crash and a hiking cycle.

That gap is the problem this project tries to close.

---

## Objectives

- Implement six academic-style factors with definitions, identities and limitations in the UI.
- Rank names with user-controlled weights; update ranking, exposure and risk together.
- Provide company research that reads like a note, not a marketing card.
- Backtest long-only sleeves with rebalancing, a flat cost, and labelled look-ahead.
- Report risk with standard formulae and a regime overlay.
- Keep the dataset honest: educational sample, never presented as live.

---

## Literature review (teaching set, not a journal survey)

Sharpe (1964) and Lintner (1965) give CAPM: expected return linear in beta. Fama and French (1993, 2015) add size, value, profitability and investment. Jegadeesh and Titman (1993) document 3–12 month momentum; Daniel and Moskowitz (2016) document the crash. Novy-Marx (2013) puts gross profitability in the conversation that industry now calls “quality”. Ang, Hodrick, Xing and Zhang (2006) and Baker, Bradley and Wurgler (2011) are the usual door into low-volatility. Frazzini and Pedersen (2014) betting-against-beta is the leveraged cousin. Asness, Moskowitz and Pedersen (2013) show value and momentum as a pair across markets. Cochrane’s “discount-rate variation” reading is the reminder that a high Sharpe in one decade is not a law of nature.

None of this is implemented as a full replication. The lab is a *teaching surface* over those papers.

---

## Factor investing theory

A factor is a characteristic associated with a return difference in the cross-section after you have some handle on the market. Two interpretations sit on the same chart:

- **Risk:** the characteristic is a proxy for something that hurts in bad times (distress, illiquidity, crash risk).
- **Behaviour / limits to arbitrage:** the characteristic is a persistent mispricing that is hard to lean against.

This project does not pick a church. Value can be distress. Momentum can be underreaction plus crowded stops. Quality can be a profitability premium or just “not junk”. The regime map is there so students stop averaging 2020 into 2023 and calling it a conclusion.

---

## Alpha generation

Two numbers live in the product:

1. **Alpha Score (0–100)**  
   `0.25 Value + 0.20 Momentum + 0.20 Quality + 0.15 Growth + 0.10 Size + 0.10 Low Vol`  
   (weights user-editable, then normalised). This is a research ranking.

2. **Jensen / CAPM alpha**  
   `α = Rp − [Rf + β(Rm − Rf)]`  
   estimated on the backtest path versus the chosen benchmark. This is a leftover.

Generating “alpha” in the second sense requires that the first score is *not* just leveraged market exposure. That is why beta, IR and the equal-weight/cap-weight cousins are on the same page as CAGR.

---

## Methodology

1. **Universe.** 50 US names, 25 India names. Recognisable, liquid, multi-sector. Mixing two markets in one rank is a shortcut and is flagged.
2. **Prices.** Daily business days 2 Jan 2020 – 31 Dec 2025, generated from a multi-factor return model with idiosyncratic noise and three baked-in windows (COVID air-pocket, 2022 bear, 2023–24 recovery). Momentum is shocked down in Feb–Mar 2020 on purpose.
3. **Fundamentals.** PE, PB, EV/EBITDA, ROE, ROA, margins, growth, leverage — correlated with the latent exposures so screens and scores tell the same story.
4. **Scores.** Cross-sectional percentile ranks, 0–100, as of sample end.
5. **Portfolios.** Long-only top-N (default 15), equal weight unless the builder says otherwise.
6. **Rebalance.** 21 / 63 / 252 sessions. Turnover charged at a flat cost (default 10 bps).
7. **Benchmarks.** Sample S&P 500, NASDAQ, Nifty 50 series generated alongside the book.

---

## Data

SQLite tables: companies, prices, financials, factor_scores, benchmarks, portfolios, holdings, backtests, research_notes.

A CSV snapshot of the universe is written to `datasets/universe.csv`. Nothing here should be pasted into a live model as if it were Bloomberg.

Rf is set to 4.2% as a sample-period stand-in. Dividends are not modelled separately; the price path is treated as a total-return approximation. That understates carry for high-yield names.

---

## Portfolio construction

Equal weight is a small-cap tilt. Cap weight is a size/momentum-of-size tilt. Factor weight concentrates in high scores and raises idiosyncratic risk. Sector caps in the builder are a reminder that 20 semiconductor names are one bet. Diversification is reported as `1 − HHI`.

---

## Backtesting methodology

Mark-to-model daily. Rebalance on a fixed session grid. Transaction cost = `cost × turnover`, turnover = half the L1 weight change. The engine also rebuilds an equal-weight and a cap-weight path on the same names so “the factor worked” has to beat two lazy cousins, not only cash.

**Look-ahead bias:** names are ranked on full-sample scores. A cleaner design would re-rank every rebalance on data known at t. We left the bias in and labelled it, because hiding it would be worse than admitting it.

---

## Risk measurement

```
Return     = (P1 − P0 + D) / P0     (D ≈ 0 in this seed)
CAGR       = (E/B)^(1/n) − 1
Sharpe     = (Rp − Rf) / σp
Sortino    = (Rp − Rf) / σ_down
Beta       = Cov(Rp, Rm) / Var(Rm)
Alpha      = Rp − [Rf + β(Rm − Rf)]
Treynor    = (Rp − Rf) / β
TE         = σ(Rp − Rb)
IR         = (Rp − Rb) / TE
MDD        = min(P / runningmax − 1)
VaR_95     = quantile_5%(daily returns)
CVaR_95    = mean of those tail days
```

VaR here is historical, not parametric. One March 2020 week is not a distribution.

---

## Results (how to read them)

Results live in the running app, not in a frozen table in this PDF-style note. A fair student write-up should report, for each sleeve:

- CAGR, vol, Sharpe, MDD
- alpha and beta versus a *named* benchmark
- the same numbers on equal-weight and cap-weight
- the regime row for high-vol and 2022
- turnover

If momentum’s high-vol cell is not ugly, something in the engine is wrong. That check is part of the viva.

---

## Interpretation

A high Alpha Score means the name is aligned with the weights you typed. It does not mean next year’s return is owed to you. A high Sharpe on a window that excludes 2020 is a compliment you paid yourself. Quality outperforming in high vol is consistent with the usual defensive story; growth outperforming in 2020–21 and lagging in 2022 is the duration story. None of this is original. Seeing it on *your* book is the exercise.

---

## Limitations

- Synthetic-realistic data, not CRSP/Compustat/CMIE
- Survivorship: names do not delist
- Look-ahead in scores
- Two countries, one rank
- Flat costs, no market impact
- No point-in-time fundamentals
- Regime labels are judgement
- Factor crowding is discussed, not modelled as a capacity function
- **Backtests are not forecasts. There is no guaranteed alpha.**

---

## Future scope

Point-in-time scoring, live vendor integration, split India/US books, Fama–French attribution regressions, cost functions that scale with ADV, and a proper skip-month momentum definition.

---

## Conclusion

The laboratory is a place to practice the sentence a junior researcher actually needs: *this book is a tilt toward X, it has this beta, this hole, this behaviour in 2022, and after costs the leftover is Y — which may or may not survive the next regime.* That sentence is the deliverable. A glowing dashboard is not.

---

## References

- Ang, A., Hodrick, R., Xing, Y. & Zhang, X. (2006). The cross-section of volatility and expected returns. *Journal of Finance*.
- Asness, C., Moskowitz, T. & Pedersen, L. (2013). Value and momentum everywhere. *Journal of Finance*.
- Baker, M., Bradley, B. & Wurgler, J. (2011). Benchmarks as limits to arbitrage. *Financial Analysts Journal*.
- Daniel, K. & Moskowitz, T. (2016). Momentum crashes. *Journal of Financial Economics*.
- Fama, E. & French, K. (1993, 2015). Common risk factors; A five-factor asset pricing model. *Journal of Financial Economics*.
- Frazzini, A. & Pedersen, L. (2014). Betting against beta. *Journal of Financial Economics*.
- Jegadeesh, N. & Titman, S. (1993). Returns to buying winners and selling losers. *Journal of Finance*.
- Novy-Marx, R. (2013). The other side of value. *Journal of Financial Economics*.
- Sharpe, W. (1964). Capital asset prices. *Journal of Finance*.
- Sharpe, W. (1991). The arithmetic of active management. *Financial Analysts Journal*.
