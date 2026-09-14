from pydantic import BaseModel
from typing import Optional


class PlanetBase(BaseModel):
    name: str
    planet_type: Optional[str] = None
    mass: Optional[float] = None
    radius: Optional[float] = None
    distance_from_star: Optional[float] = None
    orbital_period: Optional[float] = None


class PlanetCreate(PlanetBase):
    pass


class PlanetResponse(PlanetBase):
    id: int

    class Config:
        from_attributes = True