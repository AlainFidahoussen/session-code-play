import { defineConfig } from "@playwright/test";

/**
 * Runs against the app as served by `docker compose up` (compose.yaml at the
 * repo root) — a single origin serving both the built frontend and the
 * FastAPI backend, backed by Postgres. Start the stack yourself (or via
 * `make e2e`) before running `npm test` here.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: process.env["CI"] ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "http://localhost:8000",
    trace: "retain-on-failure",
  },
});
