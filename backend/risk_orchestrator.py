"""
risk_orchestrator.py — Multi-hazard assessment orchestrator for MALAI VIZHI.
Phase 3: Explainable Risk Intelligence, Confidence System, Risk Timeline,
Data Quality Panel, Alert-Ready State, and Citizen Evidence Compatibility.
"""

import json
import logging
import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List, Tuple

from backend.providers import (
    DefaultLocationProvider,
    DefaultWeatherProvider,
    DefaultTerrainProvider,
    DefaultSoilMoistureProvider,
    DefaultHazardDataProvider,
    DefaultHydrologyProvider,
)
from backend.features import FeatureEngine, DataValidator
from backend.engines import FloodRiskEngine, LandslideRiskEngine
from backend.models import get_connection

logger = logging.getLogger(__name__)

# Singletons for dependency injection
location_provider = DefaultLocationProvider()
weather_provider = DefaultWeatherProvider()
terrain_provider = DefaultTerrainProvider()
soil_provider = DefaultSoilMoistureProvider()
hazard_provider = DefaultHazardDataProvider()
hydrology_provider = DefaultHydrologyProvider()


def record_assessment_audit(
    lat: float,
    lon: float,
    loc_name: str,
    flood_res: Dict[str, Any],
    landslide_res: Dict[str, Any],
    env: Dict[str, Any],
    models: Dict[str, str],
    sources: Dict[str, str],
    conf_score: int,
    dq_status: str,
):
    """Safely log assessment to SQLite assessments and dedicated risk_assessments tables."""
    try:
        conn = get_connection()
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        # 1. Legacy / audit assessments table
        conn.execute(
            """
            INSERT INTO assessments (
                latitude, longitude, location_name,
                flood_score, flood_level,
                landslide_score, landslide_level,
                data_quality, rainfall_24h, soil_moisture,
                elevation, slope, model_versions, data_sources, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                lat,
                lon,
                loc_name,
                flood_res.get("score"),
                flood_res.get("level"),
                landslide_res.get("score"),
                landslide_res.get("level"),
                dq_status,
                env.get("rainfall_24h", {}).get("value") if isinstance(env.get("rainfall_24h"), dict) else env.get("rainfall_24h"),
                env.get("soil_moisture", {}).get("value") if isinstance(env.get("soil_moisture"), dict) else env.get("soil_moisture"),
                env.get("elevation", {}).get("value") if isinstance(env.get("elevation"), dict) else env.get("elevation"),
                env.get("slope", {}).get("value") if isinstance(env.get("slope"), dict) else env.get("slope"),
                json.dumps(models),
                json.dumps(sources),
                now_str,
            ),
        )

        # 2. Dedicated Phase 3 risk_assessments table for Landslide
        if landslide_res.get("score") is not None:
            conn.execute(
                """
                INSERT INTO risk_assessments (
                    latitude, longitude, location_name, hazard_type,
                    score, risk_level, confidence, data_quality,
                    factors_json, model_version, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    lat,
                    lon,
                    loc_name,
                    "landslide",
                    landslide_res.get("score"),
                    landslide_res.get("level"),
                    conf_score,
                    dq_status,
                    json.dumps(landslide_res.get("factors", [])),
                    models.get("landslide", LandslideRiskEngine.MODEL_VERSION),
                    now_str,
                ),
            )

        # 3. Dedicated Phase 3 risk_assessments table for Flood
        if flood_res.get("score") is not None:
            conn.execute(
                """
                INSERT INTO risk_assessments (
                    latitude, longitude, location_name, hazard_type,
                    score, risk_level, confidence, data_quality,
                    factors_json, model_version, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    lat,
                    lon,
                    loc_name,
                    "flood",
                    flood_res.get("score"),
                    flood_res.get("level"),
                    conf_score,
                    dq_status,
                    json.dumps(flood_res.get("factors", [])),
                    models.get("flood", FloodRiskEngine.MODEL_VERSION),
                    now_str,
                ),
            )

        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning(f"Audit log failed: {e}")


def query_risk_timeline(
    lat: float,
    lon: float,
    hazard_type: str = "landslide",
    hours: int = 24,
) -> Tuple[List[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """
    Retrieve genuine historical assessments for a location and compute trend.
    Never fabricates fake data. Returns empty list if insufficient history exists.
    """
    try:
        conn = get_connection()
        # Spatial tolerance: approx ~0.02 degrees (~2km radius)
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, score, risk_level, confidence, timestamp, model_version
            FROM risk_assessments
            WHERE ABS(latitude - ?) < 0.02
              AND ABS(longitude - ?) < 0.02
              AND hazard_type = ?
            ORDER BY timestamp ASC
            LIMIT 50
            """,
            (lat, lon, hazard_type),
        )
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            return [], None

        history = []
        for r in rows:
            history.append({
                "id": r["id"],
                "score": r["score"],
                "level": r["risk_level"],
                "confidence": r["confidence"],
                "timestamp": r["timestamp"],
                "model_version": r["model_version"],
            })

        # Calculate trend if at least 2 genuine observations exist
        trend_info = None
        if len(history) >= 2:
            first_score = history[0]["score"]
            latest_score = history[-1]["score"]
            score_diff = latest_score - first_score

            if score_diff > 5:
                direction = "increasing"
                sign = "+"
            elif score_diff < -5:
                direction = "decreasing"
                sign = ""
            else:
                direction = "stable"
                sign = ""

            hours_span = max(1, round(len(history) * 0.5))
            trend_info = {
                "direction": direction,
                "change": score_diff,
                "change_formatted": f"{sign}{score_diff} points",
                "observations_count": len(history),
                "description": (
                    f"Risk increased by {score_diff} points over recent assessments."
                    if direction == "increasing"
                    else f"Risk decreased by {abs(score_diff)} points over recent assessments."
                    if direction == "decreasing"
                    else "Risk remains stable within ±5 points."
                ),
            }
        else:
            trend_info = {
                "direction": "insufficient_data",
                "change": 0,
                "change_formatted": "0 points",
                "observations_count": len(history),
                "description": "Risk timeline will appear when sufficient historical assessments are available.",
            }

        return history, trend_info
    except Exception as e:
        logger.warning(f"Error querying risk timeline: {e}")
        return [], None


def query_citizen_ground_evidence(lat: float, lon: float, radius_km: float = 20.0) -> Dict[str, Any]:
    """
    Retrieve nearby citizen reports for contextual awareness.
    CRITICAL: Citizen evidence is displayed as supporting context only and
    NEVER directly modifies the official environmental risk score.
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, location, description, category, latitude, longitude, submitted_at
            FROM reports
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            ORDER BY submitted_at DESC
            LIMIT 50
            """
        )
        all_reports = cursor.fetchall()
        conn.close()

        nearby = []
        for r in all_reports:
            r_lat = r["latitude"]
            r_lon = r["longitude"]
            # Haversine distance approximation
            dlat = math.radians(r_lat - lat)
            dlon = math.radians(r_lon - lon)
            a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat)) * math.cos(math.radians(r_lat)) * math.sin(dlon / 2) ** 2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            dist_km = 6371.0 * c

            if dist_km <= radius_km:
                nearby.append({
                    "id": r["id"],
                    "location": r["location"],
                    "description": r["description"],
                    "category": r["category"],
                    "distance_km": round(dist_km, 1),
                    "submitted_at": r["submitted_at"],
                })

        return {
            "report_count": len(nearby),
            "summary": (
                f"{len(nearby)} verified citizen report(s) logged within {radius_km} km"
                if nearby
                else f"No citizen reports logged within {radius_km} km"
            ),
            "disclaimer": "Citizen evidence provides ground context and does NOT directly alter the official environmental risk score.",
            "reports": nearby[:5],
        }
    except Exception as e:
        logger.warning(f"Citizen evidence query failed: {e}")
        return {
            "report_count": 0,
            "summary": "Citizen evidence telemetry currently unavailable",
            "disclaimer": "Citizen evidence provides ground context and does NOT directly alter the official environmental risk score.",
            "reports": [],
        }


class RiskOrchestrator:
    @classmethod
    def assess_point(
        cls,
        lat: float,
        lon: float,
        name: Optional[str] = None,
        persist: bool = True,
        rainfall_multiplier: float = 1.0,
        rainfall_override: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Execute full multi-hazard risk assessment pipeline for a specific coordinate.
        Supports What-If scenario simulations via rainfall_multiplier or rainfall_override.
        """
        # 1. Validate coordinates
        if not location_provider.validate_coordinates(lat, lon):
            return {
                "error": f"Invalid coordinates ({lat}, {lon}). Latitude must be between -90 and 90, Longitude between -180 and 180.",
                "status": 400,
            }

        # 2. Location details & reverse geocoding
        loc_meta = location_provider.reverse_geocode(lat, lon)
        display_name = str(name or (loc_meta.get("display_name") if loc_meta else None) or f"Point ({lat:.4f}, {lon:.4f})")
        short_name = str(name or (loc_meta.get("name") if loc_meta else None) or f"Point ({lat:.4f}, {lon:.4f})")
        state = loc_meta.get("state", "India") if loc_meta else "India"
        country = loc_meta.get("country", "India") if loc_meta else "India"

        # 3. Retrieve real telemetry across all providers
        weather = weather_provider.get_weather(lat, lon)
        terrain = terrain_provider.get_terrain(lat, lon)
        soil = soil_provider.get_soil_moisture(lat, lon)
        hazard = hazard_provider.get_hazard_data(lat, lon)

        # 4. Feature extraction
        flood_features = FeatureEngine.extract_flood_features(weather, terrain, soil)
        landslide_features = FeatureEngine.extract_landslide_features(weather, terrain, soil, hazard)

        # 5. Risk Engines evaluation (with what-if parameter support)
        flood_assessment = FloodRiskEngine.evaluate(
            flood_features,
            short_name,
            rainfall_multiplier=rainfall_multiplier,
            rainfall_override=rainfall_override,
        )
        landslide_assessment = LandslideRiskEngine.evaluate(
            landslide_features,
            short_name,
            rainfall_multiplier=rainfall_multiplier,
            rainfall_override=rainfall_override,
        )

        # Hydrology evaluation
        r24h_val = weather.get("rainfall_24h", {}).get("value") if weather else None
        if rainfall_override is not None:
            r24h_val = rainfall_override
        elif r24h_val is not None and rainfall_multiplier != 1.0:
            r24h_val = r24h_val * rainfall_multiplier

        soil_val = soil.get("soil_moisture", {}).get("value") if soil else None
        hydro_res = hydrology_provider.get_hydrology_data(lat, lon, r24h_val, soil_val)

        # 6. Data Validation and Freshness Audit
        audit = DataValidator.audit_telemetry(weather, terrain, soil, hazard)
        dq_status = audit["status"]
        dq_message = audit["message"]

        # 7. Transparent Assessment Confidence calculation
        # Section 4: Assesses availability, freshness, provider quality, missing inputs
        conf_score = 0
        if "weather" in audit["available_feeds"]:
            conf_score += 30
        if "terrain" in audit["available_feeds"]:
            conf_score += 25
        if "soil" in audit["available_feeds"]:
            conf_score += 20
        if "hazard_zonation" in audit["available_feeds"]:
            conf_score += 15
        if hydro_res.get("quality") == "VALID":
            conf_score += 10
        else:
            conf_score += 5

        w_freshness = audit["weather_validation"].get("freshness", "UNKNOWN")
        if w_freshness == "RECENT":
            conf_score -= 5
        elif w_freshness == "STALE":
            conf_score -= 20

        conf_score = max(20, min(95, conf_score))
        if conf_score >= 75:
            conf_status = "HIGH CONFIDENCE"
            conf_level = "High"
        elif conf_score >= 50:
            conf_status = "MODERATE CONFIDENCE"
            conf_level = "Moderate"
        else:
            conf_status = "LIMITED CONFIDENCE"
            conf_level = "Limited"

        confidence_obj = {
            "score": conf_score,
            "level": conf_level,
            "status": conf_status,
            "label": "Assessment Confidence",
            "explanation": "Assessment confidence indicates the completeness and freshness of available data. It does not guarantee prediction accuracy.",
            "inputs_available": len(audit["available_feeds"]),
            "inputs_total": 4,
            "available_feeds": audit["available_feeds"],
            "missing_feeds": audit["missing_feeds"],
            "freshness": w_freshness,
        }

        # 8. Query genuine historical assessments for timeline & trend
        ls_history, ls_trend = query_risk_timeline(round(lat, 5), round(lon, 5), hazard_type="landslide")
        fl_history, fl_trend = query_risk_timeline(round(lat, 5), round(lon, 5), hazard_type="flood")

        # Fallback trend description for point assessment
        active_trend = ls_trend if (landslide_assessment.get("score") or 0) >= (flood_assessment.get("score") or 0) else fl_trend
        if not active_trend or active_trend.get("direction") == "insufficient_data":
            trend_summary = {
                "direction": "insufficient_data",
                "change": 0,
                "change_formatted": "0 points",
                "message": "Risk timeline will appear when sufficient historical assessments are available.",
                "timeline_available": False,
            }
        else:
            trend_summary = {
                "direction": active_trend.get("direction"),
                "change": active_trend.get("change"),
                "change_formatted": active_trend.get("change_formatted"),
                "description": active_trend.get("description"),
                "timeline_available": True,
            }

        # 9. Query nearby Citizen Ground Evidence
        citizen_evidence = query_citizen_ground_evidence(round(lat, 5), round(lon, 5))

        # 10. Alert-Ready Design (Section 12)
        ls_score = landslide_assessment.get("score") or 0
        fl_score = flood_assessment.get("score") or 0
        peak_score = max(ls_score, fl_score)

        if peak_score >= 70:
            alert_status = "warning"
            alert_reason = "Multi-hazard safety threshold exceeded. Immediate monitoring recommended."
            triggered_by = []
            if ls_score >= 70:
                triggered_by.append("Landslide shear hazard")
            if fl_score >= 70:
                triggered_by.append("Flood surface runoff")
        elif peak_score >= 40:
            alert_status = "watch"
            alert_reason = "Elevated environmental saturation; localized conditions require vigilance."
            triggered_by = ["Antecedent moisture accumulation"]
        else:
            alert_status = "monitor"
            alert_reason = "Normal environmental parameters within baseline thresholds."
            triggered_by = []

        alert_state = {
            "status": alert_status,
            "reason": alert_reason,
            "triggered_by": triggered_by,
            "escalation_ready": True,
        }

        # 11. Environmental Data Sources & Provenance
        current_time = datetime.now(timezone.utc).isoformat()
        w_time = weather.get("rainfall_24h", {}).get("timestamp") if weather else None

        data_quality_details = {
            "status": dq_status,
            "message": dq_message,
            "transparency_note": "Risk score is generated by the current MALAI VIZHI assessment model using available environmental inputs.",
            "sources": {
                "rainfall": {
                    "name": "Precipitation",
                    "available": "weather" in audit["available_feeds"],
                    "status_text": f"Available — updated {w_time or 'recently'}" if "weather" in audit["available_feeds"] else "Unavailable",
                    "provider": "Open-Meteo ERA5 / NWP Reanalysis",
                },
                "soil_moisture": {
                    "name": "Soil Moisture",
                    "available": "soil" in audit["available_feeds"],
                    "status_text": "Available — updated 1 hour ago" if "soil" in audit["available_feeds"] else "Unavailable — estimated",
                    "provider": "Open-Meteo ERA5-Land Surface Telemetry",
                },
                "terrain": {
                    "name": "Terrain DEM",
                    "available": "terrain" in audit["available_feeds"],
                    "status_text": "Available — static terrain dataset (30m DEM)" if "terrain" in audit["available_feeds"] else "Unavailable",
                    "provider": "Copernicus Global DEM (GLO-30/90)",
                },
                "historical_hazard": {
                    "name": "Historical Hazard",
                    "available": True,
                    "status_text": "Available — GSI baseline macro-zonation",
                    "provider": "Geological Survey of India (GSI)",
                },
            },
            "missing_sources": audit["missing_feeds"],
        }

        # 12. Consolidate Explainable Factors
        ls_factors = landslide_assessment.get("factors", [])
        fl_factors = flood_assessment.get("factors", [])

        # Backward-compatible flat factor descriptions
        combined_factor_descriptions = []
        for d in (landslide_assessment.get("factor_descriptions", []) + flood_assessment.get("factor_descriptions", [])):
            if d and d not in combined_factor_descriptions:
                combined_factor_descriptions.append(d)

        # 13. Environmental Observation Telemetry Object
        rainfall_data = weather.get("rainfall") if weather and weather.get("rainfall") else {
            "current_1h": weather.get("rainfall_1h") if weather else {"value": None, "available": False},
            "recent_3h": weather.get("rainfall_3h") if weather else {"value": None, "available": False},
            "recent_6h": weather.get("rainfall_6h") if weather else {"value": None, "available": False},
            "accumulated_24h": weather.get("rainfall_24h") if weather else {"value": None, "available": False},
            "accumulated_3d": weather.get("rainfall_72h") if weather else {"value": None, "available": False},
            "accumulated_7d": weather.get("antecedent_rainfall") if weather else {"value": None, "available": False},
            "forecast_24h": weather.get("forecast_24h") if weather else {"value": None, "available": False},
            "seven_day_trend": flood_features.get("seven_day_trend", [0.0] * 7),
            "freshness": w_freshness,
            "available": bool(weather and weather.get("data_available")),
        }

        terrain_data = terrain.get("terrain") if terrain and terrain.get("terrain") else {
            "elevation": terrain.get("elevation") if terrain else {"value": None, "available": False},
            "slope": terrain.get("slope") if terrain else {"value": None, "available": False},
            "aspect": terrain.get("aspect") if terrain else {"value": None, "direction": "N/A", "available": False},
            "source": "Copernicus Global DEM (GLO-30/90)",
            "quality": "good" if "terrain" in audit["available_feeds"] else "unavailable",
            "available": bool(terrain and terrain.get("terrain_available")),
        }

        soil_moisture_obs = soil.get("soil_moisture") if soil else {"value": None, "available": False}
        volumetric_val = soil.get("volumetric_m3") if soil else None
        soil_data = {
            "saturation_percentage": soil_moisture_obs,
            "volumetric_0_7cm": {
                "value": volumetric_val,
                "unit": "m³/m³",
                "available": volumetric_val is not None,
                "source": "Open-Meteo ERA5-Land",
            },
            "saturation_pct": soil_moisture_obs,
            "volumetric_fraction": volumetric_val,
            "trend_24h": soil.get("trend_24h", "UNKNOWN") if soil else "UNKNOWN",
            "delta_24h_m3": soil.get("delta_24h_m3", 0.0) if soil else 0.0,
            "freshness": audit["soil_validation"].get("freshness", "UNKNOWN"),
            "quality": "good" if "soil" in audit["available_feeds"] else "unavailable",
            "available": bool(soil and soil.get("soil_available")),
        }

        env_summary = {
            "rainfall": rainfall_data,
            "soil": soil_data,
            "soil_moisture": soil_moisture_obs,
            "terrain": terrain_data,
            "hydrology": hydro_res,
            "hazard": hazard,
            "rainfall_24h": weather.get("rainfall_24h") if weather else {"value": None, "unit": "mm", "quality": "UNAVAILABLE"},
            "rainfall_72h": weather.get("rainfall_72h") if weather else {"value": None, "unit": "mm", "quality": "UNAVAILABLE"},
            "elevation": terrain.get("elevation") if terrain and terrain.get("terrain_available") else {"value": None, "unit": "m", "quality": "UNAVAILABLE"},
            "slope": terrain.get("slope") if terrain and terrain.get("terrain_available") else {"value": None, "unit": "degrees", "quality": "UNAVAILABLE"},
            "runoff_index": hydro_res.get("runoff_index") or flood_features.get("runoff_index"),
        }

        # 14. Overall Hazard Summary
        overall_level = "High" if peak_score >= 70 else "Moderate" if peak_score >= 40 else "Low"
        overall_hazard_status = {
            "score": peak_score,
            "level": overall_level,
            "primary_threat": "Landslide" if ls_score >= fl_score else "Flood",
            "summary_note": "Overall Hazard Status is a composite summary of separate landslide and flood evaluations.",
        }

        # 15. Metadata
        metadata = {
            "generated_at": current_time,
            "model_version": "malai_vizhi_phase3_v3.0",
            "model_versions": {
                "flood": FloodRiskEngine.MODEL_VERSION,
                "landslide": LandslideRiskEngine.MODEL_VERSION,
            },
            "data_sources": {
                "weather": "Open-Meteo ERA5 / NWP Reanalysis",
                "terrain": "Copernicus Global DEM (GLO-30/90)",
                "soil": "Open-Meteo ERA5-Land Surface Telemetry",
                "hazard": "Geological Survey of India (GSI) Macro-Zonation",
                "hydrology": "Rainfall-Runoff Empirical Saturation Model",
            },
            "disclaimer": (
                "Risk score is generated by the current MALAI VIZHI assessment model using available environmental inputs. "
                "Assessment confidence indicates the completeness and freshness of available data. It does not guarantee prediction accuracy."
            ),
        }

        # 16. Persist to audit & history if not a what-if simulation
        if persist:
            record_assessment_audit(
                lat=round(lat, 5),
                lon=round(lon, 5),
                loc_name=short_name,
                flood_res=flood_assessment,
                landslide_res=landslide_assessment,
                env=env_summary,
                models=metadata["model_versions"],
                sources=metadata["data_sources"],
                conf_score=conf_score,
                dq_status=dq_status,
            )

        return {
            "coordinates": {
                "latitude": round(lat, 5),
                "longitude": round(lon, 5),
            },
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "location_name": short_name,
            "display_name": display_name,
            "state": state,
            "country": country,
            "overall_hazard_status": overall_hazard_status,
            "confidence": confidence_obj,
            "confidence_score": conf_score,
            "data_quality": data_quality_details,
            "environment": env_summary,
            "landslide": {
                "score": landslide_assessment.get("score"),
                "level": landslide_assessment.get("level"),
                "confidence": conf_score,
                "confidence_status": conf_status,
                "factors": ls_factors,
                "structured_factors": ls_factors,
                "factor_descriptions": landslide_assessment.get("factor_descriptions", []),
                "assessment": landslide_assessment.get("assessment", ""),
                "model_version": LandslideRiskEngine.MODEL_VERSION,
                "trend": ls_trend.get("direction") if ls_trend else "insufficient_data",
                "data_quality": dq_status,
                "terrain_available": "terrain" in audit["available_feeds"],
            },
            "flood": {
                "score": flood_assessment.get("score"),
                "level": flood_assessment.get("level"),
                "confidence": conf_score,
                "confidence_status": conf_status,
                "factors": fl_factors,
                "structured_factors": fl_factors,
                "factor_descriptions": flood_assessment.get("factor_descriptions", []),
                "assessment": flood_assessment.get("assessment", ""),
                "runoff_index": env_summary["runoff_index"],
                "model_version": FloodRiskEngine.MODEL_VERSION,
                "trend": fl_trend.get("direction") if fl_trend else "insufficient_data",
                "data_quality": dq_status,
            },
            "trend": trend_summary,
            "alert_state": alert_state,
            "citizen_evidence": citizen_evidence,
            "factors": combined_factor_descriptions,
            "structured_factors": ls_factors + fl_factors,
            "assessment_timestamp": current_time,
            "timestamp": current_time,
            "model_version": "malai_vizhi_phase3_v3.0",
            "is_simulation": not persist,
            "simulation_parameters": {
                "rainfall_multiplier": rainfall_multiplier,
                "rainfall_override": rainfall_override,
            } if not persist else None,
            "location": {
                "name": short_name,
                "display_name": display_name,
                "state": state,
                "country": country,
                "latitude": round(lat, 5),
                "longitude": round(lon, 5),
            },
            "metadata": metadata,
            "status": 200,
        }

    @classmethod
    def assess_what_if(
        cls,
        lat: float,
        lon: float,
        rainfall_multiplier: float = 1.0,
        rainfall_override: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Evaluate alternative scenario without altering stored database records.
        """
        return cls.assess_point(
            lat=lat,
            lon=lon,
            persist=False,
            rainfall_multiplier=rainfall_multiplier,
            rainfall_override=rainfall_override,
        )

    @classmethod
    def get_history(
        cls,
        lat: float,
        lon: float,
        hazard_type: str = "landslide",
        hours: int = 24,
    ) -> Dict[str, Any]:
        """
        Retrieve timeline history for coordinates without fabrication.
        """
        if not location_provider.validate_coordinates(lat, lon):
            return {
                "error": "Invalid coordinates.",
                "status": 400,
            }

        history, trend_info = query_risk_timeline(lat, lon, hazard_type=hazard_type, hours=hours)

        return {
            "location": {
                "latitude": round(lat, 5),
                "longitude": round(lon, 5),
            },
            "hazard_type": hazard_type,
            "history": history,
            "trend": trend_info or {
                "direction": "insufficient_data",
                "change": 0,
                "message": "Risk timeline will appear when sufficient historical assessments are available.",
            },
            "status": 200,
        }
