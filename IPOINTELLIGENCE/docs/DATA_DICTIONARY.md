# Data dictionary (selected)

| Field | Type | Meaning |
|---|---|---|
| id / ticker | ACTUAL | NSE symbol, lower-cased id |
| issue_price | ACTUAL | Final issue price |
| listing_open | ACTUAL | NSE listing open |
| listing_return | CALCULATED | open/issue − 1 |
| gmp / gmp_pct | ACTUAL / CALCULATED | last GMP ₹ and /issue |
| gmp_error | CALCULATED | listing_return − gmp_pct |
| sub_total | ACTUAL | final times subscribed |
| sub_qib/nii/retail | ACTUAL snapshot | last daily category print |
| post_issue_shares | ESTIMATED or missing | see methodology |
| pe / pe_premium | CALCULATED | only if shares estimated |
| fund_quality | flag | HIGH/MEDIUM/LOW |
| signal | MODEL overlay | consistency, not manipulation |
| ret_30d … ret_1y | ACTUAL if Yahoo | from listing-open snapshot |
