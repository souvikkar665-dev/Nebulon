from typing import Optional
from pydantic import BaseModel, Field

class Step1VerifyRequest(BaseModel):
    system_uid: str = Field(..., description="Master system user ID")
    system_password: str = Field(..., description="Master system password")
    remember_device: Optional[bool] = Field(True, description="Remember device flag")

class Step1VerifyResponse(BaseModel):
    success: bool = True
    step1_token: str = Field(..., description="Temporary Step 1 Clearance JWT Token")
    expires_at: str = Field(..., description="ISO 8601 UTC timestamp of token expiration")
    message: str = "Step 1 System Clearance Verified"

class Step2VerifyRequest(BaseModel):
    member_id: str = Field(..., description="Authorized team member ID (souvik, debangshu, sneha, arunima)")
    password: str = Field(..., description="Member access password")
    step1_token: Optional[str] = Field(None, description="Optional Step 1 clearance token in body if not in header")

class MemberInfo(BaseModel):
    id: str
    name: str
    role: str
    badge: str
    ground_segment: str
    station: Optional[str] = None

    def __init__(self, **data):
        if "station" not in data or not data["station"]:
            data["station"] = data.get("ground_segment", "")
        super().__init__(**data)

class Step2VerifyResponse(BaseModel):
    success: bool = True
    access_token: str = Field(..., description="Authenticated Operator Session Bearer JWT Token")
    token_type: str = "Bearer"
    expires_at: str = Field(..., description="ISO 8601 UTC timestamp of session expiration")
    member: MemberInfo

class AuthMeResponse(BaseModel):
    authenticated: bool = True
    member: MemberInfo

class LogoutResponse(BaseModel):
    success: bool = True
    message: str = "Session revoked successfully."

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
