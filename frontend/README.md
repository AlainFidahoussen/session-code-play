# Live Code Studio

I want to create an app that would be front-end. Mock the calls to backend, i will implement backend later. 
Here the specs:
# Online Coding Interview Platform — Technical Specification

## 1. Overview

A web application that lets an interviewer create a shareable session link, invite a candidate to join, and collaboratively edit and run code in real time, with no account required for candidates and no server-side code execution risk.

**Core capabilities**
- Create a session and get a shareable link (no signup required to join)
- Real-time collaborative code editing (multi-cursor, everyone can edit)
- Syntax highlighting for multiple languages
- In-browser code execution (sandboxed, no backend execution)

---

## 2. Non-Goals (v1)

To keep scope tight, the following are explicitly out of scope for v1 unless you want them added later:
- User authentication / persistent accounts
- Video/audio calling (assume interviewer uses Zoom/Meet alongside)
- Persistent storage of sessions beyond a TTL (e.g., 24–72h)
- Server-side/native code execution (compiled languages like Java, C++, Go) — only browser-executable languages initially
- Recording/playback of the session

---

## 3. High-Level Architecture

```
┌──────────────┐        WebSocket (CRDT sync)        ┌──────────────┐
│  Interviewer │ ───────────────────────────────────► │              │
│   Browser    │ ◄─────────────────────────────────── │  Sync Server │
└──────────────┘                                       │ (stateless,  │
                                                         │  relay only) │
┌──────────────┐        WebSocket (CRDT sync)          │              │
│  Candidate   │ ───────────────────────────────────►  └──────┬───────┘
│   Browser    │ ◄─────────────────────────────────────       │
└──────────────┘                                       ┌──────▼───────┐
                                                         │  Redis / KV  │
                                                         │ (session TTL,│
                                                         │  presence)   │
                                                         └──────────────┘
```

**Key architectural decision:** code execution happens entirely client-side (sandboxed iframe/Web Worker/WASM), never on the server. This sidesteps the hardest and most dangerous part of "run arbitrary user code" (container escapes, resource exhaustion, network egress from a server) by never running untrusted code server-side at all.

---

## 4. Tech Stack (suggested)

| Layer | Choice | Rationale |
|---|---|---|
| Editor | [CodeMirror 6](https://codemirror.net/) or Monaco | Both support syntax highlighting + collaborative extensions; CM6 is lighter and has first-class Yjs bindings |
| Real-time sync | [Yjs](https://docs.yjs.dev/) (CRDT) + `y-websocket` or `y-webrtc` | Conflict-free multi-editor sync, works even with concurrent edits, no OT server logic to write |
| Sync transport | WebSocket server (e.g., `y-websocket` server, or Hocuspocus) | Simple relay; can be stateless/horizontally scaled with Redis pub/sub adapter |
| Session storage | Redis (TTL-based) | Sessions are ephemeral; no need for a durable DB in v1 |
| Backend (session creation, link minting) | Node.js (Express/Fastify) or edge functions | Thin — just generates session IDs and serves the WS relay |
| Code execution (JS/TS) | Web Worker + `iframe sandbox` | Native, fast, secure via origin isolation |
| Code execution (Python) | [Pyodide](https://pyodide.org/) (WASM CPython) in a Web Worker | Runs fully client-side, no server needed |
| Code execution (other languages) | WASM runtimes where available (e.g., a WASM-compiled interpreter), else disable "Run" and show "highlighting only" | Avoid server execution entirely per requirement |
| Hosting | Static frontend (Vercel/Netlify/S3+CDN) + small WS relay service (Fly.io/Render/Railway) | Cheap, scales independently |

---

## 5. Feature Specifications

### 5.1 Session Creation & Sharing
- Interviewer clicks "New Interview" → backend mints a `sessionId` (UUID v4 or short nanoid, e.g., `k3f9-x7q2`)
- A Yjs document is lazily created in the sync server keyed by `sessionId`
- Shareable URL: `https://app.example.com/session/{sessionId}`
- Session TTL: configurable (default 4 hours from creation, extended on activity), after which the Yjs doc and Redis keys are purged
- No login required to join — anyone with the link can join as a participant
- Optional: interviewer sets a display name on entry; candidate does too (stored only in-memory/presence, not persisted)

### 5.2 Real-Time Collaborative Editing
- All connected clients can edit the same document (no read-only mode in v1 — "everyone who connects can edit" per requirement)
- CRDT (Yjs) guarantees eventual consistency without a central conflict-resolution server
- **Presence features:**
  - Colored multi-cursor + selection highlighting per user (via `y-protocols/awareness`)
  - Small avatar/name tag list showing who's connected
  - Live "typing" indicator optional
- **Reconnection handling:** client buffers local edits and Yjs merges automatically on reconnect — no data loss on brief network drops

### 5.3 Syntax Highlighting
- Language selector dropdown in the UI (JavaScript, TypeScript, Python, Java, C++, Go, SQL, HTML/CSS, Markdown, plain text — extensible list)
- Changing the language is itself a synced state (stored as a shared Yjs field, e.g., `ydoc.getMap('meta').get('language')`) so all participants see the same highlighting mode
- Implemented via CodeMirror 6 language packages (`@codemirror/lang-javascript`, `@codemirror/lang-python`, etc.), loaded on demand to keep bundle size down

### 5.4 In-Browser Code Execution ("Run" button)
- Execution is **client-side only**, triggered locally by whichever user clicks "Run" — the *code* is synced via CRDT, but the *execution* and its output are local to that user's browser (with the option to broadcast output to others, see below)
- **Sandboxing model:**
  - JS/TS: run inside a sandboxed `<iframe sandbox="allow-scripts">` with no `allow-same-origin`, so it cannot access the parent page, cookies, or localStorage; communicate via `postMessage`
  - Additionally run inside a Web Worker within that iframe for CPU isolation and the ability to terminate on infinite loops (`worker.terminate()` after a timeout, e.g., 5s)
  - Python: Pyodide loaded in a Web Worker (same timeout/termination strategy)
  - Console output (`console.log`, `print`, stdout/stderr) captured and piped back to the UI's output panel
- **Resource limits:** execution timeout (default 5–10s), max output buffer size (e.g., 1MB, truncate beyond that) to prevent runaway output from freezing the UI
- **No network access** from within the sandbox (enforced by CSP + iframe sandbox attributes) — prevents candidates' code from exfiltrating data or calling external APIs
- **Broadcasting results (optional, recommended):** after local execution, the output can be sent as an ephemeral (non-persisted) awareness/broadcast message so the interviewer sees the candidate's run output too, without it being part of the durable document

### 5.5 Output/Console Panel
- Split view: editor (left/top) + output console (right/bottom)
- Output panel shows: stdout, stderr (styled differently, e.g., red), execution time, and a "Clear" button
- Each "Run" clears previous output by default (toggleable)

---

## 6. Data Model

**Yjs document structure per session:**
```
YDoc
├── ytext: "code"           → shared text content of the editor
├── ymap: "meta"
│   ├── "language"          → e.g. "python"
│   ├── "createdAt"         → ISO timestamp
│   └── "title"             → optional session label
└── awareness (ephemeral, not persisted)
    ├── clientId → { name, color, cursor, selection }
```

**Redis keys (session registry, not the CRDT content itself):**
```
session:{sessionId}:createdAt   → timestamp (for TTL/cleanup)
session:{sessionId}:lastActive  → timestamp (for TTL extension)
```

---

## 7. API / Protocol Surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/sessions` | `POST` | Create a new session, returns `{ sessionId, url }` |
| `/api/sessions/:id` | `GET` | Validate session exists / not expired (for a friendly "link expired" page) |
| `wss://.../sync/:sessionId` | WebSocket | Yjs sync protocol (binary), handles document updates + awareness |

---

## 8. Security Considerations

| Concern | Mitigation |
|---|---|
| Malicious code trying to break out of sandbox | `iframe sandbox` with no `allow-same-origin` + Worker isolation; strict CSP on the sandbox origin |
| Infinite loops / resource exhaustion | Execution timeout + `worker.terminate()`; consider running sandbox on a separate subdomain to limit blast radius |
| XSS via injected code rendered as HTML | Never `eval` or render output as HTML; output panel renders as text only (escape all content) |
| Session link guessing | Use unguessable IDs (122-bit UUID or nanoid with sufficient entropy), not sequential IDs |
| Data leakage after interview | TTL-based auto-expiry and deletion of both Redis keys and the Yjs doc from memory/storage |
| Abuse (someone spamming session creation) | Rate-limit `/api/sessions` per IP |
| Cross-tenant document access | `sessionId` acts as the sole authorization token — treat it as a secret; don't log full URLs server-side |

---

## 9. Non-Functional Requirements

- **Latency:** edit propagation to other participants < 150ms on typical connections (CRDT sync over WebSocket is well within this)
- **Scalability:** sync server should be horizontally scalable; use Redis pub/sub or a dedicated CRDT backend (e.g., Hocuspocus with Redis extension) if running multiple WS server instances
- **Availability:** target 99.5%+ during business hours; graceful reconnect UX on the client (toast: "Reconnecting…")
- **Browser support:** latest 2 versions of Chrome, Firefox, Safari, Edge (WASM + Web Worker support required for Python execution)
- **Accessibility:** keyboard-navigable UI, sufficient color contrast for cursor/presence colors

---

## 10. Suggested Build Phases

1. **Phase 1 — Core collaboration:** session creation, Yjs + CodeMirror integration, real-time text sync, presence cursors
2. **Phase 2 — Syntax highlighting:** language selector synced across clients, CodeMirror language packs
3. **Phase 3 — Safe execution:** sandboxed JS execution (iframe + Worker), output panel
4. **Phase 4 — Python support:** Pyodide integration, loading-state UX (Pyodide bundle is ~10MB, needs a spinner)
5. **Phase 5 — Polish:** session expiry UX, rate limiting, reconnect handling, additional languages

---

## 11. Open Questions to Resolve Before Build

- Should output be broadcast to all participants, or stay local to whoever clicked Run?
- Do we need a read-only "observer" role for additional interviewers watching silently, or is fully-open editing acceptable long-term (spec currently says everyone can edit)?
- Which languages must support **execution** (not just highlighting) at launch — just JS + Python, or more?
- Session TTL default — 4 hours? 24 hours? Configurable per session?

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://session-code-play.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fe6da9c2-c103-42bb-ae85-40fe61830a3e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
