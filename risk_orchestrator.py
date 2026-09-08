"""
risk_orchestrator.py — Multi-hazard assessment orchestrator for MALAI VIZHI.

Coordinates the end-to-end point-level environmental risk assessment pipeline:
Location -> Providers -> Feature Engines -> Risk Engines -> Audit Logging -> Normalized Output.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from providers import (
    DefaultLocationProvider,
    DefaultWeatherProvider,
    DefaultTerrainProvider,
    DefaultSoilMoistureProvider,
    DefaultHazardDataProvider,
)
from features import FeatureEngine
from engines import FloodRiskEngine, LandslideRiskEngine
from models import get_connection

logger = logging.getLogger(__name__)

# Singletons for dependency injection
location_provider = DefaultLocationProvider()
weather_provider = DefaultWeatherProvider()
terrain_provider = DefaultTerrainProvider()
soil_provider = DefaultSoilMoistureProvider()
hazard_provider = DefaultHazardDataProvider()


def record_assessment_audit(
    lat: float,
    lon: float,
    loc_name: str,
    flood_res: Dict[str, Any],
    landslide_res: Dict[str, Any],
    env: Dict[str, Any],
    models: Dict[str, str],
    sources: Dict[str, str],
):
    """Safely log assessment to SQLite assessments table."""
    try:
        conn = get_connection()
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
                flood_res.get("data_quality", "PARTIAL"),
                env.get("rainfall_24h", {}).get("value") if isinstance(env.get("rainfall_24h"), dict) else env.get("rainfall_24h"),
                env.get("soil_moisture", {}).get("value") if isinstance(env.get("soil_moisture"), dict) else env.get("soil_moisture"),
                env.get("elevation", {}).get("value") if isinstance(env.get("elevation"), dict) else env.get("elevation"),
                env.get("slope", {}).get("value") if isinstance(env.get("slope"), dict) else env.get("slope"),
                json.dumps(models),
                json.dumps(sources),
                datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            ),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning(f"Audit log failed: {e}")


class RiskOrchestrator:
    @classmethod
    def assess_point(cls, lat: float, lon: float, name: Optional[str] = None) -> Dict[str, Any]:
        """
        Execute full multi-hazard risk assessment pipeline for a specific coordinate.
        """
        # 1. Validate coordinates
        if not location_provider.validate_coordinates(lat, lon):
            return {
                "error": f"Invalid coordinates ({lat}, {lon}). Latitude must be between -90 and 90, Longitude between -180 and 180.",
                "status": 400
            }

        # 2. Location details & reverse geocoding
        loc_meta = location_provider.reverse_geocode(lat, lon)
        display_name = name or (loc_meta.get("display_name") if loc_meta else f"Point ({lat:.4f}, {lon:.4f})")
        short_name = name or (loc_meta.get("name") if loc_meta else f"Point ({lat:.4f}, {lon:.4f})")
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

        # 5. Risk Engines evaluation
        flood_assessment = FloodRiskEngine.evaluate(flood_features, short_name)
        landslide_assessment = LandslideRiskEngine.evaluate(landslide_features, short_name)

        # 6. Environmental summary vector
        env_summary = {
            "rainfall_1h": weather.get("rainfall_1h") if weather else {"value": None, "unit": "mm", "quality": "UNAVAILABLE"},
            "rainfall_3h": weather.get("rainfall_3h") if weather else {"value": None, "unit": "mm", "quality": "UNAVAILABLE"},
            "rainfall_6h": weather.get("rainfall_6h") if weather else {"value": None, "unit": "mm", "quality": "UNAVAILABLE"},
            "rainfall_24h": weather.get("rainfall_24h") if weather else {"value": None, "unit": "mm", "quality": "UNAVAILABLE"},
            "rainfall_72h": weather.get("rainfall_72h") if weather else {"value": None, "unit": "mm", "quality": "UNAVAILABLE"},
            "antecedent_rainfall": weather.get("antecedent_rainfall") if weather else {"value": None, "unit": "mm", "quality": "UNAVAILABLE"},
            "seven_day_trend": flood_features.get("seven_day_trend", [0.0] * 7),
            "soil_moisture": soil.get("soil_moisture") if soil and soil.get("soil_available") else {"value": None, "unit": "%", "quality": "UNAVAILABLE"},
            "elevation": terrain.get("elevation") if terrain and terrain.get("terrain_available") else {"value": None, "unit": "m", "quality": "UNAVAILABLE"},
            "slope": terrain.get("slope") if terrain and terrain.get("terrain_available") else {"value": None, "unit": "degrees", "quality": "UNAVAILABLE"},
            "aspect": terrain.get("aspect") if terrain and terrain.get("terrain_available") else {"value": None, "direction": "N/A", "quality": "UNAVAILABLE"},
            "runoff_index": flood_features.get("runoff_index"),
        }

        metadata = {
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "model_versions": {
                "flood": FloodRiskEngine.MODEL_VERSION,
                "landslide": LandslideRiskEngine.MODEL_VERSION,
            },
            "data_sources": {
                "weather": "Open-Meteo ERA5 / NWP Reanalysis (No API Key Required)",
                "terrain": "Copernicus Global DEM (GLO-30/90)",
                "soil": "Open-Meteo ERA5-Land Surface Telemetry",
                "hazard": "Geological Survey of India (GSI) Macro-Zonation",
            },
            "disclaimer": "Assessment based on available environmental and hazard telemetry. Designed for decision-support and risk awareness.",
        }

        # 7. Audit log in background
        record_assessment_audit(
            lat=round(lat, 5),
            lon=round(lon, 5),
            loc_name=short_name,
            flood_res=flood_assessment,
            landslide_res=landslide_assessment,
            env=env_summary,
            models=metadata["model_versions"],
            sources=metadata["data_sources"],
        )

        return {
            "location": {
                "name": short_name,
                "display_name": display_name,
                "state": state,
                "country": country,
                "latitude": round(lat, 5),
                "longitude": round(lon, 5),
            },
            "flood": flood_assessment,
            "landslide": landslide_assessment,
            "environment": env_summary,
            "metadata": metadata,
            "status": 200
        }
