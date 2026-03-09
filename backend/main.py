from fastapi import FastAPI
from .routers import sessions
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.include_router(sessions.router)

@app.get("/health")
def health():
    return {"status": "ok"}