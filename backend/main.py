from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import ai_analysis
from routers import auth as auth_router
from routers import communication
from routers import sessions
from dotenv import load_dotenv

from database import engine
from models import Base

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://keysight-teacher.vercel.app",
        "https://keysight-student.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/health")
async def health():
    return {"status": "ok"}

app.include_router(auth_router.router, prefix="/auth")
app.include_router(sessions.router)
app.include_router(communication.router, prefix="/communication")
app.include_router(ai_analysis.router, prefix="/ai")