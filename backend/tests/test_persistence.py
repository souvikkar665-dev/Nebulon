import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from backend.app import app
from backend.database.connection import SessionLocal, init_db
from backend.models.db.user import User
from backend.models.db.session_token import SessionToken
from backend.models.db.review import Review
from backend.repositories.sqlalchemy_auth_repository import SQLAlchemyAuthRepository
from backend.repositories.sqlalchemy_mission_repository import SQLAlchemyMissionRepository

client = TestClient(app)

def test_database_initialization_and_seeding():
    """Verify SQLite database auto-seeds system clearances and authorized members."""
    init_db()
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        assert user_count >= 4

        souvik = db.query(User).filter(User.member_id == "souvik").first()
        assert souvik is not None
        assert souvik.callsign == "Souvik Kar"
        assert souvik.role == "Mission Director & Orbital Architect"
    finally:
        db.close()

def test_auth_session_persistence_across_restarts():
    """Verify authentication tokens persist in SQLite and survive repository reinstantiation."""
    init_db()
    db1 = SessionLocal()
    repo1 = SQLAlchemyAuthRepository(db1)

    token = "persistent-token-test-12345"
    exp = datetime.now(timezone.utc) + timedelta(hours=8)

    # Store session in repo1
    import asyncio
    sess = asyncio.run(repo1.create_session(token, "souvik", True, True, exp))
    assert sess["token"] == token
    db1.close()

    # Simulate backend restart with a new independent database connection
    db2 = SessionLocal()
    repo2 = SQLAlchemyAuthRepository(db2)
    try:
        fetched = asyncio.run(repo2.get_session(token))
        assert fetched is not None
        assert fetched["member_id"] == "souvik"
        assert fetched["step1_verified"] is True
        assert fetched["step2_verified"] is True

        # Test session revocation
        revoked = asyncio.run(repo2.revoke_session(token))
        assert revoked is True

        fetched_after = asyncio.run(repo2.get_session(token))
        assert fetched_after is None
    finally:
        db2.close()

def test_review_persistence_across_restarts():
    """Verify operator review submissions are written to SQLite and survive backend restarts."""
    init_db()
    db1 = SessionLocal()
    mission_repo1 = SQLAlchemyMissionRepository(db1)

    import asyncio
    review_res = asyncio.run(mission_repo1.add_review_record(
        hypothesis_id="hyp-56987",
        reviewer="Souvik Kar · Mission Director",
        decision="Verified by source",
        notes="Doppler waterfall confirms NORAD 56987 telemetry alignment."
    ))

    req_id = review_res["request_id"]
    assert req_id.startswith("REV-")
    assert review_res["resulting_state"] == "VERIFIED_PERMANENT"
    db1.close()

    # Simulate backend restart with fresh database session
    db2 = SessionLocal()
    try:
        saved_review = db2.query(Review).filter(Review.request_id == req_id).first()
        assert saved_review is not None
        assert saved_review.hypothesis_id == "hyp-56987"
        assert saved_review.reviewer == "Souvik Kar · Mission Director"
        assert saved_review.decision == "Verified by source"
        assert saved_review.resulting_state == "VERIFIED_PERMANENT"
    finally:
        db2.close()

def test_full_auth_and_review_api_flow():
    """Verify full end-to-end API login, auth token usage, and review submission."""
    # Step 1
    s1_res = client.post("/api/v1/auth/verify-step1", json={"system_uid": "nebulon", "system_password": "nebulon@2070"})
    assert s1_res.status_code == 200
    s1_token = s1_res.json()["step1_token"]

    # Step 2
    s2_res = client.post("/api/v1/auth/verify-step2", json={"member_id": "sneha", "password": "sneha@2070", "step1_token": s1_token})
    assert s2_res.status_code == 200
    access_token = s2_res.json()["access_token"]

    # Auth Me
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me_res.status_code == 200
    assert me_res.json()["member"]["id"] == "sneha"

    # Submit Review via API
    rev_res = client.post(
        "/api/v1/hypotheses/hyp-56987/reviews",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "decision": "Verified by source",
            "notes": "Ground station GS-044 confirmed beacon frequency match."
        }
    )
    assert rev_res.status_code == 200
    assert rev_res.json()["success"] is True
