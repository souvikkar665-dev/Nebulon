from typing import Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import HTTPException, status

from backend.repositories.base_repository import BaseAuthRepository
from backend.auth import (
    verify_password, create_step1_token, create_access_token, decode_token
)
from backend.schemas.auth_schemas import (
    Step1VerifyRequest, Step1VerifyResponse,
    Step2VerifyRequest, Step2VerifyResponse,
    MemberInfo, AuthMeResponse, LogoutResponse
)

class AuthService:
    def __init__(self, repo: BaseAuthRepository):
        self.repo = repo

    async def verify_step1(self, request: Step1VerifyRequest) -> Step1VerifyResponse:
        """Process Step 1 System Clearance Verification."""
        clean_uid = request.system_uid.strip().lower()
        clearance = await self.repo.get_system_clearance(clean_uid)

        if not clearance:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid System User ID or System Clearance Key."
            )

        if not verify_password(request.system_password, clearance["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid System Access Cipher / Password."
            )

        token, expires_at = create_step1_token(clean_uid)
        return Step1VerifyResponse(
            success=True,
            step1_token=token,
            expires_at=expires_at,
            message="Step 1 System Clearance Verified"
        )

    async def verify_step2(self, request: Step2VerifyRequest, header_step1_token: Optional[str] = None) -> Step2VerifyResponse:
        """Process Step 2 Member Operator Authorization & Login."""
        step1_token = request.step1_token or header_step1_token

        if not step1_token:
            pass
        else:
            payload = decode_token(step1_token)
            if payload.get("type") != "step1_clearance":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Step 1 Clearance Token."
                )

        clean_id = request.member_id.strip().lower()
        member = await self.repo.get_authorized_member(clean_id)

        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Authorized operator profile '{request.member_id}' not found."
            )

        if not member.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Operator account is currently inactive."
            )

        if not verify_password(request.password, member["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid member access password."
            )

        access_token, expires_at_str = create_access_token(clean_id)

        # Calculate expiry datetime for DB session persistence
        exp_payload = decode_token(access_token)
        exp_ts = exp_payload.get("exp")
        exp_dt = datetime.fromtimestamp(exp_ts, tz=timezone.utc) if exp_ts else datetime.now(timezone.utc)

        await self.repo.create_session(
            token=access_token,
            member_id=clean_id,
            step1_verified=True,
            step2_verified=True,
            expires_at=exp_dt
        )

        member_info = MemberInfo(
            id=member["member_id"],
            name=member["callsign"],
            role=member["role"],
            badge=member["clearance_badge"],
            ground_segment=member["ground_segment"],
            station=member["ground_segment"]
        )

        return Step2VerifyResponse(
            success=True,
            access_token=access_token,
            token_type="Bearer",
            expires_at=expires_at_str,
            member=member_info
        )

    async def get_me(self, current_active_user: Dict[str, Any]) -> AuthMeResponse:
        """Returns the authenticated member's profile."""
        member = current_active_user["member"]
        member_info = MemberInfo(
            id=member["member_id"],
            name=member["callsign"],
            role=member["role"],
            badge=member["clearance_badge"],
            ground_segment=member["ground_segment"],
            station=member["ground_segment"]
        )
        return AuthMeResponse(
            authenticated=True,
            member=member_info
        )

    async def logout(self, current_active_user: Dict[str, Any]) -> LogoutResponse:
        """Revokes the current member's session token."""
        token = current_active_user["token"]
        await self.repo.revoke_session(token)
        return LogoutResponse(
            success=True,
            message="Session revoked successfully."
        )
