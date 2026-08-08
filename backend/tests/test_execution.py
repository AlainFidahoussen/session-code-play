import pytest
from fastapi.testclient import TestClient

from backend.executor import ExecutionError, run_tests
from backend.models import TestCase

CORRECT_TWO_SUM = (
    "def two_sum(nums, target):\n"
    "    seen = {}\n"
    "    for i, n in enumerate(nums):\n"
    "        if target - n in seen:\n"
    "            return [seen[target - n], i]\n"
    "        seen[n] = i\n"
    "    return []\n"
)

WRONG_TWO_SUM = "def two_sum(nums, target):\n    return [0, 0]\n"

SYNTAX_ERROR_CODE = "def two_sum(nums, target)\n    pass\n"

PRINTING_TWO_SUM = (
    "def two_sum(nums, target):\n"
    "    print('debugging', nums, target)\n"
    "    seen = {}\n"
    "    for i, n in enumerate(nums):\n"
    "        if target - n in seen:\n"
    "            return [seen[target - n], i]\n"
    "        seen[n] = i\n"
    "    return []\n"
)


def test_run_with_correct_solution_passes_visible_tests(client: TestClient) -> None:
    resp = client.post("/api/problems/two-sum/run", json={"code": CORRECT_TWO_SUM})

    assert resp.status_code == 200
    body = resp.json()
    assert body["error"] is None
    assert body["allPassed"] is True
    assert len(body["results"]) == 2
    for result in body["results"]:
        assert result["passed"] is True
        assert result["actual"] == result["expected"]


def test_run_captures_print_output_for_debugging(client: TestClient) -> None:
    resp = client.post("/api/problems/two-sum/run", json={"code": PRINTING_TWO_SUM})

    assert resp.status_code == 200
    body = resp.json()
    for result in body["results"]:
        assert "debugging" in result["stdout"]


def test_submit_never_leaks_stdout_for_hidden_tests(client: TestClient) -> None:
    resp = client.post("/api/problems/two-sum/submit", json={"code": PRINTING_TWO_SUM})

    assert resp.status_code == 200
    body = resp.json()
    for hidden_result in body["hidden"]:
        assert "stdout" not in hidden_result
    for visible_result in body["visible"]:
        assert "debugging" in visible_result["stdout"]


def test_run_with_wrong_solution_reports_failures(client: TestClient) -> None:
    resp = client.post("/api/problems/two-sum/run", json={"code": WRONG_TWO_SUM})

    assert resp.status_code == 200
    body = resp.json()
    assert body["allPassed"] is False
    assert any(not r["passed"] for r in body["results"])


def test_run_with_syntax_error_returns_error_not_500(client: TestClient) -> None:
    resp = client.post("/api/problems/two-sum/run", json={"code": SYNTAX_ERROR_CODE})

    assert resp.status_code == 200
    body = resp.json()
    assert body["results"] == []
    assert body["allPassed"] is False
    assert "SyntaxError" in body["error"]


def test_run_unknown_problem_returns_404(client: TestClient) -> None:
    resp = client.post("/api/problems/does-not-exist/run", json={"code": CORRECT_TWO_SUM})

    assert resp.status_code == 404


def test_submit_grades_hidden_tests_without_leaking_their_data(client: TestClient) -> None:
    resp = client.post("/api/problems/two-sum/submit", json={"code": CORRECT_TWO_SUM})

    assert resp.status_code == 200
    body = resp.json()
    assert body["allPassed"] is True
    assert body["passedCount"] == body["totalCount"]
    assert len(body["visible"]) == 2
    assert len(body["hidden"]) == 3

    for hidden_result in body["hidden"]:
        assert set(hidden_result.keys()) == {"index", "passed", "error"}
        assert "input" not in hidden_result
        assert "expected" not in hidden_result
        assert "actual" not in hidden_result


def test_submit_unknown_problem_returns_404(client: TestClient) -> None:
    resp = client.post("/api/problems/does-not-exist/submit", json={"code": CORRECT_TWO_SUM})

    assert resp.status_code == 404


def test_executor_reports_missing_function() -> None:
    with pytest.raises(ExecutionError, match="not defined"):
        run_tests("x = 1", "two_sum", [TestCase(input=[[1, 2], 3], expected=[0, 1])])


def test_executor_times_out_on_infinite_loop() -> None:
    infinite_loop = "def slow(n):\n    while True:\n        pass\n"
    with pytest.raises(ExecutionError, match="timed out"):
        run_tests(
            infinite_loop,
            "slow",
            [TestCase(input=[1], expected=1)],
            timeout_seconds=0.5,
        )
