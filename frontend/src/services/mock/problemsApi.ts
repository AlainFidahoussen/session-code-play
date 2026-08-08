/**
 * Mocked ProblemsApi. Stands in for a real HTTP backend (GET /api/problems)
 * backed by a problems database.
 */
import type { Problem, ProblemsApi } from "../types";

const latency = (ms = 280) => new Promise((r) => setTimeout(r, ms));

const PROBLEMS: Problem[] = [
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "easy",
    description:
      "Given an array of integers `nums` and an integer `target`, return the indices of the " +
      "two numbers that add up to `target`.\n\n" +
      "Assume exactly one solution exists, and the same element may not be used twice.",
    starterCode: {
      javascript: "function twoSum(nums, target) {\n  \n}\n",
      typescript: "function twoSum(nums: number[], target: number): number[] {\n  \n}\n",
      python: "def two_sum(nums, target):\n    pass\n",
    },
  },
  {
    id: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "easy",
    description:
      "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', " +
      "determine if the input string is valid.\n\n" +
      "Brackets must close in the correct order and every opening bracket must have a " +
      "matching closing bracket of the same type.",
    starterCode: {
      javascript: "function isValid(s) {\n  \n}\n",
      typescript: "function isValid(s: string): boolean {\n  \n}\n",
      python: "def is_valid(s):\n    pass\n",
    },
  },
  {
    id: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "medium",
    description:
      "Given an array of intervals where `intervals[i] = [start, end]`, merge all " +
      "overlapping intervals and return an array of the non-overlapping intervals that " +
      "cover all the intervals in the input.",
    starterCode: {
      javascript: "function merge(intervals) {\n  \n}\n",
      typescript: "function merge(intervals: number[][]): number[][] {\n  \n}\n",
      python: "def merge(intervals):\n    pass\n",
    },
  },
  {
    id: "lru-cache",
    title: "LRU Cache",
    difficulty: "medium",
    description:
      "Design a data structure that follows the Least Recently Used (LRU) cache eviction " +
      "policy.\n\n" +
      "Implement `get(key)` and `put(key, value)` so both operations run in O(1) average time.",
    starterCode: {
      javascript:
        "class LRUCache {\n  constructor(capacity) {\n    \n  }\n  get(key) {\n    \n  }\n  put(key, value) {\n    \n  }\n}\n",
      typescript:
        "class LRUCache {\n  constructor(capacity: number) {\n    \n  }\n  get(key: number): number {\n    return -1;\n  }\n  put(key: number, value: number): void {\n    \n  }\n}\n",
      python:
        "class LRUCache:\n    def __init__(self, capacity):\n        pass\n\n    def get(self, key):\n        pass\n\n    def put(self, key, value):\n        pass\n",
    },
  },
  {
    id: "word-ladder",
    title: "Word Ladder",
    difficulty: "hard",
    description:
      "Given two words `beginWord` and `endWord`, and a dictionary `wordList`, return the " +
      "number of words in the shortest transformation sequence from `beginWord` to " +
      "`endWord`, changing only one letter at a time with every intermediate word present " +
      "in `wordList`. Return 0 if no such sequence exists.",
    starterCode: {
      javascript: "function ladderLength(beginWord, endWord, wordList) {\n  \n}\n",
      typescript:
        "function ladderLength(beginWord: string, endWord: string, wordList: string[]): number {\n  \n}\n",
      python: "def ladder_length(begin_word, end_word, word_list):\n    pass\n",
    },
  },
];

export const mockProblemsApi: ProblemsApi = {
  async listProblems() {
    await latency();
    return PROBLEMS;
  },
};
