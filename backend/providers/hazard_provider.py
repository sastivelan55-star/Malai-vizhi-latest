"""
providers/hazard_provider.py — Geological Survey of India (GSI) baseline landslide susceptibility
and hydrological floodplain baseline zoning.
"""

from typing import Dict, Any
from providers.base import HazardDataProvider


class DefaultHazardDataProvider(HazardDataProvider):
    def get_hazard_data(self, lat: float, lon: float) -> Dict[str, Any]:
        """
        Derive baseline geological and geomorphological susceptibility zone based on
        known macro-physiographic hazard mapping in India.
        """
        susceptibility_zone = "LOW"
        region_desc = "Peninsular Plains / Stable Craton"

        # 1. Western Ghats & Nilgiris corridor (Lat 8.0 - 21.0, Lon 73.0 - 77.5)
        if 8.0 <= lat <= 21.0 and 73.0 <= lon <= 77.5:
            susceptibility_zone = "HIGH"
            region_desc = "Western Ghats / Nilgiris Escarpment (GSI High Hazard Zone)"

        # 2. Eastern Himalayas & Northeast Region (NER) (Lat 23.0 - 29.5, Lon 88.0 - 97.5)
        elif 23.0 <= lat <= 29.5 and 88.0 <= lon <= 97.5:
            susceptibility_zone = "HIGH"
            region_desc = "Eastern Himalayas & Indo-Burma Ranges (GSI Critical Hazard Zone)"

        # 3. Northern Himalayas / Western Himalayas (Lat 29.0 - 36.5, Lon 74.0 - 81.0)
        elif 29.0 <= lat <= 36.5 and 74.0 <= lon <= 81.0:
            susceptibility_zone = "HIGH"
            region_desc = "Northwestern Himalayas (GSI Critical Hazard Zone)"

        # 4. Eastern Ghats & Chota Nagpur (Lat 13.0 - 22.0, Lon 78.5 - 87.0)
        elif 13.0 <= lat <= 22.0 and 78.5 <= lon <= 87.0:
            susceptibility_zone = "MODERATE"
            region_desc = "Eastern Ghats / Dissected Hill Tracts"

        # 5. Coastal Plains (Urban inundation prone)
        elif lon > 79.5 and (8.0 <= lat <= 16.0):
            susceptibility_zone = "LOW_LANDSLIDE_HIGH_FLOOD"
            region_desc = "Coromandel Coastal Plain (Urban Inundation Catchment)"

        return {
            "gsi_susceptibility_zone": susceptibility_zone,
            "physiographic_region": region_desc,
            "source": "Geological Survey of India (GSI) Macro-Zonation Atlas (Baseline Layer)",
            "disclaimer": "Macro-scale baseline susceptibility layer. Does not represent site-specific geotechnical boring.",
        }
