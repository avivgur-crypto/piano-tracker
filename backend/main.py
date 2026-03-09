from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth as auth_router
from routers import sessions
from dotenv import load_dotenv

from database import engine
from models import Base

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

app.include_router(auth_router.router, prefix="/auth")
app.include_router(sessions.router)

@app.get("/health")
def health():
    return {"status": "ok"}