/**
 * Backend location for the real HTTP/WebSocket services. Configurable via
 * `VITE_API_URL` (e.g. in `.env.local`); defaults to the local FastAPI
 * backend's default `uvicorn` port.
 */
export const API_BASE_URL: string = import.meta.env["VITE_API_URL"] ?? "http://localhost:8000";

export const WS_BASE_URL: string = API_BASE_URL.replace(/^http/, "ws");
