"""
providers/terrain_provider.py — Real Copernicus DEM terrain and gradient analysis.

Ingests point-level elevation and computes local slope (degrees) and aspect
using finite-difference gradients from the Copernicus Global DEM (90m/30m resolution).
"""

import math
import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import requests
from providers.base import TerrainProvider

logger = logging.getLogger(__name__)

_TERRAIN_CACHE: Dict[str, Dict[str, Any]] = {}
TERRAIN_CACHE_TTL = 86400  # 24 hours (topography is static)


def aspect_to_compass(deg: float) -> str:
    """Convert aspect degree (0-360) to 8-point compass direction."""
    val = int((deg / 45.0) + 0.5) % 8
    directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    return directions[val]


class DefaultTerrainProvider(TerrainProvider):
    def get_terrain(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """
        Derive point elevation, slope angle, and aspect at exact coordinates
        from a 5-point cross-stencil Copernicus DEM elevation sample.
        """
        grid_key = f"{round(lat, 4)},{round(lon, 4)}"
        now = time.time()
        if grid_key in _TERRAIN_CACHE:
            entry = _TERRAIN_CACHE[grid_key]
            if now - entry["timestamp"] < TERRAIN_CACHE_TTL:
                return entry["data"]

        # 500m offset in degrees
        d_lat = 0.0045
        cos_lat = max(0.1, math.cos(math.radians(lat)))
        d_lon = 0.0045 / cos_lat

        lats = [lat, lat + d_lat, lat - d_lat, lat, lat]
        lons = [lon, lon, lon, lon + d_lon, lon - d_lon]

        lats_str = ",".join(f"{v:.5f}" for v in lats)
        lons_str = ",".join(f"{v:.5f}" for v in lons)

        url = f"https://api.open-meteo.com/v1/elevation?latitude={lats_str}&longitude={lons_str}"

        try:
            resp = requests.get(url, timeout=6)
            if resp.status_code != 200:
                logger.warning(f"Elevation API error {resp.status_code} for ({lat}, {lon})")
                return self._unavailable_response()

            data = resp.json()
            elevs = data.get("elevation", [])
            if len(elevs) < 5:
                return self._unavailable_response()

            z_center = float(elevs[0])
            z_north = float(elevs[1])
            z_south = float(elevs[2])
            z_east = float(elevs[3])
            z_west = float(elevs[4])

            # Distance in meters
            dist_y = d_lat * 111320.0
            dist_x = d_lon * 111320.0 * cos_lat

            # Finite-difference gradient
            dz_dy = (z_north - z_south) / (2.0 * dist_y)
            dz_dx = (z_east - z_west) / (2.0 * dist_x)

            slope_rad = math.atan(math.sqrt(dz_dx**2 + dz_dy**2))
            slope_deg = round(math.degrees(slope_rad), 1)

            aspect_rad = math.atan2(dz_dy, -dz_dx)
            aspect_deg = round((math.degrees(aspect_rad) + 360.0) % 360.0, 1)
            aspect_compass = aspect_to_compass(aspect_deg)

            obs_timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

            obs_elev = {
                "value": round(z_center, 1),
                "unit": "m",
                "source": "Copernicus Global DEM (GLO-30/90)",
                "timestamp": obs_timestamp,
                "spatial_resolution": "30m–90m",
                "quality": "good",
                "available": True,
            }
            obs_slope = {
                "value": slope_deg,
                "unit": "degrees",
                "source": "Copernicus DEM Finite-Difference Gradient",
                "timestamp": obs_timestamp,
                "spatial_resolution": "~500m baseline",
                "quality": "good",
                "available": True,
            }
            obs_aspect = {
                "value": aspect_deg,
                "direction": aspect_compass,
                "unit": "degrees",
                "source": "Copernicus DEM Finite-Difference Gradient",
                "timestamp": obs_timestamp,
                "spatial_resolution": "~500m baseline",
                "quality": "good",
                "available": True,
            }

            terrain_data = {
                "elevation": obs_elev,
                "slope": obs_slope,
                "aspect": obs_aspect,
                "terrain_available": True,
                "terrain": {
                    "elevation": obs_elev,
                    "slope": obs_slope,
                    "aspect": obs_aspect,
                    "source": "Copernicus Global DEM (GLO-30/90)",
                    "timestamp": obs_timestamp,
                    "quality": "good",
                    "available": True,
                },
            }

            _TERRAIN_CACHE[grid_key] = {"timestamp": now, "data": terrain_data}
            return terrain_data

        except Exception as e:
            logger.error(f"Terrain analysis failed for ({lat}, {lon}): {e}")
            return self._unavailable_response()

    def _unavailable_response(self) -> Dict[str, Any]:
        null_elev = {
            "value": None,
            "unit": "m",
            "source": "Copernicus DEM (Unavailable)",
            "timestamp": None,
            "quality": "unavailable",
            "available": False,
        }
        null_slope = {
            "value": None,
            "unit": "degrees",
            "source": "Copernicus DEM (Unavailable)",
            "timestamp": None,
            "quality": "unavailable",
            "available": False,
        }
        null_aspect = {
            "value": None,
            "direction": "N/A",
            "unit": "degrees",
            "source": "Copernicus DEM (Unavailable)",
            "timestamp": None,
            "quality": "unavailable",
            "available": False,
        }
        return {
            "elevation": null_elev,
            "slope": null_slope,
            "aspect": null_aspect,
            "terrain_available": False,
            "terrain": {
                "elevation": null_elev,
                "slope": null_slope,
                "aspect": null_aspect,
                "source": "Copernicus DEM (Unavailable)",
                "timestamp": None,
                "quality": "unavailable",
                "available": False,
            },
        }

