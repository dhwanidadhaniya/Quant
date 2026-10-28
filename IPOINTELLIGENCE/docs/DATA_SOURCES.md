# Data sources

## Primary extract (ACTUAL)

Ghosh, S., Maji, A., Vardhan, N.H., Naskar, S.K. (2024).
*Experimenting with Multi-modal Information to Predict Success of Indian IPOs*.
arXiv:2412.16174.

Hugging Face dataset: [`sohomghosh/Indian_IPO_datasets`](https://huggingface.co/datasets/sohomghosh/Indian_IPO_datasets)

Files used:

- `ipo_mainline_final_data_v18.xlsx` — 418 NSE mainboard IPOs. Identity, issue structure, RHP-linked financials, daily subscription snapshots, NSE listing OHLC, Nifty/VIX at issue close.
- `GMP_data/GMP_Mainline_2019_2024YTD_Investorgrain_CLEAN.xlsx` — last published GMP (Investorgain), 208 rows, of which 164 match this universe.

**Licence:** CC-BY-NC-SA-4.0 (non-commercial). Cite the paper and dataset.

Original field collection is attributed by the authors to Chittorgarh-linked IPO pages and RHP text, plus market data around the close date.

## Listing returns (CALCULATED from ACTUAL)

`listing_return = NSE_Open / Final_Issue_Price − 1`

This is the conventional “listing pop” vs issue price using the **open**, not the close. Close-based return is stored separately.

## GMP (ACTUAL when joined)

Last rupee GMP from the Investorgain clean file. **Not** a T-10…T-1 series. Trajectories in the UI are sparse by construction.

Join keys: NSE ticker inside the GMP name string, else name, else listing date ± 4 days and issue price.

## Post-listing horizons (ACTUAL when Yahoo succeeds)

`python -m app.data.ingest` without `--no-yahoo` downloads `{TICKER}.NS` and `^NSEI` via yfinance. Cached at `backend/data/processed/yf_cache.parquet`. Yahoo frequently rate-limits; missing horizons stay null.

## What we refuse to invent

- Intra-week GMP paths
- EBITDA when the extract has only PAT
- Cash balances (EV treats cash as 0 and labels it)
- Post-issue share count when promoter stakes are missing (multiples withheld)
- Live “CMP” as if it were a streaming feed
