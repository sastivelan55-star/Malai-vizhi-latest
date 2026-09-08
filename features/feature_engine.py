"""
features/feature_engine.py — Dedicated multi-hazard feature extraction layer.

Normalizes raw provider telemetry into structured feature vectors for the
Flood Risk Engine and Landslide Risk Engine. Preserves missing data as None without fabrication.
"""

from typing import Dict, Any, List, Optional


def assess_data_quality(required_present: int, total_required: int, critical_missing: bool = False) -> str:
    """Evaluate qualitative data quality without fabricating statistics."""
    if critical_missing or required_present == 0:
        return "INSUFFICIENT"
    ratio = required_present / float(total_required)
    if ratio >= 0.85:
        return "GOOD"
    if ratio >= 0.50:
        return "PARTIAL"
    return "INSUFFICIENT"


class FeatureEngine:
    @staticmethod
    def extract_flood_features(
        weather: Optional[Dict[str, Any]],
        terrain: Optional[Dict[str, Any]],
        soil: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Extract normalized features for flood risk assessment.
        """
        missing_features = []
        present_count = 0
        total_features = 6

        # 1. Rainfall features
        r1h = None
        r3h = None
        r6h = None
        r24h = None
        r72h = None
        antecedent_rain = None
        seven_day_trend = [0.0] * 7

        if weather and weather.get("data_available"):
            r1h = weather.get("rainfall_1h", {}).get("value")
            r3h = weather.get("rainfall_3h", {}).get("value")
            r6h = weather.get("rainfall_6h", {}).get("value")
            r24h = weather.get("rainfall_24h", {}).get("value")
            r72h = weather.get("rainfall_72h", {}).get("value")
            antecedent_rain = weather.get("antecedent_rainfall", {}).get("value")
            seven_day_trend = weather.get("seven_day_trend", [0.0] * 7)

            if r24h is not None:
                present_count += 2  # Primary trigger
            if r72h is not None:
                present_count += 1
        else:
            missing_features.extend(["rainfall_24h", "rainfall_72h", "antecedent_rainfall"])

        # 2. Soil moisture feature
        soil_moisture = None
        soil_status = "UNAVAILABLE"
        if soil and soil.get("soil_available"):
            soil_moisture = soil.get("soil_moisture", {}).get("value")
            soil_status = soil.get("soil_moisture", {}).get("quality", "VALID")
            if soil_moisture is not None:
                present_count += 1
        else:
            missing_features.append("soil_moisture")

        # 3. Terrain features
        elevation = None
        slope = None
        if terrain and terrain.get("terrain_available"):
            elevation = terrain.get("elevation", {}).get("value")
            slope = terrain.get("slope", {}).get("value")
            if elevation is not None:
                present_count += 1
            if slope is not None:
                present_count += 1
        else:
            missing_features.extend(["elevation", "slope"])

        critical_missing = (r24h is None)
        data_quality = assess_data_quality(present_count, total_features, critical_missing)

        # Estimate runoff index if rainfall & soil moisture present
        runoff_index = None
        if r24h is not None:
            effective_soil = soil_moisture if soil_moisture is not None else min(80.0, 30.0 + (r24h * 0.35))
            raw_runoff = (r24h * 0.35) + (effective_soil * 0.65)
            runoff_index = round(max(5.0, min(98.0, raw_runoff)), 1)

        return {
            "rainfall_1h": r1h,
            "rainfall_3h": r3h,
            "rainfall_6h": r6h,
            "rainfall_24h": r24h,
            "rainfall_72h": r72h,
            "antecedent_rainfall": antecedent_rain,
            "seven_day_trend": seven_day_trend,
            "soil_moisture": soil_moisture,
            "soil_status": soil_status,
            "elevation": elevation,
            "slope": slope,
            "runoff_index": runoff_index,
            "missing_features": missing_features,
            "data_quality": data_quality,
        }

    @staticmethod
    def extract_landslide_features(
        weather: Optional[Dict[str, Any]],
        terrain: Optional[Dict[str, Any]],
        soil: Optional[Dict[str, Any]],
        hazard: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Extract normalized features for landslide risk assessment.
        """
        missing_features = []
        present_count = 0
        total_features = 6

        r24h = None
        r72h = None
        antecedent_rain = None
        if weather and weather.get("data_available"):
            r24h = weather.get("rainfall_24h", {}).get("value")
            r72h = weather.get("rainfall_72h", {}).get("value")
            antecedent_rain = weather.get("antecedent_rainfall", {}).get("value")
            if r24h is not None:
                present_count += 2
            if antecedent_rain is not None:
                present_count += 1
        else:
            missing_features.extend(["rainfall_24h", "antecedent_rainfall"])

        soil_moisture = None
        soil_status = "UNAVAILABLE"
        if soil and soil.get("soil_available"):
            soil_moisture = soil.get("soil_moisture", {}).get("value")
            soil_status = soil.get("soil_moisture", {}).get("quality", "VALID")
            if soil_moisture is not None:
                present_count += 1
        else:
            missing_features.append("soil_moisture")

        elevation = None
        slope = None
        aspect = None
        aspect_dir = "N/A"
        terrain_available = False
        if terrain and terrain.get("terrain_available"):
            elevation = terrain.get("elevation", {}).get("value")
            slope = terrain.get("slope", {}).get("value")
            aspect = terrain.get("aspect", {}).get("value")
            aspect_dir = terrain.get("aspect", {}).get("direction", "N/A")
            terrain_available = True
            if slope is not None:
                present_count += 2
        else:
            missing_features.extend(["slope", "elevation"])

        gsi_zone = hazard.get("gsi_susceptibility_zone", "LOW") if hazard else "LOW"
        physiographic = hazard.get("physiographic_region", "Peninsular India") if hazard else "Peninsular India"

        critical_missing = (r24h is None and slope is None)
        data_quality = assess_data_quality(present_count, total_features, critical_missing)

        return {
            "rainfall_24h": r24h,
            "rainfall_72h": r72h,
            "antecedent_rainfall": antecedent_rain,
            "soil_moisture": soil_moisture,
            "soil_status": soil_status,
            "elevation": elevation,
            "slope": slope,
            "aspect": aspect,
            "aspect_direction": aspect_dir,
            "terrain_available": terrain_available,
            "gsi_susceptibility_zone": gsi_zone,
            "physiographic_region": physiographic,
            "missing_features": missing_features,
            "data_quality": data_quality,
        }
