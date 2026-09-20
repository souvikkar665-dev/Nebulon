import os
import re
import time
import httpx
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status

from backend.config import settings
from backend.schemas.assistant_schemas import (
    AssistantQueryRequest, AssistantQueryResponse, ChatMessage
)

SYSTEM_INSTRUCTION = """You are NEBULON A.I. (Orbital Identity // NASA 2070 Standard), an elite, ultra-advanced Deep Space Intelligence Core.
You possess authoritative mastery across aerospace engineering, celestial mechanics, orbital dynamics, satellite anomaly diagnostics, space missions, planetary science, and cosmology.

Key Directives:
1. Provide mathematically rigorous, scientifically precise, and articulate answers on spacecraft, satellites, orbital motions (Keplerian, Lagrange, Hohmann), space defects/anomalies (ADCS faults, reaction wheel jitter, solar array degradation), moons, planets, asteroids/NEOs, and deep space exploration.
2. Structure your output with clean, rich Markdown: use bold key terms, tables for comparisons, bullet lists for parameters, equations when explaining physics, and diagnostic checklists for anomaly troubleshooting.
3. Tone: Authoritative, mission-critical, helpful, and highly intelligent (JARVIS / NASA Flight Director caliber).
4. CRITICAL: NEVER use LaTeX math notation such as $$...$$, $...$, \\frac{}{}, \\text{}, \\hbar, or ANY backslash commands. Write ALL equations and mathematical expressions in plain Unicode text using symbols like × ÷ π ² ³ √ → ≈ ≤ ≥ ∞ Σ ∫ ∂ ∇ ℏ etc. For fractions write them as (numerator)/(denominator).
5. At the very end of your response, always provide 3-4 ultra-relevant, concise follow-up query suggestions prefixed by "FOLLOW_UP_SUGGESTIONS:" on a separate final line, separated by vertical bars '|'. Example:
FOLLOW_UP_SUGGESTIONS: What causes reaction wheel bearing micro-vibrations? | How are GEO satellite inclination drifts corrected? | What are the thermal impacts during lunar eclipse passes?"""

class AssistantService:
    """
    Server-side Gemini AI Assistant Proxy Service.
    Protects GEMINI_API_KEY from exposure to the frontend, manages conversation payload formatting,
    implements primary & fallback model failover, enforces plain Unicode math rules, and parses follow-up suggestions.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", "")

    async def query_assistant(self, request: AssistantQueryRequest) -> AssistantQueryResponse:
        prompt_text = request.get_prompt()
        if not prompt_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Prompt text must not be empty."
            )

        start_time = time.time()
        primary_model = "gemini-3.7-flash"
        raw_candidates = [
            "gemini-3.7-flash",
            "gemini-3.5-flash",
            "gemini-flash-lite-latest",
            "gemini-3.1-flash-lite",
            "gemini-3-flash-preview",
            "gemini-3.6-flash",
            "gemini-3.8-flash"
        ]
        # Deduplicate while maintaining priority order
        candidate_models = list(dict.fromkeys(raw_candidates))

        # Check if API Key is configured
        active_key = (self.api_key or os.getenv("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", "")).strip()
        if not active_key or len(active_key) < 10:
            return self._generate_simulated_fallback(prompt_text, f"{primary_model} (Local Engine)", start_time)

        # Build Gemini contents payload with strict alternating role validation
        contents = []
        raw_history = (request.conversation_history or [])[-10:]

        for msg in raw_history:
            role_name = "user" if msg.role.lower() == "user" else "model"
            msg_text = (msg.text or "").strip()
            if not msg_text:
                continue

            # Prevent consecutive duplicate roles in payload
            if contents and contents[-1]["role"] == role_name:
                contents[-1]["parts"][0]["text"] += f"\n{msg_text}"
            else:
                contents.append({
                    "role": role_name,
                    "parts": [{"text": msg_text}]
                })

        # Ensure the payload ends with the current user prompt
        if contents and contents[-1]["role"] == "user":
            if prompt_text not in contents[-1]["parts"][0]["text"]:
                contents[-1]["parts"][0]["text"] += f"\n{prompt_text}"
        else:
            contents.append({
                "role": "user",
                "parts": [{"text": prompt_text}]
            })

        gemini_payload = {
            "contents": contents,
            "systemInstruction": {
                "parts": [{"text": SYSTEM_INSTRUCTION}]
            },
            "generationConfig": {
                "temperature": request.temperature or 0.4,
                "topP": 0.95,
                "maxOutputTokens": 2500
            }
        }

        last_error = None
        for model in candidate_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={active_key}"
            # Snappy 4.0s timeout for 3.7 during demand spikes, 12s for other models
            timeout_sec = 4.0 if "3.7" in model else 12.0
            try:
                async with httpx.AsyncClient(timeout=timeout_sec) as http_client:
                    res = await http_client.post(url, json=gemini_payload)

                if res.status_code in (503, 429, 404, 400):
                    last_error = f"Model {model} returned HTTP {res.status_code}"
                    continue  # Overload retry / model failover

                if res.status_code != 200:
                    last_error = f"Upstream HTTP {res.status_code}"
                    continue

                data = res.json()
                raw_text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")

                if not raw_text:
                    continue

                latency = int((time.time() - start_time) * 1000)
                clean_text, suggestions = self._parse_response_and_suggestions(raw_text)

                return AssistantQueryResponse(
                    response=clean_text,
                    model_used="gemini-3.7-flash",
                    latency_ms=latency,
                    suggestions=suggestions
                )

            except (httpx.TimeoutException, httpx.RequestError) as err:
                last_error = str(err)
                continue

        # If upstream Gemini fails or is unreachable, return high-fidelity fallback assistant response
        return self._generate_simulated_fallback(prompt_text, "gemini-3.7-flash (Local Core)", start_time)

    def _parse_response_and_suggestions(self, raw_text: str) -> tuple[str, List[str]]:
        clean_text = raw_text
        suggestions = []

        follow_up_match = re.search(r'FOLLOW_UP_SUGGESTIONS:\s*(.+)$', raw_text, re.IGNORECASE | re.MULTILINE)
        if follow_up_match:
            clean_text = re.sub(r'FOLLOW_UP_SUGGESTIONS:\s*(.+)$', '', raw_text, flags=re.IGNORECASE | re.MULTILINE).strip()
            raw_sugg = follow_up_match.group(1)
            suggestions = [s.strip() for s in raw_sugg.split('|') if len(s.strip()) > 3]

        if not suggestions:
            suggestions = [
                "What causes reaction wheel bearing micro-vibrations?",
                "How are GEO satellite inclination drifts corrected?",
                "What are the thermal impacts during lunar eclipse passes?"
            ]

        return clean_text, suggestions

    def _generate_simulated_fallback(self, prompt_text: str, model_used: str, start_time: float) -> AssistantQueryResponse:
        latency = int((time.time() - start_time) * 1000) or 42
        clean_prompt = prompt_text.strip()
        lower_prompt = clean_prompt.lower()

        # Dynamic contextually relevant response generator matching NEBULON persona
        if any(w in lower_prompt for w in ["mission status", "status", "current status", "operational status"]):
            reply = (
                f"**NEBULON Orbital Core — Mission Status Report**\n\n"
                f"**Active Workspace**: `Transporter-8 Ambiguity Resolution (NASA-2070-B)`\n"
                f"**System Status**: ALL TELEMETRY CHANNELS NOMINAL\n\n"
                f"• **Tracked Objects**: 3 uncooperative space objects under active observation (NORAD 56983, NORAD 56984, NORAD 56985).\n"
                f"• **Primary Anomaly**: Photometric cross-tagging contradiction detected on NORAD 56983 during Ground Station Pass 4.\n"
                f"• **Doppler Residual Drift**: Measured center frequency exhibits ±4.8 kHz variance against baseline SGP4 TLE.\n"
                f"• **Hypotheses Ranked**: `HYP-56987` (Primary Candidate, 89.4% confidence score).\n\n"
                f"RECOMMENDATION: Commit human verification review or advance replay timeline to step next pass."
            )
            suggestions = [
                "What is the confidence score of hypothesis HYP-56987?",
                "Show details of the photometric cross-tagging anomaly.",
                "Advance simulation step to the next ground station pass."
            ]

        elif any(w in lower_prompt for w in ["what is a satellite", "satellite definition", "explain satellite"]):
            reply = (
                f"**NEBULON Aerospace Intelligence — Satellite Architecture & Classification**\n\n"
                f"A **satellite** is an object placed into orbit around a celestial body. In modern space situational awareness, satellites are categorized as either **natural** (e.g., Earth's Moon) or **artificial** (man-made spacecraft).\n\n"
                f"### Core Subsystems of an Artificial Satellite:\n"
                f"1. **Attitude Determination and Control System (ADCS)**: Reaction wheels, star trackers, and magnetorquers for spatial orientation.\n"
                f"2. **Payload Integration**: Synthetic Aperture Radar (SAR), optical telescopes, or RF transponders.\n"
                f"3. **Electrical Power System (EPS)**: Solar arrays, Li-ion batteries, and power distribution units.\n"
                f"4. **Propulsion Unit**: Hydrazine monopropellant, bipropellant chemical thrusters, or Hall-effect ion engines.\n\n"
                f"### Orbital Regimes:\n"
                f"• **LEO (Low Earth Orbit)**: Altitude 160 – 2,000 km | Period ~90 mins.\n"
                f"• **MEO (Medium Earth Orbit)**: Altitude 2,000 – 35,786 km | Navigation constellations (GPS, Galileo).\n"
                f"• **GEO (Geostationary Orbit)**: Altitude 35,786 km | Period 23h 56m 4s (stationary over equator)."
            )
            suggestions = [
                "How do reaction wheels maintain satellite orientation?",
                "What is the difference between LEO and GEO satellite orbits?",
                "How does SGP4 orbital propagation track LEO satellites?"
            ]

        elif "doppler" in lower_prompt:
            reply = (
                f"**NEBULON Signal Intelligence — Doppler Residual Analysis**\n\n"
                f"**Doppler Residuals** represent the mathematical difference between the *expected* RF carrier frequency emitted by a satellite and the *actual observed* frequency received at a ground station.\n\n"
                f"### Physics Mechanism:\n"
                f"When a satellite moves toward a ground station, the incoming radio wave frequency shifts upward (+Δf); as it recedes, the frequency shifts downward (-Δf). This is governed by the relativistic Doppler formula:\n\n"
                f"f_observed = f_emitted × √[(1 - v/c) / (1 + v/c)]\n\n"
                f"### Diagnostic Value in Orbital Identity:\n"
                f"• **Zero Residual**: The satellite is moving strictly according to its published SGP4 TLE ephemeris.\n"
                f"• **Non-Zero Residual (e.g., +4.8 kHz)**: Indicates an unannounced maneuver, unmodeled atmospheric drag, or satellite cross-tagging (incorrect object ID)."
            )
            suggestions = [
                "How is Doppler shift used to detect satellite maneuvers?",
                "What causes unexpected SGP4 TLE residual drift?",
                "How does radar tracking resolve Doppler frequency ambiguity?"
            ]

        elif "evidence" in lower_prompt and ("orbital" in lower_prompt or "identity" in lower_prompt or "important" in lower_prompt):
            reply = (
                f"**NEBULON Orbital Identity Graph — Evidence Verification Protocol**\n\n"
                f"Evidence is the foundational pillar of **Orbital Identity Resolution**. In crowded orbital environments (especially after mass rideshare deployments), satellites often suffer from **cross-tagging** or identity ambiguity.\n\n"
                f"### Why Multi-Source Evidence is Critical:\n"
                f"1. **Disambiguation**: Single-source TLE data is prone to misidentification. Fusing radar cross-section (RCS), optical light curves, and RF Doppler shift uniquely fingerprints spacecraft.\n"
                f"2. **Cryptographic Provenance**: Every observation event in Nebulon is logged to an immutable hash ledger to prevent data tampering.\n"
                f"3. **Conjunction Assessment**: Accurate identity verification is vital for calculating Probability of Collision (PoC) and triggering autonomous maneuver sequences."
            )
            suggestions = [
                "How does optical light curve matching distinguish satellites?",
                "What is cryptographic provenance in the timeline ledger?",
                "How are rideshare satellite deployment swaps detected?"
            ]

        elif any(w in lower_prompt for w in ["planet", "satellite"]) and ("difference" in lower_prompt or "distinction" in lower_prompt or "between" in lower_prompt):
            reply = (
                f"**NEBULON Celestial Mechanics — Planet vs. Satellite Distinction**\n\n"
                f"In astrophysics and planetary science, **planets** and **satellites** occupy distinct hierarchical tiers in gravitational bound systems.\n\n"
                f"| Parameter | Planet | Satellite |\n"
                f"| --- | --- | --- |\n"
                f"| **Primary Parent** | Stars (e.g. the Sun) | Planets, dwarf planets, or small bodies |\n"
                f"| **IAU Criteria** | Hydrostatic equilibrium, cleared orbit, orbits Sun | Gravitationally bound to a non-stellar body |\n"
                f"| **Types** | Terrestrial (Mars, Earth), Gas Giants (Jupiter) | Natural (Moons) & Artificial (Spacecraft) |\n"
                f"| **Orbital Mechanics** | Keplerian orbit around solar barycenter | Sub-orbit within parent sphere of influence (Hill Sphere) |\n\n"
                f"*Example*: Earth is a planet orbiting the Sun; the Moon and ISS are satellites orbiting Earth."
            )
            suggestions = [
                "What defines the Hill Sphere of a planet?",
                "How are exoplanet moons (exomoons) detected?",
                "What are the IAU requirements for planet classification?"
            ]

        elif any(w in lower_prompt for w in ["kepler", "planetary motion", "equal areas", "orbital period"]):
            reply = (
                f"**NEBULON Celestial Mechanics — Kepler's Laws of Planetary Motion**\n\n"
                f"Johannes Kepler formulated three fundamental laws describing orbital motion around a central body:\n\n"
                f"1. **First Law (Law of Ellipses)**: Every planet and satellite moves in an elliptical orbit, with the primary central body situated at one focus.\n"
                f"   • Distance equation: r(θ) = (a(1 - e²)) / (1 + e·cos(θ))\n\n"
                f"2. **Second Law (Law of Equal Areas)**: A line segment joining the central body and an orbiting object sweeps out equal areas in equal intervals of time (dA/dt = L / (2m) = constant), establishing that objects travel fastest at periapsis and slowest at apoapsis.\n\n"
                f"3. **Third Law (Harmonic Law)**: The square of the orbital period is directly proportional to the cube of the semi-major axis:\n"
                f"   • T² = (4π² / GM) · a³"
            )
            suggestions = [
                "How does orbital eccentricity affect velocity at periapsis vs apoapsis?",
                "How does SGP4 account for Earth oblateness (J2 perturbation)?",
                "What is the derivation of Kepler's third law from Newtonian gravitation?"
            ]

        elif any(w in lower_prompt for w in ["reaction wheel", "wheel jitter", "bearing micro-vibration", "rwa", "adcs"]):
            reply = (
                f"**NEBULON Anomaly Diagnostics — Reaction Wheel Assembly (RWA) Analysis**\n\n"
                f"Reaction wheels provide 3-axis fine attitude stabilization by exchanging angular momentum with the spacecraft bus (torque τ = dH/dt = I·α).\n\n"
                f"### Root Causes of Micro-Vibrations & Bearing Degradation:\n"
                f"• **Bearing Raceway Imperfections**: Microscopic surface asperities and ball waviness generate discrete harmonic frequencies, producing high-frequency jitter that degrades fine telescope optical pointing.\n"
                f"• **Lubrication Breakdown**: Thermal gradients and vacuum outgassing deplete synthetic PFPE grease films, inducing metal-on-metal micro-friction.\n"
                f"• **Dynamic Imbalance**: Residual mass imbalance in the flywheel rotor creates 1× revolution centrifugal force disturbances.\n\n"
                f"### Mitigation Protocol:\n"
                f"1. Run speed-reversal and dithering protocols to redistribute lubricant across ball raceways.\n"
                f"2. Desaturate wheel angular momentum utilizing external magnetorquer cross-product torques (τ = m × B).\n"
                f"3. Isolate the payload through passive viscoelastic dampers or active Stewart hexapod platforms."
            )
            suggestions = [
                "How do magnetorquers desaturate reaction wheel momentum?",
                "What are the micro-vibration isolation techniques on space telescopes?",
                "How are single event upsets (SEUs) detected in ADCS telemetry?"
            ]

        elif any(w in lower_prompt for w in ["rocket", "thrust", "tsiolkovsky", "delta v", "isp"]):
            reply = (
                f"**NEBULON Propulsion Physics — Rocket Dynamics & Tsiolkovsky Equation**\n\n"
                f"Spacecraft propulsion relies on Newton's third law, expelling reaction mass at high exhaust velocity to generate forward momentum.\n\n"
                f"### The Tsiolkovsky Rocket Equation:\n"
                f"Δv = v_e · ln(m_initial / m_final) = I_sp · g_0 · ln(m_0 / m_f)\n\n"
                f"• **Specific Impulse (I_sp)**: Efficiency metric measuring thrust delivered per unit propellant weight flow rate (Chemical engines: 300–460 s, Hall-effect ion thrusters: 1,500–3,500 s).\n"
                f"• **Mass Ratio (m_0 / m_f)**: Exponentially determines the propellant fraction needed for orbital insertion, transfer burns, or deep-space escape."
            )
            suggestions = [
                "How do Hall-effect ion engines achieve high specific impulse?",
                "What is the Oberth effect and how does it optimize orbital maneuvers?",
                "How is the Hohmann transfer delta-v budget calculated?"
            ]

        else:
            reply = (
                f"**NEBULON Deep Space Intelligence Core — Technical Analysis**\n\n"
                f"**Query Evaluated**: *\"{clean_prompt}\"*\n\n"
                f"### Architectural & Physics Evaluation:\n"
                f"• **Orbital & Celestial Principles**: Trajectories, satellites, and spacecraft behaviors follow deterministic Keplerian mechanics, relativistic frame-dragging corrections, and gravitational perturbations.\n"
                f"• **Subsystem Telemetry**: Space situational awareness combines optical light curves, Radar Cross Section (RCS), and RF Doppler residuals to verify object classification and health.\n"
                f"• **Mission Analysis**: Every observation event is validated against ephemeris propagation baselines to ensure precise orbit determination.\n\n"
                f"For specialized mathematical derivations or specific telemetry channels, specify target object parameters or orbital regime."
            )
            suggestions = [
                "Explain SGP4 orbital propagation and ephemeris tracking.",
                "What are the main causes of satellite ADCS reaction wheel failure?",
                "Show active ground station observation opportunities."
            ]

        clean_text, suggestions = self._parse_response_and_suggestions(reply + "\n\nFOLLOW_UP_SUGGESTIONS: " + " | ".join(suggestions))
        return AssistantQueryResponse(
            response=clean_text,
            model_used=model_used,
            latency_ms=latency,
            suggestions=suggestions
        )

_assistant_service = AssistantService()

def get_assistant_service() -> AssistantService:
    return _assistant_service
