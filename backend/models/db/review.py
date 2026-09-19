from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime, timezone
from backend.database.base import Base

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(64), unique=True, nullable=False)
    hypothesis_id = Column(String(64), nullable=False)
    reviewer = Column(String(128), nullable=False)
    decision = Column(String(64), nullable=False)
    resulting_state = Column(String(64), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
