# Financial methodology (condensed)

Full formula objects live in `backend/app/engines/formulas.py` and are served at `GET /research/formulas` for Learn mode.

## Implied equity value

`MarketCap = IPO Price × Post-Issue Shares`

Post-issue shares are **estimated** as `offer_shares / (promoter_pre − promoter_post)` when both stakes exist. Otherwise multiples are not published. Offer size is not market cap: Tata Technologies’ ₹3,043 Cr OFS is not a ₹3,043 Cr company.

## Multiples

- **P/E** = Price / EPS, EPS = PAT_cr × 1e7 / shares. Undefined if PAT ≤ 0.
- **P/B** = Price / BVPS. More informative for financials.
- **EV** = Equity + Debt − Cash, cash default 0 (estimated).
- **EV/Sales** = EV / Revenue. Used when earnings are weak.
- **EV/EBITDA** withheld without EBITDA.
- **PEG** = (P/E) / earnings growth (decimal). Undefined if growth ≤ 0.
- **Premium** = IPO multiple / peer median − 1. Never auto-labelled good or bad.

Peers are prior-36-month same-sector IPOs with estimated mcap (no look-ahead).

## DCF laboratory

`EV = Σ FCF_t / (1+WACC)^t + TV/(1+WACC)^n`, `TV = FCF_{n+1}/(WACC−g)`.

FCF_t = PAT_t × (1 − reinvestment) under BULL/BASE/BEAR. This answers “what would have to be true”, not “this is the fair value”.

## GMP

`Expected listing price = Issue + GMP`  
`Expected return = GMP / Issue`  
`Error = actual listing-open return − expected return`

MAE, RMSE, directional accuracy, Pearson/Spearman, and R² versus the identity line (not OLS R²).

## Subscription

`Velocity_t = Sub_t − Sub_{t−1}`  
`Acceleration_t = Vel_t − Vel_{t−1}`  
Demand concentration = category shares and HHI on the last snapshot.

## Event study

`AR_it = R_it − R_nifty` (β = 1). CAR if the whole window exists.

## Backtest controls

Decision at listing. Features in `FORBIDDEN` that are post-listing returns are rejected. Two fills: listing open (secondary) vs allotment (optimistic). Costs as flat bps.
