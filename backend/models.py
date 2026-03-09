from sqlalchemy import Column, Integer, String, DateTime, JSON
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