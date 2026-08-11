# Coding Practice Platform — Technical Specification

## 1. Overview

A web application for practicing coding problems, LeetCode-style: a user
signs in, picks a problem, writes a Python solution, runs it against visible
test cases, and submits it for grading against visible + hidden test cases.
Each user's most recent code per problem is saved to their account.

**Core capabilities**
- User accounts (signup / login) — progress is tied to a person, not a link
- Problem catalog with description, difficulty, and starter code
- Run against visible test cases; Submit against visible + hidden test cases
- Per-user, per-problem autosave, so a solution is right where it was left

---

## 2. Non-Goals

- Interviewer/candidate pairing, shareable session links, or real-time
  collaborative editing between multiple people
- Multi-language execution — problems and grading are Python only
- Video/audio calling, proctoring, or timed sessions

---

## 3. High-Level Architecture

```
┌──────────────┐        HTTP (REST, bearer token)     ┌──────────────┐
│   Browser    │ ───────────────────────────────────► │   FastAPI    │
│ (TanStack    │ ◄─────────────────────────────────── │   Backend    │
│  Start/React)│                                       └──────┬───────┘
└──────────────┘                                              │
                                                        ┌──────▼───────┐
                                                        │   SQL DB     │
                                                        │ (SQLite dev, │
                                                        │  Postgres)   │
                                                        └──────────────┘
```

No realtime layer: every user only ever runs their own code against their
own account, so there is no sync relay, no CRDT document, and no presence
model to build. The one place execution is genuinely sensitive is grading —
hidden test cases must never reach the browser, so `Run`/`Submit` execute
the candidate's Python in an isolated subprocess with a hard timeout
(`backend/src/backend/executor.py`), server-side. See §8 for what that
sandbox does and doesn't protect against.

---

## 4. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Editor | [CodeMirror 6](https://codemirror.net/) | Lightweight, good Python syntax highlighting |
| Backend | FastAPI + SQLAlchemy (Python, managed with [uv](https://docs.astral.sh/uv/)) | Thin REST API over the DB |
| Auth | Bearer tokens + bcrypt-hashed passwords | Simple, stateless-ish; no session cookies/CSRF to manage |
| Database | SQLite (dev) / Postgres (prod), via `DATABASE_URL` | Durable storage for accounts, problems, and saved answers |
| Code execution (grading) | Isolated Python subprocess with a timeout (`backend/src/backend/executor.py`) | Hidden test cases can't be shipped to the browser, so grading must run server-side |
| Frontend | TanStack Start (React) | File-based routing, SSR shell |
| Hosting | Single Docker image serving the built frontend from FastAPI | See top-level `README.md` |

---

## 5. Feature Specifications

### 5.1 Accounts
- `POST /api/auth/signup` — creates a user (bcrypt-hashed password) and
  immediately issues a bearer token, no separate login step needed
- `POST /api/auth/login` — issues a new bearer token for existing credentials
- `POST /api/auth/logout` — invalidates the current token
- `GET /api/auth/me` — resolves the current user from the `Authorization:
  Bearer <token>` header; used by the frontend to decide whether to show the
  login form or the workspace
- Tokens do not expire on their own — they're valid until `logout` deletes
  them. There is currently no token rotation or multi-device revocation.

### 5.2 Problem Catalog
- `GET /api/problems` returns every problem's id, title, difficulty,
  description, function name, starter code (`prototype`), and *visible*
  test cases only
- Hidden test cases are never serialized anywhere in this response — they
  live in a separate column (`ProblemRecord.hidden_tests`) that only the
  grading endpoints read

### 5.3 Problem Grading (`Run` / `Submit`)
- **Run** (`POST /api/problems/:id/run`) grades the user's code against the
  problem's *visible* test cases only. Per-test input, expected output, and
  actual output/error (plus captured stdout) are returned, so the user can
  debug.
- **Submit** (`POST /api/problems/:id/submit`) grades against visible *and*
  hidden test cases. Visible results show the same detail as `Run`; hidden
  results are reduced to pass/fail (+ error message) — their input and
  expected output are never sent to the client.
- **Execution model:** the backend runs the user's function in an isolated
  subprocess with a hard timeout — see §8 for the sandboxing tradeoffs.
- **Language:** Python only. Problems, starter code, and grading are all
  Python-specific.

### 5.4 Saved Answers
- `GET /api/answers/:problemId` returns the current user's last-saved code
  for that problem (404 if nothing's been saved yet)
- `PUT /api/answers/:problemId` upserts it
- The frontend autosaves on edit, debounced 800ms, scoped per user per
  problem (`ProblemAnswerRecord`, primary key `(user_id, problem_id)`) — two
  users working the same problem never see each other's code

### 5.5 Results Panel
- Split view: editor (left) + results panel (right)
- One row per test case (pass/fail badge, input/expected/actual for visible
  tests, pass/fail only for hidden tests), plus a summary count
  (`X / Y passed`)
- Each `Run` or `Submit` replaces the previous results

---

## 6. Data Model

| Table | Key columns |
|---|---|
| `users` | `id`, `username` (unique), `password_hash`, `created_at` |
| `auth_tokens` | `token` (PK), `user_id`, `created_at` |
| `problems` | `id` (PK), `order_index`, `title`, `difficulty`, `description`, `function_name`, `prototype`, `visible_tests` (JSON), `hidden_tests` (JSON) |
| `problem_answers` | `(user_id, problem_id)` (composite PK), `code`, `updated_at` |

---

## 7. API Surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/signup` | `POST` | Create an account, returns a bearer token |
| `/api/auth/login` | `POST` | Exchange credentials for a bearer token |
| `/api/auth/logout` | `POST` | Invalidate the current token |
| `/api/auth/me` | `GET` | Resolve the current user from the bearer token |
| `/api/problems` | `GET` | List problems (visible tests only, no hidden tests) |
| `/api/problems/:id/run` | `POST` | Grade code against visible test cases |
| `/api/problems/:id/submit` | `POST` | Grade code against visible + hidden test cases |
| `/api/answers/:problemId` | `GET` | Fetch the current user's saved code for a problem |
| `/api/answers/:problemId` | `PUT` | Save the current user's code for a problem |

All endpoints except `/api/auth/signup` and `/api/auth/login` require an
`Authorization: Bearer <token>` header.

---

## 8. Security Considerations

| Concern | Mitigation |
|---|---|
| Password storage | bcrypt, per-password salt |
| Credential stuffing / token guessing | Tokens are 32 bytes of `secrets.token_urlsafe` entropy, not guessable |
| Malicious code in problem grading (`/run`, `/submit`) breaking out of the server process | Candidate code runs in its own OS subprocess (never in-process), with a hard timeout. **Current gap:** no container/seccomp/network isolation on the subprocess yet — a determined user could still read/write the local filesystem or reach the network from within it. Treat this as prototype-grade isolation; harden with a container (gVisor/Firecracker) or `resource`-based rlimits + network namespace before running untrusted code at scale |
| Hidden test cases leaking to the client | `/api/problems` and `/run` only ever serialize `visibleTests`; hidden tests live in a separate DB column and `/submit` strips input/expected/actual from hidden results before responding |
| Cross-user data access | Every answers/problems query is scoped by the authenticated user's id — there is no way to read another user's saved code |

---

## 9. Non-Functional Requirements

- **Browser support:** latest 2 versions of Chrome, Firefox, Safari, Edge
- **Accessibility:** keyboard-navigable UI, sufficient color contrast
- **Persistence:** all state (accounts, saved answers) is durable in the SQL
  database — nothing is TTL'd or purged
