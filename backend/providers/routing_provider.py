import datetime

class RoutingProvider:
    def get_route(self, start_lat, start_lon, end_lat, end_lon):
        """
        Returns a route geometry. Since we do not have OSRM integrated,
        we return a strictly labeled DEMO/SYNTHETIC straight-line route.
        """
        return {
            "geometry": [
                [start_lat, start_lon],
                [end_lat, end_lon]
            ],
            "distance_km": self._haversine(start_lat, start_lon, end_lat, end_lon),
            "status": "DEMO",
            "source": "synthetic_demo_route",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        
    def _haversine(self, lat1, lon1, lat2, lon2):
        import math
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

routing_provider = RoutingProvider()
