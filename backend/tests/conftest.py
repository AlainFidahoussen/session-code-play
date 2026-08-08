import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.store import session_store


@pytest.fixture(autouse=True)
def _reset_session_store() -> None:
    session_store._sessions.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
