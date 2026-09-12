"""
test_risk_tier.py -- Regression tests for canonical risk tier classification.

Canonical thresholds (MUST ALWAYS HOLD):
  0  - 39.99  -> LOW
  40 - 69.99  -> MODERATE
  70 - 100    -> HIGH

Boundary cases tested:
  score   expected
  0       LOW
  39      LOW
  39.99   LOW
  40      MODERATE
  49      MODERATE   <- THE BUG THIS FIXES (was incorrectly showing HIGH)
  69      MODERATE
  69.99   MODERATE
  70      HIGH
  100     HIGH
"""

import sys
import os
import pytest

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# pyrefly: ignore [missing-import]
from features.risk_logic import classify_risk_score


# ---------------------------------------------------------------------------
# Canonical boundary regression tests
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("score,expected", [
    (0,     "LOW"),
    (5,     "LOW"),
    (20,    "LOW"),
    (39,    "LOW"),
    (39.99, "LOW"),
    (40,    "MODERATE"),
    (49,    "MODERATE"),
    (50,    "MODERATE"),
    (60,    "MODERATE"),
    (69,    "MODERATE"),
    (69.99, "MODERATE"),
    (70,    "HIGH"),
    (80,    "HIGH"),
    (99,    "HIGH"),
    (100,   "HIGH"),
])
def test_classify_risk_score_canonical_thresholds(score, expected):
    """All boundary and mid-range values must match canonical thresholds exactly."""
    result = classify_risk_score(score)
    assert result == expected, (
        f"classify_risk_score({score}) returned '{result}', expected '{expected}'. "
        f"CANONICAL: 0-39=LOW, 40-69=MODERATE, 70-100=HIGH"
    )


def test_score_49_is_moderate():
    """
    Explicit regression test for the reported bug:
    Dashboard was showing Risk Score=49 as HIGH RISK.
    Correct answer: MODERATE RISK.
    """
    result = classify_risk_score(49)
    assert result == "MODERATE", (
        f"BUG REGRESSION FAILED: score=49 returned '{result}' but MUST be 'MODERATE'. "
        f"Canonical thresholds: <40=LOW, 40-69=MODERATE, >=70=HIGH"
    )


def test_boundary_at_40():
    """Score of exactly 40 must be MODERATE, not LOW."""
    assert classify_risk_score(40) == "MODERATE"
    assert classify_risk_score(39.99) == "LOW"


def test_boundary_at_70():
    """Score of exactly 70 must be HIGH, not MODERATE."""
    assert classify_risk_score(70) == "HIGH"
    assert classify_risk_score(69.99) == "MODERATE"


def test_return_type_is_uppercase_string():
    """classify_risk_score must always return an uppercase string."""
    for score in [0, 39, 40, 49, 69, 70, 100]:
        result = classify_risk_score(score)
        assert isinstance(result, str), f"Expected str, got {type(result)} for score={score}"
        assert result == result.upper(), f"Expected uppercase string for score={score}, got '{result}'"
        assert result in ("LOW", "MODERATE", "HIGH"), f"Unexpected value '{result}' for score={score}"


# ---------------------------------------------------------------------------
# API endpoint regression test
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    from app import app as flask_app
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as c:
        yield c


def test_risk_data_endpoint_level_matches_score(client):
    """
    For every location in /api/risk-data, risk_level must agree with
    classify_risk_score(risk_score). Catches stale DB risk_level bug.
    """
    res = client.get("/api/risk-data")
    assert res.status_code == 200
    data = res.get_json()
    assert isinstance(data, list) and len(data) > 0

    mismatches = []
    for loc in data:
        score = loc.get("risk_score")
        level = loc.get("risk_level")
        if score is not None:
            expected = classify_risk_score(score)
            if level != expected:
                mismatches.append(
                    f"  {loc.get('name')}: score={score} -> expected={expected}, got={level}"
                )

    assert not mismatches, (
        "risk_level/risk_score mismatch in /api/risk-data:\n" + "\n".join(mismatches)
    )


def test_single_location_level_matches_score(client):
    """
    /api/risk-data/<id> must return canonical risk_level consistent with risk_score.
    """
    res = client.get("/api/risk-data/1")
    assert res.status_code == 200
    loc = res.get_json()
    score = loc.get("risk_score")
    level = loc.get("risk_level")
    if score is not None:
        expected = classify_risk_score(score)
        assert level == expected, (
            f"Location id=1: score={score} -> expected risk_level='{expected}', got='{level}'"
        )
