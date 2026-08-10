import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

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


# Built by `npm run build` into frontend/.output/public (see frontend/vite.config.ts).
# Only present when the frontend has actually been built (e.g. in the Docker image);
# absent in local dev, where the Vite dev server serves the frontend on its own port.
FRONTEND_DIST_DIR = Path(os.environ.get("FRONTEND_DIST_DIR", "../frontend/.output/public"))

if FRONTEND_DIST_DIR.is_dir():

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str) -> FileResponse:
        if full_path == "health" or full_path.startswith(("api/", "sync/")):
            raise HTTPException(404, "Not Found")
        candidate = FRONTEND_DIST_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST_DIR / "index.html")
