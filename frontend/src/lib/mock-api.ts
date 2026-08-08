/**
 * Mocked backend. Every function here stands in for a real HTTP call
 * (POST /api/sessions, GET /api/sessions/:id) and can be swapped for fetch()
 * later without touching the UI.
 */
import { customAlphabet } from "nanoid";

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const nano = customAlphabet(ALPHABET, 4);

export const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4h default TTL

export type SessionMeta = {
  sessionId: string;
  title: string;
  language: string;
  createdAt: string;
  lastActive: string;
};

const KEY = (id: string) => `mock:session:${id}`;
const latency = (ms = 320) => new Promise((r) => setTimeout(r, ms));

function read(id: string): SessionMeta | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY(id));
  return raw ? (JSON.parse(raw) as SessionMeta) : null;
}

function write(meta: SessionMeta) {
  window.localStorage.setItem(KEY(meta.sessionId), JSON.stringify(meta));
}

/** POST /api/sessions */
export async function createSession(
  title: string | undefined,
  language: string,
): Promise<SessionMeta> {
  await latency();
  const meta: SessionMeta = {
    sessionId: `${nano()}-${nano()}`,
    title: title?.trim() || "Untitled interview",
    language,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  };
  write(meta);
  return meta;
}

/** GET /api/sessions/:id — returns null when missing or past TTL. */
export async function getSession(id: string): Promise<SessionMeta | null> {
  await latency(220);
  let meta = read(id);
  if (!meta) {
    // Mock: an unknown link that "exists" on the relay is materialised lazily,
    // mirroring how a real sync server creates the Yjs doc on first connect.
    meta = {
      sessionId: id,
      title: "Untitled interview",
      language: "javascript",
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };
    write(meta);
  }
  if (Date.now() - new Date(meta.createdAt).getTime() > SESSION_TTL_MS) return null;
  return meta;
}

export function touchSession(id: string) {
  const meta = read(id);
  if (!meta) return;
  write({ ...meta, lastActive: new Date().toISOString() });
}

export function expiresAt(meta: SessionMeta) {
  return new Date(new Date(meta.createdAt).getTime() + SESSION_TTL_MS);
}
