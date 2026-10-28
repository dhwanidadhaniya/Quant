from __future__ import annotations

import json
import sqlite3
import threading
from pathlib import Path

import pandas as pd

from app.config import ROOT
from app.mathutil import clean


class Database:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        self._lock = threading.Lock()
        self.conn = sqlite3.connect(path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._init()

    def close(self) -> None:
        with self._lock:
            self.conn.close()

    def _init(self) -> None:
        with self._lock:
            self.conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS experiments (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    config_hash TEXT,
                    config_json TEXT,
                    result_json TEXT,
                    summary_json TEXT,
                    falsification_json TEXT,
                    status TEXT,
                    provider TEXT,
                    created_at TEXT,
                    engine_version TEXT
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    experiment_id TEXT,
                    split TEXT,
                    seed INTEGER,
                    payload_json TEXT
                );
                CREATE TABLE IF NOT EXISTS quotes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    experiment_id TEXT,
                    session_id TEXT,
                    split TEXT,
                    round_idx INTEGER,
                    agent_id TEXT,
                    model TEXT,
                    temperature REAL,
                    persona TEXT,
                    prompt_version TEXT,
                    private_signal REAL,
                    signal_error REAL,
                    bid REAL,
                    ask REAL,
                    size REAL,
                    accepted INTEGER,
                    inventory REAL,
                    cash REAL,
                    pnl_vs_mid REAL,
                    error TEXT,
                    raw_response TEXT,
                    news_event TEXT,
                    news_magnitude REAL,
                    true_value REAL,
                    prev_midpoint REAL,
                    last_trade REAL
                );
                CREATE TABLE IF NOT EXISTS trades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    experiment_id TEXT,
                    session_id TEXT,
                    split TEXT,
                    round_idx INTEGER,
                    buyer_id TEXT,
                    seller_id TEXT,
                    price REAL,
                    quantity REAL,
                    aggressor_side TEXT
                );
                CREATE TABLE IF NOT EXISTS decisions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    experiment_id TEXT,
                    session_id TEXT,
                    split TEXT,
                    round_idx INTEGER,
                    rule_triggered TEXT,
                    action TEXT,
                    price REAL,
                    quantity REAL,
                    expected_edge REAL,
                    realized_pnl REAL,
                    input_state_json TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_sessions_exp ON sessions(experiment_id);
                CREATE INDEX IF NOT EXISTS idx_quotes_exp ON quotes(experiment_id);
                CREATE INDEX IF NOT EXISTS idx_hash ON experiments(config_hash);
                """
            )
            self.conn.commit()

    def find_by_hash(self, config_hash: str) -> dict | None:
        with self._lock:
            row = self.conn.execute(
                "SELECT id, result_json, status FROM experiments WHERE config_hash = ? AND status = 'complete' ORDER BY created_at DESC LIMIT 1",
                (config_hash,),
            ).fetchone()
        if row is None or not row["result_json"]:
            return None
        payload = json.loads(row["result_json"])
        payload["cached"] = True
        payload["id"] = row["id"]
        return payload

    def save_experiment(
        self,
        *,
        experiment_id: str,
        name: str,
        config_hash: str,
        config: dict,
        result: dict,
        sessions: list[dict],
        provider: str,
        engine_version: str,
    ) -> None:
        summary = {
            "id": experiment_id,
            "name": name,
            "created_at": result["created_at"],
            "status": "complete",
            "provider": provider,
            "model": result["protocol"]["model"],
            "frozen_variant": result["protocol"]["frozen_variant"],
            "test_mean_pnl": result["performance"]["test"]["mean_pnl"],
            "test_ci_low": result["performance"]["test"]["bootstrap_ci95"]["low"],
            "test_ci_high": result["performance"]["test"]["bootstrap_ci95"]["high"],
            "train_sessions": config["train_sessions"],
            "test_sessions": config["test_sessions"],
            "rounds": config["rounds"],
            "agents": config["agents"],
            "seed": config["seed"],
        }
        with self._lock:
            self.conn.execute(
                """
                INSERT INTO experiments
                (id, name, config_hash, config_json, result_json, summary_json, falsification_json, status, provider, created_at, engine_version)
                VALUES (?, ?, ?, ?, ?, ?, NULL, 'complete', ?, ?, ?)
                """,
                (
                    experiment_id,
                    name,
                    config_hash,
                    json.dumps(clean(config)),
                    json.dumps(clean(result)),
                    json.dumps(clean(summary)),
                    provider,
                    result["created_at"],
                    engine_version,
                ),
            )
            self._insert_sessions_unlocked(experiment_id, sessions)
            self.conn.commit()

    def add_sessions(self, experiment_id: str, sessions: list[dict]) -> None:
        with self._lock:
            self._insert_sessions_unlocked(experiment_id, sessions)
            self.conn.commit()

    def _insert_sessions_unlocked(self, experiment_id: str, sessions: list[dict]) -> None:
        quote_rows = []
        trade_rows = []
        decision_rows = []
        session_rows = []
        for session in sessions:
            session_rows.append(
                (
                    session["id"],
                    experiment_id,
                    session["split"],
                    session["seed"],
                    json.dumps(clean(session)),
                )
            )
            for rnd in session["rounds"]:
                for quote in rnd["quotes"]:
                    quote_rows.append(
                        (
                            experiment_id,
                            session["id"],
                            session["split"],
                            rnd["round"],
                            quote["agent_id"],
                            quote["model"],
                            quote["temperature"],
                            quote["persona"],
                            quote["prompt_version"],
                            quote["private_signal"],
                            quote["signal_error"],
                            quote["bid"],
                            quote["ask"],
                            quote["size"],
                            1 if quote["accepted"] else 0,
                            quote["inventory"],
                            quote["cash"],
                            quote["pnl_vs_mid"],
                            quote["error"],
                            quote["raw_response"],
                            rnd["news_event"],
                            rnd["news_magnitude"],
                            rnd["true_value"],
                            quote["prev_midpoint"],
                            quote["last_trade"],
                        )
                    )
                for trade in rnd["trades"]:
                    trade_rows.append(
                        (
                            experiment_id,
                            session["id"],
                            session["split"],
                            rnd["round"],
                            trade["buyer_id"],
                            trade["seller_id"],
                            trade["price"],
                            trade["quantity"],
                            trade["aggressor_side"],
                        )
                    )
                decision = rnd.get("strategy")
                if decision:
                    decision_rows.append(
                        (
                            experiment_id,
                            session["id"],
                            session["split"],
                            rnd["round"],
                            decision.get("rule_triggered"),
                            decision.get("action"),
                            decision.get("price"),
                            decision.get("quantity"),
                            decision.get("expected_edge"),
                            decision.get("realized_pnl"),
                            json.dumps(clean(decision.get("input_state"))),
                        )
                    )
        self.conn.executemany(
            "INSERT INTO sessions (id, experiment_id, split, seed, payload_json) VALUES (?, ?, ?, ?, ?)",
            session_rows,
        )
        self.conn.executemany(
            """
            INSERT INTO quotes (
                experiment_id, session_id, split, round_idx, agent_id, model, temperature, persona,
                prompt_version, private_signal, signal_error, bid, ask, size, accepted, inventory,
                cash, pnl_vs_mid, error, raw_response, news_event, news_magnitude, true_value,
                prev_midpoint, last_trade
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            quote_rows,
        )
        self.conn.executemany(
            """
            INSERT INTO trades (
                experiment_id, session_id, split, round_idx, buyer_id, seller_id, price, quantity, aggressor_side
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            trade_rows,
        )
        self.conn.executemany(
            """
            INSERT INTO decisions (
                experiment_id, session_id, split, round_idx, rule_triggered, action, price, quantity,
                expected_edge, realized_pnl, input_state_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            decision_rows,
        )

    def list_experiments(self) -> list[dict]:
        with self._lock:
            rows = self.conn.execute(
                "SELECT summary_json FROM experiments ORDER BY created_at DESC"
            ).fetchall()
        return [json.loads(row["summary_json"]) for row in rows if row["summary_json"]]

    def get_result(self, experiment_id: str) -> dict | None:
        with self._lock:
            row = self.conn.execute("SELECT result_json FROM experiments WHERE id = ?", (experiment_id,)).fetchone()
        if row is None or not row["result_json"]:
            return None
        return json.loads(row["result_json"])

    def get_record(self, experiment_id: str) -> dict | None:
        with self._lock:
            row = self.conn.execute("SELECT * FROM experiments WHERE id = ?", (experiment_id,)).fetchone()
        if row is None:
            return None
        return {key: row[key] for key in row.keys()}

    def save_falsification(self, experiment_id: str, payload: dict) -> None:
        with self._lock:
            self.conn.execute(
                "UPDATE experiments SET falsification_json = ? WHERE id = ?",
                (json.dumps(clean(payload)), experiment_id),
            )
            self.conn.commit()

    def get_falsification(self, experiment_id: str) -> dict | None:
        with self._lock:
            row = self.conn.execute(
                "SELECT falsification_json FROM experiments WHERE id = ?",
                (experiment_id,),
            ).fetchone()
        if row is None or not row["falsification_json"]:
            return None
        return json.loads(row["falsification_json"])

    def get_session(self, session_id: str) -> dict | None:
        with self._lock:
            row = self.conn.execute("SELECT payload_json FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if row is None:
            return None
        return json.loads(row["payload_json"])

    def list_quotes(self, experiment_id: str, limit: int, offset: int, failures_only: bool) -> dict:
        clause = "AND error IS NOT NULL" if failures_only else ""
        with self._lock:
            total = self.conn.execute(
                f"SELECT COUNT(*) AS n FROM quotes WHERE experiment_id = ? {clause}",
                (experiment_id,),
            ).fetchone()["n"]
            rows = self.conn.execute(
                f"""
                SELECT session_id, split, round_idx, agent_id, model, persona, prompt_version,
                       private_signal, signal_error, bid, ask, size, accepted, inventory, error,
                       news_event, news_magnitude, true_value
                FROM quotes WHERE experiment_id = ? {clause}
                ORDER BY id LIMIT ? OFFSET ?
                """,
                (experiment_id, limit, offset),
            ).fetchall()
        return {"total": total, "limit": limit, "offset": offset, "rows": [dict(row) for row in rows]}

    def export_parquet(self, experiment_id: str) -> list[str]:
        dest = ROOT / "data" / "exports" / experiment_id
        dest.mkdir(parents=True, exist_ok=True)
        queries = {
            "quotes": "SELECT * FROM quotes WHERE experiment_id = ?",
            "trades": "SELECT * FROM trades WHERE experiment_id = ?",
            "decisions": "SELECT * FROM decisions WHERE experiment_id = ?",
            "sessions": "SELECT id, experiment_id, split, seed FROM sessions WHERE experiment_id = ?",
        }
        files = []
        with self._lock:
            for name, sql in queries.items():
                frame = pd.read_sql_query(sql, self.conn, params=(experiment_id,))
                path = dest / f"{name}.parquet"
                frame.to_parquet(path, index=False)
                files.append(str(path))
        return files
