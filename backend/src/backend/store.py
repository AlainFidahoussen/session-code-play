"""In-memory session and problem storage.

Sessions are ephemeral per `docs/specs.md` §2: no persistent storage, TTL-based
expiry. A real deployment would back this with Redis; this in-memory store is
the process-local stand-in described in the OpenAPI spec.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from backend.models import Difficulty, Problem, SessionMeta, TestCase

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
                "twice.\n\n"
                "Example 1:\n"
                "Input: nums = [2, 7, 11, 15], target = 9\n"
                "Output: [0, 1]\n"
                "Explanation: nums[0] + nums[1] == 9, so return [0, 1].\n\n"
                "Example 2:\n"
                "Input: nums = [3, 2, 4], target = 6\n"
                "Output: [1, 2]\n\n"
                "Example 3:\n"
                "Input: nums = [3, 3], target = 6\n"
                "Output: [0, 1]"
            ),
            functionName="two_sum",
            prototype="def two_sum(nums, target):\n    pass\n",
            visibleTests=[
                TestCase(input=[[2, 7, 11, 15], 9], expected=[0, 1]),
                TestCase(input=[[3, 2, 4], 6], expected=[1, 2]),
            ],
        ),
        Problem(
            id="valid-parentheses",
            title="Valid Parentheses",
            difficulty=Difficulty.easy,
            description=(
                "Given a string `s` containing just the characters '(', ')', '{', '}', "
                "'[' and ']', determine if the input string is valid.\n\n"
                "Brackets must close in the correct order and every opening bracket must "
                "have a matching closing bracket of the same type.\n\n"
                "Example 1:\n"
                "Input: s = \"()\"\n"
                "Output: true\n\n"
                "Example 2:\n"
                "Input: s = \"()[]{}\"\n"
                "Output: true\n\n"
                "Example 3:\n"
                "Input: s = \"(]\"\n"
                "Output: false\n"
                "Explanation: The '(' is closed by ']' instead of ')'.\n\n"
                "Example 4:\n"
                "Input: s = \"\"\n"
                "Output: true\n"
                "Explanation: An empty string has no unmatched brackets."
            ),
            functionName="is_valid",
            prototype="def is_valid(s):\n    pass\n",
            visibleTests=[
                TestCase(input=["()"], expected=True),
                TestCase(input=["()[]{}"], expected=True),
            ],
        ),
        Problem(
            id="merge-intervals",
            title="Merge Intervals",
            difficulty=Difficulty.medium,
            description=(
                "Given an array of intervals where `intervals[i] = [start, end]`, merge "
                "all overlapping intervals and return an array of the non-overlapping "
                "intervals that cover all the intervals in the input.\n\n"
                "Example 1:\n"
                "Input: intervals = [[1, 3], [2, 6], [8, 10], [15, 18]]\n"
                "Output: [[1, 6], [8, 10], [15, 18]]\n"
                "Explanation: [1, 3] and [2, 6] overlap, so they merge into [1, 6].\n\n"
                "Example 2:\n"
                "Input: intervals = [[1, 4], [4, 5]]\n"
                "Output: [[1, 5]]\n"
                "Explanation: Intervals [1, 4] and [4, 5] are considered overlapping "
                "because they touch at 4."
            ),
            functionName="merge",
            prototype="def merge(intervals):\n    pass\n",
            visibleTests=[
                TestCase(
                    input=[[[1, 3], [2, 6], [8, 10], [15, 18]]],
                    expected=[[1, 6], [8, 10], [15, 18]],
                ),
            ],
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
                "exists.\n\n"
                "Example 1:\n"
                "Input: beginWord = \"hit\", endWord = \"cog\", "
                "wordList = [\"hot\", \"dot\", \"dog\", \"lot\", \"log\", \"cog\"]\n"
                "Output: 5\n"
                "Explanation: One shortest transformation sequence is "
                "\"hit\" -> \"hot\" -> \"dot\" -> \"dog\" -> \"cog\", which has 5 words.\n\n"
                "Example 2:\n"
                "Input: beginWord = \"hit\", endWord = \"cog\", "
                "wordList = [\"hot\", \"dot\", \"dog\", \"lot\", \"log\"]\n"
                "Output: 0\n"
                "Explanation: endWord \"cog\" is not in wordList, so no valid "
                "transformation sequence exists."
            ),
            functionName="ladder_length",
            prototype="def ladder_length(begin_word, end_word, word_list):\n    pass\n",
            visibleTests=[
                TestCase(
                    input=["hit", "cog", ["hot", "dot", "dog", "lot", "log", "cog"]],
                    expected=5,
                ),
            ],
        ),
    ]


# Never serialized in a Problem response — only used server-side by the
# executor when grading a `/submit`, so candidates can't read them from the
# network tab.
_HIDDEN_TESTS: dict[str, list[TestCase]] = {
    "two-sum": [
        TestCase(input=[[3, 3], 6], expected=[0, 1]),
        TestCase(input=[[1, 2, 3, 4, 5], 9], expected=[3, 4]),
        TestCase(input=[[-3, 4, 3, 90], 0], expected=[0, 2]),
    ],
    "valid-parentheses": [
        TestCase(input=["(]"], expected=False),
        TestCase(input=["([)]"], expected=False),
        TestCase(input=["{[]}"], expected=True),
        TestCase(input=[""], expected=True),
    ],
    "merge-intervals": [
        TestCase(input=[[[1, 4], [4, 5]]], expected=[[1, 5]]),
        TestCase(input=[[[1, 4], [0, 4]]], expected=[[0, 4]]),
        TestCase(input=[[[1, 4], [2, 3]]], expected=[[1, 4]]),
    ],
    "word-ladder": [
        TestCase(input=["hit", "cog", ["hot", "dot", "dog", "lot", "log"]], expected=0),
        TestCase(input=["a", "c", ["a", "b", "c"]], expected=3),
    ],
}


class ProblemStore:
    def __init__(self) -> None:
        self._problems: list[Problem] = _seed_problems()
        self._hidden_tests = _HIDDEN_TESTS

    def list(self) -> list[Problem]:
        return self._problems

    def get(self, problem_id: str) -> Problem | None:
        return next((p for p in self._problems if p.id == problem_id), None)

    def hidden_tests(self, problem_id: str) -> list[TestCase]:
        return self._hidden_tests.get(problem_id, [])


session_store = SessionStore()
problem_store = ProblemStore()
