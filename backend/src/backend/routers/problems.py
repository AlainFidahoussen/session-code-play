from fastapi import APIRouter, HTTPException, status

from backend.executor import ExecutionError, run_tests
from backend.models import (
    HiddenTestResult,
    Problem,
    RunRequest,
    RunResponse,
    SubmitResponse,
    VisibleTestResult,
)
from backend.store import problem_store

router = APIRouter(prefix="/api/problems", tags=["problems"])


@router.get("", response_model=list[Problem], response_model_by_alias=True)
def list_problems() -> list[Problem]:
    return problem_store.list()


def _get_problem_or_404(problem_id: str) -> Problem:
    problem = problem_store.get(problem_id)
    if problem is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return problem


@router.post("/{problem_id}/run", response_model=RunResponse, response_model_by_alias=True)
def run_problem(problem_id: str, body: RunRequest) -> RunResponse:
    problem = _get_problem_or_404(problem_id)
    try:
        outcomes = run_tests(body.code, problem.function_name, problem.visible_tests)
    except ExecutionError as exc:
        return RunResponse(results=[], allPassed=False, error=str(exc))

    results = [
        VisibleTestResult(
            index=i,
            passed=outcome.passed,
            input=test.input,
            expected=test.expected,
            actual=outcome.actual,
            error=outcome.error,
            stdout=outcome.stdout,
        )
        for i, (test, outcome) in enumerate(zip(problem.visible_tests, outcomes, strict=True))
    ]
    return RunResponse(results=results, allPassed=all(r.passed for r in results))


@router.post("/{problem_id}/submit", response_model=SubmitResponse, response_model_by_alias=True)
def submit_problem(problem_id: str, body: RunRequest) -> SubmitResponse:
    problem = _get_problem_or_404(problem_id)
    hidden_tests = problem_store.hidden_tests(problem_id)
    all_tests = problem.visible_tests + hidden_tests

    try:
        outcomes = run_tests(body.code, problem.function_name, all_tests)
    except ExecutionError as exc:
        return SubmitResponse(
            visible=[],
            hidden=[],
            passedCount=0,
            totalCount=len(all_tests),
            allPassed=False,
            error=str(exc),
        )

    visible_count = len(problem.visible_tests)
    visible = [
        VisibleTestResult(
            index=i,
            passed=outcome.passed,
            input=test.input,
            expected=test.expected,
            actual=outcome.actual,
            error=outcome.error,
            stdout=outcome.stdout,
        )
        for i, (test, outcome) in enumerate(
            zip(problem.visible_tests, outcomes[:visible_count], strict=True)
        )
    ]
    hidden = [
        HiddenTestResult(index=visible_count + i, passed=outcome.passed, error=outcome.error)
        for i, outcome in enumerate(outcomes[visible_count:])
    ]
    passed_count = sum(1 for r in visible if r.passed) + sum(1 for r in hidden if r.passed)
    return SubmitResponse(
        visible=visible,
        hidden=hidden,
        passedCount=passed_count,
        totalCount=len(all_tests),
        allPassed=passed_count == len(all_tests),
    )
