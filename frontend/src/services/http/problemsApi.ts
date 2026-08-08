/**
 * Real ProblemsApi. Talks to the FastAPI backend (GET /api/problems,
 * POST /api/problems/:id/run, POST /api/problems/:id/submit) per
 * `openapi.yaml`.
 */
import type { Problem, ProblemsApi, RunResult, SubmitResult } from "../types";
import { API_BASE_URL } from "./config";

async function postCode<T>(path: string, code: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${path} failed: ${res.status} ${res.statusText} — ${body}`);
  }
  return (await res.json()) as T;
}

export const httpProblemsApi: ProblemsApi = {
  async listProblems() {
    const res = await fetch(`${API_BASE_URL}/api/problems`);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`listProblems failed: ${res.status} ${res.statusText} — ${body}`);
    }
    return (await res.json()) as Problem[];
  },

  runTests(problemId, code) {
    return postCode<RunResult>(`/api/problems/${problemId}/run`, code);
  },

  submitTests(problemId, code) {
    return postCode<SubmitResult>(`/api/problems/${problemId}/submit`, code);
  },
};
