import datetime

class ExposureProvider:
    def get_population_exposure(self, lat, lon, radius_km):
        # We don't have an authoritative offline database of population for India currently.
        # Strict enforcement: Do NOT hallucinate data. Return UNAVAILABLE.
        return {
            "value": 0,
            "unit": "people",
            "source": "None",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "data_quality": "POOR",
            "availability": "UNAVAILABLE"
        }

    def get_infrastructure_exposure(self, lat, lon, radius_km):
        # We don't have an authoritative offline database of infrastructure.
        return {
            "value": 0,
            "unit": "facilities",
            "source": "None",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "data_quality": "POOR",
            "availability": "UNAVAILABLE"
        }

    def get_road_exposure(self, lat, lon, radius_km):
        # We don't have an authoritative offline database of roads.
        return {
            "value": 0,
            "unit": "km",
            "source": "None",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "data_quality": "POOR",
            "availability": "UNAVAILABLE"
        }

exposure_provider = ExposureProvider()
