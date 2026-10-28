# Interview guide

## 30 seconds

I built a research terminal on 418 Indian mainboard IPOs to measure whether grey-market premium, subscription, and IPO valuation line up with listing outcomes. Last GMP tracks listing-open returns tightly in this extract (ρ ≈ 0.92, directional accuracy ≈ 82% on 164 paired names), but that is a short-horizon unofficial print — not a law, and not a proof of market quality.

## 1 minute

The product is finance-first: every metric has a formula, a limitation, and a data-type tag. I do not treat offer size as market cap; P/E is shown only when post-issue shares can be inferred from promoter dilution. DCF is a scenario lab on PAT-to-FCF conversion. The hero page is GMP vs reality: error, MAE/RMSE, and segmented reliability by size, book, sector and regime. Models are split by listing date so later IPO waves are out of sample. Backtests reject look-ahead fields.

## 3 minutes

Walk Pulse → GMP vs Reality → When GMP Works → one name (Tata Technologies). Show: issue vs OFS, estimated mcap, ~43× P/E vs sector IPO median, GMP ₹475 / 95% implied vs +140% open, signal-quality disclaimer. Then Quant Lab OLS of GMP on listing return with HC3 errors. Then Backtest Lab strategy A and the warnings (allotment, event-time, costs).

## Why GMP?

It is the most widely cited unofficial Indian IPO signal and the most abused in retail narratives. The research question is *when it is informative*, not whether it is “the truth”.

## Why might GMP fail?

Thin OTC, rumours, last-day QIB that the grey market has not digested, market gap overnight, and the mechanical fact that last GMP is often measured hours before the open.

## Does subscription predict listing?

Test it — do not assume. In this extract, final total and GMP are collinear with listing pops; category snapshots are biased by missing day-3 QIB. The demand module reports Pearson/Spearman/OLS by QIB, NII, retail separately.

## Why separate QIB?

QIBs are often treated as smart money. Last-day QIB filling is also how many Indian books actually clear. Missing last prints can make QIB look weaker than it was. The code flags `path_incomplete`.

## Why DCF / EV/EBITDA / P/E?

DCF is the coherent cash-flow question; here it is a sensitivity tool because CFO/capex are missing. EV/EBITDA is withheld without EBITDA. P/E is the earnings question and fails for losses and cyclicals.

## Abnormal return?

Return minus a benchmark. Default is market-adjusted (β=1) because IPOs have no estimation window. That assumption is stated.

## Look-ahead / overfitting

Chronological split. No post-listing features in models or backtest predicates. Tree depth capped. Presets specified before fishing. Multiple-testing warning in the UI.

## What would break the model?

A GMP definition change, a regime with no grey market, using offer size as mcap, imputing missing day-3 QIB, or treating event-time means as CAGR.
