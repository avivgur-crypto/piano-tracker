import logging
import traceback

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from database import get_db, async_session
from models import Session as DBSession, AIReport as DBAIReport
from schemas import SessionCreate, SessionResponse
from typing import Dict, List, Optional
from datetime import datetime, timedelta, timezone

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
    print(f"[sessions] get_active_session received device_id={device_id!r}")
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
async def list_sessions(
    student_id: Optional[int] = None,
    date_range: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(DBSession)
    if student_id is not None:
        query = query.where(DBSession.student_id == student_id)

    if date_range:
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        if date_range == "today":
            query = query.where(DBSession.started_at >= today_start)
        elif date_range == "yesterday":
            yesterday_start = today_start - timedelta(days=1)
            query = query.where(
                DBSession.started_at >= yesterday_start,
                DBSession.started_at < today_start,
            )
        elif date_range == "last_week":
            week_ago = today_start - timedelta(days=7)
            query = query.where(DBSession.started_at >= week_ago)

    query = query.order_by(DBSession.created_at.desc())
    result = await db.execute(query)
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


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(session_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DBSession).where(DBSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.execute(
        sa_delete(DBAIReport).where(DBAIReport.session_id == session_id)
    )
    await db.delete(session)
    await db.commit()


# ── Auto-cleanup: delete sessions older than 7 days ──────────────────────────
# Runs as a background asyncio task started from main.py on_event("startup").
# For production, consider a dedicated cron job instead:
#   curl -X POST https://your-api/sessions/cleanup
CLEANUP_INTERVAL_HOURS = 24
RETENTION_DAYS = 7


@router.post("/sessions/cleanup", status_code=200)
async def cleanup_old_sessions(db: AsyncSession = Depends(get_db)):
    """Manual trigger: delete sessions (and their AI reports) older than RETENTION_DAYS."""
    cutoff = datetime.utcnow() - timedelta(days=RETENTION_DAYS)
    result = await db.execute(
        select(DBSession.id).where(DBSession.started_at < cutoff)
    )
    old_ids = [row[0] for row in result.all()]
    if not old_ids:
        return {"deleted": 0}
    await db.execute(sa_delete(DBAIReport).where(DBAIReport.session_id.in_(old_ids)))
    await db.execute(sa_delete(DBSession).where(DBSession.id.in_(old_ids)))
    await db.commit()
    logger.info(f"Cleanup: deleted {len(old_ids)} sessions older than {RETENTION_DAYS} days")
    return {"deleted": len(old_ids)}


async def periodic_cleanup():
    """Background loop that auto-deletes stale sessions every CLEANUP_INTERVAL_HOURS."""
    import asyncio
    while True:
        await asyncio.sleep(CLEANUP_INTERVAL_HOURS * 3600)
        try:
            async with async_session() as db:
                cutoff = datetime.utcnow() - timedelta(days=RETENTION_DAYS)
                result = await db.execute(
                    select(DBSession.id).where(DBSession.started_at < cutoff)
                )
                old_ids = [row[0] for row in result.all()]
                if not old_ids:
                    continue
                await db.execute(
                    sa_delete(DBAIReport).where(DBAIReport.session_id.in_(old_ids))
                )
                await db.execute(
                    sa_delete(DBSession).where(DBSession.id.in_(old_ids))
                )
                await db.commit()
                logger.info(
                    f"Auto-cleanup: deleted {len(old_ids)} sessions older than {RETENTION_DAYS} days"
                )
        except Exception as e:
            logger.error(f"Auto-cleanup error: {e}")