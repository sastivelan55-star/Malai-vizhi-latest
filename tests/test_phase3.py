"""
test_phase3.py — Comprehensive test suite for MALAI VIZHI Phase 3:
Explainable Risk Intelligence, Confidence System, Risk Timeline,
Data Quality Panel, Alert-Ready State, What-If Simulation, and Regressions.
"""

import sys
import os
import json
import sqlite3

# Add backend directory to sys.path so modules can be resolved
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# pyrefly: ignore [missing-import]
from app import app
# pyrefly: ignore [missing-import]
from features.risk_orchestrator import RiskOrchestrator
# pyrefly: ignore [missing-import]
from engines import LandslideRiskEngine, FloodRiskEngine
# pyrefly: ignore [missing-import]
from models import get_connection, init_db


def test_health(client):
    print("Testing 1: GET /api/health...")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    assert data["status"] == "ok"
    assert "version" in data
    print("  ✅ Health endpoint OK")


def test_risk_data(client):
    print("Testing 2: GET /api/risk-data...")
    res = client.get("/api/risk-data")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    assert isinstance(data, list)
    assert len(data) > 0
    print(f"  ✅ Risk data endpoint returned {len(data)} stations")


def test_point_assessment_explainability(client):
    print("Testing 3: GET /api/risk/assess with explainable structured factors...")
    res = client.get("/api/risk/assess?lat=11.0168&lon=76.9558")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()

    # 1. Coordinates and Location
    assert "latitude" in data and "longitude" in data
    assert data["latitude"] == 11.0168
    assert data["longitude"] == 76.9558

    # 2. Confidence
    assert "confidence" in data
    conf = data["confidence"]
    assert "score" in conf and isinstance(conf["score"], (int, float))
    assert "status" in conf and ("CONFIDENCE" in conf["status"])
    assert "explanation" in conf
    assert "inputs_available" in conf

    # 3. Data Quality Panel
    assert "data_quality" in data
    dq = data["data_quality"]
    assert "status" in dq
    assert "sources" in dq
    assert "rainfall" in dq["sources"]
    assert "terrain" in dq["sources"]
    assert "soil_moisture" in dq["sources"]
    assert "historical_hazard" in dq["sources"]

    # 4. Landslide Assessment & Factors
    assert "landslide" in data
    ls = data["landslide"]
    assert "score" in ls and ls["score"] is not None
    assert "level" in ls
    assert "factors" in ls and isinstance(ls["factors"], list)
    for factor in ls["factors"]:
        assert "name" in factor
        assert "impact" in factor
        assert "contribution" in factor
        assert "available" in factor

    # 5. Flood Assessment & Factors
    assert "flood" in data
    fl = data["flood"]
    assert "score" in fl and fl["score"] is not None
    assert "level" in fl
    assert "factors" in fl and isinstance(fl["factors"], list)
    for factor in fl["factors"]:
        assert "name" in factor
        assert "impact" in factor
        assert "contribution" in factor
        assert "available" in factor

    # 6. Trend & Alert State
    assert "trend" in data
    assert "direction" in data["trend"]
    assert "alert_state" in data
    assert data["alert_state"]["status"] in ["monitor", "watch", "warning"]

    # 7. Model versioning
    assert data["metadata"]["model_versions"]["landslide"] == LandslideRiskEngine.MODEL_VERSION
    assert data["metadata"]["model_versions"]["flood"] == FloodRiskEngine.MODEL_VERSION

    print(f"  ✅ Explainable assessment validated! Landslide: {ls['score']} ({ls['level']}), Flood: {fl['score']} ({fl['level']}), Confidence: {conf['score']}%")


def test_invalid_coordinates(client):
    print("Testing 4: Invalid coordinates rejection...")
    # Missing lat/lon
    r1 = client.get("/api/risk/assess")
    assert r1.status_code == 400

    # Non-numeric lat
    r2 = client.get("/api/risk/assess?lat=abc&lon=76.95")
    assert r2.status_code == 400

    # Out-of-bounds coordinates
    r3 = client.get("/api/risk/assess?lat=999&lon=999")
    assert r3.status_code == 400
    print("  ✅ Invalid coordinates properly rejected with 400")


def test_missing_data_handling():
    print("Testing 5: Missing and partial data handling...")
    # Evaluate with empty features
    empty_features = {"data_quality": "INSUFFICIENT"}
    ls_missing = LandslideRiskEngine.evaluate(empty_features)
    assert ls_missing["score"] is None
    assert ls_missing["level"] == "UNAVAILABLE"
    assert ls_missing["status"] == "MISSING_CRITICAL_DATA"

    fl_missing = FloodRiskEngine.evaluate(empty_features)
    assert fl_missing["score"] is None
    assert fl_missing["level"] == "UNAVAILABLE"

    # Evaluate with only slope, missing rainfall
    partial_features = {
        "slope": 35.0,
        "terrain_available": True,
        "data_quality": "PARTIAL",
    }
    ls_partial = LandslideRiskEngine.evaluate(partial_features)
    assert ls_partial["score"] is not None
    # Check that unavailable factor has available=False and value=None
    rain_factor = next(f for f in ls_partial["factors"] if f["name"] == "Recent rainfall")
    assert rain_factor["available"] is False
    assert rain_factor["value"] is None
    print("  ✅ Missing data correctly sets available=False with zero fake values")


def test_risk_timeline_and_trend(client):
    print("Testing 6: Risk timeline and trend analysis...")
    test_lat, test_lon = 11.5555, 77.5555

    # 1. Clean previous test entries if any
    conn = get_connection()
    conn.execute("DELETE FROM risk_assessments WHERE ABS(latitude - ?) < 0.01 AND ABS(longitude - ?) < 0.01", (test_lat, test_lon))
    conn.commit()
    conn.close()

    # 2. Check history before any assessments exist -> no fake history!
    res_empty = client.get(f"/api/risk/history?lat={test_lat}&lon={test_lon}&hazard_type=landslide")
    assert res_empty.status_code == 200
    data_empty = res_empty.get_json()
    assert len(data_empty["history"]) == 0
    assert data_empty["trend"]["direction"] == "insufficient_data"
    assert "Risk timeline will appear" in data_empty["trend"]["message"]
    print("  ✅ Empty history returns clean 0 points without any fake data")

    # 3. Simulate first assessment (score: 40)
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO risk_assessments (latitude, longitude, location_name, hazard_type, score, risk_level, confidence, data_quality, model_version, timestamp)
        VALUES (?, ?, 'Test Loc', 'landslide', 40, 'Moderate', 80, 'GOOD', 'landslide_model_v1', '2026-09-09 10:00:00 UTC')
        """,
        (test_lat, test_lon)
    )
    conn.commit()
    conn.close()

    # 4. History with 1 observation -> still insufficient for trend
    res_one = client.get(f"/api/risk/history?lat={test_lat}&lon={test_lon}&hazard_type=landslide")
    assert len(res_one.get_json()["history"]) == 1
    assert res_one.get_json()["trend"]["direction"] == "insufficient_data"

    # 5. Insert second assessment with higher score (score: 65 -> +25 points)
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO risk_assessments (latitude, longitude, location_name, hazard_type, score, risk_level, confidence, data_quality, model_version, timestamp)
        VALUES (?, ?, 'Test Loc', 'landslide', 65, 'Moderate', 85, 'GOOD', 'landslide_model_v1', '2026-09-09 12:00:00 UTC')
        """,
        (test_lat, test_lon)
    )
    conn.commit()
    conn.close()

    # 6. Check history and trend
    res_two = client.get(f"/api/risk/history?lat={test_lat}&lon={test_lon}&hazard_type=landslide")
    data_two = res_two.get_json()
    assert len(data_two["history"]) == 2
    assert data_two["trend"]["direction"] == "increasing"
    assert data_two["trend"]["change"] == 25
    assert "+25 points" in data_two["trend"]["change_formatted"]
    print("  ✅ Trend calculation verified: direction = increasing (+25 points)")

    # Clean up test rows
    conn = get_connection()
    conn.execute("DELETE FROM risk_assessments WHERE ABS(latitude - ?) < 0.01 AND ABS(longitude - ?) < 0.01", (test_lat, test_lon))
    conn.commit()
    conn.close()


def test_what_if_simulation(client):
    print("Testing 7: What-If simulation foundation...")
    conn = get_connection()
    count_before = conn.execute("SELECT COUNT(*) FROM risk_assessments").fetchone()[0]
    conn.close()

    # Run simulation with 2.0x rainfall multiplier
    res = client.get("/api/risk/simulate-scenario?lat=11.0168&lon=76.9558&rainfall_multiplier=2.0")
    assert res.status_code == 200
    data = res.get_json()
    assert data["is_simulation"] is True
    assert data["simulation_parameters"]["rainfall_multiplier"] == 2.0

    # Verify no records were inserted into database
    conn = get_connection()
    count_after = conn.execute("SELECT COUNT(*) FROM risk_assessments").fetchone()[0]
    conn.close()
    assert count_before == count_after, "Simulation must NOT insert records into database!"
    print("  ✅ What-if simulation calculated on-the-fly without database mutation")


def test_citizen_evidence_separation(client):
    print("Testing 8: Citizen evidence compatibility and score separation...")
    res = client.get("/api/risk/assess?lat=11.0168&lon=76.9558")
    data = res.get_json()
    assert "citizen_evidence" in data
    ce = data["citizen_evidence"]
    assert "disclaimer" in ce
    assert "does NOT directly alter" in ce["disclaimer"]
    print("  ✅ Citizen evidence verified as ground context without altering official risk score")


def test_regression_endpoints(client):
    print("Testing 9: Full regression check on existing features...")
    # System status
    r_stat = client.get("/api/system-status")
    assert r_stat.status_code == 200

    # Flood risk
    r_flood = client.get("/api/flood-risk")
    assert r_flood.status_code == 200

    # Alerts
    r_alerts = client.get("/api/alerts")
    assert r_alerts.status_code == 200

    # Reports
    r_reports = client.get("/api/reports")
    assert r_reports.status_code == 200

    # Analytics
    r_analytics = client.get("/api/analytics")
    assert r_analytics.status_code == 200
    print("  ✅ All core regression endpoints responded with 200 OK")


if __name__ == "__main__":
    init_db()
    client = app.test_client()
    try:
        test_health(client)
        test_risk_data(client)
        test_point_assessment_explainability(client)
        test_invalid_coordinates(client)
        test_missing_data_handling()
        test_risk_timeline_and_trend(client)
        test_what_if_simulation(client)
        test_citizen_evidence_separation(client)
        test_regression_endpoints(client)
        print("\n🎉 ALL PHASE 3 BACKEND & REGRESSION TESTS PASSED SUCCESSFULLY!")
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        sys.exit(1)
