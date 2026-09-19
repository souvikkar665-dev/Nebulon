import secrets
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.repositories.base_mission_repository import BaseMissionRepository
from backend.repositories.mock_mission_repository import _mock_mission_repo, MockMissionRepository
from backend.models.db.review import Review

class SQLAlchemyMissionRepository(BaseMissionRepository):
    """
    SQLAlchemy-backed Mission Repository wrapper targeting SQLite database.
    Persists operator verification review entries to SQLite while maintaining
    compatibility with mission, telemetry, hypothesis, and simulation datasets.
    """

    def __init__(self, db_session: Session, mock_repo: Optional[MockMissionRepository] = None):
        self.db = db_session
        self.delegate = mock_repo or _mock_mission_repo

    async def get_missions(self) -> List[Dict[str, Any]]:
        return await self.delegate.get_missions()

    async def get_mission_by_id(self, mission_id: str) -> Optional[Dict[str, Any]]:
        return await self.delegate.get_mission_by_id(mission_id)

    async def get_hypotheses_by_mission(self, mission_id: str) -> List[Dict[str, Any]]:
        return await self.delegate.get_hypotheses_by_mission(mission_id)

    async def get_hypothesis_by_id(self, hypothesis_id: str) -> Optional[Dict[str, Any]]:
        return await self.delegate.get_hypothesis_by_id(hypothesis_id)

    async def get_hypothesis_evidence(self, hypothesis_id: str) -> Optional[List[Dict[str, Any]]]:
        return await self.delegate.get_hypothesis_evidence(hypothesis_id)

    async def get_opportunities_by_mission(self, mission_id: str) -> List[Dict[str, Any]]:
        return await self.delegate.get_opportunities_by_mission(mission_id)

    async def get_timeline_events(self, mission_id: Optional[str] = None, limit: int = 50, kind: Optional[str] = None) -> List[Dict[str, Any]]:
        return await self.delegate.get_timeline_events(mission_id=mission_id, limit=limit, kind=kind)

    async def add_review_record(self, hypothesis_id: str, reviewer: str, decision: str, notes: str) -> Dict[str, Any]:
        # Perform target hypothesis lookup & status update via delegate
        hyp = await self.delegate.get_hypothesis_by_id(hypothesis_id)
        if not hyp:
            raise ValueError(f"Hypothesis '{hypothesis_id}' not found.")

        req_id = "REV-" + secrets.token_hex(4).upper()
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        dec_clean = decision.lower()
        if "verified" in dec_clean or "confirm" in dec_clean:
            resulting_state = "VERIFIED_PERMANENT"
            hyp["status"] = "verified"
            hyp["evidence_score"] = min(99.9, hyp["evidence_score"] + 10.0)
            msg = f"Verification recorded. Spacecraft identity bound to {hyp['tracked_object']}."
        elif "reject" in dec_clean or "debris" in dec_clean:
            resulting_state = "REJECTED_DEBRIS"
            hyp["status"] = "rejected"
            hyp["evidence_score"] = 5.0
            msg = f"Rejection recorded. Object {hyp['tracked_object']} classified as non-target debris."
        else:
            resulting_state = "PENDING_OBSERVATION"
            hyp["status"] = "review_required"
            msg = f"Review noted. Additional pass observation queued for {hyp['tracked_object']}."

        # Save persistently to SQLite database
        review_db = Review(
            request_id=req_id,
            hypothesis_id=hypothesis_id,
            reviewer=reviewer,
            decision=decision,
            resulting_state=resulting_state,
            notes=notes or "",
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(review_db)
        self.db.commit()
        self.db.refresh(review_db)

        review_entry = {
            "request_id": req_id,
            "hypothesis_id": hypothesis_id,
            "reviewer": reviewer,
            "decision": decision,
            "notes": notes,
            "resulting_state": resulting_state,
            "timestamp": now_str,
            "message": msg
        }

        # Also store in delegate reviews for memory consistency
        self.delegate._reviews.append(review_entry)

        audit_event = {
            "id": "ev-rev-" + req_id.lower(),
            "time": now_str,
            "kind": "review_audit",
            "source": "Human Verification Arbiter",
            "source_badge": "VERIFICATION",
            "title": f"Verification decision committed by {reviewer}",
            "detail": f"Decision: {decision}. State: {resulting_state}. Notes: {notes or 'None'}",
            "provenance": {
                "source_url": f"https://nebulon.nasa.gov/audit/{req_id}",
                "record_id": req_id,
                "parser_version": "nebulon-audit-v1.0",
                "freshness_seconds": 0,
                "is_contradiction": False
            }
        }
        default_timeline = self.delegate._timeline.get("transporter-8-ambiguity", [])
        default_timeline.insert(0, audit_event)

        return review_entry

    async def advance_replay(self, mission_id: str, step: int = 1) -> Dict[str, Any]:
        return await self.delegate.advance_replay(mission_id, step)

    async def inject_contradiction(self, mission_id: str, target_object: str, drift_khz: float) -> Dict[str, Any]:
        return await self.delegate.inject_contradiction(mission_id, target_object, drift_khz)

    async def get_sources_health(self) -> Dict[str, Any]:
        return await self.delegate.get_sources_health()

    async def get_workspace_data(self, mission_id: str) -> Optional[Dict[str, Any]]:
        return await self.delegate.get_workspace_data(mission_id)
