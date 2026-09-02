import random
import secrets
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from backend.repositories.base_mission_repository import BaseMissionRepository

class MockMissionRepository(BaseMissionRepository):
    """
    Temporary Isolated In-Memory Mock Mission & Hypotheses Repository.
    Contains scientific dataset matching frontend/js/api-client.js.
    Easily replaceable by PostgresMissionRepository without altering FastAPI routes or services.
    """

    def __init__(self):
        self._replay_step = 0
        self._missions = [
            {
                "id": "transporter-8-ambiguity",
                "name": "Transporter-8 SSO CubeSat Swarm",
                "launch_date": "2023-06-12 21:35:00 UTC",
                "vehicle": "Falcon 9 · Vandenberg SLC-4E",
                "objects_tracked": 72,
                "ambiguous_clusters": 4,
                "target_spacecraft": "Aurora-1 (6U Earth Observation)",
                "summary": "Post-deploy cluster separation failure across Objects 56983, 56987, and 56991 in sun-synchronous orbit.",
                "leading_candidate": "NORAD 56987 (Object C)",
                "confidence_score": 87.4,
                "is_historical": True
            },
            {
                "id": "starlink-g6-12-deploy",
                "name": "Starlink Group 6-12 Dep-Train",
                "launch_date": "2023-09-03 02:20:00 UTC",
                "vehicle": "Falcon 9 · Cape Canaveral SLC-40",
                "objects_tracked": 22,
                "ambiguous_clusters": 2,
                "target_spacecraft": "Starlink-30412 (Direct-to-Cell Test)",
                "summary": "Co-orbital drift separation identification with rapid Doppler residual disambiguation.",
                "leading_candidate": "NORAD 57802 (Object F)",
                "confidence_score": 94.1,
                "is_historical": True
            },
            {
                "id": "pslv-c37-swarm",
                "name": "PSLV-C37 Record 104-Sat Cluster",
                "launch_date": "2017-02-15 03:58:00 UTC",
                "vehicle": "PSLV-XL · Satish Dhawan FLP",
                "objects_tracked": 104,
                "ambiguous_clusters": 9,
                "target_spacecraft": "Doves Flock 3p-14 (3U Cubesat)",
                "summary": "Dense orbital packet separation over South Atlantic anomaly requiring Next-Best ground pass.",
                "leading_candidate": "NORAD 41954 (Object AC)",
                "confidence_score": 76.8,
                "is_historical": True
            }
        ]

        self._hypotheses = {
            "transporter-8-ambiguity": [
                {
                    "id": "hyp-56987",
                    "rank": 1,
                    "tracked_object": "NORAD 56987 / Object C",
                    "spacecraft_name": "Aurora-1",
                    "evidence_score": 87.4,
                    "physics_score": 89.2,
                    "neural_score": 85.6,
                    "confidence_label": "high",
                    "status": "review_required",
                    "supporting_observations": ["OBS-204-SATNOGS", "OBS-229-DOPPLER", "OBS-311-BEACON"],
                    "contradictions": [],
                    "orbital_elements": {
                        "epoch": "2026-08-25 09:14:02 UTC",
                        "semi_major_axis_km": 6894.2,
                        "altitude_km": 516.2,
                        "inclination": 97.45,
                        "eccentricity": 0.0012,
                        "raan": 214.8,
                        "arg_perigee": 78.4,
                        "mean_anomaly": 142.1
                    },
                    "rf_characteristics": {
                        "beacon_freq": "437.450 MHz",
                        "modulation": "GFSK 9.6 kbps",
                        "measured_snr_db": 14.8,
                        "doppler_residual_hz": 38
                    }
                },
                {
                    "id": "hyp-56983",
                    "rank": 2,
                    "tracked_object": "NORAD 56983 / Object A",
                    "spacecraft_name": "Aurora-1 (Secondary Candidate)",
                    "evidence_score": 46.2,
                    "physics_score": 51.0,
                    "neural_score": 41.4,
                    "confidence_label": "moderate",
                    "status": "conflicted",
                    "supporting_observations": ["OBS-204-SATNOGS"],
                    "contradictions": ["Doppler residual +4.8 kHz above transmitter nominal frequency on Pass #4"],
                    "orbital_elements": {
                        "epoch": "2026-08-25 08:44:19 UTC",
                        "semi_major_axis_km": 6898.6,
                        "altitude_km": 520.6,
                        "inclination": 97.46,
                        "eccentricity": 0.0015,
                        "raan": 214.9,
                        "arg_perigee": 79.1,
                        "mean_anomaly": 140.8
                    },
                    "rf_characteristics": {
                        "beacon_freq": "437.450 MHz",
                        "modulation": "GFSK 9.6 kbps",
                        "measured_snr_db": 7.2,
                        "doppler_residual_hz": 4820
                    }
                },
                {
                    "id": "hyp-56991",
                    "rank": 3,
                    "tracked_object": "NORAD 56991 / Object G",
                    "spacecraft_name": "Aurora-1 (Tertiary Candidate)",
                    "evidence_score": 18.9,
                    "physics_score": 22.4,
                    "neural_score": 15.4,
                    "confidence_label": "low",
                    "status": "rejected_candidate",
                    "supporting_observations": [],
                    "contradictions": ["Deployment spring velocity delta mismatch", "No RF beacon detected in pass window GS-088"],
                    "orbital_elements": {
                        "epoch": "2026-08-25 07:12:55 UTC",
                        "semi_major_axis_km": 6905.1,
                        "altitude_km": 527.1,
                        "inclination": 97.48,
                        "eccentricity": 0.0021,
                        "raan": 215.1,
                        "arg_perigee": 82.0,
                        "mean_anomaly": 137.4
                    },
                    "rf_characteristics": {
                        "beacon_freq": "437.450 MHz",
                        "modulation": "None",
                        "measured_snr_db": 0.0,
                        "doppler_residual_hz": 0
                    }
                }
            ]
        }

        self._opportunities = {
            "transporter-8-ambiguity": [
                {
                    "id": "opp-gs142-svalbard",
                    "station_id": "GS-142 · Svalbard Polar Station",
                    "location": "78.22° N, 15.65° E",
                    "window": "14:22–14:29 UTC",
                    "elevation_max_deg": 68.4,
                    "expected_information_gain": 94,
                    "predicted_doppler_separation": "4.8 kHz",
                    "station_feasibility": 0.91,
                    "confidence_impact": "HIGH",
                    "feasible": True,
                    "rank": 1,
                    "is_recommended": True,
                    "reason": "Maximum Doppler gradient separation between NORAD 56987 and 56983 near polar zenith.",
                    "value_factors": {
                        "station_feasibility": 0.91,
                        "doppler_separation_weight": 0.96,
                        "latency_seconds": 4.2,
                        "sensor_independence": 0.88
                    },
                    "observation_type": "RF Doppler Spectrum + IQ Recording",
                    "frequency": "437.450 MHz UHF"
                },
                {
                    "id": "opp-gs088-hawaii",
                    "station_id": "GS-088 · Hawaii Pacific Relay",
                    "location": "19.82° N, 155.46° W",
                    "window": "15:58–16:04 UTC",
                    "elevation_max_deg": 42.1,
                    "expected_information_gain": 68,
                    "predicted_doppler_separation": "2.1 kHz",
                    "station_feasibility": 0.84,
                    "confidence_impact": "MEDIUM",
                    "feasible": True,
                    "rank": 2,
                    "is_recommended": False,
                    "reason": "Secondary equatorial pass; adequate separation but lower elevation and potential weather attenuation.",
                    "value_factors": {
                        "station_feasibility": 0.84,
                        "doppler_separation_weight": 0.65,
                        "latency_seconds": 8.5,
                        "sensor_independence": 0.72
                    },
                    "observation_type": "RF Telemetry Demodulation",
                    "frequency": "437.450 MHz UHF"
                },
                {
                    "id": "opp-gs044-hart",
                    "station_id": "GS-044 · Hartebeesthoek Observatory",
                    "location": "25.88° S, 27.70° E",
                    "window": "17:34–17:40 UTC",
                    "elevation_max_deg": 26.5,
                    "expected_information_gain": 41,
                    "predicted_doppler_separation": "1.2 kHz",
                    "station_feasibility": 0.62,
                    "confidence_impact": "LOW",
                    "feasible": True,
                    "rank": 3,
                    "is_recommended": False,
                    "reason": "Low horizon pass; high atmospheric noise floor with minimal Doppler curve divergence.",
                    "value_factors": {
                        "station_feasibility": 0.62,
                        "doppler_separation_weight": 0.38,
                        "latency_seconds": 12.1,
                        "sensor_independence": 0.55
                    },
                    "observation_type": "Optical Photometry (Twilight)",
                    "frequency": "Optical 550nm"
                }
            ]
        }

        self._timeline = {
            "transporter-8-ambiguity": [
                {
                    "id": "ev-01",
                    "time": "2026-08-25 14:10:04 UTC",
                    "kind": "observation",
                    "source": "SatNOGS Station 142",
                    "source_badge": "SatNOGS",
                    "title": "Doppler waterfall captured on NORAD 56987",
                    "detail": "Observation ID #849201. Measured center frequency 437.450038 MHz. Curve matches predicted SGP4 epoch 09:14 UTC within 38 Hz residual.",
                    "timestamps": {
                        "physical_observation_time": "2026-08-25 14:10:04 UTC",
                        "source_record_updated": "2026-08-25 14:10:28 UTC",
                        "orbital_element_epoch": "2026-08-25 09:14:02 UTC",
                        "nebulon_retrieved": "2026-08-25 14:10:31 UTC"
                    },
                    "provenance": {
                        "source_url": "https://network.satnogs.org/observations/849201",
                        "record_id": "SATNOGS-OBS-849201",
                        "parser_version": "nebulon-ingest-v2.4.1",
                        "freshness_seconds": 12,
                        "is_contradiction": False
                    }
                },
                {
                    "id": "ev-02",
                    "time": "2026-08-25 13:42:18 UTC",
                    "kind": "conflict",
                    "source": "CelesTrak GP Parser",
                    "source_badge": "CelesTrak",
                    "title": "Doppler separation discrepancy on NORAD 56983",
                    "detail": "Pass #4 Doppler curve diverged by +4.8 kHz from predicted SGP4 orbit. Evidence indicates Object A is not Aurora-1.",
                    "timestamps": {
                        "physical_observation_time": "2026-08-25 13:42:18 UTC",
                        "source_record_updated": "2026-08-25 13:45:00 UTC",
                        "orbital_element_epoch": "2026-08-25 08:44:19 UTC",
                        "nebulon_retrieved": "2026-08-25 13:45:15 UTC"
                    },
                    "provenance": {
                        "source_url": "https://celestrak.org/NORAD/elements/gp.php?CATNR=56983",
                        "record_id": "CELESTRAK-GP-56983",
                        "parser_version": "nebulon-sgp4-v3.1.0",
                        "freshness_seconds": 24,
                        "is_contradiction": True
                    }
                },
                {
                    "id": "ev-03",
                    "time": "2026-08-25 12:15:00 UTC",
                    "kind": "tle_update",
                    "source": "Space-Track / 18th SDS",
                    "source_badge": "Space-Track",
                    "title": "Element set #0004 issued for Transporter-8 cluster",
                    "detail": "TLE set generated from radar cross-section separation track. Positional covariance 480 meters.",
                    "timestamps": {
                        "physical_observation_time": "2026-08-25 12:00:00 UTC",
                        "source_record_updated": "2026-08-25 12:14:30 UTC",
                        "orbital_element_epoch": "2026-08-25 12:00:00 UTC",
                        "nebulon_retrieved": "2026-08-25 12:15:00 UTC"
                    },
                    "provenance": {
                        "source_url": "https://www.space-track.org/#/gp/56987",
                        "record_id": "SPACETRACK-TLE-56987-0004",
                        "parser_version": "nebulon-sgp4-v3.1.0",
                        "freshness_seconds": 45,
                        "is_contradiction": False
                    }
                },
                {
                    "id": "ev-04",
                    "time": "2026-08-25 10:02:11 UTC",
                    "kind": "manifest",
                    "source": "Launch Manifest Ingest",
                    "source_badge": "Manifest",
                    "title": "Deployment sequence confirmed from Transporter-8 upper stage",
                    "detail": "Aurora-1 deployed at T+01:04:12 into 516 km sun-synchronous orbit, inclination 97.45°.",
                    "timestamps": {
                        "physical_observation_time": "2023-06-12 22:39:12 UTC",
                        "source_record_updated": "2023-06-12 23:00:00 UTC",
                        "orbital_element_epoch": "2023-06-12 22:39:12 UTC",
                        "nebulon_retrieved": "2026-08-25 10:02:11 UTC"
                    },
                    "provenance": {
                        "source_url": "https://spaceflight.com/manifest/transporter-8",
                        "record_id": "MANIFEST-T8-AURORA1",
                        "parser_version": "nebulon-manifest-v1.0.0",
                        "freshness_seconds": 120,
                        "is_contradiction": False
                    }
                }
            ]
        }

        self._reviews = []

        self._sources_health = {
            "engine": "Nominal",
            "score_version": "Nebula-Physics v3.2 + Neural-Graph v1.9",
            "latency_ms": 18,
            "status_label": "LIVE / PRODUCTION FEED",
            "sources": [
                {"name": "CelesTrak GP Stream", "status": "SYNCHRONIZED", "freshness": "24s ago", "status_code": "healthy"},
                {"name": "SatNOGS Global Ground Network", "status": "SYNCHRONIZED", "freshness": "12s ago", "status_code": "healthy"},
                {"name": "Space-Track (18th SDS)", "status": "SYNCHRONIZED", "freshness": "45s ago", "status_code": "healthy"},
                {"name": "Launch Vehicle Telemetry Ingest", "status": "STATIC ARCHIVE", "freshness": "Historical", "status_code": "healthy"}
            ]
        }

    async def get_missions(self) -> List[Dict[str, Any]]:
        return self._missions

    async def get_mission_by_id(self, mission_id: str) -> Optional[Dict[str, Any]]:
        clean_id = (mission_id or "").strip().lower()
        for m in self._missions:
            if m["id"] == clean_id:
                return m
        return None

    async def get_hypotheses_by_mission(self, mission_id: str) -> List[Dict[str, Any]]:
        clean_id = (mission_id or "").strip().lower()
        return self._hypotheses.get(clean_id, self._hypotheses.get("transporter-8-ambiguity", []))

    async def get_hypothesis_by_id(self, hypothesis_id: str) -> Optional[Dict[str, Any]]:
        clean_id = (hypothesis_id or "").strip().lower()
        for mission_hypotheses in self._hypotheses.values():
            for hyp in mission_hypotheses:
                if hyp["id"] == clean_id:
                    return hyp
        return None

    async def get_hypothesis_evidence(self, hypothesis_id: str) -> Optional[List[Dict[str, Any]]]:
        hyp = await self.get_hypothesis_by_id(hypothesis_id)
        if not hyp:
            return None
        return await self.get_timeline_by_mission("transporter-8-ambiguity")

    async def get_opportunities_by_mission(self, mission_id: str) -> List[Dict[str, Any]]:
        clean_id = (mission_id or "").strip().lower()
        return self._opportunities.get(clean_id, self._opportunities.get("transporter-8-ambiguity", []))

    async def get_timeline_by_mission(self, mission_id: str) -> List[Dict[str, Any]]:
        clean_id = (mission_id or "").strip().lower()
        return self._timeline.get(clean_id, self._timeline.get("transporter-8-ambiguity", []))

    async def get_timeline_events(self, mission_id: Optional[str] = None, limit: int = 50, kind: Optional[str] = None) -> List[Dict[str, Any]]:
        target_mission = mission_id or "transporter-8-ambiguity"
        events = await self.get_timeline_by_mission(target_mission)

        if kind:
            clean_kind = kind.strip().lower()
            events = [e for e in events if e.get("kind", "").lower() == clean_kind]

        return events[:limit]

    async def add_review_record(self, hypothesis_id: str, reviewer: str, decision: str, notes: str) -> Dict[str, Any]:
        hyp = await self.get_hypothesis_by_id(hypothesis_id)
        if not hyp:
            raise ValueError(f"Hypothesis '{hypothesis_id}' not found.")

        req_id = "REV-" + secrets.token_hex(3).upper()
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        dec_norm = decision.strip().lower()
        if "verified" in dec_norm:
            resulting_state = "VERIFIED_PERMANENT"
            hyp["status"] = "verified_permanent"
            msg = f"Verification recorded. Spacecraft {hyp['spacecraft_name']} identity bound to {hyp['tracked_object']}."
        elif "refuted" in dec_norm:
            resulting_state = "REFUTED"
            hyp["status"] = "refuted"
            msg = f"Refutation recorded. Spacecraft identity conflict committed for {hyp['tracked_object']}."
        else:
            resulting_state = "NEEDS_OBSERVATION"
            hyp["status"] = "needs_observation"
            msg = f"Additional observation scheduled for {hyp['tracked_object']}."

        review_entry = {
            "request_id": req_id,
            "hypothesis_id": hypothesis_id,
            "reviewer": reviewer,
            "decision": decision,
            "notes": notes,
            "resulting_state": resulting_state,
            "timestamp": now_str,
            "message": msg
        }
        self._reviews.append(review_entry)

        audit_event = {
            "id": "ev-rev-" + req_id.lower(),
            "time": now_str,
            "kind": "review_audit",
            "source": "Human Verification Arbiter",
            "source_badge": "VERIFICATION",
            "title": f"Verification decision committed by {reviewer}",
            "detail": f"Decision: {decision}. State: {resulting_state}. Notes: {notes or 'None'}",
            "provenance": {
                "source_url": f"https://nebulon.nasa.gov/audit/{req_id}",
                "record_id": req_id,
                "parser_version": "nebulon-audit-v1.0",
                "freshness_seconds": 0,
                "is_contradiction": False
            }
        }
        default_timeline = self._timeline.get("transporter-8-ambiguity", [])
        default_timeline.insert(0, audit_event)

        return review_entry

    async def advance_replay(self, mission_id: str, step: int = 1) -> Dict[str, Any]:
        mission = await self.get_mission_by_id(mission_id)
        if not mission:
            raise ValueError(f"Mission workspace '{mission_id}' not found.")

        self._replay_step += step
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

        # Format MET T+ HH:MM:SS
        total_seconds = 15502 + (self._replay_step * 60)
        hrs = str(total_seconds // 3600).zfill(2)
        mins = str((total_seconds % 3600) // 60).zfill(2)
        secs = str(total_seconds % 60).zfill(2)
        met_str = f"T+{hrs}:{mins}:{secs}"

        step_event = {
            "id": f"ev-replay-step-{self._replay_step}",
            "time": now_str,
            "kind": "observation",
            "source": "Replay Simulation Stream",
            "source_badge": "REPLAY",
            "title": f"Replay step advanced to MET {met_str}",
            "detail": f"{step} new observation ingest step processed. Positional ephemeris update committed.",
            "provenance": {
                "source_url": "https://nebulon.nasa.gov/replay",
                "record_id": f"REPLAY-STEP-{self._replay_step}",
                "parser_version": "nebulon-replay-v1.0",
                "freshness_seconds": 0,
                "is_contradiction": False
            }
        }
        default_timeline = self._timeline.get(mission["id"], [])
        default_timeline.insert(0, step_event)

        return {
            "status": "ok",
            "message": f"Replay advanced to MET {met_str}. {step} new observation ingest processed."
        }

    async def inject_contradiction(self, mission_id: str, target_object: str, drift_khz: float) -> Dict[str, Any]:
        mission = await self.get_mission_by_id(mission_id)
        if not mission:
            raise ValueError(f"Mission workspace '{mission_id}' not found.")

        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        hypotheses = await self.get_hypotheses_by_mission(mission["id"])

        # Find hypothesis matching target_object
        target_hyp = None
        for h in hypotheses:
            if target_object.lower() in h["tracked_object"].lower() or target_object.lower() in h["id"].lower():
                target_hyp = h
                break

        if not target_hyp and hypotheses:
            target_hyp = hypotheses[1] if len(hypotheses) > 1 else hypotheses[0]

        if target_hyp:
            conflict_msg = f"Doppler residual +{drift_khz:.1f} kHz above transmitter nominal frequency on Pass #{self._replay_step + 4}"
            target_hyp["contradictions"].append(conflict_msg)
            target_hyp["status"] = "conflicted"
            target_hyp["evidence_score"] = max(10.0, target_hyp["evidence_score"] - 15.0)

        conflict_event = {
            "id": f"ev-contradiction-{secrets.token_hex(2)}",
            "time": now_str,
            "kind": "conflict",
            "source": "CelesTrak Doppler Discrepancy Filter",
            "source_badge": "CelesTrak",
            "title": f"Doppler separation discrepancy injected into {target_object}",
            "detail": f"Pass Doppler curve diverged by +{drift_khz:.1f} kHz from predicted SGP4 orbit.",
            "provenance": {
                "source_url": "https://celestrak.org/NORAD/elements/gp.php",
                "record_id": f"INJECTED-CONFLICT-{secrets.token_hex(2)}",
                "parser_version": "nebulon-sgp4-v3.1.0",
                "freshness_seconds": 0,
                "is_contradiction": True
            }
        }
        default_timeline = self._timeline.get(mission["id"], [])
        default_timeline.insert(0, conflict_event)

        return {
            "status": "ok",
            "message": f"Simulated Doppler contradiction injected into Object {target_object} (+{drift_khz:.1f} kHz drift)."
        }

    async def get_sources_health(self) -> Dict[str, Any]:
        return self._sources_health

    async def get_workspace_data(self, mission_id: str) -> Optional[Dict[str, Any]]:
        mission = await self.get_mission_by_id(mission_id)
        if not mission:
            return None

        hypotheses = await self.get_hypotheses_by_mission(mission_id)
        opportunities = await self.get_opportunities_by_mission(mission_id)
        timeline = await self.get_timeline_by_mission(mission_id)

        return {
            "mission_id": mission["id"],
            "launch_name": mission["name"],
            "launch_time": mission["launch_date"],
            "candidate_summary": mission["summary"],
            "hypotheses": hypotheses,
            "opportunities": opportunities,
            "timeline": timeline
        }

_mock_mission_repo = MockMissionRepository()

def get_mission_repository() -> BaseMissionRepository:
    """Dependency Injection provider for Mission Repository."""
    return _mock_mission_repo
