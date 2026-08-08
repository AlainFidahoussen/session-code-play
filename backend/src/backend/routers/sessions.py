from fastapi import APIRouter, HTTPException, Response, status

from backend.models import CreateSessionRequest, SessionMeta
from backend.store import session_store

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SessionMeta, response_model_by_alias=True)
def create_session(body: CreateSessionRequest) -> SessionMeta:
    return session_store.create(body.title, body.language)


@router.get("/{session_id}", response_model=SessionMeta, response_model_by_alias=True)
def get_session(session_id: str) -> SessionMeta:
    meta = session_store.get(session_id)
    if meta is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return meta


@router.post("/{session_id}/touch", status_code=status.HTTP_204_NO_CONTENT)
def touch_session(session_id: str) -> Response:
    if not session_store.touch(session_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
