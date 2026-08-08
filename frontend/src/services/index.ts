/**
 * Single entry point for every backend call the app makes. Components import
 * `sessionApi` / `collabApi` from here — never from `./mock` directly — so
 * swapping the mocks for a real HTTP/WebSocket backend only touches this file.
 */
import { mockSessionApi } from "./mock/sessionApi";
import { mockCollabApi } from "./mock/collabApi";

export type { SessionMeta, SessionApi, CollabApi, RealtimeChannel } from "./types";

export const sessionApi = mockSessionApi;
export const collabApi = mockCollabApi;
