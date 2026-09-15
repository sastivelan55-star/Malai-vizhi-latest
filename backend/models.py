"""
models.py — Database schema creation for Malai Vizhi Landslide EWS
Uses SQLite via Python's built-in sqlite3 module.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "database.db")


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
    if "node_id" not in columns:
        cursor.execute("ALTER TABLE locations ADD COLUMN node_id TEXT")
    if "inclination_deg" not in columns:
        cursor.execute("ALTER TABLE locations ADD COLUMN inclination_deg REAL NOT NULL DEFAULT 0.0")
    if "battery" not in columns:
        cursor.execute("ALTER TABLE locations ADD COLUMN battery INTEGER NOT NULL DEFAULT 100")

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

    cursor.execute("PRAGMA table_info(alerts)")
    a_columns = [row["name"] for row in cursor.fetchall()]
    if "trigger_type" not in a_columns:
        cursor.execute("ALTER TABLE alerts ADD COLUMN trigger_type TEXT DEFAULT 'RISK_ESCALATION'")
    if "risk_score" not in a_columns:
        cursor.execute("ALTER TABLE alerts ADD COLUMN risk_score INTEGER")
    if "latitude" not in a_columns:
        cursor.execute("ALTER TABLE alerts ADD COLUMN latitude REAL")
    if "longitude" not in a_columns:
        cursor.execute("ALTER TABLE alerts ADD COLUMN longitude REAL")
    if "acknowledged_at" not in a_columns:
        cursor.execute("ALTER TABLE alerts ADD COLUMN acknowledged_at TEXT")
    if "recipient_type" not in a_columns:
        cursor.execute("ALTER TABLE alerts ADD COLUMN recipient_type TEXT DEFAULT 'ALL'")

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
    if "status" not in r_columns:
        cursor.execute("ALTER TABLE reports ADD COLUMN status TEXT NOT NULL DEFAULT 'SUBMITTED'")
    if "verified_at" not in r_columns:
        cursor.execute("ALTER TABLE reports ADD COLUMN verified_at TEXT")
    if "resolved_at" not in r_columns:
        cursor.execute("ALTER TABLE reports ADD COLUMN resolved_at TEXT")
    if "video_path" not in r_columns:
        cursor.execute("ALTER TABLE reports ADD COLUMN video_path TEXT")

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

    # ---------- risk_assessments (Phase 3 Dedicated Hazard History & Timeline) ----------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS risk_assessments (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            latitude      REAL    NOT NULL,
            longitude     REAL    NOT NULL,
            location_name TEXT,
            hazard_type   TEXT    NOT NULL,
            score         INTEGER NOT NULL,
            risk_level    TEXT    NOT NULL,
            confidence    INTEGER NOT NULL,
            data_quality  TEXT    NOT NULL DEFAULT 'GOOD',
            factors_json  TEXT,
            model_version TEXT    NOT NULL,
            timestamp     TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_risk_assessments_coords_time
        ON risk_assessments (latitude, longitude, hazard_type, timestamp)
    """)

    # ---------- route_assessments (Phase 6 Route Risk Analysis) ----------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS route_assessments (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            route_info    TEXT    NOT NULL,
            risk_info     TEXT    NOT NULL,
            model_version TEXT    NOT NULL,
            data_quality  TEXT    NOT NULL DEFAULT 'LIMITED',
            created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    """)

    # ---------- historical_events (Phase 7 Contextual Data) ----------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS historical_events (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            location    TEXT    NOT NULL,
            latitude    REAL    NOT NULL,
            longitude   REAL    NOT NULL,
            date        TEXT    NOT NULL,
            severity    TEXT    NOT NULL,
            source      TEXT    NOT NULL,
            description TEXT,
            status      TEXT    NOT NULL DEFAULT 'VERIFIED'
        )
    """)

    # ---------- road_status (Phase 6 Route Risk Analysis & Connectivity) ----------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS road_status (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            road_name        TEXT    NOT NULL,
            latitude         REAL    NOT NULL,
            longitude        REAL    NOT NULL,
            status           TEXT    NOT NULL DEFAULT 'UNKNOWN',
            risk_score       INTEGER NOT NULL DEFAULT 0,
            impact_priority  TEXT    NOT NULL DEFAULT 'LOW',
            last_updated     TEXT    NOT NULL DEFAULT (datetime('now')),
            data_source      TEXT    NOT NULL DEFAULT 'DEMO'
        )
    """)

    # ---------- villages (Phase 8 GIS Data) ----------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS villages (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            name             TEXT    NOT NULL,
            latitude         REAL    NOT NULL,
            longitude        REAL    NOT NULL,
            population       INTEGER NOT NULL,
            risk_exposure    TEXT    NOT NULL DEFAULT 'UNKNOWN',
            data_source      TEXT    NOT NULL DEFAULT 'DEMO'
        )
    """)

    # ---------- critical_infrastructure (Phase 8 GIS Data) ----------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS critical_infrastructure (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            name             TEXT    NOT NULL,
            type             TEXT    NOT NULL,
            latitude         REAL    NOT NULL,
            longitude        REAL    NOT NULL,
            status           TEXT    NOT NULL DEFAULT 'ACTIVE',
            data_source      TEXT    NOT NULL DEFAULT 'DEMO'
        )
    """)

    # ---------- notifications (Group 4) ----------
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id      INTEGER,
            category       TEXT    NOT NULL DEFAULT 'SYSTEM ALERT',
            title          TEXT    NOT NULL,
            message        TEXT    NOT NULL,
            latitude       REAL,
            longitude      REAL,
            timestamp      TEXT    NOT NULL DEFAULT (datetime('now')),
            priority       TEXT    NOT NULL DEFAULT 'NORMAL',
            status         TEXT    NOT NULL DEFAULT 'NEW',
            recipient_role TEXT    NOT NULL DEFAULT 'ALL',
            is_read        INTEGER NOT NULL DEFAULT 0,
            action_state   TEXT    NOT NULL DEFAULT 'PENDING'
        )
    """)

    conn.commit()
    conn.close()
    print("[models] ✅ Database tables initialised and migrated.")
