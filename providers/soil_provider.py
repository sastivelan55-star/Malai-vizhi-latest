"""
providers/soil_provider.py — Soil moisture and ground saturation telemetry provider.

Queries surface soil moisture (0–1cm and 1–3cm volumetric fraction m³/m³)
from Open-Meteo Land Surface models. Converts to pore space saturation percentage.
"""

import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import requests
from providers.base import SoilMoistureProvider

logger = logging.getLogger(__name__)

_SOIL_CACHE: Dict[str, Dict[str, Any]] = {}
SOIL_CACHE_TTL = 900  # 15 minutes


class DefaultSoilMoistureProvider(SoilMoistureProvider):
    def get_soil_moisture(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """
        Retrieve surface soil moisture and saturation percentage.
        """
        grid_key = f"{round(lat, 2)},{round(lon, 2)}"
        now = time.time()
        if grid_key in _SOIL_CACHE:
            entry = _SOIL_CACHE[grid_key]
            if now - entry["timestamp"] < SOIL_CACHE_TTL:
                return entry["data"]

        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": "soil_moisture_0_to_1cm,soil_moisture_1_to_3cm",
            "past_days": 1,
            "forecast_days": 1,
            "timezone": "auto",
        }

        try:
            resp = requests.get(url, params=params, timeout=6)
            if resp.status_code != 200:
                return self._unavailable_response()

            data = resp.json()
            hourly = data.get("hourly", {})
            soil_0_1 = hourly.get("soil_moisture_0_to_1cm", [])

            valid_samples = [s for s in soil_0_1 if s is not None]
            if not valid_samples:
                return self._unavailable_response()

            # Volumetric fraction m³/m³ (typically 0.05 to 0.45)
            recent_m3 = float(valid_samples[-1])
            # Soil saturation % assuming ~0.48 m³/m³ pore saturation limit
            saturation_pct = min(98.0, max(5.0, (recent_m3 / 0.48) * 100.0))

            obs_timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

            soil_data = {
                "soil_moisture": {
                    "value": round(saturation_pct, 1),
                    "volumetric_m3": round(recent_m3, 3),
                    "unit": "%",
                    "source": "Open-Meteo ERA5-Land Surface Telemetry",
                    "timestamp": obs_timestamp,
                    "spatial_resolution": "0.1° (~11 km grid cell)",
                    "quality": "VALID",
                },
                "soil_available": True,
            }

            _SOIL_CACHE[grid_key] = {"timestamp": now, "data": soil_data}
            return soil_data

        except Exception as e:
            logger.error(f"Soil moisture fetch failed for ({lat}, {lon}): {e}")
            return self._unavailable_response()

    def _unavailable_response(self) -> Dict[str, Any]:
        return {
            "soil_moisture": {
                "value": None,
                "volumetric_m3": None,
                "unit": "%",
                "source": "ERA5-Land (Unavailable)",
                "quality": "UNAVAILABLE",
            },
            "soil_available": False,
        }
