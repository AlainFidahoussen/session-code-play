/**
 * Contracts for every backend call the app makes. The UI depends only on
 * these interfaces (via `@/services`) — never on a concrete implementation —
 * so a real HTTP/WebSocket backend can be swapped in for the mock without
 * touching any component.
 */

export type SessionMeta = {
  sessionId: string;
  title: string;
  language: string;
  createdAt: string;
  lastActive: string;
};

export interface SessionApi {
  /** POST /api/sessions */
  createSession(title: string | undefined, language: string): Promise<SessionMeta>;
  /** GET /api/sessions/:id — resolves null when missing or past TTL. */
  getSession(id: string): Promise<SessionMeta | null>;
  /** Marks the session as recently active, extending its TTL. */
  touchSession(id: string): void;
  expiresAt(meta: SessionMeta): Date;
}

/** A bidirectional channel carrying opaque, caller-defined messages. */
export interface RealtimeChannel {
  send(message: unknown): void;
  onMessage(handler: (message: unknown) => void): void;
  close(): void;
}

export interface CollabApi {
  /** Opens the realtime sync channel (doc updates + presence) for a session. */
  connect(sessionId: string): RealtimeChannel;
}
