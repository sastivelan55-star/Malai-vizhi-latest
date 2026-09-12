from services.point_assessment_service import PointRiskAssessmentService
from services.exposure_service import exposure_service

point_service = PointRiskAssessmentService()

class ImpactService:
    def calculate_impact(self, lat, lon):
        # 1. Get Hazard Risk (Phase 3)
        hazard_assessment = point_service.assess_point(lat, lon, persist=False)
        hazard_score = hazard_assessment.get("overall_hazard_priority", {}).get("score", 0)
        
        # 2. Get Exposure (Phase 6)
        exposure_data = exposure_service.assess_exposure(lat, lon)
        exposure_score = exposure_data.get("exposure_score", 0)
        
        # 3. Calculate Impact (HAZARD_SCORE x EXPOSURE_SCORE / 100)
        # Because we lack real exposure data (it defaults to UNAVAILABLE/0), 
        # impact score will mathematically be 0, which is transparent and honest.
        # But for demonstration of the math if exposure was 100:
        impact_score = round((hazard_score * exposure_score) / 100)
        
        # Determine Priority Level based on impact
        if impact_score > 70:
            priority_level = "CRITICAL"
        elif impact_score > 40:
            priority_level = "HIGH"
        elif impact_score > 15:
            priority_level = "MODERATE"
        else:
            priority_level = "LOW"
            
        return {
            "hazard_score": hazard_score,
            "exposure_score": exposure_score,
            "impact_score": impact_score,
            "priority_level": priority_level,
            "contributing_factors": {
                "hazard_details": hazard_assessment,
                "exposure_details": exposure_data["details"]
            },
            "data_quality": exposure_data["details"]["population"]["data_quality"],
            "model_version": "v1.0.0-impact"
        }

impact_service = ImpactService()
