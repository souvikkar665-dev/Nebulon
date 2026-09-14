from pydantic import BaseModel


class LoginRequest(BaseModel):
    member_id: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"