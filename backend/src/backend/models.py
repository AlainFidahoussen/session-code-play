"""Pydantic models mirroring `frontend/src/services/types.ts` and `openapi.yaml`."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class CreateSessionRequest(BaseModel):
    title: str | None = None
    language: str


class SessionMeta(BaseModel):
    session_id: str = Field(alias="sessionId")
    title: str
    language: str
    created_at: datetime = Field(alias="createdAt")
    last_active: datetime = Field(alias="lastActive")

    model_config = {"populate_by_name": True}


class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class Problem(BaseModel):
    id: str
    title: str
    difficulty: Difficulty
    description: str
    starter_code: dict[str, str] = Field(alias="starterCode")

    model_config = {"populate_by_name": True}
