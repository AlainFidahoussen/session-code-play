"""SQLAlchemy ORM models backing `backend.store`."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.db import Base
from backend.models import JSONValue


class ProblemRecord(Base):
    __tablename__ = "problems"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    difficulty: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    function_name: Mapped[str] = mapped_column(String, nullable=False)
    prototype: Mapped[str] = mapped_column(Text, nullable=False)
    visible_tests: Mapped[list[dict[str, JSONValue]]] = mapped_column(JSON, nullable=False)
    hidden_tests: Mapped[list[dict[str, JSONValue]]] = mapped_column(JSON, nullable=False)


class UserRecord(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    username: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class AuthTokenRecord(Base):
    __tablename__ = "auth_tokens"

    token: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ProblemAnswerRecord(Base):
    __tablename__ = "problem_answers"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    problem_id: Mapped[str] = mapped_column(ForeignKey("problems.id"), primary_key=True)
    code: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
