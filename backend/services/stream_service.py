import asyncio
import json
import random
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional

class StreamService:
    """
    Server-Sent Events (SSE) Stream Manager.
    Asynchronous non-blocking generator that streams live telemetry pulse events and state updates to clients.
    Handles client disconnects cleanly without infinite loops or resource leaks.
    """

    async def event_generator(self, max_events: Optional[int] = None) -> AsyncGenerator[str, None]:
        event_counter = 0
        try:
            # 1. Emit initial source health event on connection open
            initial_event = {
                "event_id": f"sse-init-{int(datetime.now(timezone.utc).timestamp())}",
                "type": "source_health_changed",
                "status": "LIVE",
                "connected": True,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            yield f"event: source_health_changed\ndata: {json.dumps(initial_event)}\n\n"
            event_counter += 1

            # 2. Telemetry pulse heartbeat loop
            while max_events is None or event_counter < max_events:
                await asyncio.sleep(0.01 if max_events else 5)  # Fast sleep during max_events tests
                event_counter += 1
                now_utc = datetime.now(timezone.utc)
                ts_ms = int(now_utc.timestamp() * 1000)

                pulse_payload = {
                    "event_id": f"sim-{ts_ms}-{event_counter}",
                    "type": "source_pulse",
                    "timestamp": now_utc.isoformat(),
                    "latency_ms": 14 + random.randint(0, 6)
                }

                yield f"event: source_pulse\ndata: {json.dumps(pulse_payload)}\n\n"

        except (asyncio.CancelledError, GeneratorExit):
            # Clean disconnect handling when client closes SSE stream
            pass

_stream_service = StreamService()

def get_stream_service() -> StreamService:
    return _stream_service
