"""
flood_logic.py — Prototype flood risk calculation, assessment commentary,
and hydrological runoff estimation for the Malai Vizhi platform.

NOTE: This is a modular, prototype flood risk assessment engine designed
to extend Malai Vizhi's multi-hazard capabilities without modifying the core
Landslide Early Warning engine in risk_logic.py.
"""

def calculate_flood_risk_level(score: int) -> str:
    """
    Determine Flood Risk level based on score:
      0–39  = LOW
      40–69 = MODERATE
      70–100 = HIGH
    """
    if score >= 70:
        return "HIGH"
    if score >= 40:
        return "MODERATE"
    return "LOW"


def calculate_flood_risk_score(rainfall_mm: float, soil_moisture: float, slope_deg: float = 32.0) -> int:
    """
    Compute a normalized composite Prototype Flood Risk Score from 0 to 100.
    
    Hydrological rationale:
    - Rainfall component (0-50 pts): High recent rainfall directly fuels surface runoff.
      Saturated at 200mm.
    - Soil saturation component (0-35 pts): High soil moisture (>70%) prevents infiltration,
      causing immediate pooling and sheet runoff. Saturated at 95%.
    - Catchment basin / Valley factor (0-15 pts): Low-slope floodplains/valleys (<20 deg)
      accumulate water faster than steep hillsides where runoff sheds rapidly.
    """
    # 1. Rainfall component (0-50)
    rain_pts = min(50.0, (rainfall_mm / 200.0) * 50.0)

    # 2. Ground saturation component (0-35)
    moist_pts = min(35.0, (soil_moisture / 95.0) * 35.0)

    # 3. Terrain accumulation factor (0-15): flatter terrain retains water longer
    valley_factor = max(0.0, min(15.0, (45.0 - slope_deg) / 45.0 * 15.0))

    score = int(round(rain_pts + moist_pts + valley_factor))
    return max(5, min(99, score))


def calculate_surface_runoff_index(rainfall_mm: float, soil_moisture: float) -> float:
    """
    Estimate Surface Runoff Potential percentage (0-100%) based on precipitation
    and antecedent moisture saturation.
    """
    runoff = (rainfall_mm * 0.35) + (soil_moisture * 0.65)
    return round(max(5.0, min(98.0, runoff)), 1)


def generate_flood_assessment(
    risk_level: str,
    rainfall_mm: float,
    soil_moisture: float,
    runoff_index: float,
    location_name: str
) -> str:
    """
    Generate prototype hydrological explanatory commentary.
    """
    if risk_level == "HIGH":
        if rainfall_mm > 140 and soil_moisture > 70:
            return (
                f"Severe inundation potential in {location_name}. "
                f"Sustained heavy precipitation ({rainfall_mm:.1f} mm) over highly saturated ground "
                f"({soil_moisture:.1f}% moisture) drives an estimated surface runoff index of {runoff_index}%. "
                f"Low-lying drainage channels and riverbanks are at high risk of flash waterlogging."
            )
        elif rainfall_mm > 140:
            return (
                f"Flash flood warning for {location_name}. "
                f"Intense precipitation spike ({rainfall_mm:.1f} mm) exceeds natural soil infiltration capacity, "
                f"producing rapid surface runoff ({runoff_index}%)."
            )
        else:
            return (
                f"High water accumulation risk in {location_name}. "
                f"Extensive ground saturation ({soil_moisture:.1f}%) significantly limits drainage absorption, "
                f"increasing low-land flood vulnerability."
            )
    elif risk_level == "MODERATE":
        return (
            f"Moderate flood advisory for {location_name}. "
            f"Precipitation ({rainfall_mm:.1f} mm) and ground moisture ({soil_moisture:.1f}%) indicate increasing "
            f"surface water accumulation. Localized drainage congestion possible in low-lying sections."
        )
    else:
        return (
            f"Normal hydrological baseline across {location_name}. "
            f"Rainfall ({rainfall_mm:.1f} mm) and soil saturation ({soil_moisture:.1f}%) remain within adequate "
            f"natural drainage capacity. Runoff potential is low ({runoff_index}%)."
        )


# ---------------------------------------------------------------------------
# Chennai Flood Stations Configuration (Prototype Multi-Hazard Monitoring)
# ---------------------------------------------------------------------------

from datetime import datetime, timezone

CHENNAI_STATIONS_CONFIG = [
    {
        "id": "CHN-001",
        "station_code": "CHN-001",
        "name": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "rainfall_mm": 72.4,
        "soil_moisture": 64.0,
        "slope_deg": 3.0,
        "basin": "Chennai Urban Coastal Plain",
        "seven_day_trend": [18.0, 24.5, 31.0, 52.0, 68.5, 60.0, 72.4],
        "data_source": "Prototype Assessment — based on available model inputs",
        "assessment_type": "Prototype Flood Risk Assessment",
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
    },
    {
        "id": "CHN-002",
        "station_code": "CHN-002",
        "name": "Chennai - Adyar River Basin",
        "state": "Tamil Nadu",
        "country": "India",
        "latitude": 13.0067,
        "longitude": 80.2570,
        "rainfall_mm": 68.0,
        "soil_moisture": 66.5,
        "slope_deg": 2.5,
        "basin": "Adyar River Corridor",
        "seven_day_trend": [15.0, 22.0, 28.0, 48.0, 62.0, 55.0, 68.0],
        "data_source": "Prototype Assessment — based on available model inputs",
        "assessment_type": "Prototype Flood Risk Assessment",
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
    },
    {
        "id": "CHN-003",
        "station_code": "CHN-003",
        "name": "Chennai - Cooum River Basin",
        "state": "Tamil Nadu",
        "country": "India",
        "latitude": 13.0732,
        "longitude": 80.2609,
        "rainfall_mm": 74.5,
        "soil_moisture": 67.0,
        "slope_deg": 2.0,
        "basin": "Cooum Waterway Corridor",
        "seven_day_trend": [20.0, 26.0, 35.0, 58.0, 70.0, 64.0, 74.5],
        "data_source": "Prototype Assessment — based on available model inputs",
        "assessment_type": "Prototype Flood Risk Assessment",
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
    },
    {
        "id": "CHN-004",
        "station_code": "CHN-004",
        "name": "Chennai - Velachery / Pallikaranai",
        "state": "Tamil Nadu",
        "country": "India",
        "latitude": 12.9790,
        "longitude": 80.2185,
        "rainfall_mm": 82.0,
        "soil_moisture": 72.0,
        "slope_deg": 1.5,
        "basin": "Pallikaranai Marshland Catchment",
        "seven_day_trend": [22.0, 30.0, 42.0, 65.0, 78.0, 70.0, 82.0],
        "data_source": "Prototype Assessment — based on available model inputs",
        "assessment_type": "Prototype Flood Risk Assessment",
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
    },
]


def build_chennai_flood_station(cfg: dict) -> dict:
    """
    Calculate dynamic flood risk parameters for a Chennai station using existing flood logic.
    """
    rainfall = float(cfg.get("rainfall_mm", 72.4))
    moisture = float(cfg.get("soil_moisture", 64.0))
    slope = float(cfg.get("slope_deg", 3.0))

    score = calculate_flood_risk_score(rainfall, moisture, slope)
    level = calculate_flood_risk_level(score)
    runoff = calculate_surface_runoff_index(rainfall, moisture)
    assessment = generate_flood_assessment(level, rainfall, moisture, runoff, cfg["name"])

    return {
        "id": cfg["id"],
        "station_code": cfg.get("station_code", cfg["id"]),
        "name": cfg["name"],
        "state": cfg["state"],
        "country": cfg.get("country", "India"),
        "latitude": cfg["latitude"],
        "longitude": cfg["longitude"],
        "rainfall_mm": rainfall,
        "rainfall_24h": rainfall,
        "soil_moisture": moisture,
        "slope_deg": slope,
        "flood_risk_score": score,
        "risk_score": score,
        "flood_risk_level": level,
        "risk_level": level,
        "runoff_index": runoff,
        "flood_assessment": assessment,
        "seven_day_trend": cfg.get("seven_day_trend", [18.0, 24.5, 31.0, 52.0, 68.5, 60.0, rainfall]),
        "last_updated": cfg.get("last_updated") or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "data_source": cfg.get("data_source", "Prototype Assessment — based on available model inputs"),
        "assessment_type": cfg.get("assessment_type", "Prototype Flood Risk Assessment"),
        "is_prototype": True,
        "basin": cfg.get("basin", "Urban Coastal Catchment"),
    }


def generate_chennai_flood_advisory(station: dict) -> dict:
    """
    Generate advisory matching non-alarmist SIH prototype guidelines:
    - Avoid official sounding emergency claims.
    - Low: 'Current prototype assessment indicates relatively lower flood risk. Continue monitoring rainfall conditions.'
    - Moderate: 'Moderate prototype flood risk. Monitor rainfall and local waterlogging conditions.'
    - High: 'High prototype flood risk. Increased caution is recommended and local official advisories should be followed.'
    """
    level = station.get("flood_risk_level", "LOW")
    name = station.get("name", "Chennai")
    st_id = station.get("id", "CHN-001")
    runoff = station.get("runoff_index", 50.0)

    if level == "HIGH":
        msg = (
            "High prototype flood risk. Increased caution is recommended and local official advisories should be followed. "
            "Prototype assessment based on rainfall, soil moisture and surface runoff indicators."
        )
    elif level == "MODERATE":
        msg = (
            "Moderate prototype flood risk. Monitor rainfall and local waterlogging conditions. "
            "Prototype assessment based on rainfall, soil moisture and surface runoff indicators."
        )
    else:
        msg = "Current prototype assessment indicates relatively lower flood risk. Continue monitoring rainfall conditions."

    return {
        "id": f"fl-adv-{st_id}",
        "location_id": st_id,
        "location_name": name,
        "state": station.get("state", "Tamil Nadu"),
        "severity": level,
        "title": f"Flood Risk Advisory — {name}",
        "message": msg,
        "timestamp": station.get("last_updated") or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "hazard_type": "Flood Risk",
    }


def get_chennai_flood_stations() -> list:
    """Return all built Chennai flood monitoring stations."""
    return [build_chennai_flood_station(cfg) for cfg in CHENNAI_STATIONS_CONFIG]

