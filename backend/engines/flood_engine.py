"""
engines/flood_engine.py — Production-grade point-level flood risk assessment engine.
Model Version: flood_model_v1

Calculates composite risk score (0-100), risk level (Low/Moderate/High),
data quality, confidence, and explainable hydrological contributing factors.
Supports what-if simulation scenarios without persisting data.
"""

from typing import Dict, Any, List, Optional


class FloodRiskEngine:
    MODEL_VERSION = "flood_model_v1"

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
        Evaluate flood risk from normalized point-level environmental features.
        Returns explainable factors with exact value, unit, impact, contribution points, dominant factor, and availability.
        """
        data_quality = features.get("data_quality", "INSUFFICIENT")

        raw_r24h = features.get("rainfall_24h")

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

        # Missing critical input check
        if r24h is None:
            return {
                "score": None,
                "level": "UNAVAILABLE",
                "confidence": "LOW",
                "confidence_pct": 20,
                "data_quality": "INSUFFICIENT",
                "factors": [],
                "structured_factors": [],
                "dominant_factor": "Unavailable",
                "factor_descriptions": ["Critical 24-hour rainfall telemetry unavailable"],
                "model_version": cls.MODEL_VERSION,
                "assessment": f"Insufficient precipitation data for a reliable flood assessment at {location_name}.",
                "status": "MISSING_CRITICAL_DATA",
            }

        slope = features.get("slope")

        factor_descriptions: List[str] = []
        structured_factors: List[Dict[str, Any]] = []

        # 1. Rainfall intensity & accumulation (0-50 pts)
        r24h_val = float(r24h)
        rain_pts = min(50.0, (r24h_val / 200.0) * 50.0)
        if r24h_val >= 100.0:
            desc = f"Severe 24h precipitation ({r24h_val:.1f} mm)"
            impact = "high"
        elif r24h_val >= 40.0:
            desc = f"Elevated 24h precipitation ({r24h_val:.1f} mm)"
            impact = "moderate"
        elif r24h_val > 0.0:
            desc = f"Light precipitation ({r24h_val:.1f} mm)"
            impact = "low"
        else:
            desc = "No significant 24h precipitation"
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

        # 2. Soil pore water saturation (0-35 pts)
        if soil_moisture is not None:
            sm_val = float(soil_moisture)
            moist_pts = min(35.0, (sm_val / 95.0) * 35.0)
            if sm_val >= 75.0:
                desc = f"High ground saturation ({sm_val:.1f}%), severely limiting infiltration"
                impact = "high"
            elif sm_val >= 50.0:
                desc = f"Moderate soil saturation ({sm_val:.1f}%)"
                impact = "moderate"
            else:
                desc = f"Low soil saturation ({sm_val:.1f}%)"
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
            moist_pts = min(20.0, (r24h_val / 150.0) * 20.0)
            desc = "Soil moisture telemetry unavailable (estimated baseline)"
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

        # 3. Terrain accumulation / Catchment slope factor (0-15 pts)
        if slope is not None:
            slope_val = float(slope)
            retention_factor = max(0.0, min(15.0, (30.0 - slope_val) / 30.0 * 15.0))
            if slope_val < 3.0:
                desc = f"Very flat terrain (slope {slope_val:.1f}°), high surface water retention"
                impact = "high"
            elif slope_val < 10.0:
                desc = f"Gentle terrain (slope {slope_val:.1f}°), moderate water retention"
                impact = "moderate"
            else:
                desc = f"Sloped terrain ({slope_val:.1f}°), rapid natural surface runoff"
                impact = "low"

            factor_descriptions.append(desc)
            structured_factors.append({
                "name": "Terrain retention",
                "value": round(slope_val, 1),
                "unit": "degrees",
                "impact": impact,
                "contribution": int(round(retention_factor)),
                "pts": round(retention_factor, 1),
                "available": True,
                "description": desc,
            })
        else:
            retention_factor = 7.5
            desc = "DEM slope unavailable (neutral baseline)"
            factor_descriptions.append(desc)
            structured_factors.append({
                "name": "Terrain retention",
                "value": None,
                "unit": "degrees",
                "impact": "low",
                "contribution": int(round(retention_factor)),
                "pts": 7.5,
                "available": False,
                "description": desc,
            })

        # Composite score
        raw_score = rain_pts + moist_pts + retention_factor
        score = int(round(raw_score))
        score = max(5, min(99, score))

        # Risk level classification
        if score >= 70:
            level = "High"
        elif score >= 40:
            level = "Moderate"
        else:
            level = "Low"

        # Sort factors by contribution points descending
        structured_factors.sort(key=lambda f: (f["available"], f["contribution"]), reverse=True)

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
        runoff_idx = features.get("runoff_index", round((r24h_val * 0.35) + 30.0, 1))
        if level == "High":
            commentary = (
                f"Severe surface inundation advisory for {location_name}. "
                f"Accumulated rainfall ({r24h_val:.1f} mm) drives an estimated surface runoff index of {runoff_idx}%. "
                f"Low-lying drainage channels and floodplains are at elevated waterlogging risk."
            )
        elif level == "Moderate":
            commentary = (
                f"Moderate surface accumulation advisory for {location_name}. "
                f"Precipitation ({r24h_val:.1f} mm) indicates increasing localized drainage congestion in low-elevation pockets."
            )
        else:
            commentary = (
                f"Normal hydrological baseline at {location_name}. "
                f"Precipitation ({r24h_val:.1f} mm) is within manageable soil absorption and natural drainage capacities."
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
            "status": "VALID",
        }
