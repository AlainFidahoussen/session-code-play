/**
 * Single entry point for every backend call the app makes. Components import
 * `problemsApi` / `authApi` / `answersApi` from here — never from `./http`
 * directly — so swapping implementations only touches this file.
 */
import { httpProblemsApi } from "./http/problemsApi";
import { httpAuthApi } from "./http/authApi";
import { httpAnswersApi } from "./http/answersApi";

export type {
  Difficulty,
  JsonValue,
  TestCase,
  Problem,
  VisibleTestResult,
  HiddenTestResult,
  RunResult,
  SubmitResult,
  ProblemsApi,
  AuthUser,
  AuthApi,
  ProblemAnswer,
  AnswersApi,
} from "./types";

export const problemsApi = httpProblemsApi;
export const authApi = httpAuthApi;
export const answersApi = httpAnswersApi;
