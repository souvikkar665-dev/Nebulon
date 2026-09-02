# Nebulon FastAPI Backend API Map & Integration Specification

> **Target Audience**: Backend / Integration Engineers, Database Engineers, AI/ML Engineers
> **Status**: Design Phase / Planning Mode — Approved API Map Specification

---

## 1. System Overview & Scope Division

- **Backend Role**: FastAPI orchestration layer. Handles HTTP routing, 2-step authentication, session management, Server-Sent Events (SSE), external API proxying (CelesTrak, Space-Track, NASA Horizons, Gemini API), and bridging the existing Frontend with the Database and AI/ML layers.
- **Frontend Division**: Maintained by frontend team. **NO redesigns or code replacements on frontend.**
- **Database Division**: Schema and queries maintained by DB teammate. Backend consumes structured DB repository interfaces.
- **AI/ML Model Division**: Physics engine and neural graph models maintained by AI/ML teammate. Backend consumes high-level inference & physics functions.

---

## 2. Identified Repository Insights

### 2.1 All Frontend API Calls & Endpoint Mappings
The frontend consumes API endpoints via `frontend/js/api-client.js`, `frontend/js/app.js`, `frontend/js/live-stream.js`, `frontend/js/authentication.js`, and `frontend/pages/assistant/assistant.js`.

| Frontend Function / Invocation | Target API Path | Legacy / Alias Path | Method |
|---|---|---|---|
| `verifyStep1(uid, pwd)` | `/api/v1/auth/verify-step1` | `/api/auth/step1` | POST |
| `verifyStep2(memberId, pass)` | `/api/v1/auth/verify-step2` | `/api/login` | POST |
| `getActiveMember()` / Route Guard | `/api/v1/auth/me` | `/api/auth/me` | GET |
| `logout()` | `/api/v1/auth/logout` | `/api/logout` | POST |
| `NebulonAPI.getMissionEvents()` | `/api/v1/mission-events` | — | GET |
| `NebulonAPI.getWorkspace(id)` | `/api/v1/mission-events/{id}/workspace` | `/api/case` | GET |
| `NebulonAPI.getHypotheses()` | `/api/v1/hypotheses` | `/api/hypotheses` | GET |
| `NebulonAPI.getHypothesisEvidence(id)` | `/api/v1/hypotheses/{id}/evidence` | — | GET |
| `NebulonAPI.getObservationOpportunities()` | `/api/v1/observation-opportunities` | `/api/opportunities` | GET |
| `NebulonAPI.getTimeline()` | `/api/v1/timeline` | `/api/timeline` | GET |
| `NebulonAPI.recordReview(hypId, payload)` | `/api/v1/hypotheses/{id}/reviews` | `/api/verify` | POST |
| `NebulonAPI.getSourcesHealth()` | `/api/v1/sources/health` | `/api/health` | GET |
| `NebulonAPI.getModelStatus()` | `/api/v1/models/status` | — | GET |
| `api("/api/replay/advance")` | `/api/v1/replay/advance` | `/api/replay/advance` | POST |
| `api("/api/contradiction")` | `/api/v1/contradiction` | `/api/contradiction` | POST |
| `EventSource('/api/v1/stream')` | `/api/v1/stream` | — | GET (SSE) |
| `fetch(url)` in `assistant.js` | `/api/v1/assistant/query` | — | POST |

### 2.2 Direct Third-Party API Calls (To Be Proxied/Secured)
1. **CelesTrak / TLE Feed**: `https://tle.ivanstanojevic.me/api/tle/{id}` (Used in `investigate.js`, `orbit.js`)
2. **NASA JPL Horizons**: `https://ssd.jpl.nasa.gov/api/horizons.api` (Used in `solar.js`)
3. **Google Gemini API**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` (Used in `assistant.js`)

### 2.3 Exposed Gemini API Keys & Vulnerabilities
- **Location**: `frontend/pages/assistant/assistant.js` (Line 14: `DEFAULT_API_KEY = 'AQ.Ab8RN6Ie5Ztj9Oz2o4i...';`)
- **Vulnerability**: Client-side execution exposes the API key in public browser network requests (`?key=...`).
- **Remediation**: The backend FastAPI server will securely host the `GEMINI_API_KEY` in environment variables and expose `/api/v1/assistant/query` to handle requests server-side.

### 2.4 Mock / Fallback Datasets Identified
- `MOCK_MISSIONS` (Transporter-8, Starlink Group 6-12, PSLV-C37 Swarm)
- `MOCK_HYPOTHESES` (NORAD 56987 / Aurora-1, NORAD 56983, NORAD 56991)
- `MOCK_OPPORTUNITIES` (GS-142 Svalbard, GS-088 Hawaii, GS-044 Hartebeesthoek)
- `MOCK_TIMELINE` (SatNOGS, CelesTrak, Space-Track, Manifest events)
- `MOCK_HEALTH` & `MOCK_MODEL_STATUS`
- `AUTHORIZED_MEMBERS` (Souvik Kar, Debangshu, Sneha Maiti, Adrika)

---

## 3. Database Layer Interface Requirements

The database teammate will provide a repository/DAO interface with the following signatures:

```python
# Database Interface Contract (db_repository.py)

async def get_system_clearance(system_key_name: str) -> dict | None: ...
async def get_authorized_member(member_id: str) -> dict | None: ...
async def create_session(member_id: str, step1: bool, step2: bool, expires_at: datetime) -> str: ...
async def get_session(token: str) -> dict | None: ...
async def revoke_session(token: str) -> bool: ...

async def get_all_missions() -> list[dict]: ...
async def get_mission_by_id(mission_id: str) -> dict | None: ...

async def get_hypotheses_by_mission(mission_id: str) -> list[dict]: ...
async def get_hypothesis_by_id(hypothesis_id: str) -> dict | None: ...
async def update_hypothesis_status(hypothesis_id: str, status: str) -> bool: ...

async def get_opportunities_by_mission(mission_id: str) -> list[dict]: ...
async def get_timeline_events(mission_id: str | None, limit: int, kind: str | None) -> list[dict]: ...
async def create_timeline_event(event_data: dict) -> dict: ...

async def create_review_record(review_data: dict) -> dict: ...
async def save_assistant_chat(session_id: str, member_id: str, role: str, text: str, model: str, latency: int) -> bool: ...
```

---

## 4. AI/ML Model Layer Interface Requirements

The AI/ML teammate will provide an engine/model interface module (`nebula_engine.py`) with the following signatures:

```python
# AI/ML Engine Interface Contract (nebula_engine.py)

def evaluate_physics_residuals(tle_line1: str, tle_line2: str, observations: list[dict]) -> dict:
    """
    Computes SGP4 Keplerian orbital propagation residuals against observation Doppler curves.
    Returns: { 'physics_score': float, 'doppler_residual_hz': float, 'contradictions': list[str] }
    """
    ...

def get_model_status_metrics() -> dict:
    """
    Returns operational status and calibration metrics for SGP4 Physics Baseline & GraphNet-v2.1 Neural Model.
    """
    ...

def predict_doppler_pass(satellite_tle: dict, ground_station: dict) -> dict:
    """
    Predicts Doppler frequency separation and information gain for ground pass opportunities.
    """
    ...
```

---

## 5. Detailed Endpoint Map & Specifications

---

### Endpoint 1: Verify Step 1 System Clearance

- **METHOD**: `POST`
- **PATH**: `/api/v1/auth/verify-step1` (Alias: `/api/auth/step1`)
- **AUTHENTICATION**: None (Public Login Step 1)
- **REQUEST**:
  ```json
  {
    "system_uid": "nebulon",
    "system_password": "nebulon@2070",
    "remember_device": true
  }
  ```
- **RESPONSE**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "step1_token": "eyJhbGciOiJIUzI1Ni...",
      "expires_at": "2026-09-01T20:45:00Z",
      "message": "Step 1 System Clearance Verified"
    }
    ```
- **DATABASE DEPENDENCY**: Calls `db.get_system_clearance(system_uid)` to verify access cipher hash.
- **MODEL DEPENDENCY**: None.
- **EXTERNAL API DEPENDENCY**: None.
- **ERROR CASES**:
  - `400 Bad Request`: Missing `system_uid` or `system_password`.
  - `401 Unauthorized`: Invalid system credentials.

---

### Endpoint 2: Verify Step 2 Member Operator Login

- **METHOD**: `POST`
- **PATH**: `/api/v1/auth/verify-step2` (Aliases: `/api/auth/step2`, `/api/login`)
- **AUTHENTICATION**: Step 1 Clearance Token (Body/Header)
- **REQUEST**:
  ```json
  {
    "member_id": "souvik",
    "password": "souvik@2070",
    "step1_token": "eyJhbGciOiJIUzI1Ni..."
  }
  ```
- **RESPONSE**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "access_token": "eyJhbGciOiJIUzI1Ni...",
      "token_type": "Bearer",
      "expires_at": "2026-09-02T04:45:00Z",
      "member": {
        "id": "souvik",
        "name": "Souvik Kar",
        "role": "Mission Director & Orbital Architect",
        "badge": "OMEGA-DIRECTOR",
        "station": "Svalbard Polar Primary (GS-142)"
      }
    }
    ```
- **DATABASE DEPENDENCY**: Calls `db.get_authorized_member(member_id)` and `db.create_session(...)`.
- **MODEL DEPENDENCY**: None.
- **EXTERNAL API DEPENDENCY**: None.
- **ERROR CASES**:
  - `401 Unauthorized`: Step 1 token invalid or expired.
  - `401 Unauthorized`: Invalid member password or inactive member profile.
  - `404 Not Found`: Unknown operator member_id.

---

### Endpoint 3: Active Member Session Status

- **METHOD**: `GET`
- **PATH**: `/api/v1/auth/me` (Alias: `/api/auth/me`)
- **AUTHENTICATION**: `Authorization: Bearer <access_token>`
- **REQUEST**: Empty Body.
- **RESPONSE**:
  - `200 OK`:
    ```json
    {
      "authenticated": true,
      "member": {
        "id": "souvik",
        "name": "Souvik Kar",
        "role": "Mission Director & Orbital Architect",
        "badge": "OMEGA-DIRECTOR",
        "ground_segment": "Svalbard Polar Primary (GS-142)"
      }
    }
    ```
- **DATABASE DEPENDENCY**: Calls `db.get_session(token)`.
- **MODEL DEPENDENCY**: None.
- **EXTERNAL API DEPENDENCY**: None.
- **ERROR CASES**:
  - `401 Unauthorized`: Missing, malformed, or expired Bearer token.

---

### Endpoint 4: Member Logout

- **METHOD**: `POST`
- **PATH**: `/api/v1/auth/logout` (Alias: `/api/logout`)
- **AUTHENTICATION**: `Authorization: Bearer <access_token>`
- **REQUEST**: Empty Body.
- **RESPONSE**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Session revoked successfully."
    }
    ```
- **DATABASE DEPENDENCY**: Calls `db.revoke_session(token)`.
- **MODEL DEPENDENCY**: None.
- **EXTERNAL API DEPENDENCY**: None.
- **ERROR CASES**:
  - `401 Unauthorized`: Invalid session token.

---

### Endpoint 5: Get All Mission Workspaces

- **METHOD**: `GET`
- **PATH**: `/api/v1/mission-events`
- **AUTHENTICATION**: Bearer Token
- **REQUEST**: None.
- **RESPONSE**:
  - `200 OK`:
    ```json
    [
      {
        "id": "transporter-8-ambiguity",
        "name": "Transporter-8 SSO CubeSat Swarm",
        "launch_date": "2023-06-12 21:35:00 UTC",
        "vehicle": "Falcon 9 · Vandenberg SLC-4E",
        "objects_tracked": 72,
        "ambiguous_clusters": 4,
        "target_spacecraft": "Aurora-1 (6U Earth Observation)",
        "summary": "Post-deploy cluster separation failure across Objects 56983, 56987, and 56991 in sun-synchronous orbit.",
        "leading_candidate": "NORAD 56987 (Object C)",
        "confidence_score": 87.4,
        "is_historical": true
      }
    ]
    ```
- **DATABASE DEPENDENCY**: Calls `db.get_all_missions()`.
- **MODEL DEPENDENCY**: None.
- **EXTERNAL API DEPENDENCY**: None.
- **ERROR CASES**:
  - `500 Internal Server Error`: Database query failure.

---

### Endpoint 6: Get Workspace Case Summary

- **METHOD**: `GET`
- **PATH**: `/api/v1/mission-events/{mission_id}/workspace` (Alias: `/api/case`)
- **AUTHENTICATION**: Bearer Token
- **REQUEST**: Path parameter `mission_id` (default: `transporter-8-ambiguity`).
- **RESPONSE**:
  - `200 OK`:
    ```json
    {
      "mission_id": "transporter-8-ambiguity",
      "launch_name": "Transporter-8 SSO CubeSat Swarm",
      "launch_time": "2023-06-12 21:35:00 UTC",
      "candidate_summary": "Post-deploy cluster separation failure across Objects 56983, 56987, and 56991...",
      "hypotheses": [ ... ],
      "opportunities": [ ... ],
      "timeline": [ ... ]
    }
    ```
- **DATABASE DEPENDENCY**: Calls `db.get_mission_by_id`, `db.get_hypotheses_by_mission`, `db.get_opportunities_by_mission`, `db.get_timeline_events`.
- **MODEL DEPENDENCY**: None.
- **EXTERNAL API DEPENDENCY**: None.
- **ERROR CASES**:
  - `404 Not Found`: Specified `mission_id` does not exist.

---

### Endpoint 7: Get Satellite Identity Hypotheses

- **METHOD**: `GET`
- **PATH**: `/api/v1/hypotheses` (Alias: `/api/hypotheses`)
- **AUTHENTICATION**: Bearer Token
- **REQUEST**: Query param `mission_id` (optional).
- **RESPONSE**:
  - `200 OK`:
    ```json
    [
      {
        "id": "hyp-56987",
        "rank": 1,
        "tracked_object": "NORAD 56987 / Object C",
        "spacecraft_name": "Aurora-1",
        "evidence_score": 87.4,
        "physics_score": 89.2,
        "neural_score": 85.6,
        "confidence_label": "high",
        "status": "review_required",
        "supporting_observations": ["OBS-204-SATNOGS", "OBS-229-DOPPLER"],
        "contradictions": [],
        "orbital_elements": {
          "epoch": "2026-08-25 09:14:02 UTC",
          "semi_major_axis_km": 6894.2,
          "altitude_km": 516.2,
          "inclination": 97.45,
          "eccentricity": 0.0012,
          "raan": 214.8,
          "arg_perigee": 78.4,
          "mean_anomaly": 142.1
        },
        "rf_characteristics": {
          "beacon_freq": "437.450 MHz",
          "modulation": "GFSK 9.6 kbps",
          "measured_snr_db": 14.8,
          "doppler_residual_hz": 38
        }
      }
    ]
    ```
- **DATABASE DEPENDENCY**: Calls `db.get_hypotheses_by_mission(mission_id)`.
- **MODEL DEPENDENCY**: Consumes `nebula_engine.evaluate_physics_residuals(...)` to update dynamic scores.
- **EXTERNAL API DEPENDENCY**: Optional CelesTrak TLE fetch (`https://tle.ivanstanojevic.me/api/tle/{norad_id}`).
- **ERROR CASES**:
  - `404 Not Found`: No hypotheses found for given mission.

---

### Endpoint 8: Get Hypothesis Evidence & Contradictions

- **METHOD**: `GET`
- **PATH**: `/api/v1/hypotheses/{hypothesis_id}/evidence`
- **AUTHENTICATION**: Bearer Token
- **REQUEST**: Path parameter `hypothesis_id`.
- **RESPONSE**:
  - `200 OK`: Array of timeline evidence items matching `hypothesis_id`.
- **DATABASE DEPENDENCY**: Calls `db.get_timeline_events(...)`.
- **MODEL DEPENDENCY**: None.
- **EXTERNAL API DEPENDENCY**: None.
- **ERROR CASES**:
  - `404 Not Found`: Unknown hypothesis_id.

---

### Endpoint 9: Get Ground Station Observation Opportunities

- **METHOD**: `GET`
- **PATH**: `/api/v1/observation-opportunities` (Alias: `/api/opportunities`)
- **AUTHENTICATION**: Bearer Token
- **REQUEST**: Query param `mission_id` (optional).
- **RESPONSE**:
  - `200 OK`:
    ```json
    [
      {
        "id": "opp-gs142-svalbard",
        "station_id": "GS-142 · Svalbard Polar Station",
        "location": "78.22° N, 15.65° E",
        "window": "14:22–14:29 UTC",
        "elevation_max_deg": 68.4,
        "expected_information_gain": 94,
        "predicted_doppler_separation": "4.8 kHz",
        "station_feasibility": 0.91,
        "confidence_impact": "HIGH",
        "feasible": true,
        "rank": 1,
        "is_recommended": true,
        "reason": "Maximum Doppler gradient separation near polar zenith.",
        "value_factors": {
          "station_feasibility": 0.91,
          "doppler_separation_weight": 0.96,
          "latency_seconds": 4.2,
          "sensor_independence": 0.88
        },
        "observation_type": "RF Doppler Spectrum + IQ Recording",
        "frequency": "437.450 MHz UHF"
      }
    ]
    ```
- **DATABASE DEPENDENCY**: Calls `db.get_opportunities_by_mission(mission_id)`.
- **MODEL DEPENDENCY**: Consumes `nebula_engine.predict_doppler_pass(...)`.
- **EXTERNAL API DEPENDENCY**: None.
- **ERROR CASES**:
  - `500 Internal Server Error`: Pass propagation calculation error.

---

### Endpoint 10: Get Cryptographic Evidence Timeline Ledger

- **METHOD**: `GET`
- **PATH**: `/api/v1/timeline` (Alias: `/api/timeline`)
- **AUTHENTICATION**: Bearer Token
- **REQUEST**: Query params `limit` (int, default 50), `kind` (string, optional).
- **RESPONSE**:
  - `200 OK`: Array of timeline event objects sorted by `time DESC`.
- **DATABASE DEPENDENCY**: Calls `db.get_timeline_events(mission_id, limit, kind)`.
- **MODEL DEPENDENCY**: None.
- **EXTERNAL API DEPENDENCY**: None.
- **ERROR CASES**:
  - `400 Bad Request`: Invalid filter parameter.

---

### Endpoint 11: Commit Human Verification Review

- **METHOD**: `POST`
- **PATH**: `/api/v1/hypotheses/{hypothesis_id}/reviews` (Alias: `/api/verify`)
- **AUTHENTICATION**: Bearer Token
- **REQUEST**:
  ```json
  {
    "decision": "Verified by source",
    "notes": "SGP4 residual matches SatNOGS waterfall within 38 Hz.",
    "reviewer": "Souvik Kar · Mission Director"
  }
  ```
- **RESPONSE**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "request_id": "REV-X9K2L1P",
      "reviewer": "Souvik Kar · Mission Director",
      "timestamp": "2026-09-01T16:45:00Z",
      "hypothesis_id": "hyp-56987",
      "decision": "Verified by source",
      "resulting_state": "VERIFIED_PERMANENT",
      "message": "Verification recorded. Spacecraft Aurora-1 identity bound to NORAD 56987."
    }
    ```
- **DATABASE DEPENDENCY**: Calls `db.create_review_record(...)`, `db.update_hypothesis_status(...)`, `db.create_timeline_event(...)`.
- **MODEL DEPENDENCY**: None.
- **EXTERNAL API DEPENDENCY**: None.
- **ERROR CASES**:
  - `400 Bad Request`: Invalid `decision` (must be `Verified by source`, `Refuted by conflict`, or `Needs additional observation`).
  - `404 Not Found`: Unknown `hypothesis_id`.

---

### Endpoint 12: Get Source Ingest Health

- **METHOD**: `GET`
- **PATH**: `/api/v1/sources/health` (Alias: `/api/health`)
- **AUTHENTICATION**: Bearer Token
- **REQUEST**: None.
- **RESPONSE**:
  - `200 OK`:
    ```json
    {
      "engine": "Nominal",
      "score_version": "Nebula-Physics v3.2 + Neural-Graph v1.9",
      "latency_ms": 18,
      "status_label": "LIVE / PRODUCTION FEED",
      "sources": [
        { "name": "CelesTrak GP Stream", "status": "SYNCHRONIZED", "freshness": "24s ago", "status_code": "healthy" },
        { "name": "SatNOGS Global Ground Network", "status": "SYNCHRONIZED", "freshness": "12s ago", "status_code": "healthy" },
        { "name": "Space-Track (18th SDS)", "status": "SYNCHRONIZED", "freshness": "45s ago", "status_code": "healthy" },
        { "name": "Launch Vehicle Telemetry Ingest", "status": "STATIC ARCHIVE", "freshness": "Historical", "status_code": "healthy" }
      ]
    }
    ```
- **DATABASE DEPENDENCY**: None.
- **MODEL DEPENDENCY**: None.
- **EXTERNAL API DEPENDENCY**: Ping check to CelesTrak / SatNOGS / Space-Track APIs.
- **ERROR CASES**:
  - `503 Service Unavailable`: Upstream stream ingestion network down.

---

### Endpoint 13: Get AI/ML Model Status

- **METHOD**: `GET`
- **PATH**: `/api/v1/models/status`
- **AUTHENTICATION**: Bearer Token
- **REQUEST**: None.
- **RESPONSE**:
  - `200 OK`:
    ```json
    {
      "physics_baseline": {
        "status": "Active · Primary Arbiter",
        "algorithm": "SGP4 / SDP4 Keplerian Residual Filter",
        "covariance_threshold_km": 1.2,
        "doppler_tolerance_hz": 150,
        "contradiction_rules_active": 8,
        "verified_by_physics": true
      },
      "neural_intelligence": {
        "status": "Operational · Advisory Ranking",
        "model_name": "Nebula-GraphNet-v2.1",
        "version": "2.1.4-rc",
        "training_window": "2023-01 to 2026-06 (4,820 orbital passes)",
        "calibration_score": 0.942,
        "inference_latency_ms": 12.4,
        "is_ood": false,
        "disclaimer": "Experimental advisory ranking — not mathematical proof of spacecraft identity."
      },
      "metrics": {
        "total_hypotheses_evaluated": 1420,
        "ambiguity_resolution_rate": "98.2%",
        "average_time_to_verification": "38 min",
        "contradiction_catch_rate": "100%"
      }
    }
    ```
- **DATABASE DEPENDENCY**: None.
- **MODEL DEPENDENCY**: Consumes `nebula_engine.get_model_status_metrics()`.
- **EXTERNAL API DEPENDENCY**: None.
- **ERROR CASES**:
  - `500 Internal Server Error`: Engine failed to return metrics.

---

### Endpoint 14: Advance Replay Step

- **METHOD**: `POST`
- **PATH**: `/api/v1/replay/advance` (Alias: `/api/replay/advance`)
- **AUTHENTICATION**: Bearer Token
- **REQUEST**: `{}`
- **RESPONSE**:
  - `200 OK`:
    ```json
    {
      "status": "ok",
      "message": "Replay advanced to T+04:22:00. 1 new observation ingest processed."
    }
    ```
- **DATABASE DEPENDENCY**: Appends simulated step event to `timeline_events`.
- **MODEL DEPENDENCY**: Recalculates candidate ranking score.
- **EXTERNAL API DEPENDENCY**: None.
- **ERROR CASES**:
  - `400 Bad Request`: Replay simulation at boundary end.

---

### Endpoint 15: Inject Contradiction Simulation

- **METHOD**: `POST`
- **PATH**: `/api/v1/contradiction` (Alias: `/api/contradiction`)
- **AUTHENTICATION**: Bearer Token
- **REQUEST**: `{}`
- **RESPONSE**:
  - `200 OK`:
    ```json
    {
      "status": "ok",
      "message": "Simulated Doppler contradiction injected into Object NORAD 56983 (+4.8 kHz drift)."
    }
    ```
- **DATABASE DEPENDENCY**: Inserts conflict event into `timeline_events`.
- **MODEL DEPENDENCY**: Triggers contradiction flag in `hypotheses`.
- **EXTERNAL API DEPENDENCY**: None.
- **ERROR CASES**: None.

---

### Endpoint 16: Real-Time SSE Telemetry Stream

- **METHOD**: `GET`
- **PATH**: `/api/v1/stream`
- **AUTHENTICATION**: Bearer Token (or Query Token for EventSource)
- **REQUEST**: Header `Accept: text/event-stream`
- **RESPONSE**:
  - `200 OK` (Stream): `text/event-stream`
    ```text
    event: source_pulse
    data: {"event_id": "pulse-101", "type": "source_pulse", "timestamp": "2026-09-01T16:45:00Z", "latency_ms": 14}

    event: hypothesis_updated
    data: {"type": "hypothesis_updated", "hypothesis_id": "hyp-56987", "evidence_score": 88.4}
    ```
- **DATABASE DEPENDENCY**: Listens for state mutations or queries recent timeline events.
- **MODEL DEPENDENCY**: Periodic heartbeat status.
- **EXTERNAL API DEPENDENCY**: None.
- **ERROR CASES**:
  - `401 Unauthorized`: Invalid SSE connection token.

---

### Endpoint 17: Deep Space AI Assistant Query (Gemini Proxy)

- **METHOD**: `POST`
- **PATH**: `/api/v1/assistant/query`
- **AUTHENTICATION**: Bearer Token
- **REQUEST**:
  ```json
  {
    "prompt": "What causes reaction wheel bearing micro-vibrations in GEO communications satellites?",
    "conversation_history": [
      { "role": "user", "text": "Hello Nebulon" },
      { "role": "assistant", "text": "Greetings, Operator." }
    ],
    "model": "gemini-3.7-flash",
    "temperature": 0.4
  }
  ```
- **RESPONSE**:
  - `200 OK`:
    ```json
    {
      "response": "Micro-vibrations in GEO satellite reaction wheels are predominantly induced by bearing cage instability...",
      "model_used": "gemini-3.7-flash",
      "latency_ms": 412,
      "suggestions": [
        "What are the thermal impacts during lunar eclipse passes?",
        "How is momentum desaturation performed using magnetorquers?",
        "What are the telemetry signatures of bearing lubricant degradation?"
      ]
    }
    ```
- **DATABASE DEPENDENCY**: Calls `db.save_assistant_chat(...)`.
- **MODEL DEPENDENCY**: None directly (delegated to Gemini API).
- **EXTERNAL API DEPENDENCY**: Secure server-to-server HTTP call to Google Gemini API (`generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent`).
- **AI REQUIREMENTS & CONSTRAINTS**:
  - Enforces system instruction (`NASA 2070 / JARVIS` persona).
  - Enforces plain Unicode math notation directive (strictly forbids LaTeX `$$...$$` or `\frac{}{}`).
  - Extracts follow-up suggestions (`FOLLOW_UP_SUGGESTIONS: ...`).
  - Implements automatic failover retry with backoff and model fallback (`gemini-3.7-flash` -> `gemini-3.6-flash`).
- **ERROR CASES**:
  - `400 Bad Request`: Empty prompt text.
  - `502 Bad Gateway`: External Gemini API network/auth error.
