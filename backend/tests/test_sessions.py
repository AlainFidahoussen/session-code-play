from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from backend.store import SESSION_TTL, session_store


def test_create_session_returns_meta(client: TestClient) -> None:
    resp = client.post("/api/sessions", json={"title": "Backend · Ana R.", "language": "python"})

    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "Backend · Ana R."
    assert body["language"] == "python"
    assert body["sessionId"]
    assert body["createdAt"] == body["lastActive"]


def test_create_session_defaults_title_when_blank(client: TestClient) -> None:
    resp = client.post("/api/sessions", json={"title": "   ", "language": "python"})

    assert resp.json()["title"] == "Untitled interview"


def test_create_session_defaults_title_when_omitted(client: TestClient) -> None:
    resp = client.post("/api/sessions", json={"language": "javascript"})

    assert resp.status_code == 201
    assert resp.json()["title"] == "Untitled interview"


def test_get_session_returns_created_session(client: TestClient) -> None:
    created = client.post("/api/sessions", json={"language": "python"}).json()

    resp = client.get(f"/api/sessions/{created['sessionId']}")

    assert resp.status_code == 200
    assert resp.json() == created


def test_get_session_404_when_missing(client: TestClient) -> None:
    resp = client.get("/api/sessions/does-not-exist")

    assert resp.status_code == 404


def test_get_session_404_when_expired(client: TestClient) -> None:
    created = client.post("/api/sessions", json={"language": "python"}).json()
    session_id = created["sessionId"]
    expired_time = datetime.now(timezone.utc) - SESSION_TTL - timedelta(seconds=1)
    stale = session_store._sessions[session_id].model_copy(update={"last_active": expired_time})
    session_store._sessions[session_id] = stale

    resp = client.get(f"/api/sessions/{session_id}")

    assert resp.status_code == 404


def test_touch_session_extends_ttl(client: TestClient) -> None:
    created = client.post("/api/sessions", json={"language": "python"}).json()
    session_id = created["sessionId"]
    near_expiry = datetime.now(timezone.utc) - SESSION_TTL + timedelta(seconds=5)
    session_store._sessions[session_id] = session_store._sessions[session_id].model_copy(
        update={"last_active": near_expiry}
    )

    resp = client.post(f"/api/sessions/{session_id}/touch")

    assert resp.status_code == 204
    assert session_store._sessions[session_id].last_active > near_expiry
    assert client.get(f"/api/sessions/{session_id}").status_code == 200


def test_touch_session_404_when_missing(client: TestClient) -> None:
    resp = client.post("/api/sessions/does-not-exist/touch")

    assert resp.status_code == 404
