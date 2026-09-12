import json
from services.point_assessment_service import PointRiskAssessmentService
from providers.routing_provider import routing_provider
from models import get_connection

point_service = PointRiskAssessmentService()

class RoutingService:
    def analyze_route(self, start_lat, start_lon, end_lat, end_lon):
        # 1. Fetch Route (will be DEMO straight line)
        route = routing_provider.get_route(start_lat, start_lon, end_lat, end_lon)
        
        # 2. Sample points along the route
        # For our demo route (which only has 2 points), we'll interpolate a few points.
        points = []
        num_segments = max(1, int(route["distance_km"] / 5)) # Sample roughly every 5km
        if num_segments > 20: num_segments = 20 # cap
        
        for i in range(num_segments + 1):
            fraction = i / num_segments
            lat = start_lat + (end_lat - start_lat) * fraction
            lon = start_lon + (end_lon - start_lon) * fraction
            points.append((lat, lon))
            
        # 3. Assess multi-hazard risk along the route
        segment_assessments = []
        max_flood = 0
        max_landslide = 0
        
        for lat, lon in points:
            try:
                risk = point_service.assess_point(lat, lon, persist=False)
                f_score = risk.get("flood", {}).get("score", 0)
                l_score = risk.get("landslide", {}).get("score", 0)
            except Exception as e:
                print(f"Warning: Failed to assess point ({lat}, {lon}): {e}")
                f_score = 0
                l_score = 0
            
            max_flood = max(max_flood, f_score)
            max_landslide = max(max_landslide, l_score)
            
            segment_assessments.append({
                "latitude": lat,
                "longitude": lon,
                "flood_score": f_score,
                "landslide_score": l_score
            })
            
        overall_route_risk = max(max_flood, max_landslide)
        risk_level = "HIGH" if overall_route_risk >= 70 else "MODERATE" if overall_route_risk >= 40 else "LOW"
        
        risk_info = {
            "overall_route_score": overall_route_risk,
            "overall_route_level": risk_level,
            "max_flood_score": max_flood,
            "max_landslide_score": max_landslide,
            "segments": segment_assessments
        }
        
        # 4. Save to Database
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO route_assessments (route_info, risk_info, model_version, data_quality)
            VALUES (?, ?, ?, ?)
        """, (json.dumps(route), json.dumps(risk_info), "v1.0.0-route", "LIMITED"))
        route_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return {
            "id": route_id,
            "route_info": route,
            "risk_info": risk_info,
            "model_version": "v1.0.0-route",
            "data_quality": "LIMITED"
        }
        
    def get_route_assessment(self, route_id):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM route_assessments WHERE id = ?", (route_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
            
        return {
            "id": row["id"],
            "route_info": json.loads(row["route_info"]),
            "risk_info": json.loads(row["risk_info"]),
            "model_version": row["model_version"],
            "data_quality": row["data_quality"],
            "created_at": row["created_at"]
        }

routing_service = RoutingService()
