"""
engines/flood_engine.py — Production-grade point-level flood risk assessment engine.
Model Version: flood_model_v1

Calculates composite risk score (0-100), risk level (LOW/MODERATE/HIGH),
data quality, confidence, and primary contributing hydrological factors.
"""

from typing import Dict, Any, List


class FloodRiskEngine:
    MODEL_VERSION = "flood_model_v1"

    @classmethod
    def evaluate(cls, features: Dict[str, Any], location_name: str = "Selected Location") -> Dict[str, Any]:
        """
        Evaluate flood risk from normalized point-level environmental features.
        """
        data_quality = features.get("data_quality", "INSUFFICIENT")

        # Missing critical input check
        r24h = features.get("rainfall_24h")
        if r24h is None:
            return {
                "score": None,
                "level": "UNAVAILABLE",
                "confidence": "LOW",
                "data_quality": "INSUFFICIENT",
                "factors": ["Critical 24-hour rainfall telemetry unavailable"],
                "model_version": cls.MODEL_VERSION,
                "assessment": f"Insufficient precipitation data for a reliable flood assessment at {location_name}.",
                "status": "MISSING_CRITICAL_DATA",
            }

        soil_moisture = features.get("soil_moisture")
        slope = features.get("slope")
        elevation = features.get("elevation")
        antecedent = features.get("antecedent_rainfall")

        factors: List[str] = []

        # 1. Rainfall intensity & accumulation (0-50 pts)
        # Saturated at 200 mm/24h
        rain_pts = min(50.0, (float(r24h) / 200.0) * 50.0)
        if r24h >= 100.0:
            factors.append(f"Severe 24h precipitation ({r24h:.1f} mm)")
        elif r24h >= 40.0:
            factors.append(f"Elevated 24h precipitation ({r24h:.1f} mm)")
        elif r24h > 0.0:
            factors.append(f"Light precipitation ({r24h:.1f} mm)")
        else:
            factors.append("No significant 24h precipitation")

        # 2. Soil pore water saturation (0-35 pts)
        # Saturated at 95%
        if soil_moisture is not None:
            moist_pts = min(35.0, (float(soil_moisture) / 95.0) * 35.0)
            if soil_moisture >= 75.0:
                factors.append(f"High ground saturation ({soil_moisture:.1f}%), severely limiting infiltration")
            elif soil_moisture >= 50.0:
                factors.append(f"Moderate soil saturation ({soil_moisture:.1f}%)")
        else:
            # Conservative baseline estimate when soil probe is missing
            moist_pts = min(20.0, (float(r24h) / 150.0) * 20.0)
            factors.append("Soil moisture telemetry unavailable (estimated baseline)")

        # 3. Terrain accumulation / Catchment slope factor (0-15 pts)
        # Low slopes (<15 deg) in valleys and coastal plains retain and pool water
        if slope is not None:
            slope_val = float(slope)
            # Flatter terrain = higher water retention
            retention_factor = max(0.0, min(15.0, (30.0 - slope_val) / 30.0 * 15.0))
            if slope_val < 3.0:
                factors.append(f"Very flat terrain (slope {slope_val:.1f}°), high surface water retention")
            elif slope_val < 10.0:
                factors.append(f"Gentle terrain (slope {slope_val:.1f}°)")
        else:
            retention_factor = 7.5  # Neutral midpoint
            factors.append("DEM slope unavailable (neutral baseline)")

        # Composite score
        raw_score = rain_pts + moist_pts + retention_factor
        score = int(round(raw_score))
        score = max(5, min(99, score))

        # Risk level classification
        if score >= 70:
            level = "HIGH"
        elif score >= 40:
            level = "MODERATE"
        else:
            level = "LOW"

        # Confidence rating
        if data_quality == "GOOD":
            confidence = "HIGH"
            confidence_pct = 85
        elif data_quality == "PARTIAL":
            confidence = "MODERATE"
            confidence_pct = 65
        else:
            confidence = "LOW"
            confidence_pct = 40

        # Assessment narrative
        runoff_idx = features.get("runoff_index", round((r24h * 0.35) + 30.0, 1))
        if level == "HIGH":
            commentary = (
                f"Severe surface inundation advisory for {location_name}. "
                f"Accumulated rainfall ({r24h:.1f} mm) drives an estimated surface runoff index of {runoff_idx}%. "
                f"Low-lying drainage channels and floodplains are at elevated waterlogging risk."
            )
        elif level == "MODERATE":
            commentary = (
                f"Moderate surface accumulation advisory for {location_name}. "
                f"Precipitation ({r24h:.1f} mm) indicates increasing localized drainage congestion in low-elevation pockets."
            )
        else:
            commentary = (
                f"Normal hydrological baseline at {location_name}. "
                f"Precipitation ({r24h:.1f} mm) is within manageable soil absorption and natural drainage capacities."
            )

        return {
            "score": score,
            "level": level,
            "confidence": confidence,
            "confidence_pct": confidence_pct,
            "data_quality": data_quality,
            "factors": factors,
            "model_version": cls.MODEL_VERSION,
            "assessment": commentary,
            "status": "VALID",
        }
