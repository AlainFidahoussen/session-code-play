/**
 * Real AnswersApi. Talks to the FastAPI backend (GET/PUT /api/answers/:problemId)
 * to persist the current user's latest code per problem.
 */
import type { AnswersApi, ProblemAnswer } from "../types";
import { API_BASE_URL } from "./config";
import { authHeaders } from "./token";

export const httpAnswersApi: AnswersApi = {
  async getAnswer(problemId) {
    const res = await fetch(`${API_BASE_URL}/api/answers/${problemId}`, { headers: authHeaders() });
    if (res.status === 404) return null;
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`getAnswer failed: ${res.status} ${res.statusText} — ${body}`);
    }
    return (await res.json()) as ProblemAnswer;
  },

  async saveAnswer(problemId, code) {
    const res = await fetch(`${API_BASE_URL}/api/answers/${problemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`saveAnswer failed: ${res.status} ${res.statusText} — ${body}`);
    }
    return (await res.json()) as ProblemAnswer;
  },
};
