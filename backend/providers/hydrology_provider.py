"""
providers/hydrology_provider.py — Hydrology and surface runoff provider for MALAI VIZHI.

Calculates surface runoff index, retention characteristics, and drainage indicators
based on empirical rainfall-runoff saturation modeling.
Future phases can connect real CWC river gauges and Sentinel-1 SAR flood layers.
"""

import logging
from typing import Dict, Any, Optional
from providers.base import HydrologyProvider

logger = logging.getLogger(__name__)


class DefaultHydrologyProvider(HydrologyProvider):
    """
    Default Hydrology Provider.
    Uses physical saturation calculations when precipitation and soil moisture are available.
    Never fabricates gauge readings; explicitly flags telemetry source.
    """

    def get_hydrology_data(
        self,
        lat: float,
        lon: float,
        rainfall_24h: Optional[float] = None,
        soil_moisture: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Evaluate surface hydrology metrics.
        Returns runoff index, river gauge status, and telemetry quality.
        """
        if rainfall_24h is None:
            return {
                "runoff_index": None,
                "drainage_status": "UNKNOWN",
                "quality": "UNAVAILABLE",
                "source": "Hydrology Provider (Missing Precipitation)",
                "cwc_gauge_available": False,
                "is_prototype": True,
            }

        rain_val = float(rainfall_24h)
        moist_val = float(soil_moisture) if soil_moisture is not None else min(95.0, rain_val * 0.5 + 20.0)

        # Soil conservation service empirical approximation:
        # Runoff increases with high soil saturation and high rain intensity
        raw_runoff = (rain_val * 0.45) + (moist_val * 0.35)
        runoff_idx = round(max(5.0, min(98.0, raw_runoff)), 1)

        quality = "VALID" if soil_moisture is not None else "PARTIAL"

        return {
            "runoff_index": runoff_idx,
            "soil_saturation_factor": round(moist_val / 100.0, 2),
            "drainage_status": "ELEVATED" if runoff_idx >= 60 else "NORMAL",
            "quality": quality,
            "source": "Empirical Rainfall-Runoff Model (CWC Gauges Pending)",
            "cwc_gauge_available": False,
            "is_prototype": True,
        }
