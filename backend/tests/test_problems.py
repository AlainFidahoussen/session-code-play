from fastapi.testclient import TestClient


def test_list_problems_returns_seeded_problems(client: TestClient) -> None:
    resp = client.get("/api/problems")

    assert resp.status_code == 200
    problems = resp.json()
    assert len(problems) > 0
    ids = {p["id"] for p in problems}
    assert "two-sum" in ids

    two_sum = next(p for p in problems if p["id"] == "two-sum")
    assert two_sum["difficulty"] == "easy"
    assert two_sum["functionName"] == "two_sum"
    assert "def two_sum" in two_sum["prototype"]


def test_problem_shape_matches_schema(client: TestClient) -> None:
    problems = client.get("/api/problems").json()

    for problem in problems:
        assert problem["difficulty"] in {"easy", "medium", "hard"}
        assert problem["title"]
        assert problem["description"]
        assert problem["functionName"]
        assert problem["prototype"]
        assert len(problem["visibleTests"]) > 0
        for test in problem["visibleTests"]:
            assert "input" in test
            assert "expected" in test


def test_problem_response_never_leaks_hidden_tests(client: TestClient) -> None:
    problems = client.get("/api/problems").json()

    for problem in problems:
        assert "hiddenTests" not in problem
        assert "hidden_tests" not in problem
