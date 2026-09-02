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

def test_authenticated_get_mission_events():
    token = get_auth_token()
    response = client.get(
        "/api/v1/mission-events",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    m0 = data[0]
    assert "id" in m0
    assert "name" in m0
    assert "target_spacecraft" in m0
    assert "objects_tracked" in m0

def test_unauthenticated_get_mission_events():
    response = client.get("/api/v1/mission-events")
    assert response.status_code == 401
    assert "error" in response.json()

def test_valid_mission_workspace():
    token = get_auth_token()
    # Test primary endpoint
    response = client.get(
        "/api/v1/mission-events/transporter-8-ambiguity/workspace",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["mission_id"] == "transporter-8-ambiguity"
    assert "hypotheses" in data
    assert "opportunities" in data
    assert "timeline" in data

    # Test legacy alias /api/case
    legacy_res = client.get(
        "/api/case",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert legacy_res.status_code == 200
    assert legacy_res.json()["mission_id"] == "transporter-8-ambiguity"

def test_invalid_mission_workspace():
    token = get_auth_token()
    response = client.get(
        "/api/v1/mission-events/non-existent-mission-id/workspace",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404
    assert "error" in response.json()

def test_authenticated_get_hypotheses():
    token = get_auth_token()
    # Test primary endpoint
    response = client.get(
        "/api/v1/hypotheses",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

    # Validate exact structure required by frontend
    h0 = data[0]
    assert "id" in h0
    assert "rank" in h0
    assert "tracked_object" in h0
    assert "spacecraft_name" in h0
    assert "evidence_score" in h0
    assert "physics_score" in h0
    assert "neural_score" in h0
    assert "confidence_label" in h0
    assert "status" in h0
    assert "orbital_elements" in h0
    assert "rf_characteristics" in h0

    # Test legacy alias /api/hypotheses
    legacy_res = client.get(
        "/api/hypotheses",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert legacy_res.status_code == 200

def test_hypotheses_filtered_by_mission_id():
    token = get_auth_token()
    response = client.get(
        "/api/v1/hypotheses?mission_id=transporter-8-ambiguity",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["tracked_object"].startswith("NORAD")

def test_invalid_mission_id_hypotheses():
    token = get_auth_token()
    response = client.get(
        "/api/v1/hypotheses?mission_id=invalid-mission-999",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404
