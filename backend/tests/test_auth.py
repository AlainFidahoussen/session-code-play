from fastapi.testclient import TestClient


def test_signup_returns_token(client: TestClient) -> None:
    resp = client.post("/api/auth/signup", json={"username": "alice", "password": "hunter22"})

    assert resp.status_code == 201
    body = resp.json()
    assert body["username"] == "alice"
    assert body["token"]


def test_signup_duplicate_username_conflicts(client: TestClient) -> None:
    client.post("/api/auth/signup", json={"username": "alice", "password": "hunter22"})

    resp = client.post("/api/auth/signup", json={"username": "alice", "password": "different1"})

    assert resp.status_code == 409


def test_login_with_correct_password(client: TestClient) -> None:
    client.post("/api/auth/signup", json={"username": "alice", "password": "hunter22"})

    resp = client.post("/api/auth/login", json={"username": "alice", "password": "hunter22"})

    assert resp.status_code == 200
    assert resp.json()["username"] == "alice"


def test_login_with_wrong_password(client: TestClient) -> None:
    client.post("/api/auth/signup", json={"username": "alice", "password": "hunter22"})

    resp = client.post("/api/auth/login", json={"username": "alice", "password": "wrong-password"})

    assert resp.status_code == 401


def test_login_with_unknown_username(client: TestClient) -> None:
    resp = client.post("/api/auth/login", json={"username": "nobody", "password": "hunter22"})

    assert resp.status_code == 401


def test_protected_endpoint_rejects_missing_token(client: TestClient) -> None:
    resp = client.get("/api/problems")

    assert resp.status_code == 401


def test_protected_endpoint_rejects_garbage_token(client: TestClient) -> None:
    resp = client.get("/api/problems", headers={"Authorization": "Bearer not-a-real-token"})

    assert resp.status_code == 401


def test_me_returns_current_user(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.get("/api/auth/me", headers=auth_headers)

    assert resp.status_code == 200
    assert resp.json()["username"] == "tester"


def test_logout_invalidates_token(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.post("/api/auth/logout", headers=auth_headers)
    assert resp.status_code == 204

    resp = client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 401
