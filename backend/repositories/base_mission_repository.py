from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any

class BaseMissionRepository(ABC):
    """
    Abstract Base Class for Mission Workspaces, Hypotheses, Evidence & Reviews Repository.
    This interface defines the exact data access layer required by the FastAPI application.
    The database teammate will implement this class (e.g. PostgresMissionRepository) to replace
    the temporary MockMissionRepository without modifying any API routes or service business logic.
    """

    @abstractmethod
    async def get_missions(self) -> List[Dict[str, Any]]:
        """Fetch list of all mission workspace events."""
        pass

    @abstractmethod
    async def get_mission_by_id(self, mission_id: str) -> Optional[Dict[str, Any]]:
        """Fetch single mission event details by mission_id."""
        pass

    @abstractmethod
    async def get_hypotheses_by_mission(self, mission_id: str) -> List[Dict[str, Any]]:
        """Fetch candidate hypotheses for a given mission_id."""
        pass

    @abstractmethod
    async def get_hypothesis_by_id(self, hypothesis_id: str) -> Optional[Dict[str, Any]]:
        """Fetch single hypothesis by hypothesis_id across all missions."""
        pass

    @abstractmethod
    async def get_hypothesis_evidence(self, hypothesis_id: str) -> Optional[List[Dict[str, Any]]]:
        """Fetch supporting evidence timeline items for a specific hypothesis_id."""
        pass

    @abstractmethod
    async def get_opportunities_by_mission(self, mission_id: str) -> List[Dict[str, Any]]:
        """Fetch observation opportunities for a given mission_id."""
        pass

    @abstractmethod
    async def get_timeline_events(self, mission_id: Optional[str] = None, limit: int = 50, kind: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch chronological evidence timeline items with limit and kind filtering."""
        pass

    @abstractmethod
    async def add_review_record(self, hypothesis_id: str, reviewer: str, decision: str, notes: str) -> Dict[str, Any]:
        """Record human verification review decision, update hypothesis status, and log audit event."""
        pass

    @abstractmethod
    async def advance_replay(self, mission_id: str, step: int = 1) -> Dict[str, Any]:
        """Advance simulation timeline by step count."""
        pass

    @abstractmethod
    async def inject_contradiction(self, mission_id: str, target_object: str, drift_khz: float) -> Dict[str, Any]:
        """Simulate an anomaly contradiction event for a target object."""
        pass

    @abstractmethod
    async def get_sources_health(self) -> Dict[str, Any]:
        """Fetch data stream ingest health metrics."""
        pass

    @abstractmethod
    async def get_workspace_data(self, mission_id: str) -> Optional[Dict[str, Any]]:
        """Fetch full workspace composite data for a given mission_id."""
        pass
