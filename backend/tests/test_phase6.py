import sys
import os
import pytest
from app import app
from models import init_db, get_connection
import json

# Removed local client fixture, relying on conftest.py

def test_exposure_assess(client):
    res = client.get("/api/exposure/assess?lat=11.0168&lon=76.9558")
    assert res.status_code == 200
    data = res.get_json()
    assert "exposure_score" in data
    assert "details" in data
    # Enforce safe fake data fallbacks
    assert data["details"]["population"]["availability"] == "UNAVAILABLE"

def test_impact_assess(client):
    res = client.get("/api/impact/assess?lat=11.0168&lon=76.9558")
    assert res.status_code == 200
    data = res.get_json()
    assert "impact_score" in data
    assert "priority_level" in data
    assert data["impact_score"] >= 0

def test_impact_priority_locations(client):
    res = client.get("/api/impact/priority-locations")
    assert res.status_code == 200
    data = res.get_json()
    assert type(data) == list
    if len(data) > 0:
        assert "impact_score" in data[0]

def test_route_risk_analyze(client):
    payload = {
        "start": {"lat": 11.0, "lon": 76.0},
        "end": {"lat": 11.1, "lon": 76.1}
    }
    res = client.post("/api/route-risk/analyze", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert "route_info" in data
    assert data["route_info"]["status"] == "DEMO"
    assert "risk_info" in data
    assert data["data_quality"] == "LIMITED"
    
    # Store ID to test next endpoint
    route_id = data["id"]
    
    # Test lookup
    res_get = client.get(f"/api/route-risk/{route_id}")
    assert res_get.status_code == 200
    get_data = res_get.get_json()
    assert get_data["id"] == route_id

def test_missing_params(client):
    res = client.get("/api/exposure/assess")
    assert res.status_code == 400
    
    res2 = client.post("/api/route-risk/analyze", json={"start": {"lat": 11.0}})
    assert res2.status_code == 400
