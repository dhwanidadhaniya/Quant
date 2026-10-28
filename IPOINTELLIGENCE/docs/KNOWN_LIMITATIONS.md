# Known limitations

1. **GMP is unofficial.** It is not a SEBI-regulated market. Last GMP is often printed close to listing, so forecast difficulty is lower than a T-10 study would imply.
2. **No T-10 path** in the sourced extract. Volatility, jumps and reversals of GMP cannot be measured here.
3. **Day-3 books are often missing.** QIB/NII/Retail columns are last intra-issue snapshots. Final totals exist; category finals often do not. Do not treat QIB snapshot as the SEBI final QIB.
4. **Post-issue shares** are estimated from `(pre − post) promoter stake` when both exist. OFS vs fresh mix can bias that inversion. Multiples are withheld when the estimate is impossible.
5. **RHP financials** have mixed units in the scrape. Years with implausible PAT/revenue are dropped or flagged LOW. Largest sane revenue year is used as “latest”.
6. **No EBITDA / CFO / capex bridge.** EV/EBITDA is withheld. DCF uses PAT × (1 − reinvestment) — model output.
7. **Cash = 0 in EV** unless sourced. EV is biased up.
8. **Peer multiples** are *prior IPO transaction multiples* in the same sector over 36 months, not live trading comps, and only among names with estimated mcap.
9. **Event study** is market-adjusted with β = 1. IPOs have no pre-event window for a market model.
10. **Yahoo 30D/90D/1Y** are optional. Without them, post-listing alpha and calendar backtests at those horizons are empty — we do not impute them.
11. **Survivorship:** names Yahoo cannot resolve drop out of post-listing stats.
12. **Zomato / Eternal** is not in this Ghosh v18 extract. Absence is a dataset gap, not a zero return.
13. **Correlation ≠ causation.** Significant slopes are not tradable edges. Allotment rationing destroys naïve long-GMP strategies.
14. **Signal quality ≠ manipulation.** The label is about inconsistency of observables.
15. **Backtests** are event-time, equal-weight, with a flat bps cost. They are not a live book.
