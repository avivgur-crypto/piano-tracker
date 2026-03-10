import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import engine
from models import User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        students = [
            User(id=2, email="danny@piano.com", full_name="Danny Cohen",
                 hashed_password=pwd_context.hash("student123"), role="student"),
            User(id=3, email="sarah@piano.com", full_name="Sarah Levi",
                 hashed_password=pwd_context.hash("student123"), role="student"),
            User(id=4, email="tom@piano.com", full_name="Tom Katz",
                 hashed_password=pwd_context.hash("student123"), role="student"),
            User(id=5, email="maya@piano.com", full_name="Maya Shapiro",
                 hashed_password=pwd_context.hash("student123"), role="student"),
        ]
        for s in students:
            existing = await db.get(User, s.id)
            if not existing:
                db.add(s)
        await db.commit()
        print("✅ Students seeded!")

asyncio.run(seed())
