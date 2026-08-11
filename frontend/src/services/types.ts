/**
 * Contracts for every backend call the app makes. The UI depends only on
 * these interfaces (via `@/services`) — never on a concrete implementation —
 * so a real HTTP/WebSocket backend can be swapped in for the mock without
 * touching any component.
 */

export type AuthUser = {
  username: string;
};

export interface AuthApi {
  /** POST /api/auth/signup — auto-issues a token, no separate login step needed. */
  signup(username: string, password: string): Promise<AuthUser>;
  /** POST /api/auth/login */
  login(username: string, password: string): Promise<AuthUser>;
  /** POST /api/auth/logout — invalidates the stored token. */
  logout(): Promise<void>;
  /** GET /api/auth/me — resolves null when there's no token or it's invalid/expired. */
  me(): Promise<AuthUser | null>;
}

export type ProblemAnswer = {
  problemId: string;
  code: string;
  updatedAt: string;
};

export interface AnswersApi {
  /** GET /api/answers/:problemId — resolves null when nothing's been saved yet. */
  getAnswer(problemId: string): Promise<ProblemAnswer | null>;
  /** PUT /api/answers/:problemId — upserts the latest code for this user+problem. */
  saveAnswer(problemId: string, code: string): Promise<ProblemAnswer>;
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
