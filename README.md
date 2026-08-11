# Session Code Play

A coding practice app: sign in, pick a problem, and grade your Python
solutions server-side (Run against visible tests, Submit against visible +
hidden tests). Your code is saved to your account per problem. See
[docs/specs.md](docs/specs.md) for the full technical spec.

## Stack

- **Backend:** FastAPI + SQLAlchemy (Python, managed with [uv](https://docs.astral.sh/uv/))
- **Frontend:** TanStack Start (React) + CodeMirror

## Getting started

```bash
make install   # install backend and frontend dependencies
make dev       # run backend (:8000) and frontend (:3000) together
```

Or individually: `make backend`, `make frontend`. Run `make help` for all commands.

## Docker

```bash
docker build -t session-code-play .
docker run -p 8000:8000 -v $(pwd)/data:/app/data session-code-play
```

Builds the frontend as static files and serves them from the backend on `:8000`. The
`-v` bind mount persists the SQLite database (`data/cohort.db`) across container runs.

## Tests

```bash
cd backend && uv run pytest
```
