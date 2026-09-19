from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, Depends, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from sqlalchemy.orm import Session

from backend.config import settings
from backend.database.connection import get_db, init_db
from backend.repositories import get_auth_repository, get_mission_repository
from backend.repositories.base_repository import BaseAuthRepository
from backend.repositories.base_mission_repository import BaseMissionRepository
from backend.services.auth_service import AuthService
from backend.services.mission_service import MissionService
from backend.services.stream_service import StreamService, get_stream_service
from backend.services.assistant_service import AssistantService, get_assistant_service
from backend.services.base_nebula_engine import BaseNebulaEngine, get_nebula_engine
from backend.auth import get_current_active_member
from backend.schemas.auth_schemas import (
    Step1VerifyRequest, Step1VerifyResponse,
    Step2VerifyRequest, Step2VerifyResponse,
    AuthMeResponse, LogoutResponse, ErrorResponse
)
from backend.schemas.mission_schemas import (
    MissionEventSchema, WorkspaceResponse, HypothesisSchema,
    ObservationOpportunitySchema, TimelineItemSchema,
    ReviewCreateRequest, ReviewResponse, SourceHealthResponse
)
from backend.schemas.assistant_schemas import (
    AssistantQueryRequest, AssistantQueryResponse,
    ReplayAdvanceRequest, ReplayAdvanceResponse,
    ContradictionRequest, ContradictionResponse
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

@app.on_event("startup")
def startup_event():
    """Auto-initialize database tables & seed initial data on application startup."""
    init_db()

# Configure CORS Middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Frontend Static Files & Provide Root Redirect
frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
if frontend_dir.exists():
    app.mount("/frontend", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")

    @app.get("/", include_in_schema=False)
    async def serve_root():
        return RedirectResponse(url="/frontend/authentication.html")


# Service Factory Helpers
def get_auth_service(repo: BaseAuthRepository = Depends(get_auth_repository)) -> AuthService:
    return AuthService(repo)

def get_mission_service(
    repo: BaseMissionRepository = Depends(get_mission_repository),
    engine: BaseNebulaEngine = Depends(get_nebula_engine)
) -> MissionService:
    return MissionService(repo, engine)

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "detail": str(exc.detail)}
    )

# --------------------------------------------------------------------------
# PHASE 1 AUTHENTICATION ENDPOINTS
# --------------------------------------------------------------------------

@app.post(
    "/api/v1/auth/verify-step1",
    response_model=Step1VerifyResponse,
    responses={401: {"model": ErrorResponse}},
    tags=["Authentication"],
    summary="Step 1 System Clearance Verification"
)
@app.post("/api/auth/step1", response_model=Step1VerifyResponse, include_in_schema=False)
async def verify_step1(
    request: Step1VerifyRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    return await auth_service.verify_step1(request)


@app.post(
    "/api/v1/auth/verify-step2",
    response_model=Step2VerifyResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    tags=["Authentication"],
    summary="Step 2 Member Operator Authorization & Login"
)
@app.post("/api/auth/step2", response_model=Step2VerifyResponse, include_in_schema=False)
@app.post("/api/login", response_model=Step2VerifyResponse, include_in_schema=False)
async def verify_step2(
    request: Step2VerifyRequest,
    x_step1_token: Optional[str] = Header(None, alias="X-Step1-Token"),
    auth_service: AuthService = Depends(get_auth_service)
):
    return await auth_service.verify_step2(request, header_step1_token=x_step1_token)


@app.get(
    "/api/v1/auth/me",
    response_model=AuthMeResponse,
    responses={401: {"model": ErrorResponse}},
    tags=["Authentication"],
    summary="Get Active Operator Profile"
)
@app.get("/api/auth/me", response_model=AuthMeResponse, include_in_schema=False)
async def get_active_member_profile(
    current_active_user: Dict[str, Any] = Depends(get_current_active_member),
    auth_service: AuthService = Depends(get_auth_service)
):
    return await auth_service.get_me(current_active_user)


@app.post(
    "/api/v1/auth/logout",
    response_model=LogoutResponse,
    responses={401: {"model": ErrorResponse}},
    tags=["Authentication"],
    summary="Log Out Active Operator Session"
)
@app.post("/api/logout", response_model=LogoutResponse, include_in_schema=False)
async def logout(
    current_active_user: Dict[str, Any] = Depends(get_current_active_member),
    auth_service: AuthService = Depends(get_auth_service)
):
    return await auth_service.logout(current_active_user)


# --------------------------------------------------------------------------
# PHASE 2 MISSION WORKSPACES & HYPOTHESES ENDPOINTS
# --------------------------------------------------------------------------

@app.get(
    "/api/v1/mission-events",
    response_model=List[MissionEventSchema],
    responses={401: {"model": ErrorResponse}},
    tags=["Missions"],
    summary="Get All Mission Events Workspaces"
)
async def get_mission_events(
    current_active_user: Dict[str, Any] = Depends(get_current_active_member),
    mission_service: MissionService = Depends(get_mission_service)
):
    return await mission_service.get_all_missions()


@app.get(
    "/api/v1/mission-events/{mission_id}/workspace",
    response_model=WorkspaceResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    tags=["Missions"],
    summary="Get Workspace Summary for a Mission"
)
@app.get("/api/case", response_model=WorkspaceResponse, include_in_schema=False)
async def get_mission_workspace(
    mission_id: Optional[str] = "transporter-8-ambiguity",
    current_active_user: Dict[str, Any] = Depends(get_current_active_member),
    mission_service: MissionService = Depends(get_mission_service)
):
    return await mission_service.get_workspace(mission_id)


@app.get(
    "/api/v1/hypotheses",
    response_model=List[HypothesisSchema],
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    tags=["Hypotheses"],
    summary="Get Candidate Hypotheses Ranking List"
)
@app.get("/api/hypotheses", response_model=List[HypothesisSchema], include_in_schema=False)
async def get_hypotheses(
    mission_id: Optional[str] = None,
    current_active_user: Dict[str, Any] = Depends(get_current_active_member),
    mission_service: MissionService = Depends(get_mission_service)
):
    return await mission_service.get_hypotheses(mission_id)


# --------------------------------------------------------------------------
# PHASE 3 EVIDENCE, OPPORTUNITIES, TIMELINE, REVIEWS, HEALTH & MODELS
# --------------------------------------------------------------------------

@app.get(
    "/api/v1/hypotheses/{hypothesis_id}/evidence",
    response_model=List[TimelineItemSchema],
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    tags=["Hypotheses"],
    summary="Get Evidence Timeline for Specific Hypothesis"
)
async def get_hypothesis_evidence(
    hypothesis_id: str,
    current_active_user: Dict[str, Any] = Depends(get_current_active_member),
    mission_service: MissionService = Depends(get_mission_service)
):
    return await mission_service.get_hypothesis_evidence(hypothesis_id)


@app.get(
    "/api/v1/observation-opportunities",
    response_model=List[ObservationOpportunitySchema],
    responses={401: {"model": ErrorResponse}},
    tags=["Opportunities"],
    summary="Get Ground Station Pass Observation Opportunities"
)
@app.get("/api/opportunities", response_model=List[ObservationOpportunitySchema], include_in_schema=False)
async def get_observation_opportunities(
    mission_id: Optional[str] = None,
    current_active_user: Dict[str, Any] = Depends(get_current_active_member),
    mission_service: MissionService = Depends(get_mission_service)
):
    return await mission_service.get_observation_opportunities(mission_id)


@app.get(
    "/api/v1/timeline",
    response_model=List[TimelineItemSchema],
    responses={401: {"model": ErrorResponse}},
    tags=["Timeline"],
    summary="Get Cryptographic Evidence Timeline Ledger"
)
@app.get("/api/timeline", response_model=List[TimelineItemSchema], include_in_schema=False)
async def get_timeline(
    mission_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200, description="Maximum number of timeline entries"),
    kind: Optional[str] = Query(None, description="Filter by event kind (observation, conflict, tle_update, manifest)"),
    current_active_user: Dict[str, Any] = Depends(get_current_active_member),
    mission_service: MissionService = Depends(get_mission_service)
):
    return await mission_service.get_timeline(mission_id=mission_id, limit=limit, kind=kind)


@app.post(
    "/api/v1/hypotheses/{hypothesis_id}/reviews",
    response_model=ReviewResponse,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    tags=["Reviews"],
    summary="Commit Human Verification Review Decision"
)
@app.post("/api/verify", response_model=ReviewResponse, include_in_schema=False)
async def record_review(
    request: ReviewCreateRequest,
    hypothesis_id: Optional[str] = None,
    current_active_user: Dict[str, Any] = Depends(get_current_active_member),
    mission_service: MissionService = Depends(get_mission_service)
):
    target_hyp_id = hypothesis_id or request.hypothesis_id
    if not target_hyp_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hypothesis ID must be provided in URL path or request body."
        )
    return await mission_service.record_review(target_hyp_id, request, current_active_user)


@app.get(
    "/api/v1/sources/health",
    response_model=SourceHealthResponse,
    responses={401: {"model": ErrorResponse}},
    tags=["Health"],
    summary="Get Ingest Data Sources Health Metrics"
)
@app.get("/api/health", response_model=SourceHealthResponse, include_in_schema=False)
async def get_sources_health(
    current_active_user: Dict[str, Any] = Depends(get_current_active_member),
    mission_service: MissionService = Depends(get_mission_service)
):
    return await mission_service.get_sources_health()


@app.get(
    "/api/v1/models/status",
    responses={401: {"model": ErrorResponse}},
    tags=["Models"],
    summary="Get AI/ML Neural & Physics Model Operational Status"
)
async def get_model_status(
    current_active_user: Dict[str, Any] = Depends(get_current_active_member),
    mission_service: MissionService = Depends(get_mission_service)
):
    return await mission_service.get_model_status()


# --------------------------------------------------------------------------
# PHASE 4 REPLAY CONTROLS, CONTRADICTION INJECTION, SSE & AI ASSISTANT PROXY
# --------------------------------------------------------------------------

@app.post(
    "/api/v1/replay/advance",
    response_model=ReplayAdvanceResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    tags=["Simulation Controls"],
    summary="Advance Replay Timeline Step"
)
@app.post("/api/replay/advance", response_model=ReplayAdvanceResponse, include_in_schema=False)
async def advance_replay(
    request: Optional[ReplayAdvanceRequest] = None,
    current_active_user: Dict[str, Any] = Depends(get_current_active_member),
    repo: BaseMissionRepository = Depends(get_mission_repository)
):
    req = request or ReplayAdvanceRequest()
    try:
        result = await repo.advance_replay(mission_id=req.mission_id or "transporter-8-ambiguity", step=req.step or 1)
        return ReplayAdvanceResponse(**result)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))


@app.post(
    "/api/v1/contradiction",
    response_model=ContradictionResponse,
    responses={401: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    tags=["Simulation Controls"],
    summary="Inject Simulated Anomaly Contradiction Event"
)
@app.post("/api/contradiction", response_model=ContradictionResponse, include_in_schema=False)
async def inject_contradiction(
    request: Optional[ContradictionRequest] = None,
    current_active_user: Dict[str, Any] = Depends(get_current_active_member),
    repo: BaseMissionRepository = Depends(get_mission_repository)
):
    req = request or ContradictionRequest()
    try:
        result = await repo.inject_contradiction(
            mission_id=req.mission_id or "transporter-8-ambiguity",
            target_object=req.target_object or "NORAD 56983",
            drift_khz=req.drift_khz or 4.8
        )
        return ContradictionResponse(**result)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))


@app.get(
    "/api/v1/stream",
    tags=["Streaming"],
    summary="Server-Sent Events Real-Time Telemetry Stream"
)
async def live_telemetry_stream(
    stream_service: StreamService = Depends(get_stream_service)
):
    return StreamingResponse(
        stream_service.event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.post(
    "/api/v1/assistant/query",
    response_model=AssistantQueryResponse,
    responses={400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
    tags=["Assistant"],
    summary="Deep Space Gemini AI Assistant Server Proxy"
)
async def assistant_query(
    request: AssistantQueryRequest,
    current_active_user: Dict[str, Any] = Depends(get_current_active_member),
    assistant_service: AssistantService = Depends(get_assistant_service)
):
    return await assistant_service.query_assistant(request)


@app.get("/health", tags=["Health"])
async def root_health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME, "version": settings.VERSION}
