from fastapi.testclient import TestClient


def _signup(client: TestClient, username: str) -> dict[str, str]:
    resp = client.post("/api/auth/signup", json={"username": username, "password": "password123"})
    token = resp.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_get_answer_404_when_unsaved(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.get("/api/answers/two-sum", headers=auth_headers)

    assert resp.status_code == 404


def test_save_then_get_round_trips(client: TestClient, auth_headers: dict[str, str]) -> None:
    code = "def two_sum(nums, target):\n    return [0, 1]\n"

    save_resp = client.put("/api/answers/two-sum", json={"code": code}, headers=auth_headers)
    assert save_resp.status_code == 200
    assert save_resp.json()["code"] == code
    assert save_resp.json()["problemId"] == "two-sum"

    get_resp = client.get("/api/answers/two-sum", headers=auth_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["code"] == code


def test_save_overwrites_previous_answer(client: TestClient, auth_headers: dict[str, str]) -> None:
    client.put("/api/answers/two-sum", json={"code": "first"}, headers=auth_headers)
    client.put("/api/answers/two-sum", json={"code": "second"}, headers=auth_headers)

    resp = client.get("/api/answers/two-sum", headers=auth_headers)

    assert resp.json()["code"] == "second"


def test_save_404_for_unknown_problem(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.put("/api/answers/does-not-exist", json={"code": "x"}, headers=auth_headers)

    assert resp.status_code == 404


def test_answers_are_isolated_per_user(client: TestClient) -> None:
    alice_headers = _signup(client, "alice")
    bob_headers = _signup(client, "bob")

    client.put("/api/answers/two-sum", json={"code": "alice's code"}, headers=alice_headers)
    client.put("/api/answers/two-sum", json={"code": "bob's code"}, headers=bob_headers)

    assert client.get("/api/answers/two-sum", headers=alice_headers).json()["code"] == "alice's code"
    assert client.get("/api/answers/two-sum", headers=bob_headers).json()["code"] == "bob's code"


def test_answers_endpoints_require_auth(client: TestClient) -> None:
    assert client.get("/api/answers/two-sum").status_code == 401
    assert client.put("/api/answers/two-sum", json={"code": "x"}).status_code == 401
