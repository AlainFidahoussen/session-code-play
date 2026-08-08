/**
 * Real SessionApi. Talks to the FastAPI backend
 * (POST /api/sessions, GET /api/sessions/:id, POST /api/sessions/:id/touch)
 * per `openapi.yaml`.
 */
import type { SessionApi, SessionMeta } from "../types";
import { API_BASE_URL } from "./config";

const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // matches backend/src/backend/store.py SESSION_TTL

async function assertOk(res: Response, context: string): Promise<void> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${context} failed: ${res.status} ${res.statusText} — ${body}`);
  }
}

export const httpSessionApi: SessionApi = {
  async createSession(title, language) {
    const res = await fetch(`${API_BASE_URL}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, language }),
    });
    await assertOk(res, "createSession");
    return (await res.json()) as SessionMeta;
  },

  async getSession(id) {
    const res = await fetch(`${API_BASE_URL}/api/sessions/${id}`);
    if (res.status === 404) return null;
    await assertOk(res, "getSession");
    return (await res.json()) as SessionMeta;
  },

  touchSession(id) {
    void fetch(`${API_BASE_URL}/api/sessions/${id}/touch`, { method: "POST" });
  },

  expiresAt(meta) {
    return new Date(new Date(meta.lastActive).getTime() + SESSION_TTL_MS);
  },
};
