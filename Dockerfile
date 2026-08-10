# syntax=docker/dockerfile:1

# --- Frontend build ----------------------------------------------------------
FROM node:22-slim AS frontend-build
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
# Same-origin relative URLs: the backend serves the frontend itself, so API/WebSocket
# calls should go to whatever host the browser already loaded the page from, not a
# hardcoded one baked in at build time (see frontend/src/services/http/config.ts).
ENV VITE_API_URL=""
RUN npm run build

# The app is fully client-rendered (see frontend/src/routes — data comes from
# ClientOnly/useEffect calls to the backend API, not server loaders), so every route
# renders the same document shell. Boot the built Node server once, capture its
# rendered HTML as a static SPA shell, then discard the server: the FastAPI backend
# only ever serves static files, never runs Node at runtime.
RUN <<'EOF'
set -e
PORT=3000 node .output/server/index.mjs &
SERVER_PID=$!
node -e "
const fs = require('fs');
(async () => {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://localhost:3000/');
      if (res.ok) {
        fs.writeFileSync('.output/public/index.html', await res.text());
        process.exit(0);
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  process.exit(1);
})();
"
kill "$SERVER_PID"
test -s .output/public/index.html
EOF

# --- Backend -------------------------------------------------------------------
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder
WORKDIR /app

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY backend/src/ src/
RUN uv sync --frozen --no-dev

FROM python:3.12-slim-bookworm
WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/src /app/src
COPY --from=frontend-build /app/frontend/.output/public /app/frontend_dist
ENV PATH="/app/.venv/bin:$PATH"
ENV DATABASE_URL="sqlite:////app/data/cohort.db"
ENV FRONTEND_DIST_DIR="/app/frontend_dist"
RUN mkdir -p /app/data

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["fastapi", "run", "src/backend/main.py", "--port", "8000"]
