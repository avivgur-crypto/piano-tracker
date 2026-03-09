from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

# --- Session schemas ---

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


# --- Auth/User schemas ---

class UserBase(BaseModel):
    email: str
    full_name: str
    role: str


class UserCreate(UserBase):
    password: str


class UserOut(UserBase):
    id: int
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str


class AuthResponse(Token):
    user: UserOut


class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None
