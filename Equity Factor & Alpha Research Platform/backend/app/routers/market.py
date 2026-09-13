from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..config import DATA_DISCLAIMER
from ..database import get_db
from .. import models

router = APIRouter(prefix="/api/market", tags=["market"])

PULSE = [
    ("^NSEI", "NIFTY 50", "India's large-cap benchmark. The local risk factor when the book has NSE names."),
    ("^GSPC", "S&P 500", "US large-cap market factor. Most textbook betas are still estimated against this."),
    ("^IXIC", "NASDAQ", "Heavier tech/growth mix than the S&P — a crude growth-factor proxy."),
    ("INDIAVIX", "India VIX", "Implied vol on Nifty options. High readings usually coincide with factor leadership changes."),
    ("USDINR", "USD/INR", "For the India sleeve, a stronger dollar is often a risk-off tape."),
    ("^TNX", "10Y Treasury Yield", "Discount-rate shock. Growth and quality duration hurt when this rips higher."),
]


@router.get("/pulse")
def pulse(db: Session = Depends(get_db)):
    out = []
    for ticker, name, note in PULSE:
        rows = (
            db.query(models.Benchmark)
            .filter(models.Benchmark.ticker == ticker)
            .order_by(models.Benchmark.date.desc())
            .limit(40)
            .all()
        )
        rows = list(reversed(rows))
        if not rows:
            continue
        last = rows[-1].value
        prev = rows[-2].value if len(rows) > 1 else last
        out.append({
            "ticker": ticker,
            "name": name,
            "value": last,
            "change": last / prev - 1 if prev else 0,
            "spark": [r.value for r in rows],
            "note": note,
        })
    return {"disclaimer": DATA_DISCLAIMER, "series": out}
