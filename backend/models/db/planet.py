from sqlalchemy import Column, Integer, String, Float, DateTime
from backend.database.base import Base


class Planet(Base):
    __tablename__ = "planet"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    planet_type = Column(String(50), nullable=True)
    mass = Column(Float, nullable=True)
    radius = Column(Float, nullable=True)
    distance_from_star = Column(Float, nullable=True)
    orbital_period = Column(Float, nullable=True)
    created_at = Column(DateTime, nullable=True)