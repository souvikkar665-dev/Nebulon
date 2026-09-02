from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class MissionEventSchema(BaseModel):
    id: str = Field(..., description="Unique mission ID (e.g. transporter-8-ambiguity)")
    name: str = Field(..., description="Human-readable mission name")
    launch_date: str = Field(..., description="UTC launch date string")
    vehicle: str = Field(..., description="Launch vehicle & site")
    objects_tracked: int = Field(..., description="Total tracked orbital objects")
    ambiguous_clusters: int = Field(..., description="Number of ambiguous cluster groups")
    target_spacecraft: str = Field(..., description="Target spacecraft name and model")
    summary: str = Field(..., description="Brief orbital situation summary")
    leading_candidate: str = Field(..., description="Current leading candidate tracked object")
    confidence_score: float = Field(..., description="Leader candidate overall confidence score (0-100)")
    is_historical: bool = Field(True, description="Whether mission is historical replay or active")

class OrbitalElements(BaseModel):
    epoch: str
    semi_major_axis_km: float
    altitude_km: float
    inclination: float
    eccentricity: float
    raan: float
    arg_perigee: float
    mean_anomaly: float

class RfCharacteristics(BaseModel):
    beacon_freq: str
    modulation: str
    measured_snr_db: float
    doppler_residual_hz: float

class HypothesisSchema(BaseModel):
    id: str
    rank: int
    tracked_object: str
    spacecraft_name: str
    evidence_score: float
    physics_score: float
    neural_score: float
    confidence_label: str
    status: str
    supporting_observations: List[str] = []
    contradictions: List[str] = []
    orbital_elements: OrbitalElements
    rf_characteristics: RfCharacteristics

class OpportunityValueFactors(BaseModel):
    station_feasibility: float
    doppler_separation_weight: float
    latency_seconds: float
    sensor_independence: float

class ObservationOpportunitySchema(BaseModel):
    id: str
    station_id: str
    location: str
    window: str
    elevation_max_deg: float
    expected_information_gain: int
    predicted_doppler_separation: str
    station_feasibility: float
    confidence_impact: str
    feasible: bool
    rank: int
    is_recommended: bool
    reason: str
    value_factors: OpportunityValueFactors
    observation_type: str
    frequency: str

class TimelineProvenance(BaseModel):
    source_url: str
    record_id: str
    parser_version: str
    freshness_seconds: int
    is_contradiction: bool

class TimelineItemSchema(BaseModel):
    id: str
    time: str
    kind: str
    source: str
    source_badge: str
    title: str
    detail: str
    timestamps: Optional[Dict[str, str]] = None
    provenance: Optional[TimelineProvenance] = None

class WorkspaceResponse(BaseModel):
    mission_id: str
    launch_name: str
    launch_time: str
    candidate_summary: str
    hypotheses: List[HypothesisSchema]
    opportunities: List[ObservationOpportunitySchema]
    timeline: List[TimelineItemSchema]

class ReviewCreateRequest(BaseModel):
    decision: str = Field(..., description="Verification decision ('Verified by source', 'Refuted by conflict', 'Needs additional observation', 'verified by reviewer')")
    notes: Optional[str] = Field("", description="Reviewer notes or comments")
    reviewer: Optional[str] = Field(None, description="Reviewer name and title")
    hypothesis_id: Optional[str] = Field(None, description="Hypothesis ID if included in body")

class ReviewResponse(BaseModel):
    success: bool = True
    request_id: str
    reviewer: str
    timestamp: str
    hypothesis_id: str
    decision: str
    resulting_state: str
    message: str

class SourceHealthItem(BaseModel):
    name: str
    status: str
    freshness: str
    status_code: str = "healthy"

class SourceHealthResponse(BaseModel):
    engine: str = "Nominal"
    score_version: str = "Nebula-Physics v3.2 + Neural-Graph v1.9"
    latency_ms: int = 18
    status_label: str = "LIVE / PRODUCTION FEED"
    sources: List[SourceHealthItem]
