/**
 * Mocked SessionApi. Stands in for a real HTTP backend
 * (POST /api/sessions, GET /api/sessions/:id) using localStorage.
 */
import { customAlphabet } from "nanoid";
import type { SessionApi, SessionMeta } from "../types";

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const nano = customAlphabet(ALPHABET, 4);

export const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4h default TTL

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

export const mockSessionApi: SessionApi = {
  async createSession(title, language) {
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
  },

  async getSession(id) {
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
  },

  touchSession(id) {
    const meta = read(id);
    if (!meta) return;
    write({ ...meta, lastActive: new Date().toISOString() });
  },

  expiresAt(meta) {
    return new Date(new Date(meta.createdAt).getTime() + SESSION_TTL_MS);
  },
};
