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

export type Difficulty = "easy" | "medium" | "hard";

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type TestCase = {
  input: JsonValue[];
  expected: JsonValue;
};

export type Problem = {
  id: string;
  title: string;
  difficulty: Difficulty;
  /** Rendered as pre-wrapped plain text, not sanitized as HTML. */
  description: string;
  /** Name of the Python function a solution must define. */
  functionName: string;
  /** Starter code loaded into the editor when the problem is selected. */
  prototype: string;
  /** Test cases shown to the candidate and used by `runTests`. */
  visibleTests: TestCase[];
};

export type VisibleTestResult = {
  index: number;
  passed: boolean;
  input: JsonValue[];
  expected: JsonValue;
  actual: JsonValue;
  error: string | null;
  /** Anything the candidate's function printed during this test call. */
  stdout: string;
};

/** Same as VisibleTestResult but with input/expected/actual stripped out. */
export type HiddenTestResult = {
  index: number;
  passed: boolean;
  error: string | null;
};

export type RunResult = {
  results: VisibleTestResult[];
  allPassed: boolean;
  /** Set instead of `results` when the code couldn't be graded at all. */
  error: string | null;
};

export type SubmitResult = {
  visible: VisibleTestResult[];
  hidden: HiddenTestResult[];
  passedCount: number;
  totalCount: number;
  allPassed: boolean;
  error: string | null;
};

export interface ProblemsApi {
  /** GET /api/problems */
  listProblems(): Promise<Problem[]>;
  /** POST /api/problems/:id/run — grades against visible test cases only. */
  runTests(problemId: string, code: string): Promise<RunResult>;
  /** POST /api/problems/:id/submit — grades against visible + hidden test cases. */
  submitTests(problemId: string, code: string): Promise<SubmitResult>;
}
