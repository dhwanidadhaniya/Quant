# Methodology notes (lab copy)

## Default alpha weights

| Sleeve | Weight | Characteristic |
| --- | --- | --- |
| Value | 25% | cheap vs expensive (PE, PB, EY, EV/EBITDA) |
| Momentum | 20% | 12m / 6m relative return |
| Quality | 20% | ROE, ROA, less leverage |
| Growth | 15% | revenue & EPS growth |
| Size | 10% | smaller cap scores higher |
| Low vol | 10% | lower realised σ scores higher |

Weights are normalised to 1 if the sliders do not sum to 100.

## What the seed is doing

Daily residual:

```
r_i,t = 0.00012
      + 0.85 mkt_t
      + 0.35 v_i VAL_t
      + 0.40 m_i MOM_t
      + 0.30 q_i QUAL_t
      + 0.25 s_i SIZE_t
      + 0.35 g_i GR_t
      + 0.30 l_i LV_t
      + ε_i,t
```

Loadings `v_i …` are sector-tilted and stable. That is why a quality sleeve is not random noise, and why Mar 2020 can still knock momentum over.

## Biases we are not pretending to have solved

Look-ahead, survivorship, mixed-currency book, no dividends, flat costs. If a report ignores these, mark it down.
