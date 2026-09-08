"""
models.py — Database schema creation for Malai Vizhi Landslide EWS
Uses SQLite via Python's built-in sqlite3 module.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")


def get_connection():
    """Return a sqlite3 connection with row_factory for dict-like rows."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create all tables if they don't already exist and apply any schema migrations."""
    conn = get_connection()
    cursor = conn.cursor()

    # ---------- locations ----------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS locations (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            name          TEXT    NOT NULL,
            state         TEXT    NOT NULL,
            latitude      REAL    NOT NULL,
            longitude     REAL    NOT NULL,
            rainfall_mm   REAL    NOT NULL DEFAULT 0,
            soil_moisture REAL    NOT NULL DEFAULT 0,
            risk_level    TEXT    NOT NULL DEFAULT 'LOW',
            slope_deg     REAL    NOT NULL DEFAULT 32.5,
            risk_score    INTEGER NOT NULL DEFAULT 25,
            last_updated  TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    """)

    # Check if slope_deg or risk_score columns exist (for existing databases)
    cursor.execute("PRAGMA table_info(locations)")
    columns = [row["name"] for row in cursor.fetchall()]
    if "slope_deg" not in columns:
        cursor.execute("ALTER TABLE locations ADD COLUMN slope_deg REAL NOT NULL DEFAULT 32.5")
    if "risk_score" not in columns:
        cursor.execute("ALTER TABLE locations ADD COLUMN risk_score INTEGER NOT NULL DEFAULT 25")

    # ---------- alerts ----------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            location_id INTEGER NOT NULL,
            severity    TEXT    NOT NULL,
            message     TEXT    NOT NULL,
            timestamp   TEXT    NOT NULL DEFAULT (datetime('now')),
            status      TEXT    NOT NULL DEFAULT 'Sent',
            FOREIGN KEY (location_id) REFERENCES locations(id)
        )
    """)

    # ---------- reports ----------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            location     TEXT    NOT NULL,
            description  TEXT    NOT NULL,
            latitude     REAL,
            longitude    REAL,
            category     TEXT    DEFAULT 'Landslide Risk',
            photo_path   TEXT,
            submitted_at TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    """)

    # Check if category, latitude, longitude columns exist in reports
    cursor.execute("PRAGMA table_info(reports)")
    r_columns = [row["name"] for row in cursor.fetchall()]
    if "category" not in r_columns:
        cursor.execute("ALTER TABLE reports ADD COLUMN category TEXT DEFAULT 'Landslide Risk'")
    if "latitude" not in r_columns:
        cursor.execute("ALTER TABLE reports ADD COLUMN latitude REAL")
    if "longitude" not in r_columns:
        cursor.execute("ALTER TABLE reports ADD COLUMN longitude REAL")

    # ---------- users ----------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       TEXT    UNIQUE NOT NULL,
            email         TEXT,
            name          TEXT    NOT NULL,
            password_hash TEXT    NOT NULL,
            role          TEXT    NOT NULL DEFAULT 'Operator',
            created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    """)

    # ---------- user_sessions ----------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_sessions (
            token         TEXT PRIMARY KEY,
            user_id       TEXT NOT NULL,
            created_at    TEXT NOT NULL DEFAULT (datetime('now')),
            expires_at    TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    """)

    # ---------- password_resets ----------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS password_resets (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       TEXT NOT NULL,
            token_hash    TEXT NOT NULL,
            created_at    TEXT NOT NULL DEFAULT (datetime('now')),
            expires_at    TEXT NOT NULL,
            used          INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    """)

    # ---------- assessments (Audit & Historical Point-Level Risk Logs) ----------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS assessments (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            latitude         REAL    NOT NULL,
            longitude        REAL    NOT NULL,
            location_name    TEXT,
            flood_score      INTEGER,
            flood_level      TEXT,
            landslide_score  INTEGER,
            landslide_level  TEXT,
            data_quality     TEXT    NOT NULL DEFAULT 'PARTIAL',
            rainfall_24h     REAL,
            soil_moisture    REAL,
            elevation        REAL,
            slope            REAL,
            model_versions   TEXT,
            data_sources     TEXT,
            timestamp        TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    """)

    conn.commit()
    conn.close()
    print("[models] ✅ Database tables initialised and migrated.")
