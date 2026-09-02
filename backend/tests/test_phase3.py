import pytest
from fastapi.testclient import TestClient
from backend.app import app

client = TestClient(app)

def get_auth_token():
    """Helper to perform 2-step login and return valid Bearer access token."""
    s1_res = client.post("/api/v1/auth/verify-step1", json={"system_uid": "nebulon", "system_password": "nebulon@2070"})
    step1_token = s1_res.json()["step1_token"]

    s2_res = client.post("/api/v1/auth/verify-step2", json={"member_id": "souvik", "password": "souvik@2070", "step1_token": step1_token})
    return s2_res.json()["access_token"]

# 1. Hypothesis Evidence Tests
def test_hypothesis_evidence_valid():
    token = get_auth_token()
    response = client.get(
        "/api/v1/hypotheses/hyp-56987/evidence",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

def test_hypothesis_evidence_invalid():
    token = get_auth_token()
    response = client.get(
        "/api/v1/hypotheses/hyp-invalid-999/evidence",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404

def test_hypothesis_evidence_unauthenticated():
    response = client.get("/api/v1/hypotheses/hyp-56987/evidence")
    assert response.status_code == 401

# 2. Observation Opportunities Tests
def test_observation_opportunities():
    token = get_auth_token()
    # Primary endpoint
    res1 = client.get(
        "/api/v1/observation-opportunities",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res1.status_code == 200
    data = res1.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "station_id" in data[0]

    # Legacy endpoint /api/opportunities
    res2 = client.get(
        "/api/opportunities",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res2.status_code == 200

def test_observation_opportunities_unauthenticated():
    response = client.get("/api/v1/observation-opportunities")
    assert response.status_code == 401

# 3. Timeline Tests
def test_timeline_ledger_and_filters():
    token = get_auth_token()
    # Primary endpoint
    res1 = client.get(
        "/api/v1/timeline",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res1.status_code == 200
    data = res1.json()
    assert isinstance(data, list)
    assert len(data) >= 1

    # Filtering by kind=observation
    res_kind = client.get(
        "/api/v1/timeline?kind=observation",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_kind.status_code == 200
    for item in res_kind.json():
        assert item["kind"] == "observation"

    # Filtering by limit=2
    res_limit = client.get(
        "/api/v1/timeline?limit=2",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_limit.status_code == 200
    assert len(res_limit.json()) <= 2

    # Legacy endpoint /api/timeline
    res_legacy = client.get(
        "/api/timeline",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_legacy.status_code == 200

def test_timeline_unauthenticated():
    response = client.get("/api/v1/timeline")
    assert response.status_code == 401

# 4. Human Verification Review Tests
def test_record_review_valid():
    token = get_auth_token()
    response = client.post(
        "/api/v1/hypotheses/hyp-56987/reviews",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "decision": "Verified by source",
            "notes": "SGP4 Doppler residual matches within 38 Hz."
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["hypothesis_id"] == "hyp-56987"
    assert data["resulting_state"] == "VERIFIED_PERMANENT"
    assert "request_id" in data

def test_record_review_legacy_endpoint():
    token = get_auth_token()
    response = client.post(
        "/api/verify",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "hypothesis_id": "hyp-56987",
            "decision": "verified by reviewer"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["hypothesis_id"] == "hyp-56987"

def test_record_review_invalid_decision():
    token = get_auth_token()
    response = client.post(
        "/api/v1/hypotheses/hyp-56987/reviews",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "decision": "invalid decision text choice"
        }
    )
    assert response.status_code == 400

def test_record_review_invalid_hypothesis():
    token = get_auth_token()
    response = client.post(
        "/api/v1/hypotheses/hyp-non-existent-999/reviews",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "decision": "Verified by source"
        }
    )
    assert response.status_code == 404

def test_record_review_unauthenticated():
    response = client.post(
        "/api/v1/hypotheses/hyp-56987/reviews",
        json={"decision": "Verified by source"}
    )
    assert response.status_code == 401

# 5. Ingest Sources Health Tests
def test_sources_health():
    token = get_auth_token()
    # Primary endpoint
    res1 = client.get(
        "/api/v1/sources/health",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res1.status_code == 200
    data = res1.json()
    assert data["engine"] == "Nominal"
    assert isinstance(data["sources"], list)

    # Legacy endpoint /api/health
    res2 = client.get(
        "/api/health",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res2.status_code == 200

def test_sources_health_unauthenticated():
    response = client.get("/api/v1/sources/health")
    assert response.status_code == 401

# 6. AI/ML Models Status Tests
def test_models_status():
    token = get_auth_token()
    response = client.get(
        "/api/v1/models/status",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "physics_baseline" in data
    assert "neural_intelligence" in data
    assert "metrics" in data

def test_models_status_unauthenticated():
    response = client.get("/api/v1/models/status")
    assert response.status_code == 401
