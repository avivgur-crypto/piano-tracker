import asyncio
import base64
import json
import os
from typing import List

from openai import OpenAI
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from auth import get_current_user
from database import get_db
from models import AIReport, Piece, Session, User
from schemas import AIReportOut, AnalyzeSessionRequest, PieceOut

router = APIRouter()

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


def ensure_teacher(user: User):
    if user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Teacher-only endpoint"
        )


# ── POST /ai/upload-piece ────────────────────────────────────────────────────

@router.post("/upload-piece", response_model=PieceOut)
async def upload_piece(
    file: UploadFile = File(...),
    title: str = Form(""),
    student_id: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ensure_teacher(current_user)

    try:
        student_id_int = int(student_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="student_id must be a valid integer",
        )

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported",
        )

    pdf_bytes = await file.read()

    prompt = (
        "You are a music theory expert. Analyze this sheet music PDF and extract "
        "the following in JSON format:\n"
        "{\n"
        '  "measures": [{"number": 1, "notes": ["C4", "E4", "G4"]}],\n'
        '  "time_signature": "4/4",\n'
        '  "key_signature": "C major",\n'
        '  "dynamics": [{"measure": 1, "marking": "mf"}]\n'
        "}\n"
        "Return ONLY valid JSON, no markdown fences."
    )

    pdf_base64 = base64.standard_b64encode(pdf_bytes).decode("utf-8")
    try:
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:application/pdf;base64,{pdf_base64}"
                            },
                        },
                    ],
                }
            ],
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI analysis failed: {str(e)}",
        )

    raw_text = (response.choices[0].message.content or "").strip()

    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[1]
        if raw_text.endswith("```"):
            raw_text = raw_text[: -3].strip()

    try:
        analysis = json.loads(raw_text)
    except json.JSONDecodeError:
        analysis = {"raw_response": raw_text}

    piece = Piece(
        teacher_id=current_user.id,
        student_id=student_id_int,
        title=title or "Untitled",
        analysis_json=analysis,
    )
    db.add(piece)
    await db.commit()
    await db.refresh(piece)

    return PieceOut(
        id=piece.id,
        teacher_id=piece.teacher_id,
        student_id=piece.student_id,
        title=piece.title,
        analysis_json=piece.analysis_json,
        created_at=piece.created_at,
    )


# ── POST /ai/analyze-session ─────────────────────────────────────────────────

@router.post("/analyze-session", response_model=AIReportOut)
async def analyze_session(
    payload: AnalyzeSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ensure_teacher(current_user)

    result = await db.execute(
        select(Session).where(Session.id == payload.session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = await db.execute(
        select(Piece)
        .where(Piece.student_id == payload.student_id)
        .order_by(Piece.created_at.desc())
    )
    piece = result.scalar_one_or_none()

    piece_context = ""
    if piece and piece.analysis_json:
        piece_context = (
            f"The student is working on '{piece.title}'.\n"
            f"Sheet music analysis: {json.dumps(piece.analysis_json)}\n\n"
        )

    midi_events = json.dumps(session.events or [])

    prompt = (
        "You are an expert piano teacher AI assistant.\n\n"
        f"{piece_context}"
        f"Here is the MIDI data from the student's practice session:\n{midi_events}\n\n"
        "Compare the student's performance to the sheet music and produce TWO reports "
        "in the following JSON format:\n"
        "{\n"
        '  "teacher_report": "Detailed technical analysis for the teacher...",\n'
        '  "student_report": "Friendly, encouraging feedback for the student..."\n'
        "}\n\n"
        "The teacher_report should cover: wrong notes (which measures), rhythm errors, "
        "missing dynamics, and technical suggestions.\n"
        "The student_report should be encouraging and use simple language, highlight "
        "what went well, and gently suggest improvements.\n"
        "Return ONLY valid JSON, no markdown fences."
    )

    try:
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI analysis failed: {str(e)}",
        )
    raw_text = (response.choices[0].message.content or "").strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.split("\n", 1)[1]
        if raw_text.endswith("```"):
            raw_text = raw_text[: -3].strip()

    try:
        reports = json.loads(raw_text)
    except json.JSONDecodeError:
        reports = {
            "teacher_report": raw_text,
            "student_report": raw_text,
        }

    ai_report = AIReport(
        session_id=payload.session_id,
        student_id=payload.student_id,
        teacher_report=reports.get("teacher_report", ""),
        student_report=reports.get("student_report", ""),
    )
    db.add(ai_report)
    await db.commit()
    await db.refresh(ai_report)

    return AIReportOut(
        id=ai_report.id,
        session_id=ai_report.session_id,
        student_id=ai_report.student_id,
        teacher_report=ai_report.teacher_report,
        student_report=ai_report.student_report,
        created_at=ai_report.created_at,
    )


# ── GET /ai/reports/student/{student_id} ─────────────────────────────────────

@router.get("/reports/student/{student_id}", response_model=List[AIReportOut])
async def get_student_reports(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == "student" and current_user.id != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students can only view their own reports",
        )

    result = await db.execute(
        select(AIReport)
        .where(AIReport.student_id == student_id)
        .order_by(AIReport.created_at.desc())
    )
    reports = result.scalars().all()

    return [
        AIReportOut(
            id=r.id,
            session_id=r.session_id,
            student_id=r.student_id,
            teacher_report=r.teacher_report,
            student_report=r.student_report,
            created_at=r.created_at,
        )
        for r in reports
    ]


# ── GET /ai/pieces/student/{student_id} ──────────────────────────────────────

@router.get("/pieces/student/{student_id}", response_model=List[PieceOut])
async def get_student_pieces(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == "student" and current_user.id != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students can only view their own pieces",
        )

    result = await db.execute(
        select(Piece)
        .where(Piece.student_id == student_id)
        .order_by(Piece.created_at.desc())
    )
    pieces = result.scalars().all()

    return [
        PieceOut(
            id=p.id,
            teacher_id=p.teacher_id,
            student_id=p.student_id,
            title=p.title,
            analysis_json=p.analysis_json,
            created_at=p.created_at,
        )
        for p in pieces
    ]
