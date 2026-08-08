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
    assert "python" in two_sum["starterCode"]


def test_problem_shape_matches_schema(client: TestClient) -> None:
    problems = client.get("/api/problems").json()

    for problem in problems:
        assert problem["difficulty"] in {"easy", "medium", "hard"}
        assert isinstance(problem["starterCode"], dict)
        assert problem["title"]
        assert problem["description"]
