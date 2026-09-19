from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime, timezone
from backend.database.base import Base

class SystemClearance(Base):
    __tablename__ = "system_clearance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    system_key_name = Column(String(64), unique=True, nullable=False)
    access_cipher_hash = Column(String(128), nullable=False)
    security_level = Column(String(32), default="LEVEL_5_OMEGA")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
