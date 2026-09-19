from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from datetime import datetime, timezone
from backend.database.base import Base

class SessionToken(Base):
    __tablename__ = "session_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    token = Column(String(256), unique=True, nullable=False)
    member_id = Column(String(64), ForeignKey("authorized_members.member_id"), nullable=False)
    step1_verified = Column(Boolean, default=False)
    step2_verified = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
