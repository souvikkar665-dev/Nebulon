import pytest
from unittest.mock import patch, AsyncMock
import httpx
from fastapi.testclient import TestClient
from backend.app import app, get_assistant_service
from backend.services.assistant_service import AssistantService

client = TestClient(app)

def get_auth_token():
    """Helper to perform 2-step login and return valid Bearer access token."""
    s1_res = client.post("/api/v1/auth/verify-step1", json={"system_uid": "nebulon", "system_password": "nebulon@2070"})
    step1_token = s1_res.json()["step1_token"]

    s2_res = client.post("/api/v1/auth/verify-step2", json={"member_id": "souvik", "password": "souvik@2070", "step1_token": step1_token})
    return s2_res.json()["access_token"]

# 1. Replay Advance Tests
def test_valid_replay_advance():
    token = get_auth_token()
    # Primary endpoint
    res1 = client.post(
        "/api/v1/replay/advance",
        headers={"Authorization": f"Bearer {token}"},
        json={"step": 1, "mission_id": "transporter-8-ambiguity"}
    )
    assert res1.status_code == 200
    assert res1.json()["status"] == "ok"
    assert "Replay advanced" in res1.json()["message"]

    # Legacy alias /api/replay/advance
    res2 = client.post(
        "/api/replay/advance",
        headers={"Authorization": f"Bearer {token}"},
        json={}
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "ok"

def test_invalid_replay_request():
    token = get_auth_token()
    response = client.post(
        "/api/v1/replay/advance",
        headers={"Authorization": f"Bearer {token}"},
        json={"mission_id": "non-existent-mission-999"}
    )
    assert response.status_code == 404

def test_unauthenticated_replay_advance():
    response = client.post("/api/v1/replay/advance", json={})
    assert response.status_code == 401

# 2. Contradiction Injection Tests
def test_valid_contradiction_injection():
    token = get_auth_token()
    # Primary endpoint
    res1 = client.post(
        "/api/v1/contradiction",
        headers={"Authorization": f"Bearer {token}"},
        json={"target_object": "NORAD 56983", "drift_khz": 4.8}
    )
    assert res1.status_code == 200
    assert res1.json()["status"] == "ok"
    assert "contradiction injected" in res1.json()["message"].lower()

    # Legacy alias /api/contradiction
    res2 = client.post(
        "/api/contradiction",
        headers={"Authorization": f"Bearer {token}"},
        json={}
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "ok"

def test_invalid_contradiction_request():
    token = get_auth_token()
    response = client.post(
        "/api/v1/contradiction",
        headers={"Authorization": f"Bearer {token}"},
        json={"mission_id": "invalid-mission-id"}
    )
    assert response.status_code == 404

def test_unauthenticated_contradiction_injection():
    response = client.post("/api/v1/contradiction", json={})
    assert response.status_code == 401

# 3. Server-Sent Events (SSE) Stream Tests
def test_sse_stream_endpoint():
    async def mock_event_gen(self, max_events=None):
        yield "event: source_health_changed\ndata: {\"status\": \"LIVE\"}\n\n"
        yield "event: source_pulse\ndata: {\"type\": \"source_pulse\"}\n\n"

    with patch("backend.services.stream_service.StreamService.event_generator", mock_event_gen):
        with client.stream("GET", "/api/v1/stream") as response:
            assert response.status_code == 200
            assert "text/event-stream" in response.headers.get("content-type", "")
            lines = [line for line in response.iter_lines() if line]
            assert len(lines) >= 2
            assert any("source_health_changed" in l for l in lines)

# 4. Gemini AI Assistant Proxy Tests
def test_assistant_empty_prompt():
    token = get_auth_token()
    response = client.post(
        "/api/v1/assistant/query",
        headers={"Authorization": f"Bearer {token}"},
        json={"prompt": ""}
    )
    assert response.status_code == 400

def test_assistant_unauthenticated():
    response = client.post(
        "/api/v1/assistant/query",
        json={"prompt": "Explain Hohmann transfer orbits"}
    )
    assert response.status_code == 401

def test_assistant_missing_api_key_fallback():
    token = get_auth_token()
    svc = AssistantService(api_key="")
    app.dependency_overrides[get_assistant_service] = lambda: svc

    try:
        response = client.post(
            "/api/v1/assistant/query",
            headers={"Authorization": f"Bearer {token}"},
            json={"prompt": "What causes reaction wheel micro-vibrations?"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "suggestions" in data
        assert len(data["suggestions"]) >= 1
    finally:
        app.dependency_overrides.clear()

def test_assistant_mocked_gemini_success():
    token = get_auth_token()
    mock_gemini_json = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": "Reaction wheel bearing micro-vibrations are caused by geometric imperfections in inner and outer raceways.\n\nFOLLOW_UP_SUGGESTIONS: How are GEO satellite inclination drifts corrected? | What are the thermal impacts during lunar eclipse passes?"
                        }
                    ]
                }
            }
        ]
    }

    mock_response = httpx.Response(status_code=200, json=mock_gemini_json)
    svc = AssistantService(api_key="AIzaSyDummyTestKeyForUnitTests123456789")
    app.dependency_overrides[get_assistant_service] = lambda: svc

    try:
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response

            response = client.post(
                "/api/v1/assistant/query",
                headers={"Authorization": f"Bearer {token}"},
                json={"prompt": "What causes reaction wheel bearing micro-vibrations?"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "Reaction wheel bearing micro-vibrations" in data["response"]
            assert data["model_used"] == "gemini-3.7-flash"
            assert "How are GEO satellite inclination drifts corrected?" in data["suggestions"]
    finally:
        app.dependency_overrides.clear()

def test_assistant_gemini_timeout_fallback():
    token = get_auth_token()
    svc = AssistantService(api_key="AIzaSyDummyTestKeyForUnitTests123456789")
    app.dependency_overrides[get_assistant_service] = lambda: svc

    try:
        with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("Timeout connecting to Gemini API")):
            response = client.post(
                "/api/v1/assistant/query",
                headers={"Authorization": f"Bearer {token}"},
                json={"prompt": "Explain Lagrange point L2 halo orbits"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "response" in data
            assert "suggestions" in data
    finally:
        app.dependency_overrides.clear()

def test_assistant_distinct_responses_for_different_questions():
    """Regression test proving that different user questions produce distinct contextually relevant responses."""
    token = get_auth_token()
    questions = [
        "What is the current mission status?",
        "What is a satellite?",
        "Explain Doppler residuals in simple terms.",
        "Why is evidence important in orbital identity resolution?",
        "What is the difference between a planet and a satellite?"
    ]

    responses = []
    for q in questions:
        res = client.post(
            "/api/v1/assistant/query",
            headers={"Authorization": f"Bearer {token}"},
            json={"prompt": q}
        )
        assert res.status_code == 200
        data = res.json()
        responses.append(data["response"])

    # Ensure all responses are non-empty and completely distinct from each other
    assert len(responses) == 5
    assert len(set(responses)) == 5, "Responses for different questions must be distinct!"

    # Verify topic-specific content presence
    assert "Mission Status Report" in responses[0] or "Transporter-8" in responses[0]
    assert "Satellite Architecture" in responses[1] or "orbit around a celestial body" in responses[1]
    assert "Doppler Residuals" in responses[2] or "frequency" in responses[2]
    assert "Orbital Identity" in responses[3] or "Disambiguation" in responses[3]
    assert "Planet vs. Satellite" in responses[4] or "Primary Parent" in responses[4]

