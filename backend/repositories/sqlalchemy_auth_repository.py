from typing import Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.repositories.base_repository import BaseAuthRepository
from backend.models.db.system_clearance import SystemClearance
from backend.models.db.user import User
from backend.models.db.session_token import SessionToken

class SQLAlchemyAuthRepository(BaseAuthRepository):
    """
    SQLAlchemy-backed Authentication & Operator Session Repository targeting SQLite database.
    Replaces in-memory MockAuthRepository for production persistence across backend restarts.
    """

    def __init__(self, db_session: Session):
        self.db = db_session

    async def get_system_clearance(self, system_key_name: str) -> Optional[Dict[str, Any]]:
        clean_key = (system_key_name or "").strip().lower()
        # Query case-insensitively or exact match
        record = self.db.query(SystemClearance).filter(
            SystemClearance.system_key_name.ilike(clean_key)
        ).first()

        if not record:
            return None

        return {
            "system_key_name": record.system_key_name,
            "password": record.access_cipher_hash,
            "security_level": record.security_level
        }

    async def get_authorized_member(self, member_id: str) -> Optional[Dict[str, Any]]:
        clean_id = (member_id or "").strip().lower()
        user = self.db.query(User).filter(
            User.member_id.ilike(clean_id)
        ).first()

        if not user or not user.is_active:
            return None

        return {
            "member_id": user.member_id,
            "callsign": user.callsign,
            "password": user.password_hash,
            "role": user.role,
            "clearance_badge": user.clearance_badge,
            "ground_segment": user.ground_segment,
            "is_active": user.is_active
        }

    async def create_session(self, token: str, member_id: str, step1_verified: bool, step2_verified: bool, expires_at: datetime) -> Dict[str, Any]:
        if expires_at.tzinfo is not None:
            expires_at = expires_at.astimezone(timezone.utc).replace(tzinfo=None)

        # Remove existing session with same token if present
        self.db.query(SessionToken).filter(SessionToken.token == token).delete()

        sess = SessionToken(
            token=token,
            member_id=member_id,
            step1_verified=step1_verified,
            step2_verified=step2_verified,
            expires_at=expires_at,
            created_at=datetime.now(timezone.utc).replace(tzinfo=None)
        )
        self.db.add(sess)
        self.db.commit()
        self.db.refresh(sess)

        return {
            "token": sess.token,
            "member_id": sess.member_id,
            "step1_verified": sess.step1_verified,
            "step2_verified": sess.step2_verified,
            "expires_at": sess.expires_at,
            "created_at": sess.created_at
        }

    async def get_session(self, token: str) -> Optional[Dict[str, Any]]:
        sess = self.db.query(SessionToken).filter(SessionToken.token == token).first()
        if not sess:
            return None

        now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
        sess_exp = sess.expires_at
        if sess_exp.tzinfo is not None:
            sess_exp = sess_exp.astimezone(timezone.utc).replace(tzinfo=None)

        if sess_exp < now_naive:
            self.db.delete(sess)
            self.db.commit()
            return None

        return {
            "token": sess.token,
            "member_id": sess.member_id,
            "step1_verified": sess.step1_verified,
            "step2_verified": sess.step2_verified,
            "expires_at": sess.expires_at,
            "created_at": sess.created_at
        }

    async def revoke_session(self, token: str) -> bool:
        sess = self.db.query(SessionToken).filter(SessionToken.token == token).first()
        if sess:
            self.db.delete(sess)
            self.db.commit()
            return True
        return False
