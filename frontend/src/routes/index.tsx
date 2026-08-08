import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Terminal, Users, Play, ShieldCheck, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sessionApi } from "@/services";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cohort — Collaborative Coding Interviews in the Browser" },
      {
        name: "description",
        content:
          "Spin up a shareable coding interview link in one click. Real-time collaborative editor, syntax highlighting, and sandboxed in-browser code execution. No signup for candidates.",
      },
      { property: "og:title", content: "Cohort — Collaborative Coding Interviews" },
      {
        property: "og:description",
        content:
          "Shareable interview links, real-time collaborative editing, and sandboxed code execution that never runs on a server.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    const session = await sessionApi.createSession(title, "python");
    void navigate({ to: "/session/$sessionId", params: { sessionId: session.sessionId } });
  }

  function handleJoin() {
    const id = joinUrl.trim().split("/").filter(Boolean).pop();
    if (!id) return;
    void navigate({ to: "/session/$sessionId", params: { sessionId: id } });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
      <header className="flex items-center gap-2 font-mono text-sm tracking-tight">
        <Terminal className="size-4 text-primary" />
        <span className="font-semibold">cohort</span>
        <span className="text-muted-foreground">/ interview</span>
      </header>

      <section className="flex flex-1 flex-col justify-center py-16">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Ephemeral · No signup · Sandboxed
        </p>
        <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Run a coding interview from a single link.
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground">
          Create a session, send the URL, and edit code together in real time. Code runs
          inside the candidate&apos;s own browser sandbox — never on a server.
        </p>

        <div className="mt-9 flex max-w-xl flex-col gap-3 sm:flex-row">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Session label (optional) — e.g. Backend · Ana R."
            className="h-11 bg-surface font-mono text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button size="lg" className="h-11 shrink-0" onClick={handleCreate} disabled={creating}>
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Terminal className="size-4" />
            )}
            New interview
          </Button>
        </div>

        <div className="mt-4 flex max-w-xl items-center gap-2">
          <Link2 className="size-4 text-muted-foreground" />
          <Input
            value={joinUrl}
            onChange={(e) => setJoinUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="…or paste an invite link to join"
            className="h-9 bg-transparent font-mono text-xs"
          />
          <Button variant="secondary" size="sm" onClick={handleJoin}>
            Join
          </Button>
        </div>

        <dl className="mt-16 grid gap-6 sm:grid-cols-3">
          <Feature
            icon={<Users className="size-4 text-primary" />}
            title="Live multi-cursor"
            body="CRDT-style sync keeps every keystroke merged, with named cursors and presence."
          />
          <Feature
            icon={<Play className="size-4 text-primary" />}
            title="Graded like LeetCode"
            body="Pick a Python problem, Run against visible tests, Submit to grade against hidden ones too."
          />
          <Feature
            icon={<ShieldCheck className="size-4 text-primary" />}
            title="Expires by default"
            body="Sessions live 4 hours. Unguessable IDs, no accounts, nothing persisted after."
          />
        </dl>
      </section>

      <footer className="border-t border-border pt-5 font-mono text-xs text-muted-foreground">
        Frontend prototype — backend calls are mocked locally.
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="panel p-4">
      <dt className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </dt>
      <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</dd>
    </div>
  );
}
