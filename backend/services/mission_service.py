from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status

from backend.repositories.base_mission_repository import BaseMissionRepository
from backend.services.base_nebula_engine import BaseNebulaEngine
from backend.schemas.mission_schemas import (
    MissionEventSchema, WorkspaceResponse, HypothesisSchema,
    ObservationOpportunitySchema, TimelineItemSchema,
    ReviewCreateRequest, ReviewResponse, SourceHealthResponse
)

ALLOWED_DECISIONS = {
    "verified by source",
    "refuted by conflict",
    "needs additional observation",
    "verified by reviewer",
    "verified",
    "refuted"
}

class MissionService:
    def __init__(self, repo: BaseMissionRepository, engine: BaseNebulaEngine):
        self.repo = repo
        self.engine = engine

    async def get_all_missions(self) -> List[MissionEventSchema]:
        """Returns all mission workspace events."""
        missions = await self.repo.get_missions()
        return [MissionEventSchema(**m) for m in missions]

    async def get_workspace(self, mission_id: Optional[str] = None) -> WorkspaceResponse:
        """Returns workspace summary for specified mission_id or default active mission."""
        target_id = mission_id or "transporter-8-ambiguity"
        workspace_data = await self.repo.get_workspace_data(target_id)

        if not workspace_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Mission workspace '{target_id}' not found."
            )

        workspace_data["hypotheses"] = self.engine.evaluate_hypotheses(workspace_data["hypotheses"])
        return WorkspaceResponse(**workspace_data)

    async def get_hypotheses(self, mission_id: Optional[str] = None) -> List[HypothesisSchema]:
        """Returns hypotheses candidate ranking list for specified mission."""
        target_id = mission_id or "transporter-8-ambiguity"

        if mission_id:
            mission = await self.repo.get_mission_by_id(mission_id)
            if not mission:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Mission '{mission_id}' not found."
                )

        raw_hypotheses = await self.repo.get_hypotheses_by_mission(target_id)
        evaluated = self.engine.evaluate_hypotheses(raw_hypotheses)
        return [HypothesisSchema(**h) for h in evaluated]

    async def get_hypothesis_evidence(self, hypothesis_id: str) -> List[TimelineItemSchema]:
        """Returns supporting evidence timeline for specific hypothesis."""
        evidence = await self.repo.get_hypothesis_evidence(hypothesis_id)
        if evidence is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Hypothesis '{hypothesis_id}' not found."
            )
        return [TimelineItemSchema(**e) for e in evidence]

    async def get_observation_opportunities(self, mission_id: Optional[str] = None) -> List[ObservationOpportunitySchema]:
        """Returns ground station observation opportunities."""
        target_id = mission_id or "transporter-8-ambiguity"
        opps = await self.repo.get_opportunities_by_mission(target_id)
        return [ObservationOpportunitySchema(**o) for o in opps]

    async def get_timeline(self, mission_id: Optional[str] = None, limit: int = 50, kind: Optional[str] = None) -> List[TimelineItemSchema]:
        """Returns evidence ledger timeline items with optional filtering."""
        target_limit = min(max(1, limit), 200)
        items = await self.repo.get_timeline_events(mission_id=mission_id, limit=target_limit, kind=kind)
        return [TimelineItemSchema(**item) for item in items]

    async def record_review(
        self,
        hypothesis_id: str,
        request: ReviewCreateRequest,
        current_member: Dict[str, Any]
    ) -> ReviewResponse:
        """Records human verification decision on target hypothesis."""
        target_hyp_id = hypothesis_id or request.hypothesis_id
        if not target_hyp_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hypothesis ID must be provided."
            )

        # Decision validation
        clean_dec = request.decision.strip().lower()
        if clean_dec not in ALLOWED_DECISIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid decision '{request.decision}'. Allowed decisions: {list(ALLOWED_DECISIONS)}"
            )

        # Reviewer title construction
        member_data = current_member.get("member", {})
        reviewer_name = request.reviewer or f"{member_data.get('callsign', 'Ada Reyes')} · {member_data.get('role', 'Senior Operator')}"

        try:
            res_dict = await self.repo.add_review_record(
                hypothesis_id=target_hyp_id,
                reviewer=reviewer_name,
                decision=request.decision,
                notes=request.notes or ""
            )
            return ReviewResponse(**res_dict)
        except ValueError as ve:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(ve)
            )

    async def get_sources_health(self) -> SourceHealthResponse:
        """Returns data stream ingest health metrics."""
        health_dict = await self.repo.get_sources_health()
        return SourceHealthResponse(**health_dict)

    async def get_model_status(self) -> Dict[str, Any]:
        """Returns AI/ML model status metrics from Nebula engine."""
        return self.engine.get_model_status_metrics()
