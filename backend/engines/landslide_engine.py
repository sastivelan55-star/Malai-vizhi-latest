"""
engines/landslide_engine.py — Production-grade point-level landslide risk assessment engine.
Model Version: landslide_model_v1

Evaluates slope instability, pore water saturation, antecedent rainfall,
and GSI baseline susceptibility for exact coordinates.
Provides fully explainable contributing factors and supports what-if simulation scenarios.
"""

from typing import Dict, Any, List, Optional


class LandslideRiskEngine:
    MODEL_VERSION = "landslide_model_v1"

    @classmethod
    def evaluate(
        cls,
        features: Dict[str, Any],
        location_name: str = "Selected Location",
        rainfall_multiplier: float = 1.0,
        rainfall_override: Optional[float] = None,
        rainfall_change_percent: float = 0.0,
        soil_moisture_change_percent: float = 0.0,
        soil_moisture_override: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Evaluate point-level landslide hazard using slope, rainfall, and soil pore saturation.
        Returns explainable factors with value, unit, impact, contribution points, dominant factor, and availability.
        """
        data_quality = features.get("data_quality", "INSUFFICIENT")

        raw_r24h = features.get("rainfall_24h")
        slope = features.get("slope")
        terrain_available = features.get("terrain_available", False)

        # Apply what-if scenario override or multiplier if specified
        if rainfall_override is not None:
            r24h = max(0.0, float(rainfall_override))
        elif rainfall_change_percent != 0.0 and raw_r24h is not None:
            r24h = max(0.0, float(raw_r24h) * (1.0 + (rainfall_change_percent / 100.0)))
        elif raw_r24h is not None and rainfall_multiplier != 1.0:
            r24h = max(0.0, float(raw_r24h) * float(rainfall_multiplier))
        else:
            r24h = raw_r24h

        raw_sm = features.get("soil_moisture")
        if soil_moisture_override is not None:
            soil_moisture = max(0.0, min(100.0, float(soil_moisture_override)))
        elif soil_moisture_change_percent != 0.0 and raw_sm is not None:
            soil_moisture = max(0.0, min(100.0, float(raw_sm) * (1.0 + (soil_moisture_change_percent / 100.0))))
        else:
            soil_moisture = raw_sm

        # Critical missing check: if both rainfall and slope are missing, assessment cannot proceed
        if r24h is None and slope is None:
            return {
                "score": None,
                "level": "UNAVAILABLE",
                "confidence": "LOW",
                "confidence_pct": 20,
                "data_quality": "INSUFFICIENT",
                "factors": [],
                "structured_factors": [],
                "dominant_factor": "Unavailable",
                "factor_descriptions": ["Rainfall and DEM terrain slope telemetry both unavailable"],
                "model_version": cls.MODEL_VERSION,
                "assessment": f"Insufficient environmental data to determine slope stability at {location_name}.",
                "status": "MISSING_CRITICAL_DATA",
            }

        antecedent = features.get("antecedent_rainfall")
        gsi_zone = features.get("gsi_susceptibility_zone", "LOW")

        factor_descriptions: List[str] = []
        structured_factors: List[Dict[str, Any]] = []

        # 1. Slope vulnerability component (0-20 pts)
        if slope is not None and terrain_available:
            slope_val = float(slope)
            if slope_val < 5.0:
                slope_pts = max(1.0, (slope_val / 5.0) * 3.0)
                desc = f"Near-flat terrain (slope {slope_val:.1f}°), minimal gravitational shear stress"
                impact = "low"
            elif slope_val < 20.0:
                slope_pts = 3.0 + ((slope_val - 5.0) / 15.0) * 7.0
                desc = f"Gentle to moderate hill slope ({slope_val:.1f}°)"
                impact = "moderate"
            elif slope_val <= 45.0:
                slope_pts = 10.0 + ((slope_val - 20.0) / 25.0) * 10.0
                desc = f"Steep slope ({slope_val:.1f}°), elevated gravitational shear hazard"
                impact = "high"
            else:
                slope_pts = 20.0
                desc = f"Precipitous cliff/escarpment (slope {slope_val:.1f}°)"
                impact = "high"

            factor_descriptions.append(desc)
            structured_factors.append({
                "name": "Slope",
                "value": round(slope_val, 1),
                "unit": "degrees",
                "impact": impact,
                "contribution": int(round(slope_pts)),
                "pts": round(slope_pts, 1),
                "available": True,
                "description": desc,
            })
        else:
            slope_pts = 5.0  # Conservative baseline
            desc = "DEM slope unavailable (conservative baseline assumed)"
            factor_descriptions.append(desc)
            structured_factors.append({
                "name": "Slope",
                "value": None,
                "unit": "degrees",
                "impact": "low",
                "contribution": int(round(slope_pts)),
                "pts": 5.0,
                "available": False,
                "description": desc,
            })

        # 2. Rainfall precipitation component (0-45 pts)
        effective_rain = float(r24h) if r24h is not None else 0.0
        if antecedent is not None and antecedent > 0:
            effective_rain += min(30.0, float(antecedent) * 0.1)

        rain_pts = min(45.0, (effective_rain / 200.0) * 45.0)
        if r24h is not None:
            r24h_val = float(r24h)
            if r24h_val >= 120.0:
                desc = f"Heavy trigger rainfall ({r24h_val:.1f} mm/24h)"
                impact = "high"
            elif r24h_val >= 50.0:
                desc = f"Moderate cumulative rainfall ({r24h_val:.1f} mm/24h)"
                impact = "moderate"
            else:
                desc = f"Low 24h rainfall ({r24h_val:.1f} mm)"
                impact = "low"

            factor_descriptions.append(desc)
            structured_factors.append({
                "name": "Recent rainfall",
                "value": round(r24h_val, 1),
                "unit": "mm",
                "impact": impact,
                "contribution": int(round(rain_pts)),
                "pts": round(rain_pts, 1),
                "available": True,
                "description": desc,
            })
        else:
            desc = "24h rainfall telemetry unavailable"
            factor_descriptions.append(desc)
            structured_factors.append({
                "name": "Recent rainfall",
                "value": None,
                "unit": "mm",
                "impact": "low",
                "contribution": 0,
                "pts": 0.0,
                "available": False,
                "description": desc,
            })

        # 3. Soil moisture / pore water saturation component (0-35 pts)
        if soil_moisture is not None:
            sm_val = float(soil_moisture)
            moist_pts = min(35.0, (sm_val / 95.0) * 35.0)
            if sm_val >= 75.0:
                desc = f"High pore water pressure ({sm_val:.1f}% moisture saturation)"
                impact = "high"
            elif sm_val >= 50.0:
                desc = f"Moderate ground moisture ({sm_val:.1f}%)"
                impact = "moderate"
            else:
                desc = f"Low soil moisture ({sm_val:.1f}%)"
                impact = "low"

            factor_descriptions.append(desc)
            structured_factors.append({
                "name": "Soil moisture",
                "value": round(sm_val, 1),
                "unit": "%",
                "impact": impact,
                "contribution": int(round(moist_pts)),
                "pts": round(moist_pts, 1),
                "available": True,
                "description": desc,
            })
        else:
            moist_pts = min(15.0, (effective_rain / 180.0) * 15.0)
            desc = "Soil moisture sensor unavailable (not included from direct telemetry)"
            factor_descriptions.append(desc)
            structured_factors.append({
                "name": "Soil moisture",
                "value": None,
                "unit": "%",
                "impact": "low",
                "contribution": int(round(moist_pts)),
                "pts": round(moist_pts, 1),
                "available": False,
                "description": desc,
            })

        # 4. GSI Regional Susceptibility Modifier (+/- 5 pts)
        if gsi_zone == "HIGH":
            gsi_bonus = 5.0
            desc = "Located within GSI High Landslide Susceptibility Zone"
            impact = "moderate"
        elif gsi_zone == "MODERATE":
            gsi_bonus = 2.0
            desc = "Located within GSI Moderate Landslide Susceptibility Zone"
            impact = "low"
        else:
            gsi_bonus = 0.0
            desc = "Located within GSI Low Susceptibility Zone"
            impact = "low"

        factor_descriptions.append(desc)
        structured_factors.append({
            "name": "Historical hazard susceptibility",
            "value": gsi_zone,
            "unit": "zone",
            "impact": impact,
            "contribution": int(round(gsi_bonus)),
            "pts": gsi_bonus,
            "available": True,
            "description": desc,
        })

        # Lowlands and flat plains have near-zero landslide risk regardless of rain
        raw_score = rain_pts + moist_pts + slope_pts + gsi_bonus
        if slope is not None and float(slope) < 4.0:
            score = min(25, int(round(raw_score * 0.4)))
        else:
            score = int(round(raw_score))

        score = max(5, min(99, score))

        # Risk level classification
        if score >= 70:
            level = "High"
        elif score >= 40:
            level = "Moderate"
        else:
            level = "Low"

        # Sort factors by contribution points descending (top contributing factors first)
        structured_factors.sort(key=lambda f: (f["available"], f["contribution"]), reverse=True)

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
        if level == "High":
            commentary = (
                f"Elevated slope instability advisory for {location_name}. "
                f"Steep terrain slope combined with saturated ground conditions exceeds typical failure equilibrium."
            )
        elif level == "Moderate":
            commentary = (
                f"Moderate slope advisory for {location_name}. "
                f"Antecedent precipitation and ground moisture indicate increasing shear stress on vulnerable cuttings."
            )
        else:
            commentary = (
                f"Stable geomorphological baseline at {location_name}. "
                f"Current precipitation and terrain slope remain well within regional stability thresholds."
            )

        dominant_factor = structured_factors[0]["name"] if structured_factors else "None"

        return {
            "score": score,
            "level": level,
            "confidence": confidence,
            "confidence_pct": confidence_pct,
            "data_quality": data_quality,
            "dominant_factor": dominant_factor,
            "factors": structured_factors,
            "structured_factors": structured_factors,
            "factor_descriptions": factor_descriptions,
            "model_version": cls.MODEL_VERSION,
            "assessment": commentary,
            "terrain_available": terrain_available,
            "status": "VALID",
        }
