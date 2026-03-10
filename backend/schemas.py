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


# --- Communication schemas ---

class HomeworkCreate(BaseModel):
    student_id: int
    title: str
    instruction: Optional[str] = None
    deadline: Optional[datetime] = None


class HomeworkOut(BaseModel):
    id: int
    teacher_id: int
    student_id: int
    title: str
    instruction: Optional[str]
    deadline: Optional[datetime]
    status: str
    created_at: datetime


class TeacherNoteCreate(BaseModel):
    student_id: int
    text: str


class TeacherNoteOut(BaseModel):
    id: int
    teacher_id: int
    student_id: int
    text: str
    created_at: datetime


# --- AI Analysis schemas ---

class PieceOut(BaseModel):
    id: int
    teacher_id: int
    student_id: int
    title: str
    analysis_json: Optional[dict] = None
    created_at: datetime


class AIReportOut(BaseModel):
    id: int
    session_id: Optional[int] = None
    student_id: int
    teacher_report: Optional[str] = None
    student_report: Optional[str] = None
    created_at: datetime


class AnalyzeSessionRequest(BaseModel):
    session_id: int
    student_id: int
