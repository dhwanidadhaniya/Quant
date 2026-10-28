import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.config import get_settings
from app.schemas import ExperimentConfig
from app.sim.experiment import run_experiment_blocking
from app.storage.db import Database


def main() -> None:
    settings = get_settings()
    db = Database(settings.database_path)
    result = run_experiment_blocking(ExperimentConfig(), settings, db)
    test = result["performance"]["test"]
    print(result["id"])
    print(result["protocol"]["frozen_variant"])
    print(test["mean_pnl"], test["bootstrap_ci95"])
    db.close()


if __name__ == "__main__":
    main()
