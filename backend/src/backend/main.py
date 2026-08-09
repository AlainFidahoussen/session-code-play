from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import problems, sessions, sync

app = FastAPI(title="Cohort — Coding Interview Session API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router)
app.include_router(problems.router)
app.include_router(sync.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
