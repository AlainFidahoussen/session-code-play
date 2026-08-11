import { useEffect, useRef, useState } from "react";
import { Play, Send, Trash2, Check, X, BookOpen, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/lib/auth";
import {
  problemsApi,
  answersApi,
  type Problem,
  type RunResult,
  type SubmitResult,
  type VisibleTestResult,
  type HiddenTestResult,
} from "@/services";

const ANSWER_SAVE_DEBOUNCE_MS = 800;

const NO_PROBLEM_CODE = "# Select a problem above to get started.\n";

type ResultState = { kind: "run"; result: RunResult } | { kind: "submit"; result: SubmitResult };

export function Workspace() {
  const { username, logout } = useAuth();

  const [problems, setProblems] = useState<Problem[]>([]);
  const [problemId, setProblemId] = useState<string | null>(null);
  const [code, setCode] = useState(NO_PROBLEM_CODE);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultState, setResultState] = useState<ResultState | null>(null);
  const outRef = useRef<HTMLDivElement>(null);

  const selectedProblem = problems.find((p) => p.id === problemId) ?? null;
  const busy = running || submitting;

  useEffect(() => {
    void problemsApi.listProblems().then(setProblems);
  }, []);

  useEffect(() => {
    outRef.current?.scrollTo({ top: outRef.current.scrollHeight });
  }, [resultState]);

  // Autosave the current user's code for the selected problem, debounced.
  useEffect(() => {
    if (!problemId) return;
    const id = problemId;
    const timer = setTimeout(() => {
      void answersApi.saveAnswer(id, code);
    }, ANSWER_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [problemId, code]);

  async function handleSelectProblem(id: string) {
    const problem = problems.find((p) => p.id === id);
    setProblemId(id);
    setResultState(null);
    const saved = await answersApi.getAnswer(id);
    setCode(saved?.code ?? problem?.prototype ?? NO_PROBLEM_CODE);
  }

  async function handleRun() {
    if (!problemId || busy) return;
    setRunning(true);
    try {
      const result = await problemsApi.runTests(problemId, code);
      setResultState({ kind: "run", result });
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmit() {
    if (!problemId || busy) return;
    setSubmitting(true);
    try {
      const result = await problemsApi.submitTests(problemId, code);
      setResultState({ kind: "submit", result });
    } finally {
      setSubmitting(false);
    }
  }

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
        <span className="font-mono text-sm font-semibold text-primary">cohort</span>

        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">{username}</span>

          <Button size="sm" variant="secondary" onClick={handleRun} disabled={!problemId || busy}>
            <Play className="size-3.5" /> {running ? "Running…" : "Run"}
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!problemId || busy}>
            <Send className="size-3.5" /> {submitting ? "Submitting…" : "Submit"}
          </Button>

          <Button variant="ghost" size="sm" onClick={logout} title="Log out">
            <LogOut className="size-3.5" />
          </Button>
        </div>
      </header>

      <div className="border-b border-border bg-surface">
        <div className="flex items-center gap-2 px-4 py-2">
          <BookOpen className="size-3.5 text-muted-foreground" />
          <Select value={problemId ?? ""} onValueChange={handleSelectProblem}>
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
          <CodeEditor value={code} language="python" onChange={setCode} />
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
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => setResultState(null)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>

          <div ref={outRef} className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs">
            {!problemId && (
              <p className="text-muted-foreground">Select a problem to run or submit code.</p>
            )}
            {problemId && !resultState && !busy && (
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
