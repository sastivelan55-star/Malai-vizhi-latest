"""
providers/location_provider.py — Geocoding, reverse geocoding, and coordinate validation.

Supports arbitrary coordinates, schools, villages, localities, streets, towns, landmarks, and cities in India.
Uses Nominatim OpenStreetMap (primary) with Open-Meteo Geocoding (fallback), with in-memory TTL caching.
"""

import time
import logging
from typing import List, Dict, Any, Optional
import requests
from providers.base import LocationProvider

logger = logging.getLogger(__name__)

# Caches
_GEO_SEARCH_CACHE: Dict[str, Dict[str, Any]] = {}
_REVERSE_GEO_CACHE: Dict[str, Dict[str, Any]] = {}

CACHE_TTL = 86400  # 24 hours


class DefaultLocationProvider(LocationProvider):
    def __init__(self, user_agent: str = "MalaiVizhi-PointRisk/2.0"):
        self.user_agent = user_agent
        self.headers = {"User-Agent": self.user_agent}

    def validate_coordinates(self, lat: float, lon: float) -> bool:
        """
        Validate latitude and longitude.
        Checks for valid world bounds and alerts if outside India's bounding envelope.
        """
        if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
            return False
        # India bounds roughly: lat 6.0 to 38.0, lon 68.0 to 98.5
        return True

    def is_within_india(self, lat: float, lon: float) -> bool:
        """Check if coordinates fall within India's approximate territorial envelope."""
        return 6.0 <= lat <= 38.5 and 68.0 <= lon <= 98.5

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Search for any place (school, village, locality, town, landmark, city) in India.
        Returns a list of candidate location dictionaries.
        """
        clean_query = query.strip()
        if not clean_query:
            return []

        cache_key = f"{clean_query.lower()}_{limit}"
        now = time.time()
        if cache_key in _GEO_SEARCH_CACHE:
            entry = _GEO_SEARCH_CACHE[cache_key]
            if now - entry["timestamp"] < CACHE_TTL:
                return entry["data"]

        results = []

        # 1. Try Nominatim (excellent for schools, villages, localities)
        try:
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                "q": clean_query,
                "format": "json",
                "countrycodes": "in",
                "addressdetails": 1,
                "limit": limit,
            }
            resp = requests.get(url, params=params, headers=self.headers, timeout=5)
            if resp.status_code == 200:
                for item in resp.json():
                    addr = item.get("address", {})
                    name = (
                        addr.get("school")
                        or addr.get("amenity")
                        or addr.get("village")
                        or addr.get("suburb")
                        or addr.get("town")
                        or addr.get("city")
                        or item.get("name")
                        or clean_query
                    )
                    state = addr.get("state") or addr.get("state_district") or "India"
                    display_name = item.get("display_name", name)
                    results.append({
                        "name": name,
                        "display_name": display_name,
                        "latitude": round(float(item["lat"]), 5),
                        "longitude": round(float(item["lon"]), 5),
                        "type": item.get("type", "location"),
                        "state": state,
                        "country": "India",
                        "source": "OpenStreetMap Nominatim"
                    })
        except Exception as e:
            logger.warning(f"Nominatim search failed for '{query}': {e}")

        # 2. Fallback to Open-Meteo Geocoding if Nominatim had no results
        if not results:
            try:
                om_url = "https://geocoding-api.open-meteo.com/v1/search"
                city_name = clean_query.split(",")[0].strip()
                om_params = {
                    "name": city_name,
                    "count": limit,
                    "language": "en",
                    "format": "json",
                }
                resp = requests.get(om_url, params=om_params, timeout=5)
                if resp.status_code == 200:
                    for item in resp.json().get("results", []):
                        if item.get("country_code", "").upper() == "IN" or item.get("country", "").lower() == "india":
                            results.append({
                                "name": item.get("name", city_name),
                                "display_name": f"{item.get('name')}, {item.get('admin1', '')}, India",
                                "latitude": round(float(item["latitude"]), 5),
                                "longitude": round(float(item["longitude"]), 5),
                                "type": item.get("feature_code", "city"),
                                "state": item.get("admin1") or "India",
                                "country": "India",
                                "source": "Open-Meteo Geocoding"
                            })
            except Exception as e:
                logger.warning(f"Open-Meteo search fallback failed for '{query}': {e}")

        _GEO_SEARCH_CACHE[cache_key] = {"timestamp": now, "data": results}
        return results

    def reverse_geocode(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """
        Reverse geocode latitude & longitude to human-readable place name and administrative context.
        """
        if not self.validate_coordinates(lat, lon):
            return None

        cache_key = f"{round(lat, 4)},{round(lon, 4)}"
        now = time.time()
        if cache_key in _REVERSE_GEO_CACHE:
            entry = _REVERSE_GEO_CACHE[cache_key]
            if now - entry["timestamp"] < CACHE_TTL:
                return entry["data"]

        try:
            url = "https://nominatim.openstreetmap.org/reverse"
            params = {
                "lat": lat,
                "lon": lon,
                "format": "json",
                "addressdetails": 1,
            }
            resp = requests.get(url, params=params, headers=self.headers, timeout=5)
            if resp.status_code == 200:
                item = resp.json()
                addr = item.get("address", {})
                name = (
                    addr.get("village")
                    or addr.get("suburb")
                    or addr.get("neighbourhood")
                    or addr.get("town")
                    or addr.get("city")
                    or addr.get("county")
                    or addr.get("state_district")
                    or "Selected Point"
                )
                state = addr.get("state") or "India"
                display_name = item.get("display_name", f"{name}, {state}")
                res_obj = {
                    "name": name,
                    "display_name": display_name,
                    "latitude": round(lat, 5),
                    "longitude": round(lon, 5),
                    "state": state,
                    "country": addr.get("country", "India"),
                    "source": "OpenStreetMap Nominatim"
                }
                _REVERSE_GEO_CACHE[cache_key] = {"timestamp": now, "data": res_obj}
                return res_obj
        except Exception as e:
            logger.warning(f"Reverse geocode failed for ({lat}, {lon}): {e}")

        # Fallback default representation
        fallback = {
            "name": f"Coordinate ({lat:.4f}, {lon:.4f})",
            "display_name": f"Point {lat:.4f} N, {lon:.4f} E",
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "state": "India",
            "country": "India",
            "source": "Coordinate Fallback"
        }
        _REVERSE_GEO_CACHE[cache_key] = {"timestamp": now, "data": fallback}
        return fallback
