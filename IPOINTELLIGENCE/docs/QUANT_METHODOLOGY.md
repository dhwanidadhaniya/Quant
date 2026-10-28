# Quantitative methodology

- Pearson and Spearman on pairwise-complete observations.
- OLS with **HC3** robust standard errors; 95% CIs; residual mean/sd.
- R² vs identity for GMP is `1 − SSE(actual, gmp_implied)/SST(actual)`, not an OLS R².
- Predictive models: median impute + scale inside a sklearn pipeline fit on the **training** chronological fold only.
- Split: first 75% of listing dates train, last 25% test.
- Logistic on listing-pop sign.
- Event-study t-stats ignore same-week cross-correlation (stated).
- Backtest rejects any predicate on post-listing returns.
