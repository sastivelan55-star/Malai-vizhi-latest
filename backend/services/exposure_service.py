from providers.exposure_provider import exposure_provider

class ExposureService:
    def assess_exposure(self, lat, lon, radius_km=5.0):
        pop = exposure_provider.get_population_exposure(lat, lon, radius_km)
        infra = exposure_provider.get_infrastructure_exposure(lat, lon, radius_km)
        roads = exposure_provider.get_road_exposure(lat, lon, radius_km)
        
        # Calculate a combined exposure score (0-100)
        # Since data is unavailable/limited, the score defaults to 0 safely.
        exposure_score = 0
        if pop["availability"] == "AVAILABLE":
            exposure_score += min(pop["value"] / 1000, 50)  # arbitrary normalization
            
        return {
            "exposure_score": round(exposure_score),
            "details": {
                "population": pop,
                "infrastructure": infra,
                "roads": roads
            }
        }

exposure_service = ExposureService()
