/**
 * Single entry point for every backend call the app makes. Components import
 * `sessionApi` / `collabApi` from here — never from `./http` or `./mock`
 * directly — so swapping implementations only touches this file.
 */
import { httpSessionApi } from "./http/sessionApi";
import { httpCollabApi } from "./http/collabApi";
import { httpProblemsApi } from "./http/problemsApi";

export type {
  SessionMeta,
  SessionApi,
  CollabApi,
  RealtimeChannel,
  Difficulty,
  JsonValue,
  TestCase,
  Problem,
  VisibleTestResult,
  HiddenTestResult,
  RunResult,
  SubmitResult,
  ProblemsApi,
} from "./types";

export const sessionApi = httpSessionApi;
export const collabApi = httpCollabApi;
export const problemsApi = httpProblemsApi;
