from pydantic import BaseModel
from typing import Optional


class UserBase(BaseModel):
    member_id: str
    callsign: str
    role: str
    clearance_badge: str
    ground_segment: str


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True