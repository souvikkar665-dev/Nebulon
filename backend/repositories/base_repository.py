from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from datetime import datetime

class BaseAuthRepository(ABC):
    """
    Abstract Base Class for Authentication Repository.
    This interface defines the exact data access layer required by the FastAPI application.
    The database teammate will implement this class (e.g., PostgresAuthRepository) to replace
    the temporary MockAuthRepository without modifying any API routes or service business logic.
    """

    @abstractmethod
    async def get_system_clearance(self, system_key_name: str) -> Optional[Dict[str, Any]]:
        """Fetch system clearance credentials by system_key_name or UID."""
        pass

    @abstractmethod
    async def get_authorized_member(self, member_id: str) -> Optional[Dict[str, Any]]:
        """Fetch authorized operator profile by member_id."""
        pass

    @abstractmethod
    async def create_session(self, token: str, member_id: str, step1_verified: bool, step2_verified: bool, expires_at: datetime) -> Dict[str, Any]:
        """Store active operator session token."""
        pass

    @abstractmethod
    async def get_session(self, token: str) -> Optional[Dict[str, Any]]:
        """Retrieve active session by token."""
        pass

    @abstractmethod
    async def revoke_session(self, token: str) -> bool:
        """Revoke/delete an active operator session token."""
        pass
