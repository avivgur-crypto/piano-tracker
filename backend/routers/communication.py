from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from auth import get_current_user
from database import get_db
from models import Homework, TeacherNote, User
from schemas import (
    HomeworkCreate,
    HomeworkOut,
    TeacherNoteCreate,
    TeacherNoteOut,
)

router = APIRouter()


def ensure_teacher(user: User):
    if user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Teacher-only endpoint"
        )
    return user


def ensure_student_owner(student_id: int, user: User):
    if user.role == "student" and user.id != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students can only view their own data",
        )
    return user


@router.post("/homework", response_model=HomeworkOut)
async def create_homework(
    payload: HomeworkCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ensure_teacher(current_user)

    db_homework = Homework(
        teacher_id=current_user.id,
        student_id=payload.student_id,
        title=payload.title,
        instruction=payload.instruction,
        deadline=payload.deadline,
    )
    db.add(db_homework)
    await db.commit()
    await db.refresh(db_homework)

    return HomeworkOut(
        id=db_homework.id,
        teacher_id=db_homework.teacher_id,
        student_id=db_homework.student_id,
        title=db_homework.title,
        instruction=db_homework.instruction,
        deadline=db_homework.deadline,
        status=db_homework.status,
        created_at=db_homework.created_at,
    )


@router.get("/homework/student/{student_id}", response_model=List[HomeworkOut])
async def list_homework_for_student(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ensure_student_owner(student_id, current_user)
    result = await db.execute(select(Homework).where(Homework.student_id == student_id))
    homework = result.scalars().all()

    return [
        HomeworkOut(
            id=h.id,
            teacher_id=h.teacher_id,
            student_id=h.student_id,
            title=h.title,
            instruction=h.instruction,
            deadline=h.deadline,
            status=h.status,
            created_at=h.created_at,
        )
        for h in homework
    ]


@router.patch("/homework/{homework_id}/done", response_model=HomeworkOut)
async def mark_homework_done(
    homework_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only students can mark homework done"
        )

    result = await db.execute(select(Homework).where(Homework.id == homework_id))
    hw = result.scalar_one_or_none()
    if not hw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Homework not found")
    if hw.student_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only mark your own homework as done",
        )

    hw.status = "done"
    db.add(hw)
    await db.commit()
    await db.refresh(hw)

    return HomeworkOut(
        id=hw.id,
        teacher_id=hw.teacher_id,
        student_id=hw.student_id,
        title=hw.title,
        instruction=hw.instruction,
        deadline=hw.deadline,
        status=hw.status,
        created_at=hw.created_at,
    )


@router.post("/notes", response_model=TeacherNoteOut)
async def create_note(
    payload: TeacherNoteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ensure_teacher(current_user)

    note = TeacherNote(
        teacher_id=current_user.id,
        student_id=payload.student_id,
        text=payload.text,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)

    return TeacherNoteOut(
        id=note.id,
        teacher_id=note.teacher_id,
        student_id=note.student_id,
        text=note.text,
        created_at=note.created_at,
    )


@router.get("/notes/student/{student_id}", response_model=List[TeacherNoteOut])
async def list_notes_for_student(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ensure_student_owner(student_id, current_user)

    result = await db.execute(select(TeacherNote).where(TeacherNote.student_id == student_id))
    notes = result.scalars().all()

    return [
        TeacherNoteOut(
            id=n.id,
            teacher_id=n.teacher_id,
            student_id=n.student_id,
            text=n.text,
            created_at=n.created_at,
        )
        for n in notes
    ]
