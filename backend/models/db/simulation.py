from sqlalchemy import Column, Integer, String, Text, DateTime
from backend.database.base import Base


class Simulation(Base):
    __tablename__ = "simulation"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="saved")
    parameters = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)