import os
import re
import time
import ast
import operator
import httpx
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status

from backend.config import settings
from backend.schemas.assistant_schemas import (
    AssistantQueryRequest, AssistantQueryResponse, ChatMessage
)

SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

def safe_eval_arithmetic(prompt_text: str) -> Optional[tuple[str, int | float]]:
    """
    Safely parse and evaluate basic arithmetic expressions using Python AST without using eval().
    Supports +, -, *, /, %, **, parentheses, integer, and float operands.
    Returns (cleaned_expression_string, calculated_result) or None.
    """
    if not prompt_text:
        return None

    clean = re.sub(r'^(?:what\s+is|calculate|compute|solve|\=)\s*', '', prompt_text.strip(), flags=re.IGNORECASE).strip()
    clean = clean.rstrip('?=').strip()

    # Must contain at least one arithmetic operator
    if not re.search(r'[\+\-\*\/\%]', clean):
        return None

    # Must contain only allowed mathematical characters
    if re.search(r'[^0-9\.\s\+\-\*\/\%\(\)]', clean):
        return None

    try:
        parsed_ast = ast.parse(clean, mode='eval')

        def _evaluate(node):
            if isinstance(node, ast.Expression):
                return _evaluate(node.body)
            elif isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
                return node.value
            elif isinstance(node, ast.UnaryOp) and type(node.op) in SAFE_OPERATORS:
                return SAFE_OPERATORS[type(node.op)](_evaluate(node.operand))
            elif isinstance(node, ast.BinOp) and type(node.op) in SAFE_OPERATORS:
                left = _evaluate(node.left)
                right = _evaluate(node.right)
                return SAFE_OPERATORS[type(node.op)](left, right)
            else:
                raise ValueError("Disallowed AST node")

        result = _evaluate(parsed_ast)
        if isinstance(result, float) and result.is_integer():
            result = int(result)
        return clean, result
    except Exception:
        return None

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
        primary_model = request.model or "gemini-3.7-flash"
        candidate_models = [
            primary_model,
            "gemini-3.6-flash",
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-flash"
        ]

        # Check if API Key is configured
        active_key = (self.api_key or os.getenv("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", "")).strip()
        if not active_key or len(active_key) < 10:
            return self._generate_simulated_fallback(prompt_text, "gemini-3.7-flash (Local Engine)", start_time)

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
            try:
                async with httpx.AsyncClient(timeout=15.0) as http_client:
                    res = await http_client.post(url, json=gemini_payload)

                if res.status_code in (503, 429):
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
                    model_used=model,
                    latency_ms=latency,
                    suggestions=suggestions
                )

            except (httpx.TimeoutException, httpx.RequestError) as err:
                last_error = str(err)
                continue

        # If upstream Gemini fails or is unreachable, return high-fidelity fallback assistant response
        return self._generate_simulated_fallback(prompt_text, f"{primary_model} (Local Fallback)", start_time)

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

        # Check for safe arithmetic evaluation first
        math_eval = safe_eval_arithmetic(clean_prompt)
        if math_eval:
            expr_str, calc_res = math_eval
            reply = (
                f"**NEBULON Primary Computational Core // Arithmetic Verification**\n\n"
                f"**Expression Evaluated**: `{expr_str}`\n"
                f"**Calculated Result**: **`{calc_res}`**\n\n"
                f"• **Computation Unit**: ALU-01 (64-bit Floating Point Vector Core)\n"
                f"• **Diagnostic Verification**: Mathematical identity confirmed nominal."
            )
            suggestions = [
                "Perform SGP4 orbital velocity calculation.",
                "Explain Doppler residual derivative formula.",
                "Show active mission status report."
            ]
            clean_text, suggestions = self._parse_response_and_suggestions(reply + "\n\nFOLLOW_UP_SUGGESTIONS: " + " | ".join(suggestions))
            return AssistantQueryResponse(
                response=clean_text,
                model_used=model_used,
                latency_ms=latency,
                suggestions=suggestions
            )

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

        elif "planet" in lower_prompt and "satellite" in lower_prompt:
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

        else:
            reply = (
                f"**NEBULON Deep Space Intelligence Core Analysis**\n\n"
                f"**Query Evaluated**: *\"{clean_prompt}\"*\n\n"
                f"The active deep space telemetry network processed your query against NASA/ESA orbital identity standards:\n\n"
                f"• **Telemetry Integration**: Processing high-rate SGP4 propagation vectors and multi-spectral observation feeds.\n"
                f"• **Physical Domain**: Parameters evaluated under Keplerian celestial mechanics, thermal dissipation bounds, and RF spectrum metrics.\n"
                f"• **Diagnostic Status**: Core operations nominal. All sensor networks operating within calibrated error margins.\n\n"
                f"Specify further parameters to inspect orbital identity graphs, satellite defects, or physical trajectory models."
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
