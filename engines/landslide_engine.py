"""
engines/landslide_engine.py — Production-grade point-level landslide risk assessment engine.
Model Version: landslide_model_v1

Evaluates slope instability, pore water saturation, antecedent rainfall,
and GSI baseline susceptibility for exact coordinates.
"""

from typing import Dict, Any, List


class LandslideRiskEngine:
    MODEL_VERSION = "landslide_model_v1"

    @classmethod
    def evaluate(cls, features: Dict[str, Any], location_name: str = "Selected Location") -> Dict[str, Any]:
        """
        Evaluate point-level landslide hazard using slope, rainfall, and soil pore saturation.
        """
        data_quality = features.get("data_quality", "INSUFFICIENT")

        r24h = features.get("rainfall_24h")
        slope = features.get("slope")
        terrain_available = features.get("terrain_available", False)

        # Critical missing check: if both rainfall and slope are missing, assessment cannot proceed
        if r24h is None and slope is None:
            return {
                "score": None,
                "level": "UNAVAILABLE",
                "confidence": "LOW",
                "data_quality": "INSUFFICIENT",
                "factors": ["Rainfall and DEM terrain slope telemetry both unavailable"],
                "model_version": cls.MODEL_VERSION,
                "assessment": f"Insufficient environmental data to determine slope stability at {location_name}.",
                "status": "MISSING_CRITICAL_DATA",
            }

        soil_moisture = features.get("soil_moisture")
        antecedent = features.get("antecedent_rainfall")
        elevation = features.get("elevation")
        aspect = features.get("aspect")
        aspect_dir = features.get("aspect_direction", "N/A")
        gsi_zone = features.get("gsi_susceptibility_zone", "LOW")

        factors: List[str] = []

        # 1. Slope vulnerability component (0-20 pts)
        # Slopes < 10° have very low gravitational driving stress;
        # Slopes > 25°-35° have high shear vulnerability.
        if slope is not None and terrain_available:
            slope_val = float(slope)
            if slope_val < 5.0:
                slope_pts = max(1.0, (slope_val / 5.0) * 3.0)
                factors.append(f"Near-flat terrain (slope {slope_val:.1f}°), minimal gravitational shear stress")
            elif slope_val < 20.0:
                slope_pts = 3.0 + ((slope_val - 5.0) / 15.0) * 7.0
                factors.append(f"Gentle to moderate hill slope ({slope_val:.1f}°)")
            elif slope_val <= 45.0:
                slope_pts = 10.0 + ((slope_val - 20.0) / 25.0) * 10.0
                factors.append(f"Steep slope ({slope_val:.1f}°), elevated gravitational shear hazard")
            else:
                slope_pts = 20.0
                factors.append(f"Precipitous cliff/escarpment (slope {slope_val:.1f}°)")
        else:
            slope_pts = 5.0  # Reduced neutral weight
            factors.append("DEM slope unavailable (conservative baseline assumed)")

        # 2. Rainfall precipitation component (0-45 pts)
        # Saturated at 200 mm
        effective_rain = float(r24h) if r24h is not None else 0.0
        # Add 10% weight of antecedent rainfall if available
        if antecedent is not None and antecedent > 0:
            effective_rain += min(30.0, float(antecedent) * 0.1)

        rain_pts = min(45.0, (effective_rain / 200.0) * 45.0)
        if r24h is not None:
            if r24h >= 120.0:
                factors.append(f"Heavy trigger rainfall ({r24h:.1f} mm/24h)")
            elif r24h >= 50.0:
                factors.append(f"Moderate cumulative rainfall ({r24h:.1f} mm/24h)")
            else:
                factors.append(f"Low 24h rainfall ({r24h:.1f} mm)")

        # 3. Soil moisture / pore water saturation component (0-35 pts)
        # High saturation weakens shear strength along failure planes
        if soil_moisture is not None:
            moist_pts = min(35.0, (float(soil_moisture) / 95.0) * 35.0)
            if soil_moisture >= 75.0:
                factors.append(f"High pore water pressure ({soil_moisture:.1f}% moisture saturation)")
            elif soil_moisture >= 50.0:
                factors.append(f"Moderate ground moisture ({soil_moisture:.1f}%)")
        else:
            moist_pts = min(15.0, (effective_rain / 180.0) * 15.0)
            factors.append("Soil moisture sensor unavailable (moisture estimated from precipitation)")

        # 4. GSI Regional Susceptibility Modifier (+/- 5 pts)
        if gsi_zone == "HIGH":
            gsi_bonus = 5.0
            factors.append("Located within GSI High Landslide Susceptibility Zone")
        elif gsi_zone == "MODERATE":
            gsi_bonus = 2.0
        else:
            gsi_bonus = 0.0

        # If flat terrain (< 5 deg), landslide probability is naturally capped
        raw_score = rain_pts + moist_pts + slope_pts + gsi_bonus
        if slope is not None and float(slope) < 4.0:
            # Lowlands and flat plains have near-zero landslide risk regardless of rain
            score = min(25, int(round(raw_score * 0.4)))
        else:
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
        if data_quality == "GOOD" and terrain_available:
            confidence = "HIGH"
            confidence_pct = 85
        elif data_quality == "PARTIAL":
            confidence = "MODERATE"
            confidence_pct = 60
        else:
            confidence = "LOW"
            confidence_pct = 35

        # Assessment narrative
        if level == "HIGH":
            commentary = (
                f"Elevated slope instability warning for {location_name}. "
                f"Steep terrain slope combined with saturated ground conditions exceeds typical failure equilibrium."
            )
        elif level == "MODERATE":
            commentary = (
                f"Moderate slope advisory for {location_name}. "
                f"Antecedent precipitation and ground moisture indicate increasing shear stress on vulnerable cuttings."
            )
        else:
            commentary = (
                f"Stable geomorphological baseline at {location_name}. "
                f"Current precipitation and terrain slope remain well within regional stability thresholds."
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
            "terrain_available": terrain_available,
            "status": "VALID",
        }
