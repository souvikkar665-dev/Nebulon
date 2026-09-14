from pydantic import BaseModel
from typing import Optional


class SimulationBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: Optional[str] = "saved"
    parameters: Optional[str] = None


class SimulationCreate(SimulationBase):
    pass


class SimulationResponse(SimulationBase):
    id: int

    class Config:
        from_attributes = True