import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { httpAuthApi } from "./authApi";
import { clearToken, getToken, setToken } from "./token";

function jsonResponse(body: unknown, init: { ok: boolean; status?: number } = { ok: true }) {
  return {
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 400),
    statusText: init.ok ? "OK" : "Bad Request",
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

describe("httpAuthApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    clearToken();
    vi.unstubAllGlobals();
  });

  it("login stores the returned token and returns the user", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ username: "alice", token: "tok-1" }));

    const user = await httpAuthApi.login("alice", "hunter2");

    expect(user).toEqual({ username: "alice" });
    expect(getToken()).toBe("tok-1");
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ username: "alice", password: "hunter2" }),
      }),
    );
  });

  it("signup stores the returned token and returns the user", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ username: "bob", token: "tok-2" }));

    const user = await httpAuthApi.signup("bob", "hunter2222");

    expect(user).toEqual({ username: "bob" });
    expect(getToken()).toBe("tok-2");
  });

  it("login rejects when the backend returns an error status", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ detail: "invalid credentials" }, { ok: false, status: 401 }),
    );

    await expect(httpAuthApi.login("alice", "wrong")).rejects.toThrow(/401/);
    expect(getToken()).toBeNull();
  });

  it("me resolves null when the backend rejects the request", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, { ok: false, status: 401 }));

    await expect(httpAuthApi.me()).resolves.toBeNull();
  });

  it("me resolves the user when the token is valid", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ username: "alice", token: "tok-1" }));

    await expect(httpAuthApi.me()).resolves.toEqual({ username: "alice" });
  });

  it("logout clears the stored token", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}));

    setToken("tok-1");
    await httpAuthApi.logout();

    expect(getToken()).toBeNull();
  });
});
