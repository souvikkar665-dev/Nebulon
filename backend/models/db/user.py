from sqlalchemy import Column, Integer, String, Boolean, DateTime
from backend.database.base import Base


class User(Base):
    __tablename__ = "authorized_members"

    id = Column(Integer, primary_key=True, autoincrement=True)
    member_id = Column(String, unique=True, nullable=False)
    callsign = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    clearance_badge = Column(String, nullable=False)
    ground_segment = Column(String, nullable=False)
    last_login = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, nullable=False)