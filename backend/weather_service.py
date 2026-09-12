"""
weather_service.py — Public weather and geocoding integration for MALAI VIZHI.

Uses public Open-Meteo APIs (zero credentials or API keys required):
- Geocoding API: https://geocoding-api.open-meteo.com/v1/search
- Weather Forecast & Historical API: https://api.open-meteo.com/v1/forecast

Includes in-memory caching with TTL to respect rate limits and minimize external latency.
"""

import time
import logging
from typing import Optional, Dict, Any, List
import requests

logger = logging.getLogger(__name__)

# In-memory caches with timestamps
_GEOCODE_CACHE: Dict[str, Dict[str, Any]] = {}
_WEATHER_CACHE: Dict[str, Dict[str, Any]] = {}

GEOCODE_CACHE_TTL = 86400  # 24 hours
WEATHER_CACHE_TTL = 900    # 15 minutes


def geocode_indian_location(query: str) -> Optional[Dict[str, Any]]:
    """
    Geocode a city or location in India using Open-Meteo Geocoding API.
    Returns dictionary with:
      name, state, country, latitude, longitude, elevation
    or None if no match found.
    """
    clean_query = query.strip()
    if not clean_query:
        return None

    cache_key = clean_query.lower()
    now = time.time()
    if cache_key in _GEOCODE_CACHE:
        entry = _GEOCODE_CACHE[cache_key]
        if now - entry["timestamp"] < GEOCODE_CACHE_TTL:
            return entry["data"]

    # Request Open-Meteo Geocoding
    # Note: query may include "City, State" or just "City"
    url = "https://geocoding-api.open-meteo.com/v1/search"
    city_name = clean_query.split(",")[0].strip()
    params = {
        "name": city_name,
        "count": 10,
        "language": "en",
        "format": "json",
    }

    try:
        resp = requests.get(url, params=params, timeout=5)
        if resp.status_code != 200:
            logger.warning(f"Geocoding API error {resp.status_code} for '{query}'")
            return None

        data = resp.json()
        results = data.get("results", [])
        if not results:
            return None

        # Filter for India first
        matched = None
        for r in results:
            if r.get("country_code", "").upper() == "IN" or r.get("country", "").lower() == "india":
                matched = r
                break

        # Fallback to first result if India not explicitly matched
        if not matched and results:
            matched = results[0]

        if not matched:
            return None

        result_obj = {
            "name": matched.get("name", city_name),
            "state": matched.get("admin1") or matched.get("admin2") or "India",
            "country": matched.get("country") or "India",
            "latitude": round(float(matched["latitude"]), 4),
            "longitude": round(float(matched["longitude"]), 4),
            "elevation": float(matched.get("elevation", 15.0)),
        }

        _GEOCODE_CACHE[cache_key] = {
            "timestamp": now,
            "data": result_obj
        }
        return result_obj

    except Exception as e:
        logger.error(f"Geocoding exception for '{query}': {e}")
        return None


def fetch_weather_telemetry(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """
    Fetch public weather data from Open-Meteo for the specified latitude and longitude:
    - Hourly precipitation (mm) -> calculates 24-hour accumulated rainfall
    - Daily precipitation sum -> past 7 days trend history
    - Surface soil moisture (0-1cm) -> converted to volumetric saturation %
    Returns dictionary with structured inputs or None if unavailable.
    """
    cache_key = f"{round(lat, 2)},{round(lon, 2)}"
    now = time.time()
    if cache_key in _WEATHER_CACHE:
        entry = _WEATHER_CACHE[cache_key]
        if now - entry["timestamp"] < WEATHER_CACHE_TTL:
            return entry["data"]

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "precipitation,soil_moisture_0_to_1cm",
        "daily": "precipitation_sum",
        "past_days": 7,
        "forecast_days": 1,
        "timezone": "auto",
    }

    try:
        resp = requests.get(url, params=params, timeout=6)
        if resp.status_code != 200:
            logger.warning(f"Weather API error {resp.status_code} for ({lat}, {lon})")
            return None

        data = resp.json()
        hourly = data.get("hourly", {})
        daily = data.get("daily", {})

        precip_list = hourly.get("precipitation", [])
        soil_list = hourly.get("soil_moisture_0_to_1cm", [])
        daily_precip = daily.get("precipitation_sum", [])

        # Calculate 24-hour accumulated rainfall from the past 24 hourly values
        # Open-Meteo forecast API past_days=7 has 168 hours of past + 24 hours of current/forecast
        if precip_list and len(precip_list) >= 48:
            # Slicing the 24 hours preceding current hour
            recent_24h = [float(p) for p in precip_list[-48:-24] if p is not None]
            rainfall_24h = round(sum(recent_24h), 1)
        elif precip_list:
            recent_24h = [float(p) for p in precip_list[-24:] if p is not None]
            rainfall_24h = round(sum(recent_24h), 1)
        else:
            rainfall_24h = 0.0

        # Recent 7-day trend history
        if daily_precip and len(daily_precip) >= 7:
            # Take the 7 past days
            seven_day_trend = [round(float(p or 0.0), 1) for p in daily_precip[-8:-1]]
        elif daily_precip:
            seven_day_trend = [round(float(p or 0.0), 1) for p in daily_precip]
        else:
            seven_day_trend = [0.0] * 7

        # Soil moisture: Open-Meteo returns volumetric fraction m³/m³ (e.g. 0.10 to 0.45)
        # Saturated field porosity is typically ~0.45 - 0.50 m³/m³
        valid_soil = [s for s in soil_list[-24:] if s is not None] if soil_list else []
        if valid_soil:
            recent_soil_m3 = valid_soil[-1]
            calculated_pct = min(98.0, max(5.0, (float(recent_soil_m3) / 0.50) * 100.0))
            soil_moisture_pct = round(calculated_pct, 1)
            soil_moisture_label = "Volumetric Model Input"
        else:
            # Conservative soil saturation estimate based on rainfall
            soil_moisture_pct = round(min(85.0, max(20.0, 30.0 + (rainfall_24h * 0.4))), 1)
            soil_moisture_label = "Estimated Model Input"

        weather_result = {
            "rainfall_24h": rainfall_24h,
            "rainfall_mm": rainfall_24h,
            "previous_rainfall_7d": round(sum(seven_day_trend), 1),
            "seven_day_trend": seven_day_trend,
            "soil_moisture": soil_moisture_pct,
            "soil_moisture_source": soil_moisture_label,
            "data_source": "Open-Meteo Public Telemetry (No API Key)",
        }

        _WEATHER_CACHE[cache_key] = {
            "timestamp": now,
            "data": weather_result
        }
        return weather_result

    except Exception as e:
        logger.error(f"Weather API exception for ({lat}, {lon}): {e}")
        return None
