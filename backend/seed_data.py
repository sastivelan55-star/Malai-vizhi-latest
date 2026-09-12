"""
seed_data.py — Populate the database with 12 NER locations.

Run this directly:
    python seed_data.py

Or it is called automatically from app.py on first startup.
"""

import random
from datetime import datetime, timezone

from models import get_connection, init_db
from features.risk_logic import calculate_risk, calculate_risk_score, fetch_rainfall


def seed_users(conn):
    """Seed initial default administrator and operator accounts if none exist."""
    from werkzeug.security import generate_password_hash
    cursor = conn.cursor()
    user_count = cursor.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if user_count == 0:
        default_users = [
            ("admin", "admin@malaivizhi.io", "System Administrator", generate_password_hash("MalaiVizhi@2025"), "Administrator"),
            ("operator", "operator@malaivizhi.io", "Field Operations Lead", generate_password_hash("Operator#2025"), "Operator"),
        ]
        cursor.executemany("""
            INSERT INTO users (user_id, email, name, password_hash, role)
            VALUES (?, ?, ?, ?, ?)
        """, default_users)
        conn.commit()
        print(f"[seed_data] 👤 Created {len(default_users)} default authorized accounts (admin, operator).")

# ---------------------------------------------------------------------------
# 12 North-East India locations with realistic coordinates & slope terrain
# ---------------------------------------------------------------------------

LOCATIONS = [
    {"name": "Cherrapunji",    "state": "Meghalaya",          "latitude": 25.2800, "longitude": 91.7200, "slope_deg": 38.5},
    {"name": "Shillong",       "state": "Meghalaya",          "latitude": 25.5788, "longitude": 91.8933, "slope_deg": 31.0},
    {"name": "Guwahati",       "state": "Assam",              "latitude": 26.1445, "longitude": 91.7362, "slope_deg": 22.0},
    {"name": "Dima Hasao",     "state": "Assam",              "latitude": 25.5694, "longitude": 93.0069, "slope_deg": 36.5},
    {"name": "Lunglei",        "state": "Mizoram",            "latitude": 22.8873, "longitude": 92.7360, "slope_deg": 42.0},
    {"name": "Aizawl",         "state": "Mizoram",            "latitude": 23.7272, "longitude": 92.7176, "slope_deg": 44.5},
    {"name": "Dimapur",        "state": "Nagaland",           "latitude": 25.9040, "longitude": 93.7265, "slope_deg": 18.5},
    {"name": "Kohima",         "state": "Nagaland",           "latitude": 25.6701, "longitude": 94.1077, "slope_deg": 39.0},
    {"name": "Imphal",         "state": "Manipur",            "latitude": 24.8170, "longitude": 93.9368, "slope_deg": 24.5},
    {"name": "Tawang",         "state": "Arunachal Pradesh",  "latitude": 27.5860, "longitude": 91.8620, "slope_deg": 43.0},
    {"name": "Itanagar",       "state": "Arunachal Pradesh",  "latitude": 27.0844, "longitude": 93.6053, "slope_deg": 35.0},
    {"name": "Gangtok",        "state": "Sikkim",             "latitude": 27.3389, "longitude": 88.6065, "slope_deg": 41.5},
]


def seed_gis_data(conn):
    """Seed villages and critical infrastructure with explicitly labeled DEMO data."""
    cursor = conn.cursor()
    v_count = cursor.execute("SELECT COUNT(*) FROM villages").fetchone()[0]
    if v_count == 0:
        # Creating a synthetic village near Shillong
        villages = [
            ("Mawlynnong", 25.201, 91.916, 500, "HIGH", "[DEMO] GIS Dataset"),
            ("Nongriat", 25.234, 91.666, 300, "CRITICAL", "[DEMO] GIS Dataset"),
            ("Pynursla", 25.305, 91.897, 1200, "MODERATE", "[DEMO] GIS Dataset")
        ]
        cursor.executemany("INSERT INTO villages (name, latitude, longitude, population, risk_exposure, data_source) VALUES (?, ?, ?, ?, ?, ?)", villages)
        
        infra = [
            ("Shillong Civil Hospital", "HOSPITAL", 25.5788, 91.8933, "ACTIVE", "[DEMO] Facilities GIS"),
            ("Umiam Hydro Power Station", "POWER", 25.655, 91.905, "AT_RISK", "[DEMO] Facilities GIS"),
            ("NH-40 Bridge", "TRANSPORT", 25.602, 91.891, "ACTIVE", "[DEMO] Facilities GIS")
        ]
        cursor.executemany("INSERT INTO critical_infrastructure (name, type, latitude, longitude, status, data_source) VALUES (?, ?, ?, ?, ?, ?)", infra)
        
        conn.commit()
        print("[seed_data] 🗺️  Seeded DEMO GIS layers (villages & infrastructure).")

def seed():
    """Insert or update all 12 locations in the database."""
    init_db()

    conn = get_connection()
    cursor = conn.cursor()
    
    seed_gis_data(conn)

    existing = cursor.execute("SELECT COUNT(*) FROM locations").fetchone()[0]
    if existing > 0:
        print(f"[seed_data] ℹ️ Database already has {existing} location(s). Updating missing attributes if needed.")
        # Ensure any locations with 0 risk_score get recalculated, and node_ids get set
        rows = cursor.execute("SELECT id, rainfall_mm, soil_moisture, slope_deg, node_id FROM locations").fetchall()
        for r in rows:
            score = calculate_risk_score(r["rainfall_mm"], r["soil_moisture"], r["slope_deg"])
            nid = r["node_id"] or f"NODE_{r['id']:03d}"
            cursor.execute("UPDATE locations SET risk_score = ?, node_id = ? WHERE id = ?", (score, nid, r["id"]))
        seed_users(conn)
        conn.commit()
        conn.close()
        return

    print("[seed_data] 🌱 Seeding 12 NER locations …")

    for idx, loc in enumerate(LOCATIONS, start=1):
        rainfall_mm   = fetch_rainfall(loc["latitude"], loc["longitude"])
        soil_moisture = round(random.uniform(30, 88), 2)
        risk_level    = calculate_risk(rainfall_mm, soil_moisture)
        risk_score    = calculate_risk_score(rainfall_mm, soil_moisture, loc["slope_deg"])
        last_updated  = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        node_id       = f"NODE_{idx:03d}"

        cursor.execute("""
            INSERT INTO locations (name, state, latitude, longitude,
                                   rainfall_mm, soil_moisture, risk_level, slope_deg, risk_score, last_updated,
                                   node_id, inclination_deg, battery)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            loc["name"], loc["state"],
            loc["latitude"], loc["longitude"],
            rainfall_mm, soil_moisture,
            risk_level, loc["slope_deg"], risk_score, last_updated,
            node_id, 0.0, 100
        ))

        print(
            f"  ➕ {loc['name']:18s} | rain={rainfall_mm:5.1f}mm "
            f"| soil={soil_moisture:5.1f}% | slope={loc['slope_deg']:4.1f}° | score={risk_score:2d} | risk={risk_level}"
        )

    # Seed an initial alert if high-risk locations exist
    high_locs = cursor.execute("SELECT id, name, rainfall_mm, soil_moisture FROM locations WHERE risk_level = 'HIGH'").fetchall()
    for hl in high_locs:
        msg = f"Elevated landslide risk in {hl['name']} — rainfall {hl['rainfall_mm']:.1f} mm, soil moisture {hl['soil_moisture']:.1f}%"
        cursor.execute("""
            INSERT INTO alerts (location_id, severity, message, timestamp, status)
            VALUES (?, 'HIGH', ?, datetime('now'), 'Sent')
        """, (hl["id"], msg))

    # Seed 2 sample verified citizen reports for demonstration
    cursor.execute("""
        INSERT INTO reports (location, description, latitude, longitude, category, photo_path, submitted_at, status, verified_at, resolved_at)
        VALUES 
        ('Mawphlang Road, Meghalaya', 'Minor slope sliding with soil displacement observed after 3 hours of heavy downpour. Road partially obstructed.', 25.45, 91.75, 'Mudslide & Debris', NULL, datetime('now', '-3 hours'), 'VERIFIED', datetime('now', '-2 hours'), NULL),
        ('NH-29 Kohima Bypass, Nagaland', 'Tension fissures and visible rock movements on upper embankment near milestone 42.', 25.68, 94.12, 'Tension Cracks', NULL, datetime('now', '-6 hours'), 'RESOLVED', datetime('now', '-5 hours'), datetime('now', '-1 hours'))
    """)

    # Seed historical landslide events (Phase 7 Context)
    hist_count = cursor.execute("SELECT COUNT(*) FROM historical_events").fetchone()[0]
    if hist_count == 0:
        historical = [
            ("Cherrapunji East", 25.28, 91.73, "2024-06-12", "MAJOR", "GSI Landslide Inventory", "Major monsoon-triggered landslide blocking main transit route.", "VERIFIED"),
            ("Aizawl North", 23.74, 92.71, "2023-08-04", "MODERATE", "State Disaster Management Authority", "Slope failure near residential sector following sustained rainfall.", "VERIFIED"),
            ("Tawang Corridor", 27.59, 91.86, "2025-02-15", "CRITICAL", "National Remote Sensing Centre (NRSC)", "Massive rockfall triggered by seismic activity and freeze-thaw weathering.", "VERIFIED"),
        ]
        cursor.executemany("""
            INSERT INTO historical_events (location, latitude, longitude, date, severity, source, description, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, historical)

    # Seed road connectivity data (Phase 6)
    road_count = cursor.execute("SELECT COUNT(*) FROM road_status").fetchone()[0]
    if road_count == 0:
        roads = [
            ("NH-29 Dimapur-Kohima", 25.75, 93.9, "BLOCKED", 85, "HIGH", "State PWD / Satellite Radar"),
            ("NH-44 Shillong-Silchar", 25.5, 91.9, "RESTRICTED", 65, "MODERATE", "Citizen Report / Ground Sensors"),
            ("SH-5 Aizawl Bypass", 23.7, 92.7, "OPEN", 20, "LOW", "State Traffic Police"),
            ("Tawang Mountain Pass", 27.5, 92.0, "UNKNOWN", 45, "MODERATE", "DEMO"),
        ]
        cursor.executemany("""
            INSERT INTO road_status (road_name, latitude, longitude, status, risk_score, impact_priority, data_source)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, roads)

    seed_users(conn)
    conn.commit()
    conn.close()
    print("[seed_data] ✅ Seed complete.")


if __name__ == "__main__":
    seed()
