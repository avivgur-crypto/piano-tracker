from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True)
    started_at = Column(DateTime)
    ended_at = Column(DateTime)
    duration_seconds = Column(Integer)
    total_notes = Column(Integer)
    events = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "teacher" or "student"
    created_at = Column(DateTime, default=datetime.utcnow)


class Homework(Base):
    __tablename__ = "homework"

    id = Column(Integer, primary_key=True)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    student_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, nullable=False)
    instruction = Column(String)
    deadline = Column(DateTime)
    status = Column(String, default="pending")  # pending / done
    created_at = Column(DateTime, default=datetime.utcnow)


class TeacherNote(Base):
    __tablename__ = "teacher_notes"

    id = Column(Integer, primary_key=True)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    student_id = Column(Integer, ForeignKey("users.id"))
    text = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Piece(Base):
    __tablename__ = "pieces"

    id = Column(Integer, primary_key=True)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    student_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, nullable=False)
    musicxml_data = Column(Text)
    score_json = Column(Text)
    analysis_json = Column(JSON)  # deprecated; kept for backward compatibility
    created_at = Column(DateTime, default=datetime.utcnow)


class AIReport(Base):
    __tablename__ = "ai_reports"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    teacher_report = Column(Text)
    student_report = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)