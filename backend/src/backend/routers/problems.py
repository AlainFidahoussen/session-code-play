from fastapi import APIRouter

from backend.models import Problem
from backend.store import problem_store

router = APIRouter(prefix="/api/problems", tags=["problems"])


@router.get("", response_model=list[Problem], response_model_by_alias=True)
def list_problems() -> list[Problem]:
    return problem_store.list()
