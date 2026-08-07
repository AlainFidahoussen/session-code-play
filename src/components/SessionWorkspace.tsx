import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Square, Trash2, Copy, Check, Radio, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CodeEditor } from "@/components/CodeEditor";
import { useCollabSession, type BroadcastOutput } from "@/lib/collab";
import { LANGUAGES, STARTERS, isRunnable, type LangId } from "@/lib/languages";
import { runCode, type RunLine } from "@/lib/runner";
import { expiresAt, touchSession, type SessionMeta } from "@/lib/mock-api";

export function SessionWorkspace({ meta, name }: { meta: SessionMeta; name: string }) {
  const collab = useCollabSession({
    sessionId: meta.sessionId,
    name,
    initialCode: STARTERS[meta.language] ?? "",
    initialLanguage: meta.language,
  });

  const [lines, setLines] = useState<RunLine[]>([]);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [clearOnRun, setClearOnRun] = useState(true);
  const [shareOutput, setShareOutput] = useState(true);
  const [copied, setCopied] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const outRef = useRef<HTMLDivElement>(null);

  const runnable = isRunnable(collab.language);
  const participants = [collab.self, ...collab.peers];

  useEffect(() => {
    touchSession(meta.sessionId);
    const id = setInterval(() => touchSession(meta.sessionId), 30_000);
    return () => clearInterval(id);
  }, [meta.sessionId]);

  useEffect(() => {
    outRef.current?.scrollTo({ top: outRef.current.scrollHeight });
  }, [lines]);

  // Remote run results arriving over the ephemeral broadcast channel.
  useEffect(() => {
    const r = collab.remoteOutput as BroadcastOutput | null;
    if (!r) return;
    setLines([
      { stream: "sys", text: `— ${r.name} ran the code (${r.ms}ms) —` },
      ...(r.lines as RunLine[]),
    ]);
    setElapsed(r.ms);
  }, [collab.remoteOutput]);

  async function handleRun() {
    if (running) return;
    if (clearOnRun) setLines([]);
    setElapsed(null);
    setRunning(true);
    const collected: RunLine[] = [];
    const { promise, cancel } = runCode(collab.language, collab.code, (line) => {
      collected.push(line);
      setLines((prev) => [...prev, line]);
    });
    cancelRef.current = cancel;
    const result = await promise;
    cancelRef.current = null;
    setRunning(false);
    setElapsed(result.ms);
    if (shareOutput) {
      collab.broadcastOutput({ lines: result.lines, ms: result.ms });
    }
  }

  function handleStop() {
    cancelRef.current?.();
    cancelRef.current = null;
    setRunning(false);
    setLines((prev) => [...prev, { stream: "err", text: "Execution stopped by user." }]);
  }

  function handleLanguage(next: string) {
    collab.setLanguage(next);
    const starter = STARTERS[next];
    if (starter && collab.code.trim() === "") collab.setCode(starter);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const expiry = useMemo(() => expiresAt(meta), [meta]);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-sm font-semibold text-primary">cohort</span>
          <span className="truncate text-sm text-muted-foreground">{meta.title}</span>
        </div>

        <span
          className="flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 font-mono text-[11px]"
          title={`Sync status: ${collab.status}`}
        >
          <Radio
            className={
              collab.status === "connected"
                ? "size-3 text-[color:var(--color-success)]"
                : "size-3 animate-pulse text-[color:var(--color-warning)]"
            }
          />
          {collab.status === "connected" ? "Live" : "Reconnecting…"}
        </span>

        <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          <Clock className="size-3" />
          expires {expiry.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Users className="size-3.5 text-muted-foreground" />
            <div className="flex -space-x-1.5">
              {participants.map((p) => (
                <span
                  key={p.clientId}
                  title={p.name}
                  className="grid size-6 place-items-center rounded-full border border-background text-[10px] font-semibold"
                  style={{ backgroundColor: p.color, color: "#12161f" }}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          <Select value={collab.language} onValueChange={handleLanguage}>
            <SelectTrigger className="h-8 w-[150px] bg-surface-2 font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.id} value={l.id} className="font-mono text-xs">
                  {l.label}
                  {!l.runnable && (
                    <span className="ml-2 text-muted-foreground">highlight only</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="secondary" size="sm" onClick={copyLink}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Invite"}
          </Button>

          {running ? (
            <Button size="sm" variant="destructive" onClick={handleStop}>
              <Square className="size-3.5" /> Stop
            </Button>
          ) : (
            <Button size="sm" onClick={handleRun} disabled={!runnable}>
              <Play className="size-3.5" /> Run
            </Button>
          )}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1.6fr_1fr]">
        <section className="min-h-0 border-b border-border lg:border-b-0 lg:border-r">
          <CodeEditor
            value={collab.code}
            language={collab.language as LangId}
            peers={collab.peers}
            onChange={collab.setCode}
            onCursor={collab.setCursor}
          />
        </section>

        <section className="flex min-h-0 flex-col bg-surface">
          <div className="flex items-center gap-3 border-b border-border px-3 py-2">
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Console
            </span>
            {elapsed != null && (
              <span className="font-mono text-[11px] text-primary">{elapsed}ms</span>
            )}
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Switch id="clear" checked={clearOnRun} onCheckedChange={setClearOnRun} />
                <Label htmlFor="clear" className="font-mono text-[11px] text-muted-foreground">
                  clear on run
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Switch id="share" checked={shareOutput} onCheckedChange={setShareOutput} />
                <Label htmlFor="share" className="font-mono text-[11px] text-muted-foreground">
                  share output
                </Label>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLines([])}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>

          <div ref={outRef} className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs">
            {lines.length === 0 && (
              <p className="text-muted-foreground">
                {runnable
                  ? "Output appears here. Code runs in a sandboxed worker with no network access."
                  : `${LANGUAGES.find((l) => l.id === collab.language)?.label} is highlighting-only — execution is disabled for compiled languages.`}
              </p>
            )}
            {lines.map((l, i) => (
              <pre
                key={i}
                className={
                  l.stream === "err"
                    ? "whitespace-pre-wrap text-[color:var(--color-destructive)]"
                    : l.stream === "sys"
                      ? "whitespace-pre-wrap text-muted-foreground"
                      : "whitespace-pre-wrap text-foreground"
                }
              >
                {l.text}
              </pre>
            ))}
            {running && <p className="mt-1 animate-pulse text-muted-foreground">running…</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
