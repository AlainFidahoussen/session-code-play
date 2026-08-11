from fastapi import APIRouter, Depends, HTTPException, status

from backend.auth import get_current_user
from backend.models import ProblemAnswer, SaveAnswerRequest
from backend.store import AuthenticatedUser, answer_store, problem_store

router = APIRouter(prefix="/api/answers", tags=["answers"])


@router.get("/{problem_id}", response_model=ProblemAnswer, response_model_by_alias=True)
def get_answer(
    problem_id: str, current: AuthenticatedUser = Depends(get_current_user)
) -> ProblemAnswer:
    answer = answer_store.get(current.user_id, problem_id)
    if answer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return answer


@router.put("/{problem_id}", response_model=ProblemAnswer, response_model_by_alias=True)
def save_answer(
    problem_id: str,
    body: SaveAnswerRequest,
    current: AuthenticatedUser = Depends(get_current_user),
) -> ProblemAnswer:
    if problem_store.get(problem_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return answer_store.save(current.user_id, problem_id, body.code)
