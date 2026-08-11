import { afterEach, describe, expect, it } from "vitest";
import { authHeaders, clearToken, getToken, setToken } from "./token";

afterEach(() => {
  clearToken();
});

describe("token storage", () => {
  it("returns null when no token has been set", () => {
    expect(getToken()).toBeNull();
  });

  it("round-trips a token through set/get", () => {
    setToken("abc123");
    expect(getToken()).toBe("abc123");
  });

  it("removes the token on clear", () => {
    setToken("abc123");
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe("authHeaders", () => {
  it("returns no Authorization header when unauthenticated", () => {
    expect(authHeaders()).toEqual({});
  });

  it("returns a Bearer Authorization header once a token is set", () => {
    setToken("abc123");
    expect(authHeaders()).toEqual({ Authorization: "Bearer abc123" });
  });
});
