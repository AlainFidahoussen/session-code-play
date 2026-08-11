"""Pydantic models mirroring `frontend/src/services/types.ts` and `openapi.yaml`."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

type JSONValue = None | bool | int | float | str | list[JSONValue] | dict[str, JSONValue]


class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class TestCase(BaseModel):
    __test__ = False  # not a pytest test class — this name mirrors the frontend's TestCase type

    input: list[JSONValue]
    expected: JSONValue


class Problem(BaseModel):
    id: str
    title: str
    difficulty: Difficulty
    description: str
    function_name: str = Field(alias="functionName")
    prototype: str
    visible_tests: list[TestCase] = Field(alias="visibleTests")

    model_config = {"populate_by_name": True}


class SignupRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    username: str


class ProblemAnswer(BaseModel):
    problem_id: str = Field(alias="problemId")
    code: str
    updated_at: datetime = Field(alias="updatedAt")

    model_config = {"populate_by_name": True}


class SaveAnswerRequest(BaseModel):
    code: str


class RunRequest(BaseModel):
    code: str


class VisibleTestResult(BaseModel):
    index: int
    passed: bool
    input: list[JSONValue]
    expected: JSONValue
    actual: JSONValue = None
    error: str | None = None
    stdout: str = ""


class HiddenTestResult(BaseModel):
    index: int
    passed: bool
    error: str | None = None


class RunResponse(BaseModel):
    results: list[VisibleTestResult]
    all_passed: bool = Field(alias="allPassed")
    error: str | None = None

    model_config = {"populate_by_name": True}


class SubmitResponse(BaseModel):
    visible: list[VisibleTestResult]
    hidden: list[HiddenTestResult]
    passed_count: int = Field(alias="passedCount")
    total_count: int = Field(alias="totalCount")
    all_passed: bool = Field(alias="allPassed")
    error: str | None = None

    model_config = {"populate_by_name": True}
