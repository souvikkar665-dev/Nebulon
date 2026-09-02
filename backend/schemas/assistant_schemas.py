from typing import Optional, List
from pydantic import BaseModel, Field

class ChatMessage(BaseModel):
    role: str = Field(..., description="Message sender role ('user' or 'assistant'/'model')")
    text: str = Field(..., description="Message text content")

class AssistantQueryRequest(BaseModel):
    prompt: Optional[str] = Field(None, description="User query prompt text")
    promptText: Optional[str] = Field(None, description="Alias for prompt text")
    conversation_history: Optional[List[ChatMessage]] = Field([], description="Recent conversation history")
    model: Optional[str] = Field("gemini-3.7-flash", description="Target Gemini model")
    temperature: Optional[float] = Field(0.4, description="Sampling temperature (0.0 - 1.0)")

    def get_prompt(self) -> str:
        text = self.prompt or self.promptText or ""
        return text.strip()

class AssistantQueryResponse(BaseModel):
    response: str = Field(..., description="Assistant reply in plain Unicode formatted Markdown")
    model_used: str = Field("gemini-3.7-flash", description="Actual model used for inference")
    latency_ms: int = Field(..., description="Inference latency in milliseconds")
    suggestions: List[str] = Field([], description="Follow-up query suggestions")

class ReplayAdvanceRequest(BaseModel):
    step: Optional[int] = Field(1, description="Number of simulation steps to advance")
    mission_id: Optional[str] = Field("transporter-8-ambiguity", description="Target mission workspace ID")

class ReplayAdvanceResponse(BaseModel):
    status: str = "ok"
    message: str = Field(..., description="Replay advancement status message")

class ContradictionRequest(BaseModel):
    target_object: Optional[str] = Field("NORAD 56983", description="Target spacecraft object for contradiction")
    drift_khz: Optional[float] = Field(4.8, description="Simulated Doppler residual drift in kHz")
    mission_id: Optional[str] = Field("transporter-8-ambiguity", description="Target mission workspace ID")

class ContradictionResponse(BaseModel):
    status: str = "ok"
    message: str = Field(..., description="Contradiction injection status message")
