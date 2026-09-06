import pytest
from datetime import timedelta
from fastapi.testclient import TestClient
from backend.app import app
from backend.auth import create_access_token, create_step1_token

client = TestClient(app)

def test_valid_step1_login():
    response = client.post(
        "/api/v1/auth/verify-step1",
        json={
            "system_uid": "nebulon",
            "system_password": "nebulon@2070",
            "remember_device": True
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "step1_token" in data
    assert "expires_at" in data
    assert data["message"] == "Step 1 System Clearance Verified"

def test_invalid_step1_credentials():
    response = client.post(
        "/api/v1/auth/verify-step1",
        json={
            "system_uid": "nebulon",
            "system_password": "wrong_password_123"
        }
    )
    assert response.status_code == 401
    data = response.json()
    assert "error" in data

def test_valid_step2_login():
    # 1. Step 1 Login
    s1_res = client.post(
        "/api/v1/auth/verify-step1",
        json={"system_uid": "nebulon", "system_password": "nebulon@2070"}
    )
    step1_token = s1_res.json()["step1_token"]

    # 2. Step 2 Login
    response = client.post(
        "/api/v1/auth/verify-step2",
        json={
            "member_id": "souvik",
            "password": "souvik@2070",
            "step1_token": step1_token
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "access_token" in data
    assert data["member"]["id"] == "souvik"
    assert data["member"]["name"] == "Souvik Kar"

def test_invalid_step2_credentials():
    s1_res = client.post(
        "/api/v1/auth/verify-step1",
        json={"system_uid": "nebulon", "system_password": "nebulon@2070"}
    )
    step1_token = s1_res.json()["step1_token"]

    response = client.post(
        "/api/v1/auth/verify-step2",
        json={
            "member_id": "souvik",
            "password": "wrong_member_password",
            "step1_token": step1_token
        }
    )
    assert response.status_code == 401

def test_missing_invalid_step1_token():
    response = client.post(
        "/api/v1/auth/verify-step2",
        json={
            "member_id": "souvik",
            "password": "souvik@2070",
            "step1_token": "invalid.jwt.token.string"
        }
    )
    assert response.status_code == 401

def test_authenticated_auth_me():
    # Login Step 1 + Step 2
    s1_res = client.post("/api/v1/auth/verify-step1", json={"system_uid": "nebulon", "system_password": "nebulon@2070"})
    step1_token = s1_res.json()["step1_token"]

    s2_res = client.post("/api/v1/auth/verify-step2", json={"member_id": "sneha", "password": "sneha@2070", "step1_token": step1_token})
    access_token = s2_res.json()["access_token"]

    # Request /api/v1/auth/me
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is True
    assert data["member"]["id"] == "sneha"
    assert data["member"]["name"] == "Sneha Maiti"

def test_unauthenticated_auth_me():
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401

def test_logout():
    # Login Step 1 + Step 2
    s1_res = client.post("/api/v1/auth/verify-step1", json={"system_uid": "nebulon", "system_password": "nebulon@2070"})
    step1_token = s1_res.json()["step1_token"]

    s2_res = client.post("/api/v1/auth/verify-step2", json={"member_id": "arunima", "password": "arunima@2070", "step1_token": step1_token})
    access_token = s2_res.json()["access_token"]

    # Perform logout
    logout_res = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert logout_res.status_code == 200
    assert logout_res.json()["success"] is True

    # Subsequent /me call should fail with 401
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert me_res.status_code == 401

def test_expired_invalid_access_token():
    # Expired token simulation
    expired_token, _ = create_access_token("souvik", expires_delta=timedelta(seconds=-10))

    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert response.status_code == 401

    # Malformed token simulation
    response_malformed = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer this.is.an.invalid.token"}
    )
    assert response_malformed.status_code == 401
