"""Session and problem storage, backed by a SQL database via SQLAlchemy.

Sessions remain ephemeral per `docs/specs.md` §2 (TTL-based expiry), but are
now persisted through `backend.db` instead of an in-process dict, so state
survives process restarts. The database backend is configurable via the
`DATABASE_URL` environment variable — SQLite by default, with Postgres (or
any other SQLAlchemy-supported database) a drop-in swap.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from backend.db import SessionLocal, init_db
from backend.db_models import ProblemRecord, SessionRecord
from backend.models import Difficulty, Problem, SessionMeta, TestCase

SESSION_TTL = timedelta(hours=4)

# Matches the frontend mock's alphabet (excludes ambiguous chars: l, o, 0, 1).
_ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"


def _generate_id() -> str:
    def block() -> str:
        return "".join(secrets.choice(_ID_ALPHABET) for _ in range(4))

    return f"{block()}-{block()}"


def _as_utc(dt: datetime) -> datetime:
    """SQLite drops tzinfo on round-trip; every stored datetime is UTC."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def _to_meta(record: SessionRecord) -> SessionMeta:
    return SessionMeta(
        sessionId=record.session_id,
        title=record.title,
        language=record.language,
        createdAt=_as_utc(record.created_at),
        lastActive=_as_utc(record.last_active),
    )


class SessionStore:
    def create(self, title: str | None, language: str) -> SessionMeta:
        now = datetime.now(timezone.utc)
        record = SessionRecord(
            session_id=_generate_id(),
            title=title.strip() if title and title.strip() else "Untitled interview",
            language=language,
            created_at=now,
            last_active=now,
        )
        with SessionLocal() as db:
            db.add(record)
            db.commit()
            return _to_meta(record)

    def get(self, session_id: str) -> SessionMeta | None:
        with SessionLocal() as db:
            record = db.get(SessionRecord, session_id)
            if record is None:
                return None
            if self._is_expired(record):
                db.delete(record)
                db.commit()
                return None
            return _to_meta(record)

    def touch(self, session_id: str) -> bool:
        with SessionLocal() as db:
            record = db.get(SessionRecord, session_id)
            if record is None or self._is_expired(record):
                if record is not None:
                    db.delete(record)
                    db.commit()
                return False
            record.last_active = datetime.now(timezone.utc)
            db.commit()
            return True

    @staticmethod
    def _is_expired(record: SessionRecord) -> bool:
        return datetime.now(timezone.utc) - _as_utc(record.last_active) > SESSION_TTL


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
        Problem(
            id="best-time-to-buy-sell-stock",
            title="Best Time to Buy and Sell Stock",
            difficulty=Difficulty.easy,
            description=(
                "You are given an array `prices` where `prices[i]` is the price of a "
                "stock on day `i`. You want to maximize profit by choosing a single day "
                "to buy and a different, later day to sell. Return the maximum profit "
                "achievable, or 0 if no profit is possible.\n\n"
                "Example 1:\n"
                "Input: prices = [7, 1, 5, 3, 6, 4]\n"
                "Output: 5\n"
                "Explanation: Buy on day 2 (price 1) and sell on day 5 (price 6), "
                "profit = 6 - 1 = 5.\n\n"
                "Example 2:\n"
                "Input: prices = [7, 6, 4, 3, 1]\n"
                "Output: 0\n"
                "Explanation: Prices only fall, so no transaction is profitable."
            ),
            functionName="max_profit",
            prototype="def max_profit(prices):\n    pass\n",
            visibleTests=[
                TestCase(input=[[7, 1, 5, 3, 6, 4]], expected=5),
                TestCase(input=[[7, 6, 4, 3, 1]], expected=0),
            ],
        ),
        Problem(
            id="contains-duplicate",
            title="Contains Duplicate",
            difficulty=Difficulty.easy,
            description=(
                "Given an integer array `nums`, return `true` if any value appears at "
                "least twice, and `false` if every element is distinct.\n\n"
                "Example 1:\n"
                "Input: nums = [1, 2, 3, 1]\n"
                "Output: true\n\n"
                "Example 2:\n"
                "Input: nums = [1, 2, 3, 4]\n"
                "Output: false"
            ),
            functionName="contains_duplicate",
            prototype="def contains_duplicate(nums):\n    pass\n",
            visibleTests=[
                TestCase(input=[[1, 2, 3, 1]], expected=True),
                TestCase(input=[[1, 2, 3, 4]], expected=False),
            ],
        ),
        Problem(
            id="single-number",
            title="Single Number",
            difficulty=Difficulty.easy,
            description=(
                "Given a non-empty array of integers `nums` where every element appears "
                "exactly twice except for one, find that single one. Your solution "
                "should run in linear time using constant extra space.\n\n"
                "Example 1:\n"
                "Input: nums = [2, 2, 1]\n"
                "Output: 1\n\n"
                "Example 2:\n"
                "Input: nums = [4, 1, 2, 1, 2]\n"
                "Output: 4"
            ),
            functionName="single_number",
            prototype="def single_number(nums):\n    pass\n",
            visibleTests=[
                TestCase(input=[[2, 2, 1]], expected=1),
                TestCase(input=[[4, 1, 2, 1, 2]], expected=4),
            ],
        ),
        Problem(
            id="missing-number",
            title="Missing Number",
            difficulty=Difficulty.easy,
            description=(
                "Given an array `nums` containing `n` distinct numbers taken from the "
                "range `[0, n]`, return the one number in that range missing from the "
                "array.\n\n"
                "Example 1:\n"
                "Input: nums = [3, 0, 1]\n"
                "Output: 2\n"
                "Explanation: n = 3, so the range is [0, 3]. 2 is the missing number.\n\n"
                "Example 2:\n"
                "Input: nums = [0, 1]\n"
                "Output: 2"
            ),
            functionName="missing_number",
            prototype="def missing_number(nums):\n    pass\n",
            visibleTests=[
                TestCase(input=[[3, 0, 1]], expected=2),
                TestCase(input=[[0, 1]], expected=2),
            ],
        ),
        Problem(
            id="climbing-stairs",
            title="Climbing Stairs",
            difficulty=Difficulty.easy,
            description=(
                "You are climbing a staircase with `n` steps. Each move you can climb "
                "either 1 or 2 steps. Return the number of distinct ways to reach the "
                "top.\n\n"
                "Example 1:\n"
                "Input: n = 2\n"
                "Output: 2\n"
                "Explanation: 1+1 or 2.\n\n"
                "Example 2:\n"
                "Input: n = 3\n"
                "Output: 3\n"
                "Explanation: 1+1+1, 1+2, or 2+1."
            ),
            functionName="climb_stairs",
            prototype="def climb_stairs(n):\n    pass\n",
            visibleTests=[
                TestCase(input=[2], expected=2),
                TestCase(input=[3], expected=3),
            ],
        ),
        Problem(
            id="majority-element",
            title="Majority Element",
            difficulty=Difficulty.easy,
            description=(
                "Given an array `nums` of size `n`, return the majority element — the "
                "element that appears more than `n / 2` times. You may assume the "
                "majority element always exists.\n\n"
                "Example 1:\n"
                "Input: nums = [3, 2, 3]\n"
                "Output: 3\n\n"
                "Example 2:\n"
                "Input: nums = [2, 2, 1, 1, 1, 2, 2]\n"
                "Output: 2"
            ),
            functionName="majority_element",
            prototype="def majority_element(nums):\n    pass\n",
            visibleTests=[
                TestCase(input=[[3, 2, 3]], expected=3),
                TestCase(input=[[2, 2, 1, 1, 1, 2, 2]], expected=2),
            ],
        ),
        Problem(
            id="valid-anagram",
            title="Valid Anagram",
            difficulty=Difficulty.easy,
            description=(
                "Given two strings `s` and `t`, return `true` if `t` is an anagram of "
                "`s` (uses exactly the same letters with the same frequencies), and "
                "`false` otherwise.\n\n"
                "Example 1:\n"
                "Input: s = \"anagram\", t = \"nagaram\"\n"
                "Output: true\n\n"
                "Example 2:\n"
                "Input: s = \"rat\", t = \"car\"\n"
                "Output: false"
            ),
            functionName="is_anagram",
            prototype="def is_anagram(s, t):\n    pass\n",
            visibleTests=[
                TestCase(input=["anagram", "nagaram"], expected=True),
                TestCase(input=["rat", "car"], expected=False),
            ],
        ),
        Problem(
            id="binary-search",
            title="Binary Search",
            difficulty=Difficulty.easy,
            description=(
                "Given a sorted array of distinct integers `nums` and an integer "
                "`target`, return the index of `target` in `nums`, or -1 if it is not "
                "present. Your solution must run in `O(log n)` time.\n\n"
                "Example 1:\n"
                "Input: nums = [-1, 0, 3, 5, 9, 12], target = 9\n"
                "Output: 4\n\n"
                "Example 2:\n"
                "Input: nums = [-1, 0, 3, 5, 9, 12], target = 2\n"
                "Output: -1"
            ),
            functionName="search",
            prototype="def search(nums, target):\n    pass\n",
            visibleTests=[
                TestCase(input=[[-1, 0, 3, 5, 9, 12], 9], expected=4),
                TestCase(input=[[-1, 0, 3, 5, 9, 12], 2], expected=-1),
            ],
        ),
        Problem(
            id="product-of-array-except-self",
            title="Product of Array Except Self",
            difficulty=Difficulty.medium,
            description=(
                "Given an integer array `nums`, return an array `answer` where "
                "`answer[i]` is the product of all elements of `nums` except "
                "`nums[i]`, without using division. Solve it in `O(n)` time.\n\n"
                "Example 1:\n"
                "Input: nums = [1, 2, 3, 4]\n"
                "Output: [24, 12, 8, 6]\n\n"
                "Example 2:\n"
                "Input: nums = [-1, 1, 0, -3, 3]\n"
                "Output: [0, 0, 9, 0, 0]"
            ),
            functionName="product_except_self",
            prototype="def product_except_self(nums):\n    pass\n",
            visibleTests=[
                TestCase(input=[[1, 2, 3, 4]], expected=[24, 12, 8, 6]),
                TestCase(input=[[-1, 1, 0, -3, 3]], expected=[0, 0, 9, 0, 0]),
            ],
        ),
        Problem(
            id="longest-substring-without-repeating",
            title="Longest Substring Without Repeating Characters",
            difficulty=Difficulty.medium,
            description=(
                "Given a string `s`, return the length of the longest substring "
                "without repeating characters.\n\n"
                "Example 1:\n"
                "Input: s = \"abcabcbb\"\n"
                "Output: 3\n"
                "Explanation: The answer is \"abc\", with length 3.\n\n"
                "Example 2:\n"
                "Input: s = \"bbbbb\"\n"
                "Output: 1\n"
                "Explanation: The answer is \"b\", with length 1."
            ),
            functionName="length_of_longest_substring",
            prototype="def length_of_longest_substring(s):\n    pass\n",
            visibleTests=[
                TestCase(input=["abcabcbb"], expected=3),
                TestCase(input=["bbbbb"], expected=1),
            ],
        ),
        Problem(
            id="maximum-subarray",
            title="Maximum Subarray",
            difficulty=Difficulty.medium,
            description=(
                "Given an integer array `nums`, find the contiguous non-empty "
                "subarray with the largest sum, and return that sum.\n\n"
                "Example 1:\n"
                "Input: nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]\n"
                "Output: 6\n"
                "Explanation: The subarray [4, -1, 2, 1] has the largest sum 6.\n\n"
                "Example 2:\n"
                "Input: nums = [1]\n"
                "Output: 1"
            ),
            functionName="max_subarray",
            prototype="def max_subarray(nums):\n    pass\n",
            visibleTests=[
                TestCase(input=[[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected=6),
                TestCase(input=[[1]], expected=1),
            ],
        ),
        Problem(
            id="group-anagrams",
            title="Group Anagrams",
            difficulty=Difficulty.medium,
            description=(
                "Given an array of strings `strs`, group the anagrams together. To "
                "keep the output deterministic: sort the words within each group "
                "alphabetically, then sort the groups by their first word "
                "alphabetically.\n\n"
                "Example 1:\n"
                "Input: strs = [\"eat\", \"tea\", \"tan\", \"ate\", \"nat\", \"bat\"]\n"
                "Output: [[\"ate\", \"eat\", \"tea\"], [\"bat\"], [\"nat\", \"tan\"]]\n\n"
                "Example 2:\n"
                "Input: strs = [\"\"]\n"
                "Output: [[\"\"]]"
            ),
            functionName="group_anagrams",
            prototype="def group_anagrams(strs):\n    pass\n",
            visibleTests=[
                TestCase(
                    input=[["eat", "tea", "tan", "ate", "nat", "bat"]],
                    expected=[["ate", "eat", "tea"], ["bat"], ["nat", "tan"]],
                ),
                TestCase(input=[[""]], expected=[[""]]),
            ],
        ),
        Problem(
            id="number-of-islands",
            title="Number of Islands",
            difficulty=Difficulty.medium,
            description=(
                "Given an `m x n` 2D grid of `\"1\"` (land) and `\"0\"` (water), return "
                "the number of islands, where an island is formed by connecting "
                "adjacent land cells horizontally or vertically.\n\n"
                "Example 1:\n"
                "Input: grid = [\n"
                "  [\"1\",\"1\",\"1\",\"1\",\"0\"],\n"
                "  [\"1\",\"1\",\"0\",\"1\",\"0\"],\n"
                "  [\"1\",\"1\",\"0\",\"0\",\"0\"],\n"
                "  [\"0\",\"0\",\"0\",\"0\",\"0\"]\n"
                "]\n"
                "Output: 1\n\n"
                "Example 2:\n"
                "Input: grid = [\n"
                "  [\"1\",\"1\",\"0\",\"0\",\"0\"],\n"
                "  [\"1\",\"1\",\"0\",\"0\",\"0\"],\n"
                "  [\"0\",\"0\",\"1\",\"0\",\"0\"],\n"
                "  [\"0\",\"0\",\"0\",\"1\",\"1\"]\n"
                "]\n"
                "Output: 3"
            ),
            functionName="num_islands",
            prototype="def num_islands(grid):\n    pass\n",
            visibleTests=[
                TestCase(
                    input=[
                        [
                            ["1", "1", "1", "1", "0"],
                            ["1", "1", "0", "1", "0"],
                            ["1", "1", "0", "0", "0"],
                            ["0", "0", "0", "0", "0"],
                        ]
                    ],
                    expected=1,
                ),
                TestCase(
                    input=[
                        [
                            ["1", "1", "0", "0", "0"],
                            ["1", "1", "0", "0", "0"],
                            ["0", "0", "1", "0", "0"],
                            ["0", "0", "0", "1", "1"],
                        ]
                    ],
                    expected=3,
                ),
            ],
        ),
        Problem(
            id="coin-change",
            title="Coin Change",
            difficulty=Difficulty.medium,
            description=(
                "Given an array of coin denominations `coins` and a target `amount`, "
                "return the fewest number of coins needed to make up that amount. If "
                "the amount cannot be made up, return -1. Assume an unlimited supply "
                "of each coin.\n\n"
                "Example 1:\n"
                "Input: coins = [1, 2, 5], amount = 11\n"
                "Output: 3\n"
                "Explanation: 11 = 5 + 5 + 1.\n\n"
                "Example 2:\n"
                "Input: coins = [2], amount = 3\n"
                "Output: -1"
            ),
            functionName="coin_change",
            prototype="def coin_change(coins, amount):\n    pass\n",
            visibleTests=[
                TestCase(input=[[1, 2, 5], 11], expected=3),
                TestCase(input=[[2], 3], expected=-1),
            ],
        ),
        Problem(
            id="house-robber",
            title="House Robber",
            difficulty=Difficulty.medium,
            description=(
                "You are a robber planning to rob houses along a street, each holding "
                "some amount of money in `nums`. Adjacent houses have connected "
                "security systems, so you cannot rob two adjacent houses in the same "
                "night. Return the maximum amount you can rob without alerting the "
                "police.\n\n"
                "Example 1:\n"
                "Input: nums = [1, 2, 3, 1]\n"
                "Output: 4\n"
                "Explanation: Rob house 1 (money = 1) and house 4 (money = 1), then rob "
                "house 3 (money = 3). Total = 1 + 3 = 4.\n\n"
                "Example 2:\n"
                "Input: nums = [2, 7, 9, 3, 1]\n"
                "Output: 12\n"
                "Explanation: Rob house 1 (2), house 3 (9), and house 5 (1). "
                "Total = 2 + 9 + 1 = 12."
            ),
            functionName="rob",
            prototype="def rob(nums):\n    pass\n",
            visibleTests=[
                TestCase(input=[[1, 2, 3, 1]], expected=4),
                TestCase(input=[[2, 7, 9, 3, 1]], expected=12),
            ],
        ),
        Problem(
            id="3sum",
            title="3Sum",
            difficulty=Difficulty.medium,
            description=(
                "Given an integer array `nums`, return all unique triplets "
                "`[nums[i], nums[j], nums[k]]` such that `i`, `j`, `k` are distinct "
                "and the triplet sums to 0. To keep the output deterministic: sort "
                "each triplet in ascending order, then sort the list of triplets "
                "lexicographically ascending.\n\n"
                "Example 1:\n"
                "Input: nums = [-1, 0, 1, 2, -1, -4]\n"
                "Output: [[-1, -1, 2], [-1, 0, 1]]\n\n"
                "Example 2:\n"
                "Input: nums = [0, 1, 1]\n"
                "Output: []\n"
                "Explanation: No triplet sums to 0."
            ),
            functionName="three_sum",
            prototype="def three_sum(nums):\n    pass\n",
            visibleTests=[
                TestCase(
                    input=[[-1, 0, 1, 2, -1, -4]],
                    expected=[[-1, -1, 2], [-1, 0, 1]],
                ),
                TestCase(input=[[0, 1, 1]], expected=[]),
            ],
        ),
        Problem(
            id="trapping-rain-water",
            title="Trapping Rain Water",
            difficulty=Difficulty.hard,
            description=(
                "Given `n` non-negative integers `height` representing an elevation "
                "map where the width of each bar is 1, compute how much water it can "
                "trap after raining.\n\n"
                "Example 1:\n"
                "Input: height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]\n"
                "Output: 6\n\n"
                "Example 2:\n"
                "Input: height = [4, 2, 0, 3, 2, 5]\n"
                "Output: 9"
            ),
            functionName="trap",
            prototype="def trap(height):\n    pass\n",
            visibleTests=[
                TestCase(
                    input=[[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]],
                    expected=6,
                ),
                TestCase(input=[[4, 2, 0, 3, 2, 5]], expected=9),
            ],
        ),
        Problem(
            id="word-break",
            title="Word Break",
            difficulty=Difficulty.hard,
            description=(
                "Given a string `s` and a list of strings `word_dict`, return `true` "
                "if `s` can be segmented into a space-separated sequence of one or "
                "more dictionary words. The same word may be reused any number of "
                "times.\n\n"
                "Example 1:\n"
                "Input: s = \"leetcode\", word_dict = [\"leet\", \"code\"]\n"
                "Output: true\n"
                "Explanation: \"leetcode\" segments into \"leet code\".\n\n"
                "Example 2:\n"
                "Input: s = \"catsandog\", "
                "word_dict = [\"cats\", \"dog\", \"sand\", \"and\", \"cat\"]\n"
                "Output: false"
            ),
            functionName="word_break",
            prototype="def word_break(s, word_dict):\n    pass\n",
            visibleTests=[
                TestCase(input=["leetcode", ["leet", "code"]], expected=True),
                TestCase(
                    input=["catsandog", ["cats", "dog", "sand", "and", "cat"]],
                    expected=False,
                ),
            ],
        ),
        Problem(
            id="edit-distance",
            title="Edit Distance",
            difficulty=Difficulty.hard,
            description=(
                "Given two strings `word1` and `word2`, return the minimum number of "
                "single-character insertions, deletions, or substitutions required to "
                "convert `word1` into `word2`.\n\n"
                "Example 1:\n"
                "Input: word1 = \"horse\", word2 = \"ros\"\n"
                "Output: 3\n"
                "Explanation: horse -> rorse (replace 'h' with 'r') -> rose "
                "(remove 'r') -> ros (remove 'e').\n\n"
                "Example 2:\n"
                "Input: word1 = \"intention\", word2 = \"execution\"\n"
                "Output: 5"
            ),
            functionName="min_distance",
            prototype="def min_distance(word1, word2):\n    pass\n",
            visibleTests=[
                TestCase(input=["horse", "ros"], expected=3),
                TestCase(input=["intention", "execution"], expected=5),
            ],
        ),
        Problem(
            id="longest-increasing-subsequence",
            title="Longest Increasing Subsequence",
            difficulty=Difficulty.hard,
            description=(
                "Given an integer array `nums`, return the length of the longest "
                "strictly increasing subsequence.\n\n"
                "Example 1:\n"
                "Input: nums = [10, 9, 2, 5, 3, 7, 101, 18]\n"
                "Output: 4\n"
                "Explanation: The longest increasing subsequence is [2, 3, 7, 101], "
                "length 4.\n\n"
                "Example 2:\n"
                "Input: nums = [0, 1, 0, 3, 2, 3]\n"
                "Output: 4"
            ),
            functionName="length_of_lis",
            prototype="def length_of_lis(nums):\n    pass\n",
            visibleTests=[
                TestCase(input=[[10, 9, 2, 5, 3, 7, 101, 18]], expected=4),
                TestCase(input=[[0, 1, 0, 3, 2, 3]], expected=4),
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
    "best-time-to-buy-sell-stock": [
        TestCase(input=[[2, 4, 1]], expected=2),
        TestCase(input=[[1, 2]], expected=1),
        TestCase(input=[[3, 3, 3, 3]], expected=0),
    ],
    "contains-duplicate": [
        TestCase(input=[[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]], expected=True),
        TestCase(input=[[]], expected=False),
        TestCase(input=[[5]], expected=False),
    ],
    "single-number": [
        TestCase(input=[[1]], expected=1),
        TestCase(input=[[7, 3, 7]], expected=3),
    ],
    "missing-number": [
        TestCase(input=[[9, 6, 4, 2, 3, 5, 7, 0, 1]], expected=8),
        TestCase(input=[[0]], expected=1),
    ],
    "climbing-stairs": [
        TestCase(input=[1], expected=1),
        TestCase(input=[5], expected=8),
        TestCase(input=[10], expected=89),
    ],
    "majority-element": [
        TestCase(input=[[1]], expected=1),
        TestCase(input=[[6, 5, 5]], expected=5),
    ],
    "valid-anagram": [
        TestCase(input=["a", "a"], expected=True),
        TestCase(input=["ab", "a"], expected=False),
        TestCase(input=["", ""], expected=True),
    ],
    "binary-search": [
        TestCase(input=[[5], 5], expected=0),
        TestCase(input=[[], 1], expected=-1),
        TestCase(input=[[1, 3], 1], expected=0),
    ],
    "product-of-array-except-self": [
        TestCase(input=[[2, 3]], expected=[3, 2]),
        TestCase(input=[[1, 1, 1, 1]], expected=[1, 1, 1, 1]),
    ],
    "longest-substring-without-repeating": [
        TestCase(input=["pwwkew"], expected=3),
        TestCase(input=[""], expected=0),
        TestCase(input=[" "], expected=1),
        TestCase(input=["dvdf"], expected=3),
    ],
    "maximum-subarray": [
        TestCase(input=[[5, 4, -1, 7, 8]], expected=23),
        TestCase(input=[[-1]], expected=-1),
        TestCase(input=[[-2, -1]], expected=-1),
    ],
    "group-anagrams": [
        TestCase(input=[["a"]], expected=[["a"]]),
        TestCase(
            input=[["abc", "bca", "cab", "xyz"]],
            expected=[["abc", "bca", "cab"], ["xyz"]],
        ),
    ],
    "number-of-islands": [
        TestCase(input=[[["0", "0"], ["0", "0"]]], expected=0),
        TestCase(input=[[["1"]]], expected=1),
    ],
    "coin-change": [
        TestCase(input=[[1], 0], expected=0),
        TestCase(input=[[1, 5, 10, 25], 30], expected=2),
        TestCase(input=[[3, 7], 5], expected=-1),
    ],
    "house-robber": [
        TestCase(input=[[2, 1, 1, 2]], expected=4),
        TestCase(input=[[5]], expected=5),
        TestCase(input=[[]], expected=0),
    ],
    "3sum": [
        TestCase(input=[[0, 0, 0]], expected=[[0, 0, 0]]),
        TestCase(input=[[0, 0, 0, 0]], expected=[[0, 0, 0]]),
        TestCase(input=[[-2, 0, 1, 1, 2]], expected=[[-2, 0, 2], [-2, 1, 1]]),
    ],
    "trapping-rain-water": [
        TestCase(input=[[]], expected=0),
        TestCase(input=[[1, 2, 3]], expected=0),
        TestCase(input=[[5, 4, 1, 2]], expected=1),
    ],
    "word-break": [
        TestCase(input=["applepenapple", ["apple", "pen"]], expected=True),
        TestCase(input=["a", ["b"]], expected=False),
        TestCase(input=["cars", ["car", "ca", "rs"]], expected=True),
    ],
    "edit-distance": [
        TestCase(input=["", ""], expected=0),
        TestCase(input=["abc", ""], expected=3),
        TestCase(input=["same", "same"], expected=0),
    ],
    "longest-increasing-subsequence": [
        TestCase(input=[[7, 7, 7, 7, 7, 7, 7]], expected=1),
        TestCase(input=[[1]], expected=1),
        TestCase(input=[[4, 10, 4, 3, 8, 9]], expected=3),
    ],
}


def _to_problem(record: ProblemRecord) -> Problem:
    return Problem(
        id=record.id,
        title=record.title,
        difficulty=Difficulty(record.difficulty),
        description=record.description,
        functionName=record.function_name,
        prototype=record.prototype,
        visibleTests=[TestCase(**t) for t in record.visible_tests],
    )


class ProblemStore:
    def list(self) -> list[Problem]:
        with SessionLocal() as db:
            records = db.scalars(select(ProblemRecord).order_by(ProblemRecord.order_index)).all()
            return [_to_problem(r) for r in records]

    def get(self, problem_id: str) -> Problem | None:
        with SessionLocal() as db:
            record = db.get(ProblemRecord, problem_id)
            return _to_problem(record) if record is not None else None

    def hidden_tests(self, problem_id: str) -> list[TestCase]:
        with SessionLocal() as db:
            record = db.get(ProblemRecord, problem_id)
            if record is None:
                return []
            return [TestCase(**t) for t in record.hidden_tests]


def _ensure_problems_seeded() -> None:
    with SessionLocal() as db:
        if db.scalars(select(ProblemRecord.id)).first() is not None:
            return
        for index, problem in enumerate(_seed_problems()):
            db.add(
                ProblemRecord(
                    id=problem.id,
                    order_index=index,
                    title=problem.title,
                    difficulty=problem.difficulty.value,
                    description=problem.description,
                    function_name=problem.function_name,
                    prototype=problem.prototype,
                    visible_tests=[t.model_dump(mode="json") for t in problem.visible_tests],
                    hidden_tests=[
                        t.model_dump(mode="json") for t in _HIDDEN_TESTS.get(problem.id, [])
                    ],
                )
            )
        db.commit()


init_db()
_ensure_problems_seeded()

session_store = SessionStore()
problem_store = ProblemStore()
