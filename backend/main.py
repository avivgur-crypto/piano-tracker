from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import sessions
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router)

@app.get("/health")
def health():
    return {"status": "ok"}