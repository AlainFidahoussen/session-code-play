import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Send, Trash2, Copy, Check, X, Radio, Users, Clock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CodeEditor } from "@/components/CodeEditor";
import { useCollabSession, type BroadcastOutput } from "@/lib/collab";
import { LANGUAGES, type LangId } from "@/lib/languages";
import {
  sessionApi,
  problemsApi,
  type SessionMeta,
  type Problem,
  type RunResult,
  type SubmitResult,
  type VisibleTestResult,
  type HiddenTestResult,
} from "@/services";

const NO_PROBLEM_CODE = "# Select a problem above to get started.\n";

type ResultState = { kind: "run"; result: RunResult } | { kind: "submit"; result: SubmitResult };

export function SessionWorkspace({ meta, name }: { meta: SessionMeta; name: string }) {
  const collab = useCollabSession({
    sessionId: meta.sessionId,
    name,
    initialCode: NO_PROBLEM_CODE,
    initialLanguage: meta.language,
  });

  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultState, setResultState] = useState<ResultState | null>(null);
  const [shareOutput, setShareOutput] = useState(true);
  const [copied, setCopied] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const outRef = useRef<HTMLDivElement>(null);

  const participants = [collab.self, ...collab.peers];
  const selectedProblem = problems.find((p) => p.id === collab.problemId) ?? null;
  const busy = running || submitting;

  useEffect(() => {
    sessionApi.touchSession(meta.sessionId);
    const id = setInterval(() => sessionApi.touchSession(meta.sessionId), 30_000);
    return () => clearInterval(id);
  }, [meta.sessionId]);

  useEffect(() => {
    void problemsApi.listProblems().then(setProblems);
  }, []);

  useEffect(() => {
    outRef.current?.scrollTo({ top: outRef.current.scrollHeight });
  }, [resultState]);

  // Remote run/submit results arriving over the ephemeral broadcast channel.
  useEffect(() => {
    const r = collab.remoteOutput as BroadcastOutput | null;
    if (!r) return;
    setResultState({ kind: r.kind, result: r.result } as ResultState);
  }, [collab.remoteOutput]);

  function handleSelectProblem(id: string) {
    const problem = problems.find((p) => p.id === id);
    collab.setProblemId(id);
    if (problem) collab.setCode(problem.prototype);
    setResultState(null);
  }

  async function handleRun() {
    if (!collab.problemId || busy) return;
    setRunning(true);
    try {
      const result = await problemsApi.runTests(collab.problemId, collab.code);
      setResultState({ kind: "run", result });
      if (shareOutput) collab.broadcastOutput({ kind: "run", result });
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmit() {
    if (!collab.problemId || busy) return;
    setSubmitting(true);
    try {
      const result = await problemsApi.submitTests(collab.problemId, collab.code);
      setResultState({ kind: "submit", result });
      if (shareOutput) collab.broadcastOutput({ kind: "submit", result });
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const expiry = useMemo(() => sessionApi.expiresAt(meta), [meta]);

  const visibleResults: VisibleTestResult[] =
    resultState?.kind === "run" ? resultState.result.results : (resultState?.result.visible ?? []);
  const hiddenResults: HiddenTestResult[] =
    resultState?.kind === "submit" ? resultState.result.hidden : [];
  const passedCount =
    resultState?.kind === "submit"
      ? resultState.result.passedCount
      : visibleResults.filter((r) => r.passed).length;
  const totalCount =
    resultState?.kind === "submit" ? resultState.result.totalCount : visibleResults.length;

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

          <span
            className="flex h-8 w-[150px] items-center justify-center rounded-md border border-border bg-surface-2 font-mono text-xs text-muted-foreground"
            title="Session language is fixed at creation"
          >
            {LANGUAGES.find((l) => l.id === collab.language)?.label ?? collab.language}
          </span>

          <Button variant="secondary" size="sm" onClick={copyLink}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Invite"}
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleRun}
            disabled={!collab.problemId || busy}
          >
            <Play className="size-3.5" /> {running ? "Running…" : "Run"}
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!collab.problemId || busy}>
            <Send className="size-3.5" /> {submitting ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </header>

      <div className="border-b border-border bg-surface">
        <div className="flex items-center gap-2 px-4 py-2">
          <BookOpen className="size-3.5 text-muted-foreground" />
          <Select value={collab.problemId ?? ""} onValueChange={handleSelectProblem}>
            <SelectTrigger className="h-8 w-[240px] bg-surface-2 font-mono text-xs">
              <SelectValue placeholder="Select a problem…" />
            </SelectTrigger>
            <SelectContent>
              {problems.map((p) => (
                <SelectItem key={p.id} value={p.id} className="font-mono text-xs">
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedProblem && (
            <Badge variant="outline" className="font-mono text-[10px] capitalize">
              {selectedProblem.difficulty}
            </Badge>
          )}
        </div>

        {selectedProblem && (
          <Accordion type="single" collapsible defaultValue="statement" className="px-4">
            <AccordionItem value="statement" className="border-none">
              <AccordionTrigger className="py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {selectedProblem.title}
              </AccordionTrigger>
              <AccordionContent className="whitespace-pre-wrap pb-3 text-sm text-foreground">
                {selectedProblem.description}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>

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
              Results
            </span>
            {resultState && !resultState.result.error && (
              <span
                className={
                  passedCount === totalCount
                    ? "font-mono text-[11px] text-[color:var(--color-success)]"
                    : "font-mono text-[11px] text-primary"
                }
              >
                {passedCount} / {totalCount} passed
              </span>
            )}
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Switch id="share" checked={shareOutput} onCheckedChange={setShareOutput} />
                <Label htmlFor="share" className="font-mono text-[11px] text-muted-foreground">
                  share results
                </Label>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setResultState(null)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>

          <div ref={outRef} className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs">
            {!collab.problemId && (
              <p className="text-muted-foreground">Select a problem to run or submit code.</p>
            )}
            {collab.problemId && !resultState && !busy && (
              <p className="text-muted-foreground">
                Run checks your code against the visible tests below. Submit also grades it against
                hidden tests.
              </p>
            )}
            {resultState?.result.error && (
              <pre className="whitespace-pre-wrap text-[color:var(--color-destructive)]">
                {resultState.result.error}
              </pre>
            )}
            {resultState && !resultState.result.error && (
              <div className="flex flex-col gap-2">
                {visibleResults.map((r) => (
                  <VisibleResultCard key={`v-${r.index}`} result={r} />
                ))}
                {hiddenResults.map((r) => (
                  <HiddenResultCard key={`h-${r.index}`} result={r} />
                ))}
              </div>
            )}
            {busy && (
              <p className="mt-2 animate-pulse text-muted-foreground">
                {running ? "running…" : "submitting…"}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function VisibleResultCard({ result }: { result: VisibleTestResult }) {
  return (
    <div className="rounded-md border border-border p-2">
      <div className="flex items-center gap-1.5">
        {result.passed ? (
          <Check className="size-3.5 text-[color:var(--color-success)]" />
        ) : (
          <X className="size-3.5 text-[color:var(--color-destructive)]" />
        )}
        <span className="font-semibold">Test {result.index + 1}</span>
      </div>
      <div className="mt-1 text-muted-foreground">input: {JSON.stringify(result.input)}</div>
      <div className="text-muted-foreground">expected: {JSON.stringify(result.expected)}</div>
      {result.error ? (
        <div className="text-[color:var(--color-destructive)]">error: {result.error}</div>
      ) : (
        <div
          className={result.passed ? "text-foreground" : "text-[color:var(--color-destructive)]"}
        >
          actual: {JSON.stringify(result.actual)}
        </div>
      )}
      {result.stdout && (
        <pre className="mt-1 whitespace-pre-wrap text-muted-foreground">
          stdout: {result.stdout}
        </pre>
      )}
    </div>
  );
}

function HiddenResultCard({ result }: { result: HiddenTestResult }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border p-2">
      {result.passed ? (
        <Check className="size-3.5 text-[color:var(--color-success)]" />
      ) : (
        <X className="size-3.5 text-[color:var(--color-destructive)]" />
      )}
      <span className="font-semibold">Hidden test {result.index + 1}</span>
      {result.error && (
        <span className="text-[color:var(--color-destructive)]">— {result.error}</span>
      )}
    </div>
  );
}
