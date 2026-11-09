"""Persistência em SQLite: configurações, presets de rosto e log de eventos."""

from __future__ import annotations

import json
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any

SCHEMA = """
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS presets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
    appearance TEXT NOT NULL,
    factory    INTEGER NOT NULL DEFAULT 0,
    category   TEXT NOT NULL DEFAULT 'Meus presets',
    description TEXT NOT NULL DEFAULT '',
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    ts      REAL NOT NULL,
    level   TEXT NOT NULL,
    source  TEXT NOT NULL,
    message TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
CREATE TABLE IF NOT EXISTS lost_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    place       TEXT NOT NULL DEFAULT '',
    found_on    TEXT NOT NULL,
    returned    INTEGER NOT NULL DEFAULT 0,
    returned_to TEXT NOT NULL DEFAULT '',
    returned_at REAL,
    created_at  REAL NOT NULL
);
"""

LOST_FIELDS = ("name", "description", "place", "found_on", "returned", "returned_to", "returned_at")

MAX_EVENTS = 5000


class DuplicateName(Exception):
    pass


class Database:
    def __init__(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        with self._lock:
            self._conn.executescript(SCHEMA)
            self._migrate()
            self._conn.commit()

    def _migrate(self) -> None:
        """Colunas adicionadas depois da v0.1 (bancos antigos não têm)."""
        columns = {r["name"] for r in self._conn.execute("PRAGMA table_info(presets)")}
        if "category" not in columns:
            self._conn.execute("ALTER TABLE presets ADD COLUMN category TEXT NOT NULL DEFAULT 'Meus presets'")
        if "description" not in columns:
            self._conn.execute("ALTER TABLE presets ADD COLUMN description TEXT NOT NULL DEFAULT ''")

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    # ---------- configurações ----------

    def get_setting(self, key: str, default: Any = None) -> Any:
        with self._lock:
            row = self._conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
        return json.loads(row["value"]) if row else default

    def set_setting(self, key: str, value: Any) -> None:
        with self._lock:
            self._conn.execute(
                "INSERT INTO settings(key, value) VALUES(?, ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, json.dumps(value)),
            )
            self._conn.commit()

    # ---------- presets ----------

    @staticmethod
    def _preset(row: sqlite3.Row) -> dict:
        return {
            "id": row["id"],
            "name": row["name"],
            "appearance": json.loads(row["appearance"]),
            "factory": bool(row["factory"]),
            "category": row["category"],
            "description": row["description"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
        }

    def list_presets(self) -> list[dict]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM presets ORDER BY factory DESC, id ASC"
            ).fetchall()
        return [self._preset(r) for r in rows]

    def get_preset(self, preset_id: int) -> dict | None:
        with self._lock:
            row = self._conn.execute("SELECT * FROM presets WHERE id = ?", (preset_id,)).fetchone()
        return self._preset(row) if row else None

    def create_preset(self, name: str, appearance: dict, factory: bool = False) -> dict:
        now = time.time()
        try:
            with self._lock:
                cur = self._conn.execute(
                    "INSERT INTO presets(name, appearance, factory, created_at, updated_at) "
                    "VALUES(?, ?, ?, ?, ?)",
                    (name, json.dumps(appearance), int(factory), now, now),
                )
                self._conn.commit()
                preset_id = cur.lastrowid
        except sqlite3.IntegrityError as exc:
            raise DuplicateName(name) from exc
        return self.get_preset(preset_id)  # type: ignore[arg-type]

    def update_preset(
        self, preset_id: int, name: str | None = None, appearance: dict | None = None
    ) -> dict | None:
        fields, values = [], []
        if name is not None:
            fields.append("name = ?")
            values.append(name)
        if appearance is not None:
            fields.append("appearance = ?")
            values.append(json.dumps(appearance))
        if fields:
            fields.append("updated_at = ?")
            values.append(time.time())
            try:
                with self._lock:
                    self._conn.execute(
                        f"UPDATE presets SET {', '.join(fields)} WHERE id = ?",
                        (*values, preset_id),
                    )
                    self._conn.commit()
            except sqlite3.IntegrityError as exc:
                raise DuplicateName(name or "") from exc
        return self.get_preset(preset_id)

    def delete_preset(self, preset_id: int) -> bool:
        with self._lock:
            cur = self._conn.execute("DELETE FROM presets WHERE id = ?", (preset_id,))
            self._conn.commit()
        return cur.rowcount > 0

    def sync_factory_presets(self, presets: list[tuple[str, str, str, dict]]) -> None:
        """Deixa os presets de fábrica iguais ao código: (nome, categoria, descrição, aparência)."""
        now = time.time()
        with self._lock:
            for name, category, description, appearance in presets:
                # um preset do usuário com o mesmo nome de um novo preset de fábrica é renomeado
                self._conn.execute(
                    "UPDATE presets SET name = name || ' (meu)' WHERE name = ? AND factory = 0", (name,)
                )
                row = self._conn.execute("SELECT id FROM presets WHERE name = ?", (name,)).fetchone()
                if row:
                    self._conn.execute(
                        "UPDATE presets SET name = ?, appearance = ?, factory = 1, category = ?, description = ? "
                        "WHERE id = ?",
                        (name, json.dumps(appearance), category, description, row["id"]),
                    )
                else:
                    self._conn.execute(
                        "INSERT INTO presets(name, appearance, factory, category, description, created_at, updated_at) "
                        "VALUES(?, ?, 1, ?, ?, ?, ?)",
                        (name, json.dumps(appearance), category, description, now, now),
                    )
            names = [p[0] for p in presets]
            self._conn.execute(
                f"DELETE FROM presets WHERE factory = 1 AND name NOT IN ({', '.join('?' * len(names))})",
                names,
            )
            self._conn.commit()

    # ---------- achados e perdidos ----------

    @staticmethod
    def _lost(row: sqlite3.Row) -> dict:
        return {
            "id": row["id"],
            "name": row["name"],
            "description": row["description"],
            "place": row["place"],
            "foundOn": row["found_on"],
            "returned": bool(row["returned"]),
            "returnedTo": row["returned_to"],
            "returnedAt": row["returned_at"],
            "createdAt": row["created_at"],
        }

    def list_lost(self) -> list[dict]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM lost_items ORDER BY returned ASC, found_on DESC, id DESC"
            ).fetchall()
        return [self._lost(r) for r in rows]

    def get_lost(self, item_id: int) -> dict | None:
        with self._lock:
            row = self._conn.execute("SELECT * FROM lost_items WHERE id = ?", (item_id,)).fetchone()
        return self._lost(row) if row else None

    def create_lost(self, name: str, description: str, place: str, found_on: str) -> dict:
        with self._lock:
            cur = self._conn.execute(
                "INSERT INTO lost_items(name, description, place, found_on, created_at) VALUES(?, ?, ?, ?, ?)",
                (name, description, place, found_on, time.time()),
            )
            self._conn.commit()
        return self.get_lost(cur.lastrowid)  # type: ignore[arg-type]

    def update_lost(self, item_id: int, **changes: Any) -> dict | None:
        """Campos em snake_case (veja LOST_FIELDS); None nos que não mudam."""
        fields = {k: v for k, v in changes.items() if k in LOST_FIELDS}
        if fields:
            with self._lock:
                self._conn.execute(
                    f"UPDATE lost_items SET {', '.join(f'{k} = ?' for k in fields)} WHERE id = ?",
                    (*fields.values(), item_id),
                )
                self._conn.commit()
        return self.get_lost(item_id)

    def delete_lost(self, item_id: int) -> bool:
        with self._lock:
            cur = self._conn.execute("DELETE FROM lost_items WHERE id = ?", (item_id,))
            self._conn.commit()
        return cur.rowcount > 0

    # ---------- eventos ----------

    def log_event(self, level: str, source: str, message: str) -> dict:
        ts = time.time()
        with self._lock:
            cur = self._conn.execute(
                "INSERT INTO events(ts, level, source, message) VALUES(?, ?, ?, ?)",
                (ts, level, source, message),
            )
            event_id = cur.lastrowid
            if event_id and event_id % 500 == 0:
                self._conn.execute("DELETE FROM events WHERE id <= ?", (event_id - MAX_EVENTS,))
            self._conn.commit()
        return {"id": event_id, "ts": ts, "level": level, "source": source, "message": message}

    def recent_events(self, limit: int = 100) -> list[dict]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM events ORDER BY id DESC LIMIT ?", (limit,)
            ).fetchall()
        return [dict(r) for r in rows]
