import os
import tempfile

# Must be set before `backend.db` is imported anywhere (including
# transitively via `backend.main`), so tests run against an isolated
# database rather than the dev SQLite file.
os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.NamedTemporaryFile(suffix='.db').name}"

import pytest
from fastapi.testclient import TestClient

from backend.db import Base, engine
from backend.main import app
from backend.store import _ensure_problems_seeded


@pytest.fixture(autouse=True)
def _reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    _ensure_problems_seeded()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def auth_token(client: TestClient) -> str:
    resp = client.post("/api/auth/signup", json={"username": "tester", "password": "password123"})
    assert resp.status_code == 201
    return resp.json()["token"]


@pytest.fixture
def auth_headers(auth_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {auth_token}"}
