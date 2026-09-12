"""
services/point_assessment_service.py — Advanced Point-Level Risk Intelligence Service.
MALAI VIZHI — SIH 2026 Phase 4.

The assessment unit is strictly: LATITUDE + LONGITUDE (not the nearest station).
Provides:
1. Point-Level Multi-Hazard Risk Assessment (Landslide, Flood, Overall Priority)
2. Explainable Factor Contributions & Dominant Factor
3. Non-Destructive What-If Simulation Engine
4. Scenario Comparison
5. Historical Risk Replay (No fabrication)
6. Lightweight Statistical Trend Analysis
7. Data Freshness & Quality Tracking
8. Classified Citizen Ground Evidence
"""

import math
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List, Tuple

from features.risk_orchestrator import (
    RiskOrchestrator,
    location_provider,
    weather_provider,
    terrain_provider,
    soil_provider,
    hazard_provider,
    hydrology_provider,
)
from engines import LandslideRiskEngine, FloodRiskEngine
from features import FeatureEngine, DataValidator
from models import get_connection

logger = logging.getLogger(__name__)


def classify_citizen_report(report: Dict[str, Any], current_utc: datetime) -> str:
    """
    Classify citizen report status into one of:
    - VERIFIED RECENT: Has photo and submitted within last 24 hours
    - HISTORICAL: Submitted more than 24 hours ago
    - LOCATION-TIME UNVERIFIED: Missing latitude/longitude or valid timestamp
    - DUPLICATE-SUSPICIOUS: Flagged if duplicates exist
    """
    lat = report.get("latitude")
    lon = report.get("longitude")
    sub_str = report.get("submitted_at")
    has_photo = bool(report.get("photo_path"))

    if lat is None or lon is None or not sub_str:
        return "LOCATION-TIME UNVERIFIED"

    try:
        # Try parse ISO or SQLite datetime format
        clean_sub = sub_str.replace(" UTC", "")
        if "T" in clean_sub:
            sub_dt = datetime.fromisoformat(clean_sub.split("+")[0].split("Z")[0])
        else:
            sub_dt = datetime.strptime(clean_sub, "%Y-%m-%d %H:%M:%S")

        age_hours = (current_utc - sub_dt).total_seconds() / 3600.0

        if age_hours <= 24.0 and has_photo:
            return "VERIFIED RECENT"
        elif age_hours <= 48.0:
            return "RECENT"
        else:
            return "HISTORICAL"
    except Exception:
        return "LOCATION-TIME UNVERIFIED"


class PointRiskAssessmentService:
    @classmethod
    def assess_point(
        cls,
        lat: float,
        lon: float,
        name: Optional[str] = None,
        rainfall_change_percent: float = 0.0,
        soil_moisture_change_percent: float = 0.0,
        is_simulation: bool = False,
        persist: bool = True,
    ) -> Dict[str, Any]:
        """
        Execute full multi-hazard point assessment for coordinates (LAT + LON).
        """
        # Validate coordinates
        if not location_provider.validate_coordinates(lat, lon):
            return {
                "error": f"Invalid coordinates ({lat}, {lon}). Latitude must be [-90..90], Longitude [-180..180].",
                "status": 400,
            }

        # Reverse geocoding & Location name
        loc_meta = location_provider.reverse_geocode(lat, lon)
        short_name   = name or (loc_meta.get("name") if loc_meta else None) or f"Point ({lat:.4f}, {lon:.4f})"
        display_name = name or (loc_meta.get("display_name") if loc_meta else None) or f"Point ({lat:.4f}, {lon:.4f})"
        state = loc_meta.get("state", "India") if loc_meta else "India"
        country = loc_meta.get("country", "India") if loc_meta else "India"

        # Providers Telemetry
        weather = weather_provider.get_weather(lat, lon)
        terrain = terrain_provider.get_terrain(lat, lon)
        soil = soil_provider.get_soil_moisture(lat, lon)
        hazard = hazard_provider.get_hazard_data(lat, lon)

        # Feature Extraction
        flood_features = FeatureEngine.extract_flood_features(weather, terrain, soil)
        landslide_features = FeatureEngine.extract_landslide_features(weather, terrain, soil, hazard)

        # Evaluate risk engines with optional scenario parameters
        ls_res = LandslideRiskEngine.evaluate(
            landslide_features,
            short_name,
            rainfall_change_percent=rainfall_change_percent,
            soil_moisture_change_percent=soil_moisture_change_percent,
        )
        fl_res = FloodRiskEngine.evaluate(
            flood_features,
            short_name,
            rainfall_change_percent=rainfall_change_percent,
            soil_moisture_change_percent=soil_moisture_change_percent,
        )

        # Data Validation & Freshness
        audit = DataValidator.audit_telemetry(weather, terrain, soil, hazard)
        dq_status = audit["status"]
        w_freshness = audit["weather_validation"].get("freshness", "UNKNOWN")

        # Map freshness string to Phase 4 standard: LIVE, RECENT, STALE, UNAVAILABLE
        freshness_std = "LIVE" if w_freshness == "LIVE" else "RECENT" if w_freshness == "RECENT" else "STALE" if w_freshness == "STALE" else "UNAVAILABLE"

        # Confidence calculation (non-predictive disclaimer)
        conf_score = 0
        if "weather" in audit["available_feeds"]:
            conf_score += 30
        if "terrain" in audit["available_feeds"]:
            conf_score += 25
        if "soil" in audit["available_feeds"]:
            conf_score += 20
        if "hazard_zonation" in audit["available_feeds"]:
            conf_score += 15

        if w_freshness == "RECENT":
            conf_score -= 5
        elif w_freshness == "STALE":
            conf_score -= 20

        conf_score = max(20, min(95, conf_score))
        conf_level = "HIGH" if conf_score >= 75 else "MODERATE" if conf_score >= 50 else "LIMITED"

        # Overall Hazard Priority
        ls_score = ls_res.get("score") or 0
        fl_score = fl_res.get("score") or 0
        overall_score = max(ls_score, fl_score)
        overall_priority = "HIGH" if overall_score >= 70 else "MODERATE" if overall_score >= 40 else "LOW"
        dominant_hazard = "LANDSLIDE" if ls_score >= fl_score else "FLOOD"

        # Dominant factor identification
        dominant_factor = ls_res.get("dominant_factor") if ls_score >= fl_score else fl_res.get("dominant_factor")

        # Current UTC timestamp
        now_utc = datetime.now(timezone.utc)
        current_time_str = now_utc.strftime("%Y-%m-%d %H:%M:%S UTC")

        # Citizen ground evidence with classified states
        citizen_evidence = cls.get_classified_citizen_evidence(lat, lon, now_utc)

        # Build response
        result = {
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "coordinates": {"latitude": round(lat, 5), "longitude": round(lon, 5)},
            "location_name": short_name,
            "display_name": display_name,
            "state": state,
            "country": country,
            "overall_hazard_priority": {
                "score": overall_score,
                "level": overall_priority,
                "dominant_hazard": dominant_hazard,
                "dominant_factor": dominant_factor,
            },
            "landslide": {
                "score": ls_res.get("score"),
                "level": ls_res.get("level"),
                "confidence": conf_score,
                "dominant_factor": ls_res.get("dominant_factor"),
                "factors": ls_res.get("factors", []),
                "factor_contributions": ls_res.get("structured_factors", []),
                "assessment": ls_res.get("assessment", ""),
                "model_version": LandslideRiskEngine.MODEL_VERSION,
                "data_quality": dq_status,
            },
            "flood": {
                "score": fl_res.get("score"),
                "level": fl_res.get("level"),
                "confidence": conf_score,
                "dominant_factor": fl_res.get("dominant_factor"),
                "factors": fl_res.get("factors", []),
                "factor_contributions": fl_res.get("structured_factors", []),
                "assessment": fl_res.get("assessment", ""),
                "runoff_index": flood_features.get("runoff_index"),
                "model_version": FloodRiskEngine.MODEL_VERSION,
                "data_quality": dq_status,
            },
            "dominant_factor": dominant_factor,
            "data_quality": {
                "status": dq_status,
                "freshness": freshness_std,
                "sources": {
                    "rainfall": {
                        "name": "Precipitation",
                        "status": freshness_std if "weather" in audit["available_feeds"] else "UNAVAILABLE",
                        "provider": "Open-Meteo ERA5 / NWP",
                        "available": "weather" in audit["available_feeds"],
                        "timestamp": weather.get("rainfall_24h", {}).get("timestamp") if weather else None,
                    },
                    "soil_moisture": {
                        "name": "Soil Moisture",
                        "status": "RECENT" if "soil" in audit["available_feeds"] else "ESTIMATED",
                        "provider": "Open-Meteo ERA5-Land",
                        "available": "soil" in audit["available_feeds"],
                    },
                    "terrain": {
                        "name": "Terrain DEM",
                        "status": "AVAILABLE" if "terrain" in audit["available_feeds"] else "UNAVAILABLE",
                        "provider": "Copernicus Global DEM (GLO-30)",
                        "available": "terrain" in audit["available_feeds"],
                    },
                    "historical_hazard": {
                        "name": "Landslide Zonation",
                        "status": "AVAILABLE",
                        "provider": "Geological Survey of India (GSI)",
                        "available": True,
                    },
                },
                "missing_sources": audit["missing_feeds"],
            },
            "confidence": {
                "score": conf_score,
                "level": conf_level,
                "status": f"{conf_level} CONFIDENCE",
                "disclaimer": "Assessment confidence indicates the completeness and freshness of available data. It does not guarantee prediction accuracy.",
            },
            "citizen_ground_evidence": citizen_evidence,
            "timestamp": current_time_str,
            "model_versions": {
                "landslide": LandslideRiskEngine.MODEL_VERSION,
                "flood": FloodRiskEngine.MODEL_VERSION,
            },
            "simulation": is_simulation,
            "status": 200,
        }

        # If not a simulation and persistence requested, record to database
        if persist and not is_simulation:
            RiskOrchestrator.assess_point(lat, lon, name, persist=True)

        return result

    @classmethod
    def simulate_scenario(
        cls,
        lat: float,
        lon: float,
        rainfall_change_percent: float = 0.0,
        soil_moisture_change_percent: float = 0.0,
    ) -> Dict[str, Any]:
        """
        Non-destructive What-If risk simulation.
        Compares CURRENT baseline vs SCENARIO conditions.
        CRITICAL: Never modifies real observations or database records.
        """
        # 1. Evaluate baseline (0% change) without DB persistence
        baseline = cls.assess_point(lat, lon, rainfall_change_percent=0.0, soil_moisture_change_percent=0.0, is_simulation=True, persist=False)
        if "error" in baseline:
            return baseline

        # 2. Evaluate scenario with changes without DB persistence
        scenario = cls.assess_point(
            lat,
            lon,
            rainfall_change_percent=rainfall_change_percent,
            soil_moisture_change_percent=soil_moisture_change_percent,
            is_simulation=True,
            persist=False,
        )

        b_ls = baseline["landslide"]["score"] or 0
        s_ls = scenario["landslide"]["score"] or 0
        ls_delta = s_ls - b_ls

        b_fl = baseline["flood"]["score"] or 0
        s_fl = scenario["flood"]["score"] or 0
        fl_delta = s_fl - b_fl

        b_overall = baseline["overall_hazard_priority"]["score"]
        s_overall = scenario["overall_hazard_priority"]["score"]
        overall_delta = s_overall - b_overall

        # Factor changes breakdown
        factor_changes = []
        b_factors = {f["name"]: f for f in baseline["landslide"]["factor_contributions"]}
        for sf in scenario["landslide"]["factor_contributions"]:
            fname = sf["name"]
            bf = b_factors.get(fname, {})
            b_val = bf.get("value")
            s_val = sf.get("value")
            b_pts = bf.get("contribution", 0)
            s_pts = sf.get("contribution", 0)
            factor_changes.append({
                "factor_name": fname,
                "baseline_value": b_val,
                "scenario_value": s_val,
                "unit": sf.get("unit"),
                "baseline_points": b_pts,
                "scenario_points": s_pts,
                "points_delta": s_pts - b_pts,
                "impact": sf.get("impact"),
            })

        return {
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "location_name": baseline["location_name"],
            "parameters": {
                "rainfall_change_percent": rainfall_change_percent,
                "soil_moisture_change_percent": soil_moisture_change_percent,
            },
            "comparison": {
                "overall": {
                    "baseline_score": b_overall,
                    "scenario_score": s_overall,
                    "score_delta": overall_delta,
                    "baseline_level": baseline["overall_hazard_priority"]["level"],
                    "scenario_level": scenario["overall_hazard_priority"]["level"],
                    "dominant_factor": scenario["dominant_factor"],
                },
                "landslide": {
                    "baseline_score": b_ls,
                    "scenario_score": s_ls,
                    "score_delta": ls_delta,
                    "baseline_level": baseline["landslide"]["level"],
                    "scenario_level": scenario["landslide"]["level"],
                },
                "flood": {
                    "baseline_score": b_fl,
                    "scenario_score": s_fl,
                    "score_delta": fl_delta,
                    "baseline_level": baseline["flood"]["level"],
                    "scenario_level": scenario["flood"]["level"],
                },
            },
            "factor_changes": factor_changes,
            "simulation": True,
            "disclaimer": "SIMULATION — NOT A FORECAST. Evaluated using MALAI VIZHI Explainable Risk Analysis Engine.",
            "status": 200,
        }

    @classmethod
    def get_risk_replay(cls, lat: float, lon: float, hours: int = 48) -> Dict[str, Any]:
        """
        Historical risk replay for exact coordinates.
        Never fabricates historical data.
        """
        if not location_provider.validate_coordinates(lat, lon):
            return {"error": "Invalid coordinates.", "status": 400}

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, score, risk_level, confidence, data_quality, factors_json, model_version, timestamp
            FROM risk_assessments
            WHERE ABS(latitude - ?) < 0.02 AND ABS(longitude - ?) < 0.02 AND hazard_type = 'landslide'
            ORDER BY timestamp ASC
            LIMIT 50
            """,
            (lat, lon),
        )
        rows = cursor.fetchall()
        conn.close()

        if not rows or len(rows) < 2:
            return {
                "latitude": round(lat, 5),
                "longitude": round(lon, 5),
                "replay_available": False,
                "message": "Historical data unavailable for this location.",
                "timeline": [],
                "observation_count": len(rows) if rows else 0,
                "status": 200,
            }

        timeline = []
        for r in rows:
            timeline.append({
                "id": r["id"],
                "timestamp": r["timestamp"],
                "score": r["score"],
                "level": r["risk_level"],
                "confidence": r["confidence"],
                "data_quality": r["data_quality"],
            })

        return {
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "replay_available": True,
            "observation_count": len(timeline),
            "timeline": timeline,
            "earliest_timestamp": timeline[0]["timestamp"],
            "latest_timestamp": timeline[-1]["timestamp"],
            "status": 200,
        }

    @classmethod
    def get_risk_trend(cls, lat: float, lon: float) -> Dict[str, Any]:
        """
        Lightweight statistical risk trend detection.
        States: STABLE, INCREASING, RAPIDLY INCREASING, DECREASING, INSUFFICIENT DATA.
        """
        if not location_provider.validate_coordinates(lat, lon):
            return {"error": "Invalid coordinates.", "status": 400}

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT score, timestamp
            FROM risk_assessments
            WHERE ABS(latitude - ?) < 0.02 AND ABS(longitude - ?) < 0.02 AND hazard_type = 'landslide'
            ORDER BY timestamp ASC
            LIMIT 50
            """,
            (lat, lon),
        )
        rows = cursor.fetchall()
        conn.close()

        if not rows or len(rows) < 2:
            return {
                "trend_direction": "INSUFFICIENT DATA",
                "trend_strength": 0.0,
                "observation_count": len(rows) if rows else 0,
                "time_window": "N/A",
                "confidence": "LOW",
                "message": "Historical data unavailable for this location.",
                "status": 200,
            }

        scores = [r["score"] for r in rows]
        first_score = scores[0]
        latest_score = scores[-1]
        delta = latest_score - first_score

        if delta >= 15:
            trend_dir = "RAPIDLY INCREASING"
        elif delta > 5:
            trend_dir = "INCREASING"
        elif delta <= -15:
            trend_dir = "RAPIDLY DECREASING"
        elif delta < -5:
            trend_dir = "DECREASING"
        else:
            trend_dir = "STABLE"

        return {
            "trend_direction": trend_dir,
            "trend_strength": abs(delta),
            "score_change": delta,
            "observation_count": len(scores),
            "earliest_score": first_score,
            "latest_score": latest_score,
            "time_window": f"{rows[0]['timestamp']} to {rows[-1]['timestamp']}",
            "confidence": "HIGH" if len(scores) >= 5 else "MODERATE",
            "status": 200,
        }

    @classmethod
    def get_classified_citizen_evidence(cls, lat: float, lon: float, current_utc: datetime, radius_km: float = 25.0) -> Dict[str, Any]:
        """
        Classify citizen ground evidence reports within radius.
        """
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, location, description, category, latitude, longitude, photo_path, submitted_at
                FROM reports
                WHERE latitude IS NOT NULL AND longitude IS NOT NULL
                ORDER BY submitted_at DESC
                LIMIT 30
                """
            )
            rows = cursor.fetchall()
            conn.close()

            classified_reports = []
            for r in rows:
                r_dict = dict(r)
                r_lat = r_dict["latitude"]
                r_lon = r_dict["longitude"]
                dlat = math.radians(r_lat - lat)
                dlon = math.radians(r_lon - lon)
                a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat)) * math.cos(math.radians(r_lat)) * math.sin(dlon / 2) ** 2
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
                dist_km = 6371.0 * c

                if dist_km <= radius_km:
                    r_dict["distance_km"] = round(dist_km, 1)
                    r_dict["classification"] = classify_citizen_report(r_dict, current_utc)
                    classified_reports.append(r_dict)

            return {
                "report_count": len(classified_reports),
                "summary": f"{len(classified_reports)} ground report(s) within {radius_km} km",
                "reports": classified_reports[:5],
                "disclaimer": "Citizen evidence provides ground context and does NOT directly alter the official environmental risk score.",
            }
        except Exception as e:
            logger.warning(f"Error classifying citizen evidence: {e}")
            return {
                "report_count": 0,
                "summary": "Citizen evidence unavailable",
                "reports": [],
                "disclaimer": "Citizen evidence provides ground context and does NOT directly alter the official environmental risk score.",
            }
