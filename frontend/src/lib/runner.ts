/**
 * Client-side sandboxed execution.
 *
 * Untrusted code never touches a server. It runs inside a Web Worker created
 * from a blob URL (no DOM, no document.cookie access) with a hard timeout —
 * `worker.terminate()` kills infinite loops. In production this worker is
 * booted from inside an `<iframe sandbox="allow-scripts">` served from a
 * separate origin so it also loses same-origin storage access.
 */

export type RunLine = { stream: "out" | "err" | "sys"; text: string };
export type RunResult = { lines: RunLine[]; ms: number; timedOut: boolean };

const MAX_OUTPUT = 1_000_000; // 1MB buffer cap
export const RUN_TIMEOUT_MS = 6000;

const JS_WORKER = `
const post = (stream, text) => self.postMessage({ type: 'line', stream, text });
const fmt = (a) => a.map((v) => {
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}).join(' ');
console.log = (...a) => post('out', fmt(a));
console.info = console.debug = console.log;
console.warn = (...a) => post('err', fmt(a));
console.error = (...a) => post('err', fmt(a));
self.fetch = () => { throw new Error('Network access is disabled in the sandbox'); };
self.XMLHttpRequest = undefined;
self.onmessage = async (e) => {
  try {
    const fn = new Function('"use strict";' + e.data.code);
    const r = fn();
    if (r && typeof r.then === 'function') await r;
  } catch (err) {
    post('err', (err && err.stack) ? String(err.stack) : String(err));
  }
  self.postMessage({ type: 'done' });
};
`;

const PY_WORKER = `
let ready = null;
const post = (stream, text) => self.postMessage({ type: 'line', stream, text });
async function boot() {
  post('sys', 'Loading Python runtime (Pyodide, ~10MB)…');
  importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');
  const py = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/' });
  py.setStdout({ batched: (s) => post('out', s) });
  py.setStderr({ batched: (s) => post('err', s) });
  post('sys', 'Python runtime ready.');
  return py;
}
self.onmessage = async (e) => {
  try {
    ready = ready || boot();
    const py = await ready;
    await py.runPythonAsync(e.data.code);
  } catch (err) {
    post('err', String(err && err.message ? err.message : err));
  }
  self.postMessage({ type: 'done' });
};
`;

/** Crude type-stripping so TS snippets can run in the JS sandbox (mock only). */
function stripTypes(code: string) {
  return code
    .replace(/^\s*(?:import|export)\s+type\s[^\n]*$/gm, "")
    .replace(/\b(interface|type)\s+\w+\s*=?\s*\{[\s\S]*?\n\}/g, "")
    .replace(/<[A-Za-z_][\w.]*(?:\s*[,|]\s*[A-Za-z_][\w.\[\]]*)*>(?=\()/g, "")
    .replace(/:\s*[A-Za-z_][\w.<>\[\]|\s]*(?=\s*[=),;{])/g, "")
    .replace(/!\./g, ".")
    .replace(/(\w)!\s*([,)\]])/g, "$1$2")
    .replace(/\bas\s+[A-Za-z_][\w.<>\[\]]*/g, "");
}

export function runCode(
  language: string,
  code: string,
  onLine: (line: RunLine) => void,
): { promise: Promise<RunResult>; cancel: () => void } {
  const isPython = language === "python";
  const src = isPython ? PY_WORKER : JS_WORKER;
  const payload =
    language === "typescript" ? stripTypes(code) : code;
  const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
  const worker = new Worker(url);
  const started = performance.now();
  const lines: RunLine[] = [];
  let size = 0;
  let settled = false;
  let timer: ReturnType<typeof setTimeout>;

  const push = (line: RunLine) => {
    if (size > MAX_OUTPUT) return;
    size += line.text.length;
    if (size > MAX_OUTPUT) line = { stream: "err", text: "… output truncated (1MB limit)" };
    lines.push(line);
    onLine(line);
  };

  const promise = new Promise<RunResult>((resolve) => {
    const finish = (timedOut: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      if (timedOut)
        push({ stream: "err", text: `Execution terminated after ${timeout / 1000}s (timeout).` });
      resolve({ lines, ms: Math.round(performance.now() - started), timedOut });
    };

    worker.onmessage = (e) => {
      const d = e.data as { type: string; stream?: RunLine["stream"]; text?: string };
      if (d.type === "line") push({ stream: d.stream!, text: d.text! });
      else if (d.type === "done") finish(false);
    };
    worker.onerror = (e) => {
      push({ stream: "err", text: e.message || "Sandbox error" });
      finish(false);
    };

    const timeout = isPython ? 60_000 : RUN_TIMEOUT_MS;
    timer = setTimeout(() => finish(true), timeout);
    worker.postMessage({ code: payload });
  });

  return { promise, cancel: () => worker.terminate() };
}
