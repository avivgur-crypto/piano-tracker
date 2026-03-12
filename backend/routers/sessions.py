import logging
import traceback

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from database import get_db
from models import Session as DBSession
from schemas import SessionCreate, SessionResponse
from typing import Dict, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter()

# ── In-memory active-session store (device_id → session info) ────────────────
active_sessions: Dict[str, dict] = {}


class ActiveSessionRequest(BaseModel):
    device_id: str
    student_id: int
    piece_id: Optional[int] = None


class ActiveSessionResponse(BaseModel):
    device_id: str
    student_id: int
    piece_id: Optional[int] = None
    started_at: str


@router.post("/sessions/active", response_model=ActiveSessionResponse)
async def set_active_session(payload: ActiveSessionRequest):
    entry = {
        "device_id": payload.device_id,
        "student_id": payload.student_id,
        "piece_id": payload.piece_id,
        "started_at": datetime.utcnow().isoformat(),
    }
    active_sessions[payload.device_id] = entry
    return ActiveSessionResponse(**entry)


@router.get("/sessions/active/{device_id}", response_model=ActiveSessionResponse)
async def get_active_session(device_id: str):
    entry = active_sessions.get(device_id)
    if not entry:
        raise HTTPException(status_code=404, detail="No active session for this device")
    return ActiveSessionResponse(**entry)


@router.delete("/sessions/active/{device_id}", status_code=204)
async def clear_active_session(device_id: str):
    active_sessions.pop(device_id, None)


def parse_dt(s: str) -> datetime:
    # Supports both naive ISO datetime and ISO with Z suffix.
    s = s.replace("Z", "+00:00")
    return datetime.fromisoformat(s)

@router.post("/sessions", response_model=SessionResponse)
async def create_session(session: SessionCreate, db: AsyncSession = Depends(get_db)):
    try:
        db_session = DBSession(
            device_id=session.device_id,
            student_id=session.student_id,
            started_at=parse_dt(session.started_at),
            ended_at=parse_dt(session.ended_at),
            duration_seconds=session.duration_seconds,
            total_notes=session.total_notes,
            events=[event.dict() for event in session.events]
        )
        db_session.started_at = db_session.started_at.replace(tzinfo=None)
        db_session.ended_at = db_session.ended_at.replace(tzinfo=None)
        db.add(db_session)
        await db.commit()
        await db.refresh(db_session)
        return SessionResponse(
            id=db_session.id,
            device_id=db_session.device_id,
            student_id=db_session.student_id,
            started_at=db_session.started_at.isoformat(),
            ended_at=db_session.ended_at.isoformat(),
            duration_seconds=db_session.duration_seconds,
            total_notes=db_session.total_notes,
            events=db_session.events,
            created_at=db_session.created_at
        )
    except Exception as e:
        logger.error(f"Session create error: {e}")
        logger.error(traceback.format_exc())
        raise

@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DBSession))
    sessions = result.scalars().all()
    return [
        SessionResponse(
            id=s.id,
            device_id=s.device_id,
            student_id=s.student_id,
            started_at=s.started_at.isoformat(),
            ended_at=s.ended_at.isoformat(),
            duration_seconds=s.duration_seconds,
            total_notes=s.total_notes,
            events=s.events,
            created_at=s.created_at
        ) for s in sessions
    ]

@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DBSession).where(DBSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse(
        id=session.id,
        device_id=session.device_id,
        student_id=session.student_id,
        started_at=session.started_at.isoformat(),
        ended_at=session.ended_at.isoformat(),
        duration_seconds=session.duration_seconds,
        total_notes=session.total_notes,
        events=session.events,
        created_at=session.created_at
    )