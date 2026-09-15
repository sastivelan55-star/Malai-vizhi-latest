"""
providers/weather_provider.py — Real location-specific precipitation telemetry provider.

Queries Open-Meteo ERA5-Land / high-resolution numerical weather prediction models (zero credentials required).
Returns multi-duration accumulated precipitation:
- rainfall_1h, rainfall_3h, rainfall_6h, rainfall_24h, rainfall_72h, antecedent_rainfall (7 days)
Stores: value, unit, source, timestamp, spatial_resolution, quality.
Includes in-memory grid-level caching (15 mins TTL).
"""

import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import requests
from providers.base import WeatherProvider

logger = logging.getLogger(__name__)

_WEATHER_CACHE: Dict[str, Dict[str, Any]] = {}
WEATHER_CACHE_TTL = 900  # 15 minutes


class DefaultWeatherProvider(WeatherProvider):
    def get_weather(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """
        Retrieve multi-duration precipitation telemetry for exact latitude & longitude.
        Uses 0.01 degree grid cell rounding for efficient cache reuse.
        """
        grid_key = f"{round(lat, 2)},{round(lon, 2)}"
        now = time.time()
        if grid_key in _WEATHER_CACHE:
            entry = _WEATHER_CACHE[grid_key]
            if now - entry["timestamp"] < WEATHER_CACHE_TTL:
                return entry["data"]

        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation",
            "hourly": "precipitation",
            "daily": "precipitation_sum",
            "past_days": 7,
            "forecast_days": 1,
            "timezone": "auto",
        }

        try:
            resp = requests.get(url, params=params, timeout=7)
            if resp.status_code != 200:
                logger.warning(f"Weather API status {resp.status_code} for ({lat}, {lon})")
                return None

            data = resp.json()
            current = data.get("current", {})
            hourly = data.get("hourly", {})
            daily = data.get("daily", {})

            temp = current.get("temperature_2m", 0.0)
            humidity = current.get("relative_humidity_2m", 0)
            wind = current.get("wind_speed_10m", 0.0)

            precip_list = hourly.get("precipitation", [])
            daily_precip = daily.get("precipitation_sum", [])

            if not precip_list:
                return None

            # Hourly series covers 7 past days (168h) + current/forecast 24h = 192h
            # The most recent 24 completed/current hours:
            # We slice the last 24 observed hours before current forecast period
            if len(precip_list) >= 48:
                recent_24h_series = [float(p) for p in precip_list[-48:-24] if p is not None]
                recent_72h_series = [float(p) for p in precip_list[-96:-24] if p is not None]
                recent_6h_series = recent_24h_series[-6:] if len(recent_24h_series) >= 6 else recent_24h_series
                recent_3h_series = recent_24h_series[-3:] if len(recent_24h_series) >= 3 else recent_24h_series
                recent_1h_series = recent_24h_series[-1:] if recent_24h_series else [0.0]
            else:
                recent_24h_series = [float(p) for p in precip_list[-24:] if p is not None]
                recent_72h_series = [float(p) for p in precip_list if p is not None]
                recent_6h_series = recent_24h_series[-6:]
                recent_3h_series = recent_24h_series[-3:]
                recent_1h_series = recent_24h_series[-1:]

            # Forecast 24h expected precipitation
            if len(precip_list) >= 24:
                forecast_24h_series = [float(p) for p in precip_list[-24:] if p is not None]
                forecast_24h = round(sum(forecast_24h_series), 1)
            else:
                forecast_24h = 0.0

            rainfall_1h = round(recent_1h_series[-1] if recent_1h_series else 0.0, 1)
            rainfall_3h = round(sum(recent_3h_series), 1)
            rainfall_6h = round(sum(recent_6h_series), 1)
            rainfall_24h = round(sum(recent_24h_series), 1)
            rainfall_72h = round(sum(recent_72h_series), 1)

            # 7-day trend from daily precipitation sum
            if daily_precip and len(daily_precip) >= 7:
                seven_day_trend = [round(float(p or 0.0), 1) for p in daily_precip[-8:-1]]
            elif daily_precip:
                seven_day_trend = [round(float(p or 0.0), 1) for p in daily_precip]
            else:
                seven_day_trend = [0.0] * 7

            antecedent_7d = round(sum(seven_day_trend), 1)
            obs_timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

            obs_1h = {
                "value": rainfall_1h,
                "unit": "mm",
                "source": "Open-Meteo ERA5 / NWP Reanalysis",
                "timestamp": obs_timestamp,
                "spatial_resolution": "0.1° (~11 km grid cell)",
                "quality": "good",
                "available": True,
            }
            obs_3h = {
                "value": rainfall_3h,
                "unit": "mm",
                "source": "Open-Meteo ERA5 / NWP Reanalysis",
                "timestamp": obs_timestamp,
                "spatial_resolution": "0.1° (~11 km grid cell)",
                "quality": "good",
                "available": True,
            }
            obs_6h = {
                "value": rainfall_6h,
                "unit": "mm",
                "source": "Open-Meteo ERA5 / NWP Reanalysis",
                "timestamp": obs_timestamp,
                "spatial_resolution": "0.1° (~11 km grid cell)",
                "quality": "good",
                "available": True,
            }
            obs_24h = {
                "value": rainfall_24h,
                "unit": "mm",
                "source": "Open-Meteo ERA5 / NWP Reanalysis",
                "timestamp": obs_timestamp,
                "spatial_resolution": "0.1° (~11 km grid cell)",
                "quality": "good",
                "available": True,
            }
            obs_72h = {
                "value": rainfall_72h,
                "unit": "mm",
                "source": "Open-Meteo ERA5 / NWP Reanalysis",
                "timestamp": obs_timestamp,
                "spatial_resolution": "0.1° (~11 km grid cell)",
                "quality": "good",
                "available": True,
            }
            obs_ant = {
                "value": antecedent_7d,
                "unit": "mm",
                "source": "Open-Meteo Daily Aggregation (7d)",
                "timestamp": obs_timestamp,
                "spatial_resolution": "0.1° (~11 km grid cell)",
                "quality": "good",
                "available": True,
            }
            obs_fc = {
                "value": forecast_24h,
                "unit": "mm",
                "source": "Open-Meteo NWP 24h Precipitation Forecast",
                "timestamp": obs_timestamp,
                "spatial_resolution": "0.1° (~11 km grid cell)",
                "quality": "good",
                "available": True,
            }

            weather_data = {
                "temperature": temp,
                "humidity": humidity,
                "wind_speed": wind,
                "rainfall_1h": obs_1h,
                "rainfall_3h": obs_3h,
                "rainfall_6h": obs_6h,
                "rainfall_24h": obs_24h,
                "rainfall_72h": obs_72h,
                "antecedent_rainfall": obs_ant,
                "forecast_24h": obs_fc,
                "seven_day_trend": seven_day_trend,
                "data_available": True,
                "rainfall": {
                    "current_1h": obs_1h,
                    "recent_3h": obs_3h,
                    "recent_6h": obs_6h,
                    "accumulated_24h": obs_24h,
                    "accumulated_3d": obs_72h,
                    "accumulated_7d": obs_ant,
                    "forecast_24h": obs_fc,
                    "seven_day_trend": seven_day_trend,
                    "freshness": "LIVE",
                    "available": True,
                },
            }

            _WEATHER_CACHE[grid_key] = {"timestamp": now, "data": weather_data}
            return weather_data

        except Exception as e:
            logger.error(f"Weather fetch failed for ({lat}, {lon}): {e}")
            return self._unavailable_response()

    def _unavailable_response(self) -> Dict[str, Any]:
        """Graceful fallback when weather provider cannot be reached."""
        null_obs = {
            "value": None,
            "unit": "mm",
            "source": "Open-Meteo (Unavailable)",
            "timestamp": None,
            "spatial_resolution": "0.1° (~11 km grid cell)",
            "quality": "unavailable",
            "available": False,
        }
        return {
            "rainfall_1h": null_obs,
            "rainfall_3h": null_obs,
            "rainfall_6h": null_obs,
            "rainfall_24h": null_obs,
            "rainfall_72h": null_obs,
            "antecedent_rainfall": null_obs,
            "forecast_24h": null_obs,
            "seven_day_trend": [0.0] * 7,
            "data_available": False,
            "rainfall": {
                "current_1h": null_obs,
                "recent_3h": null_obs,
                "recent_6h": null_obs,
                "accumulated_24h": null_obs,
                "accumulated_3d": null_obs,
                "accumulated_7d": null_obs,
                "forecast_24h": null_obs,
                "seven_day_trend": [0.0] * 7,
                "freshness": "UNAVAILABLE",
                "available": False,
            },
        }

