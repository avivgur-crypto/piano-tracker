from pydantic import BaseModel
from datetime import datetime
from typing import List

class SessionEvent(BaseModel):
    time_offset_ms: int
    note: str
    velocity: int
    type: str

class SessionCreate(BaseModel):
    device_id: str
    started_at: str
    ended_at: str
    duration_seconds: int
    total_notes: int
    events: List[SessionEvent]

class SessionResponse(SessionCreate):
    id: int
    created_at: datetime