/**
 * Bearer token storage for the authenticated API client. Kept as a plain
 * `localStorage` value (not React state) so every `http/*Api` module can read
 * it without depending on the auth context in `@/lib/auth`.
 */
const TOKEN_KEY = "cohort_auth_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
