"""In-memory session and problem storage.

Sessions are ephemeral per `docs/specs.md` §2: no persistent storage, TTL-based
expiry. A real deployment would back this with Redis; this in-memory store is
the process-local stand-in described in the OpenAPI spec.
"""

import secrets
from datetime import datetime, timedelta, timezone

from backend.models import Difficulty, Problem, SessionMeta

SESSION_TTL = timedelta(hours=4)

# Matches the frontend mock's alphabet (excludes ambiguous chars: l, o, 0, 1).
_ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"


def _generate_id() -> str:
    def block() -> str:
        return "".join(secrets.choice(_ID_ALPHABET) for _ in range(4))

    return f"{block()}-{block()}"


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, SessionMeta] = {}

    def create(self, title: str | None, language: str) -> SessionMeta:
        now = datetime.now(timezone.utc)
        meta = SessionMeta(
            sessionId=_generate_id(),
            title=title.strip() if title and title.strip() else "Untitled interview",
            language=language,
            createdAt=now,
            lastActive=now,
        )
        self._sessions[meta.session_id] = meta
        return meta

    def get(self, session_id: str) -> SessionMeta | None:
        meta = self._sessions.get(session_id)
        if meta is None:
            return None
        if self._is_expired(meta):
            del self._sessions[session_id]
            return None
        return meta

    def touch(self, session_id: str) -> bool:
        meta = self.get(session_id)
        if meta is None:
            return False
        updated = meta.model_copy(update={"last_active": datetime.now(timezone.utc)})
        self._sessions[session_id] = updated
        return True

    @staticmethod
    def _is_expired(meta: SessionMeta) -> bool:
        return datetime.now(timezone.utc) - meta.last_active > SESSION_TTL


def _seed_problems() -> list[Problem]:
    return [
        Problem(
            id="two-sum",
            title="Two Sum",
            difficulty=Difficulty.easy,
            description=(
                "Given an array of integers `nums` and an integer `target`, return the "
                "indices of the two numbers that add up to `target`.\n\n"
                "Assume exactly one solution exists, and the same element may not be used "
                "twice."
            ),
            starterCode={
                "javascript": "function twoSum(nums, target) {\n  \n}\n",
                "typescript": "function twoSum(nums: number[], target: number): number[] {\n  \n}\n",
                "python": "def two_sum(nums, target):\n    pass\n",
            },
        ),
        Problem(
            id="valid-parentheses",
            title="Valid Parentheses",
            difficulty=Difficulty.easy,
            description=(
                "Given a string `s` containing just the characters '(', ')', '{', '}', "
                "'[' and ']', determine if the input string is valid.\n\n"
                "Brackets must close in the correct order and every opening bracket must "
                "have a matching closing bracket of the same type."
            ),
            starterCode={
                "javascript": "function isValid(s) {\n  \n}\n",
                "typescript": "function isValid(s: string): boolean {\n  \n}\n",
                "python": "def is_valid(s):\n    pass\n",
            },
        ),
        Problem(
            id="merge-intervals",
            title="Merge Intervals",
            difficulty=Difficulty.medium,
            description=(
                "Given an array of intervals where `intervals[i] = [start, end]`, merge "
                "all overlapping intervals and return an array of the non-overlapping "
                "intervals that cover all the intervals in the input."
            ),
            starterCode={
                "javascript": "function merge(intervals) {\n  \n}\n",
                "typescript": "function merge(intervals: number[][]): number[][] {\n  \n}\n",
                "python": "def merge(intervals):\n    pass\n",
            },
        ),
        Problem(
            id="lru-cache",
            title="LRU Cache",
            difficulty=Difficulty.medium,
            description=(
                "Design a data structure that follows the Least Recently Used (LRU) "
                "cache eviction policy.\n\n"
                "Implement `get(key)` and `put(key, value)` so both operations run in "
                "O(1) average time."
            ),
            starterCode={
                "javascript": (
                    "class LRUCache {\n  constructor(capacity) {\n    \n  }\n  "
                    "get(key) {\n    \n  }\n  put(key, value) {\n    \n  }\n}\n"
                ),
                "typescript": (
                    "class LRUCache {\n  constructor(capacity: number) {\n    \n  }\n  "
                    "get(key: number): number {\n    return -1;\n  }\n  "
                    "put(key: number, value: number): void {\n    \n  }\n}\n"
                ),
                "python": (
                    "class LRUCache:\n    def __init__(self, capacity):\n        pass\n\n"
                    "    def get(self, key):\n        pass\n\n"
                    "    def put(self, key, value):\n        pass\n"
                ),
            },
        ),
        Problem(
            id="word-ladder",
            title="Word Ladder",
            difficulty=Difficulty.hard,
            description=(
                "Given two words `beginWord` and `endWord`, and a dictionary `wordList`, "
                "return the number of words in the shortest transformation sequence from "
                "`beginWord` to `endWord`, changing only one letter at a time with every "
                "intermediate word present in `wordList`. Return 0 if no such sequence "
                "exists."
            ),
            starterCode={
                "javascript": "function ladderLength(beginWord, endWord, wordList) {\n  \n}\n",
                "typescript": (
                    "function ladderLength(beginWord: string, endWord: string, "
                    "wordList: string[]): number {\n  \n}\n"
                ),
                "python": "def ladder_length(begin_word, end_word, word_list):\n    pass\n",
            },
        ),
    ]


class ProblemStore:
    def __init__(self) -> None:
        self._problems: list[Problem] = _seed_problems()

    def list(self) -> list[Problem]:
        return self._problems


session_store = SessionStore()
problem_store = ProblemStore()
