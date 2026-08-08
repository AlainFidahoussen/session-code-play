/**
 * Realtime collaboration hook.
 *
 * Stands in for Yjs + y-websocket: shared code text, shared `meta.language`,
 * and ephemeral awareness (name, colour, cursor). The transport comes from
 * `collabApi` (services layer) — swap the mock for a real WebSocket provider
 * there when the relay exists, without touching this hook.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { collabApi } from "@/services";
import type { RealtimeChannel } from "@/services";

export type Participant = {
  clientId: string;
  name: string;
  color: string;
  cursor: number | null;
  lastSeen: number;
};

export type BroadcastOutput = {
  from: string;
  name: string;
  color: string;
  lines: { stream: string; text: string }[];
  ms: number;
  at: number;
};

type Msg =
  | { t: "doc"; from: string; code: string; language: string; rev: number }
  | { t: "request"; from: string }
  | { t: "presence"; from: string; p: Omit<Participant, "lastSeen"> }
  | { t: "leave"; from: string }
  | { t: "output"; from: string; payload: BroadcastOutput };

export const PRESENCE_COLORS = [
  "#4dd8e6",
  "#f6c453",
  "#7ee787",
  "#ff8fab",
  "#b39dff",
  "#ffa26b",
];

export type ConnState = "connecting" | "connected" | "reconnecting";

export function useCollabSession(opts: {
  sessionId: string;
  name: string;
  initialCode: string;
  initialLanguage: string;
}) {
  const { sessionId, name } = opts;
  const clientId = useMemo(() => nanoid(8), []);
  const color = useMemo(
    () => PRESENCE_COLORS[Math.abs(hash(clientId)) % PRESENCE_COLORS.length]!,
    [clientId],
  );

  const [code, setCodeState] = useState(opts.initialCode);
  const [language, setLanguageState] = useState(opts.initialLanguage);
  const [peers, setPeers] = useState<Participant[]>([]);
  const [status, setStatus] = useState<ConnState>("connecting");
  const [remoteOutput, setRemoteOutput] = useState<BroadcastOutput | null>(null);

  const chan = useRef<RealtimeChannel | null>(null);
  const rev = useRef(0);
  const cursor = useRef<number | null>(null);
  const state = useRef({ code: opts.initialCode, language: opts.initialLanguage });
  state.current = { code, language };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const c = collabApi.connect(sessionId);
    chan.current = c;

    c.onMessage((raw) => {
      const m = raw as Msg;
      if (m.from === clientId) return;
      if (m.t === "doc") {
        if (m.rev >= rev.current) {
          rev.current = m.rev;
          setCodeState(m.code);
          setLanguageState(m.language);
        }
      } else if (m.t === "request") {
        c.send({
          t: "doc",
          from: clientId,
          code: state.current.code,
          language: state.current.language,
          rev: rev.current,
        } satisfies Msg);
      } else if (m.t === "presence") {
        setPeers((prev) => {
          const others = prev.filter((p) => p.clientId !== m.p.clientId);
          return [...others, { ...m.p, lastSeen: Date.now() }];
        });
      } else if (m.t === "leave") {
        setPeers((prev) => prev.filter((p) => p.clientId !== m.from));
      } else if (m.t === "output") {
        setRemoteOutput(m.payload);
      }
    });

    c.send({ t: "request", from: clientId } satisfies Msg);

    const heartbeat = setInterval(() => {
      c.send({
        t: "presence",
        from: clientId,
        p: { clientId, name, color, cursor: cursor.current },
      } satisfies Msg);
      setPeers((prev) => prev.filter((p) => Date.now() - p.lastSeen < 6000));
    }, 1500);

    const connectTimer = setTimeout(() => setStatus("connected"), 700);
    const onOffline = () => setStatus("reconnecting");
    const onOnline = () => setStatus("connected");
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      clearInterval(heartbeat);
      clearTimeout(connectTimer);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      c.send({ t: "leave", from: clientId } satisfies Msg);
      c.close();
    };
  }, [sessionId, clientId, name, color]);

  const publish = useCallback(
    (next: { code?: string; language?: string }) => {
      rev.current += 1;
      const code = next.code ?? state.current.code;
      const language = next.language ?? state.current.language;
      state.current = { code, language };
      chan.current?.send({
        t: "doc",
        from: clientId,
        code,
        language,
        rev: rev.current,
      } satisfies Msg);
    },
    [clientId],
  );

  const setCode = useCallback(
    (next: string) => {
      setCodeState(next);
      publish({ code: next });
    },
    [publish],
  );

  const setLanguage = useCallback(
    (next: string) => {
      setLanguageState(next);
      publish({ language: next });
    },
    [publish],
  );

  const setCursor = useCallback((pos: number | null) => {
    cursor.current = pos;
  }, []);

  const broadcastOutput = useCallback(
    (payload: Omit<BroadcastOutput, "from" | "name" | "color" | "at">) => {
      chan.current?.send({
        t: "output",
        from: clientId,
        payload: { ...payload, from: clientId, name, color, at: Date.now() },
      } satisfies Msg);
    },
    [clientId, name, color],
  );

  const self: Participant = { clientId, name, color, cursor: null, lastSeen: Date.now() };

  return {
    self,
    peers,
    status,
    code,
    language,
    setCode,
    setLanguage,
    setCursor,
    broadcastOutput,
    remoteOutput,
  };
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}
