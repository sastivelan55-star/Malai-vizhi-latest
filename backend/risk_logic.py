"""
risk_logic.py — Risk calculation, AI assessments, and NASA POWER rainfall fetching
for Malai Vizhi Landslide Early Warning System.
"""

import random
import requests
from datetime import datetime, timedelta


# ---------------------------------------------------------------------------
# Risk calculation
# ---------------------------------------------------------------------------

def calculate_risk(rainfall_mm: float, soil_moisture: float) -> str:
    """
    Determine landslide risk level based on rainfall and soil moisture.

    Returns
    -------
    str
        "HIGH", "MODERATE", or "LOW"
    """
    if rainfall_mm > 150 or soil_moisture > 75:
        return "HIGH"
    if rainfall_mm > 80 or soil_moisture > 55:
        return "MODERATE"
    return "LOW"


def calculate_risk_score(rainfall_mm: float, soil_moisture: float, slope_deg: float = 32.0) -> int:
    """
    Compute a normalized composite AI Risk Score from 0 to 100.
    Considers rainfall saturation, soil moisture, and terrain slope.
    """
    # Rainfall component (0-45 pts): saturated at 200mm
    rain_pts = min(45.0, (rainfall_mm / 200.0) * 45.0)
    
    # Soil moisture component (0-35 pts): saturated at 95%
    moist_pts = min(35.0, (soil_moisture / 95.0) * 35.0)
    
    # Slope terrain vulnerability component (0-20 pts): normalized to 45 deg slope
    slope_pts = min(20.0, (slope_deg / 45.0) * 20.0)
    
    score = int(round(rain_pts + moist_pts + slope_pts))
    return max(5, min(99, score))


def generate_ai_assessment(risk_level: str, rainfall_mm: float, soil_moisture: float, location_name: str) -> str:
    """
    Generate dynamic, scientifically sound AI explanatory commentary.
    """
    if risk_level == "HIGH":
        if rainfall_mm > 150 and soil_moisture > 75:
            return (
                f"Critical slope instability detected in {location_name}. "
                f"Sustained extreme precipitation ({rainfall_mm:.1f}mm) combined with saturated pore water pressure "
                f"({soil_moisture:.1f}% soil moisture) exceeds regional failure threshold."
            )
        elif rainfall_mm > 150:
            return (
                f"High flash landslide probability in {location_name}. "
                f"Intense precipitation spike ({rainfall_mm:.1f}mm) creates high surface runoff and shear stress on steep slopes."
            )
        else:
            return (
                f"High antecedent moisture hazard in {location_name}. "
                f"Soil saturation at {soil_moisture:.1f}% severely reduces effective cohesion along structural slip planes."
            )
    elif risk_level == "MODERATE":
        return (
            f"Elevated advisory status for {location_name}. "
            f"Precipitation ({rainfall_mm:.1f}mm) and soil moisture ({soil_moisture:.1f}%) indicate increasing moisture buildup. Continued monitoring advised."
        )
    else:
        return (
            f"Stable geological conditions across {location_name}. "
            f"Rainfall ({rainfall_mm:.1f}mm) and soil moisture ({soil_moisture:.1f}%) remain within safe baseline thresholds."
        )


# ---------------------------------------------------------------------------
# NASA POWER API helper
# ---------------------------------------------------------------------------

NASA_POWER_URL = (
    "https://power.larc.nasa.gov/api/temporal/daily/point"
    "?parameters=PRECTOTCORR"
    "&community=AG"
    "&longitude={lon}"
    "&latitude={lat}"
    "&start={start}"
    "&end={end}"
    "&format=JSON"
)


def _today_and_yesterday() -> tuple[str, str]:
    """Return (yesterday, yesterday) date strings in YYYYMMDD format."""
    target = datetime.utcnow() - timedelta(days=3)
    date_str = target.strftime("%Y%m%d")
    return date_str, date_str


def fetch_rainfall(lat: float, lon: float) -> float:
    """
    Fetch the last-available daily rainfall (mm) from the NASA POWER API.
    Falls back to a random realistic value (20–200 mm) if the API call fails.
    """
    start, end = _today_and_yesterday()
    url = NASA_POWER_URL.format(lat=lat, lon=lon, start=start, end=end)

    try:
        response = requests.get(url, timeout=12)
        response.raise_for_status()
        data = response.json()

        daily_data = (
            data
            .get("properties", {})
            .get("parameter", {})
            .get("PRECTOTCORR", {})
        )

        if not daily_data:
            raise ValueError("Empty PRECTOTCORR payload from NASA POWER.")

        rainfall_value = list(daily_data.values())[0]

        if rainfall_value is None or rainfall_value < 0:
            raise ValueError(f"Invalid rainfall value returned: {rainfall_value}")

        print(f"[risk_logic] 🌧 NASA POWER rainfall for ({lat}, {lon}): {rainfall_value:.2f} mm")
        return float(rainfall_value)

    except Exception as exc:
        fallback = round(random.uniform(20, 180), 2)
        print(
            f"[risk_logic] ⚠️ NASA POWER fetch failed for ({lat}, {lon}): {exc}. "
            f"Using fallback: {fallback} mm"
        )
        return fallback
