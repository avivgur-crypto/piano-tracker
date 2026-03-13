import asyncio
import io
import json
import logging
import os
import tempfile
import zipfile
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

from openai import OpenAI
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from auth import ensure_teacher, get_current_user
from database import get_db
from models import AIReport, Piece, Session, User
from schemas import AIReportOut, AnalyzeSessionRequest, PeriodSummaryOut, PieceOut, PieceUploadSummary

router = APIRouter()

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


def _parse_musicxml_to_score_structure(
    file_bytes: bytes, filename: str
) -> Tuple[str, Dict[str, Any], PieceUploadSummary]:
    """
    Parse MusicXML (.xml or .mxl) with music21.
    Returns (raw_xml_string, score_dict, summary).
    """
    from music21 import converter, stream

    # Get raw XML string (for .mxl extract root .xml from zip)
    raw_xml: str
    if filename.lower().endswith(".mxl"):
        with zipfile.ZipFile(io.BytesIO(file_bytes), "r") as z:
            # Find root file (often root.xml or the first .xml)
            xml_names = [n for n in z.namelist() if n.lower().endswith(".xml")]
            if not xml_names:
                raise ValueError("No XML file found in .mxl archive")
            root_name = xml_names[0]
            raw_xml = z.read(root_name).decode("utf-8", errors="replace")
        # Write to temp file for music21 (converter.parse often needs path for .mxl)
        with tempfile.NamedTemporaryFile(suffix=".mxl", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        try:
            score = converter.parse(tmp_path)
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
    else:
        raw_xml = file_bytes.decode("utf-8", errors="replace")
        with tempfile.NamedTemporaryFile(
            mode="wb", suffix=".xml", delete=False
        ) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        try:
            score = converter.parse(tmp_path)
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    notes_list: List[Dict[str, Any]] = []
    dynamics_list: List[Dict[str, Any]] = []
    time_sig: Optional[str] = None
    key_sig: Optional[str] = None
    tempo_val: Optional[str] = None
    measure_count = 0

    # Time signature
    try:
        for ts in score.recurse().getElementsByClass(stream.TimeSignature):
            time_sig = str(ts.ratioString) if getattr(ts, "ratioString", None) else None
            break
    except Exception:
        pass
    # Key signature — prefer key.Key for a human-friendly name like "F major"
    try:
        from music21 import key as m21key
        analyzed = score.analyze("key")
        if analyzed:
            key_sig = f"{analyzed.tonic.name} {analyzed.mode}"
    except Exception:
        try:
            from music21 import key as m21key
            for ks in score.recurse().getElementsByClass(m21key.KeySignature):
                k = ks.asKey()
                key_sig = f"{k.tonic.name} {k.mode}" if k else str(ks)
                break
        except Exception:
            pass
    # Tempo
    try:
        from music21 import tempo
        for mm in score.recurse().getElementsByClass(tempo.MetronomeMark):
            if getattr(mm, "number", None) and getattr(mm, "referent", None):
                tempo_val = f"{mm.number} {mm.referent.name}"
                break
    except Exception:
        pass

    # Notes with measure number and beat (expand chords to individual pitches)
    for n in score.flat.notes:
        duration = float(n.duration.quarterLength) if n.duration else 0.25
        measure_num = getattr(n, "measureNumber", None)
        if measure_num is not None:
            measure_count = max(measure_count, measure_num)
        offset = float(n.offset) if n.offset is not None else 0.0
        if hasattr(n, "isChord") and n.isChord:
            for p in n.pitches:
                pitch_name = p.name
                octave = int(p.octave)
                name_with_octave = f"{pitch_name}{octave}"
                notes_list.append({
                    "pitch": pitch_name,
                    "octave": octave,
                    "nameWithOctave": name_with_octave,
                    "duration": duration,
                    "measure": measure_num,
                    "beat": offset,
                })
        elif hasattr(n, "pitch") and n.pitch is not None:
            pitch_name = n.pitch.name
            octave = int(n.pitch.octave)
            name_with_octave = f"{pitch_name}{octave}"
            notes_list.append({
                "pitch": pitch_name,
                "octave": octave,
                "nameWithOctave": name_with_octave,
                "duration": duration,
                "measure": measure_num,
                "beat": offset,
            })
        # Dynamics (expressions on notes or in stream)
        if hasattr(n, "expressions") and n.expressions:
            for ex in n.expressions:
                ex_str = str(ex).strip()
                if ex_str and any(
                    m in ex_str.lower()
                    for m in ("p", "f", "m", "pp", "ff", "mp", "mf", "cresc", "dim")
                ):
                    dynamics_list.append({
                        "measure": getattr(n, "measureNumber", None),
                        "marking": ex_str,
                    })

    # If no measures from notes, count unique measures
    if measure_count == 0 and notes_list:
        measure_count = max(
            (x["measure"] for x in notes_list if x.get("measure") is not None),
            default=1,
        )

    score_dict: Dict[str, Any] = {
        "notes": notes_list,
        "time_signature": time_sig,
        "key_signature": key_sig,
        "tempo": tempo_val,
        "dynamics": dynamics_list,
    }
    summary = PieceUploadSummary(
        key_signature=key_sig,
        time_signature=time_sig,
        measure_count=measure_count,
        total_notes=len(notes_list),
    )
    return raw_xml, score_dict, summary


def _safe_ai_error(e: Exception) -> str:
    """Return a user-safe message; never expose API keys or full error body."""
    msg = str(e).lower()
    if "invalid_api_key" in msg or "401" in msg or "incorrect api key" in msg or "authentication" in msg:
        return "Invalid or missing OpenAI API key. Set OPENAI_API_KEY in backend/.env (get one at https://platform.openai.com/account/api-keys)."
    if "rate" in msg or "429" in msg:
        return "OpenAI rate limit exceeded. Try again later."
    return "AI request failed. Check backend logs for details."


# ── POST /ai/upload-piece ────────────────────────────────────────────────────

def _allowed_musicxml_filename(filename: str) -> bool:
    if not filename:
        return False
    lower = filename.lower()
    return lower.endswith(".xml") or lower.endswith(".musicxml") or lower.endswith(".mxl")


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

    if not _allowed_musicxml_filename(file.filename or ""):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only MusicXML files (.xml, .musicxml, .mxl) are supported.",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    try:
        raw_xml, score_dict, summary = await asyncio.to_thread(
            _parse_musicxml_to_score_structure,
            file_bytes,
            file.filename or "score.xml",
        )
    except Exception as e:
        logger.exception("MusicXML parse error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not parse MusicXML. Ensure the file is valid .xml or .mxl.",
        ) from e

    if not score_dict.get("notes"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No notes found in the score.",
        )

    piece = Piece(
        teacher_id=current_user.id,
        student_id=student_id_int,
        title=title or "Untitled",
        musicxml_data=raw_xml,
        score_json=json.dumps(score_dict),
    )
    db.add(piece)
    await db.commit()
    await db.refresh(piece)

    return PieceOut(
        id=piece.id,
        teacher_id=piece.teacher_id,
        student_id=piece.student_id,
        title=piece.title,
        musicxml_data=piece.musicxml_data,
        score_json=piece.score_json,
        analysis_json=piece.analysis_json,
        score_summary=summary,
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

    if payload.session_id:
        result = await db.execute(
            select(Session).where(Session.id == payload.session_id)
        )
    else:
        result = await db.execute(
            select(Session)
            .where(Session.student_id == payload.student_id)
            .order_by(Session.created_at.desc())
            .limit(1)
        )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=404,
            detail="No sessions found for this student",
        )

    result = await db.execute(
        select(Piece)
        .where(Piece.student_id == payload.student_id)
        .order_by(Piece.created_at.desc())
    )
    piece = result.scalars().first()

    score_json: Optional[Dict[str, Any]] = None
    if piece and piece.score_json:
        try:
            score_json = json.loads(piece.score_json)
        except json.JSONDecodeError:
            score_json = None
    if not score_json and piece and piece.analysis_json:
        score_json = piece.analysis_json if isinstance(piece.analysis_json, dict) else None

    if not piece or not score_json:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No score found for this student. Upload a MusicXML piece first.",
        )

    from services.midi_analyzer import compare_midi_to_score

    midi_events = session.events or []
    if not isinstance(midi_events, list):
        midi_events = list(midi_events) if midi_events else []
    errors = compare_midi_to_score(midi_events, score_json)
    errors_str = json.dumps(errors, indent=2)

    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY is not set. Add it to backend/.env",
        )

    teacher_prompt = (
        "You are an expert piano teacher. Here are the errors from the student's practice session:\n"
        f"{errors_str}\n\n"
        "Generate a technical, detailed report for the teacher with specific measures and recommendations. "
        "Use clear, professional language."
    )
    student_prompt = (
        "You are a friendly piano coach. Here are some areas to improve from the student's practice:\n"
        f"{errors_str}\n\n"
        "Generate an encouraging, friendly report for the student with specific tips. Use simple language. "
        "Highlight what went well and gently suggest improvements."
    )

    def _call_gpt(prompt: str) -> str:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
        )
        raw = (response.choices[0].message.content or "").strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1]
            if raw.endswith("```"):
                raw = raw[: -3].strip()
        return raw

    try:
        teacher_report = await asyncio.to_thread(_call_gpt, teacher_prompt)
        student_report = await asyncio.to_thread(_call_gpt, student_prompt)
    except Exception as e:
        logger.exception("OpenAI analyze_session error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI analysis failed: {_safe_ai_error(e)}",
        )

    ai_report = AIReport(
        session_id=session.id,
        student_id=payload.student_id,
        teacher_report=teacher_report,
        student_report=student_report,
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


# ── GET /ai/reports/student/{student_id}/period ───────────────────────────────

PERIOD_DELTAS = {
    "week": timedelta(weeks=1),
    "month": timedelta(days=30),
    "year": timedelta(days=365),
}


@router.get("/reports/student/{student_id}/period", response_model=PeriodSummaryOut)
async def get_period_summary(
    student_id: int,
    period: str = "week",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ensure_teacher(current_user)

    if period not in PERIOD_DELTAS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"period must be one of: {', '.join(PERIOD_DELTAS)}",
        )

    cutoff = datetime.utcnow() - PERIOD_DELTAS[period]
    result = await db.execute(
        select(AIReport)
        .where(AIReport.student_id == student_id, AIReport.created_at >= cutoff)
        .order_by(AIReport.created_at.desc())
    )
    reports = result.scalars().all()

    if not reports:
        return PeriodSummaryOut(period=period, session_count=0, summary=None)

    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY is not set. Add it to backend/.env",
        )

    reports_text = "\n---\n".join(
        f"[{r.created_at.isoformat()}] {r.teacher_report or '(no report)'}"
        for r in reports
    )

    prompt = (
        f"You are a piano teacher assistant. Given these {len(reports)} practice session "
        f"reports from the past {period}, synthesize a concise period summary. Include:\n"
        "1. PROGRESS: 2-3 sentences on overall trend\n"
        "2. COMMON ERRORS: top 3 recurring mistakes across sessions\n"
        "3. RECOMMENDATIONS: 3 bullet points for the teacher\n"
        "Keep it practical and under 200 words total.\n\n"
        f"Reports:\n{reports_text}"
    )

    def _call_gpt(p: str) -> str:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": p}],
        )
        return (response.choices[0].message.content or "").strip()

    try:
        summary = await asyncio.to_thread(_call_gpt, prompt)
    except Exception as e:
        logger.exception("OpenAI period summary error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI summary failed: {_safe_ai_error(e)}",
        )

    return PeriodSummaryOut(
        period=period,
        session_count=len(reports),
        summary=summary,
    )


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

    def _summary_from_score_json(score_json_str: Optional[str]) -> Optional[PieceUploadSummary]:
        if not score_json_str:
            return None
        try:
            data = json.loads(score_json_str)
            notes = data.get("notes") or []
            return PieceUploadSummary(
                key_signature=data.get("key_signature"),
                time_signature=data.get("time_signature"),
                measure_count=max((n.get("measure") or 0 for n in notes), default=0),
                total_notes=len(notes),
            )
        except Exception:
            return None

    return [
        PieceOut(
            id=p.id,
            teacher_id=p.teacher_id,
            student_id=p.student_id,
            title=p.title,
            musicxml_data=p.musicxml_data,
            score_json=p.score_json,
            analysis_json=p.analysis_json,
            score_summary=_summary_from_score_json(p.score_json),
            created_at=p.created_at,
        )
        for p in pieces
    ]


# ── GET /ai/pieces/{piece_id} ─────────────────────────────────────────────────

@router.get("/pieces/{piece_id}", response_model=PieceOut)
async def get_piece(
    piece_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    piece = await db.get(Piece, piece_id)
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")

    if current_user.role == "student" and current_user.id != piece.student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students can only view their own pieces",
        )

    summary = None
    if piece.score_json:
        try:
            data = json.loads(piece.score_json)
            notes = data.get("notes") or []
            summary = PieceUploadSummary(
                key_signature=data.get("key_signature"),
                time_signature=data.get("time_signature"),
                measure_count=max((n.get("measure") or 0 for n in notes), default=0),
                total_notes=len(notes),
            )
        except Exception:
            pass

    return PieceOut(
        id=piece.id,
        teacher_id=piece.teacher_id,
        student_id=piece.student_id,
        title=piece.title,
        musicxml_data=piece.musicxml_data,
        score_json=piece.score_json,
        analysis_json=piece.analysis_json,
        score_summary=summary,
        created_at=piece.created_at,
    )


# ── DELETE /ai/pieces/{piece_id} ─────────────────────────────────────────────

@router.delete("/pieces/{piece_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_piece(
    piece_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ensure_teacher(current_user)

    piece = await db.get(Piece, piece_id)
    if not piece:
        raise HTTPException(status_code=404, detail="Piece not found")
    if piece.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own pieces",
        )

    await db.delete(piece)
    await db.commit()
