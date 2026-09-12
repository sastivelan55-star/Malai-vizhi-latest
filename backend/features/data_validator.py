"""
features/data_validator.py — Environmental telemetry validation and quality scoring layer.

Validates:
- Physical ranges (rainfall >= 0, 0 <= soil moisture <= 100%, 0 <= slope <= 90°, -500 <= elevation <= 9000m)
- Timestamp freshness against current UTC time:
    < 6 hours: LIVE
    6 - 24 hours: RECENT
    > 24 hours: STALE
- Unit consistency and null checks
- Provider availability and missing data tracking
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class DataValidator:
    """Validates raw provider telemetry before feature and risk engine evaluation."""

    @staticmethod
    def parse_iso_timestamp(ts_str: Optional[str]) -> Optional[datetime]:
        """Safely parse various datetime string formats into UTC datetime."""
        if not ts_str:
            return None
        formats = [
            "%Y-%m-%d %H:%M:%S UTC",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f%z",
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%SZ",
        ]
        clean_str = ts_str.strip()
        for fmt in formats:
            try:
                dt = datetime.strptime(clean_str, fmt)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt
            except ValueError:
                continue
        try:
            # Fallback to fromisoformat
            return datetime.fromisoformat(clean_str.replace("Z", "+00:00"))
        except Exception:
            return None

    @classmethod
    def evaluate_freshness(cls, ts_str: Optional[str]) -> str:
        """
        Evaluate freshness of an observation:
        - LIVE: under 6 hours old
        - RECENT: between 6 and 24 hours old
        - STALE: older than 24 hours or unparseable
        """
        dt = cls.parse_iso_timestamp(ts_str)
        if not dt:
            return "UNKNOWN"
        now = datetime.now(timezone.utc)
        age_seconds = (now - dt).total_seconds()
        if age_seconds < 0:
            # Timestamp is in near future (forecast or clock skew)
            return "LIVE"
        elif age_seconds < 6 * 3600:
            return "LIVE"
        elif age_seconds < 24 * 3600:
            return "RECENT"
        else:
            return "STALE"

    @classmethod
    def validate_weather(cls, weather: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate weather observations."""
        if not weather:
            return {
                "valid": False,
                "freshness": "UNAVAILABLE",
                "missing": ["rainfall_24h", "rainfall_1h"],
                "warnings": ["Weather telemetry completely unavailable"],
            }

        warnings = []
        missing = []
        r24 = weather.get("rainfall_24h", {})
        val24 = r24.get("value") if isinstance(r24, dict) else r24
        ts24 = r24.get("timestamp") if isinstance(r24, dict) else None

        if val24 is None:
            missing.append("rainfall_24h")
        elif not isinstance(val24, (int, float)) or val24 < 0 or val24 > 1500:
            warnings.append(f"24h precipitation out of physical bounds: {val24}")

        freshness = cls.evaluate_freshness(ts24)
        if freshness == "STALE":
            warnings.append("Precipitation telemetry is older than 24 hours (stale)")

        return {
            "valid": len(missing) == 0,
            "freshness": freshness,
            "missing": missing,
            "warnings": warnings,
        }

    @classmethod
    def validate_terrain(cls, terrain: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate Copernicus DEM terrain observations."""
        if not terrain or not terrain.get("terrain_available", False):
            return {
                "valid": False,
                "freshness": "UNAVAILABLE",
                "missing": ["elevation", "slope"],
                "warnings": ["DEM terrain telemetry unavailable for this coordinate"],
            }

        warnings = []
        missing = []
        elev_obj = terrain.get("elevation", {})
        elev_val = elev_obj.get("value") if isinstance(elev_obj, dict) else elev_obj

        slope_obj = terrain.get("slope", {})
        slope_val = slope_obj.get("value") if isinstance(slope_obj, dict) else slope_obj

        if elev_val is None:
            missing.append("elevation")
        elif not isinstance(elev_val, (int, float)) or elev_val < -500 or elev_val > 9000:
            warnings.append(f"Elevation out of Earth bounds: {elev_val}m")

        if slope_val is None:
            missing.append("slope")
        elif not isinstance(slope_val, (int, float)) or slope_val < 0 or slope_val > 90:
            warnings.append(f"Slope angle out of physical bounds: {slope_val}°")

        return {
            "valid": len(missing) == 0,
            "freshness": "STATIC",
            "missing": missing,
            "warnings": warnings,
        }

    @classmethod
    def validate_soil(cls, soil: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate soil moisture observations."""
        if not soil or not soil.get("soil_available", False):
            return {
                "valid": False,
                "freshness": "UNAVAILABLE",
                "missing": ["soil_moisture"],
                "warnings": ["In-situ or satellite soil moisture unavailable"],
            }

        warnings = []
        missing = []
        sm_obj = soil.get("soil_moisture", {})
        sm_val = sm_obj.get("value") if isinstance(sm_obj, dict) else sm_obj
        sm_ts = sm_obj.get("timestamp") if isinstance(sm_obj, dict) else None

        if sm_val is None:
            missing.append("soil_moisture")
        elif not isinstance(sm_val, (int, float)) or sm_val < 0 or sm_val > 100:
            warnings.append(f"Soil moisture saturation percentage out of bounds: {sm_val}%")

        freshness = cls.evaluate_freshness(sm_ts)

        return {
            "valid": len(missing) == 0,
            "freshness": freshness,
            "missing": missing,
            "warnings": warnings,
        }

    @classmethod
    def audit_telemetry(
        cls,
        weather: Optional[Dict[str, Any]],
        terrain: Optional[Dict[str, Any]],
        soil: Optional[Dict[str, Any]],
        hazard: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Consolidated audit across all providers.
        Determines overall data quality: 'good' | 'moderate' | 'limited' | 'unavailable'.
        """
        v_weather = cls.validate_weather(weather)
        v_terrain = cls.validate_terrain(terrain)
        v_soil = cls.validate_soil(soil)

        all_warnings: List[str] = v_weather["warnings"] + v_terrain["warnings"] + v_soil["warnings"]
        missing_feeds: List[str] = v_weather["missing"] + v_terrain["missing"] + v_soil["missing"]

        # Availability count
        available_feeds = []
        if v_weather["valid"]:
            available_feeds.append("weather")
        if v_terrain["valid"]:
            available_feeds.append("terrain")
        if v_soil["valid"]:
            available_feeds.append("soil")
        if hazard and hazard.get("gsi_susceptibility_zone"):
            available_feeds.append("hazard_zonation")

        has_weather = "weather" in available_feeds
        has_terrain = "terrain" in available_feeds
        has_soil = "soil" in available_feeds

        if has_weather and has_terrain and has_soil:
            status = "good"
            message = "Real-time atmospheric reanalysis, satellite soil moisture, and Copernicus DEM terrain available."
        elif has_weather and has_terrain:
            status = "moderate"
            message = "Real-time precipitation and Copernicus DEM terrain available. Ground moisture estimated from precipitation history."
        elif has_weather:
            status = "limited"
            message = "Atmospheric precipitation available, but local high-resolution DEM slope is limited. Conservative baseline assumed."
        else:
            status = "unavailable"
            message = "Real-time environmental telemetry unavailable for this coordinate. Output is an unverified prototype baseline."

        return {
            "status": status,
            "message": message,
            "available_feeds": available_feeds,
            "missing_feeds": missing_feeds,
            "warnings": all_warnings,
            "weather_validation": v_weather,
            "terrain_validation": v_terrain,
            "soil_validation": v_soil,
        }
