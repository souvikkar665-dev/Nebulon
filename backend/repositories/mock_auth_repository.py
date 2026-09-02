from typing import Optional, Dict, Any
from datetime import datetime, timezone
from backend.repositories.base_repository import BaseAuthRepository

class MockAuthRepository(BaseAuthRepository):
    """
    Temporary Isolated In-Memory Mock Authentication Repository.
    Contains fixed credentials matching backend/database/seed.sql and frontend/js/authentication.js.
    Easily replaceable by PostgresAuthRepository without altering FastAPI routes or services.
    """

    def __init__(self):
        # Valid Step 1 System Clearance Credentials
        self._system_clearances = {
            "nebulon": {"system_key_name": "nebulon", "password": "nebulon@2070", "security_level": "LEVEL_5_OMEGA"},
            "nebulon-admin": {"system_key_name": "nebulon-admin", "password": "nebulon@2070", "security_level": "LEVEL_5_OMEGA"},
            "nebulon-2070": {"system_key_name": "nebulon-2070", "password": "nebulon-omega-2070", "security_level": "LEVEL_5_OMEGA"},
            "nebulon_core": {"system_key_name": "nebulon_core", "password": "nebulon@2070", "security_level": "LEVEL_5_OMEGA"},
            "nebulon-system": {"system_key_name": "nebulon-system", "password": "ULTRON-OMEGA-2070", "security_level": "LEVEL_5_OMEGA"},
            "admin": {"system_key_name": "admin", "password": "nebulon@2070", "security_level": "LEVEL_5_OMEGA"}
        }

        # Valid Step 2 Authorized Operators (4 Fixed Team Members)
        self._members = {
            "souvik": {
                "member_id": "souvik",
                "callsign": "Souvik Kar",
                "password": "souvik@2070",
                "role": "Mission Director & Orbital Architect",
                "clearance_badge": "OMEGA-DIRECTOR",
                "ground_segment": "Svalbard Polar Primary (GS-142)",
                "is_active": True
            },
            "debangshu": {
                "member_id": "debangshu",
                "callsign": "Debangshu",
                "password": "debangshu@2070",
                "role": "Lead Spacecraft Telemetry Analyst",
                "clearance_badge": "ALPHA-ANALYST",
                "ground_segment": "Hawaii Pacific Deep Space (GS-088)",
                "is_active": True
            },
            "sneha": {
                "member_id": "sneha",
                "callsign": "Sneha Maiti",
                "password": "sneha@2070",
                "role": "Ground Station Network Commander",
                "clearance_badge": "SIGMA-COMMANDER",
                "ground_segment": "Hartebeesthoek Southern Array (GS-044)",
                "is_active": True
            },
            "adrika": {
                "member_id": "adrika",
                "callsign": "Adrika",
                "password": "adrika@2070",
                "role": "Quantum RF & Doppler Specialist",
                "clearance_badge": "DELTA-SPECIALIST",
                "ground_segment": "Kiruna Arctic Ground Segment (GS-204)",
                "is_active": True
            }
        }

        # Active in-memory session token store (token_string -> session_dict)
        self._active_sessions: Dict[str, Dict[str, Any]] = {}

    async def get_system_clearance(self, system_key_name: str) -> Optional[Dict[str, Any]]:
        clean_key = (system_key_name or "").strip().lower()
        return self._system_clearances.get(clean_key)

    async def get_authorized_member(self, member_id: str) -> Optional[Dict[str, Any]]:
        clean_id = (member_id or "").strip().lower()
        return self._members.get(clean_id)

    async def create_session(self, token: str, member_id: str, step1_verified: bool, step2_verified: bool, expires_at: datetime) -> Dict[str, Any]:
        # Normalize expires_at to timezone-aware UTC
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        session_data = {
            "token": token,
            "member_id": member_id,
            "step1_verified": step1_verified,
            "step2_verified": step2_verified,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        }
        self._active_sessions[token] = session_data
        return session_data

    async def get_session(self, token: str) -> Optional[Dict[str, Any]]:
        session = self._active_sessions.get(token)
        if not session:
            return None

        # Expiry check against UTC
        now_utc = datetime.now(timezone.utc)
        sess_exp = session["expires_at"]
        if sess_exp.tzinfo is None:
            sess_exp = sess_exp.replace(tzinfo=timezone.utc)

        if sess_exp < now_utc:
            del self._active_sessions[token]
            return None

        return session

    async def revoke_session(self, token: str) -> bool:
        if token in self._active_sessions:
            del self._active_sessions[token]
            return True
        return False

# Global Singleton Instance for Mock Auth Repository
_mock_repo = MockAuthRepository()

def get_auth_repository() -> BaseAuthRepository:
    """Dependency Injection provider for Auth Repository."""
    return _mock_repo
