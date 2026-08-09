# Session Code Play

An online coding interview platform: create a shareable session, and grade a
candidate's Python solutions server-side (Run against visible tests, Submit
against visible + hidden tests). See [docs/specs.md](docs/specs.md) for the
full technical spec.

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
docker compose up --build
```

Runs the backend on `:8000` and the frontend on `:3000`.

## Tests

```bash
cd backend && uv run pytest
```
