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


def seed():
    """Insert or update all 12 locations in the database."""
    init_db()

    conn = get_connection()
    cursor = conn.cursor()

    existing = cursor.execute("SELECT COUNT(*) FROM locations").fetchone()[0]
    if existing > 0:
        print(f"[seed_data] ℹ️ Database already has {existing} location(s). Updating missing attributes if needed.")
        # Ensure any locations with 0 risk_score get recalculated
        rows = cursor.execute("SELECT id, rainfall_mm, soil_moisture, slope_deg FROM locations").fetchall()
        for r in rows:
            score = calculate_risk_score(r["rainfall_mm"], r["soil_moisture"], r["slope_deg"])
            cursor.execute("UPDATE locations SET risk_score = ? WHERE id = ?", (score, r["id"]))
        seed_users(conn)
        conn.commit()
        conn.close()
        return

    print("[seed_data] 🌱 Seeding 12 NER locations …")

    for loc in LOCATIONS:
        rainfall_mm   = fetch_rainfall(loc["latitude"], loc["longitude"])
        soil_moisture = round(random.uniform(30, 88), 2)
        risk_level    = calculate_risk(rainfall_mm, soil_moisture)
        risk_score    = calculate_risk_score(rainfall_mm, soil_moisture, loc["slope_deg"])
        last_updated  = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("""
            INSERT INTO locations (name, state, latitude, longitude,
                                   rainfall_mm, soil_moisture, risk_level, slope_deg, risk_score, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            loc["name"], loc["state"],
            loc["latitude"], loc["longitude"],
            rainfall_mm, soil_moisture,
            risk_level, loc["slope_deg"], risk_score, last_updated,
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
        INSERT INTO reports (location, description, latitude, longitude, category, photo_path, submitted_at)
        VALUES 
        ('Mawphlang Road, Meghalaya', 'Minor slope sliding with soil displacement observed after 3 hours of heavy downpour. Road partially obstructed.', 25.45, 91.75, 'Mudslide & Debris', NULL, datetime('now', '-3 hours')),
        ('NH-29 Kohima Bypass, Nagaland', 'Tension fissures and visible rock movements on upper embankment near milestone 42.', 25.68, 94.12, 'Tension Cracks', NULL, datetime('now', '-6 hours'))
    """)

    seed_users(conn)
    conn.commit()
    conn.close()
    print("[seed_data] ✅ Seed complete.")


if __name__ == "__main__":
    seed()
