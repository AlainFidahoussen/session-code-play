/**
 * Real AuthApi. Talks to the FastAPI backend (POST /api/auth/signup,
 * POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me).
 */
import type { AuthApi, AuthUser } from "../types";
import { API_BASE_URL } from "./config";
import { authHeaders, clearToken, setToken } from "./token";

type AuthResponse = AuthUser & { token: string };

async function assertOk(res: Response, context: string): Promise<void> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${context} failed: ${res.status} ${res.statusText} — ${body}`);
  }
}

async function credentialsRequest(
  path: string,
  username: string,
  password: string,
): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  await assertOk(res, path);
  const body = (await res.json()) as AuthResponse;
  setToken(body.token);
  return { username: body.username };
}

export const httpAuthApi: AuthApi = {
  signup(username, password) {
    return credentialsRequest("/api/auth/signup", username, password);
  },

  login(username, password) {
    return credentialsRequest("/api/auth/login", username, password);
  },

  async logout() {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: authHeaders(),
    });
    clearToken();
  },

  async me() {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders() });
    if (!res.ok) return null;
    const body = (await res.json()) as AuthResponse;
    return { username: body.username };
  },
};
