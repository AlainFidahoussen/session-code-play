import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SessionWorkspace } from "@/components/SessionWorkspace";
import { getSession, type SessionMeta } from "@/lib/mock-api";

export const Route = createFileRoute("/session/$sessionId")({
  head: () => ({
    meta: [
      { title: "Interview session — Cohort" },
      {
        name: "description",
        content:
          "Join a live collaborative coding interview: shared editor, synced language, and sandboxed in-browser execution.",
      },
      { property: "og:title", content: "Join the interview session — Cohort" },
      {
        property: "og:description",
        content: "A live collaborative coding editor with sandboxed in-browser execution.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SessionRoute,
});

function SessionRoute() {
  return (
    <ClientOnly fallback={<Splash label="Connecting to session…" />}>
      <SessionGate />
    </ClientOnly>
  );
}

function SessionGate() {
  const { sessionId } = Route.useParams();
  const [meta, setMeta] = useState<SessionMeta | null | "expired">(null);
  const [name, setName] = useState("");
  const [joined, setJoined] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void getSession(sessionId).then((m) => {
      if (alive) setMeta(m ?? "expired");
    });
    return () => {
      alive = false;
    };
  }, [sessionId]);

  if (meta === null) return <Splash label="Validating invite link…" />;

  if (meta === "expired") {
    return (
      <Splash label="">
        <h1 className="text-xl font-semibold">This link has expired</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Interview sessions are ephemeral and are purged automatically. Ask your
          interviewer for a fresh link.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Back home</Link>
        </Button>
      </Splash>
    );
  }

  if (!joined) {
    return (
      <Splash label="">
        <Terminal className="size-5 text-primary" />
        <h1 className="mt-3 text-xl font-semibold">{meta.title}</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          session {meta.sessionId}
        </p>
        <div className="mt-6 flex w-full max-w-sm gap-2">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && setJoined(name.trim())}
            placeholder="Your display name"
            className="bg-surface font-mono text-sm"
          />
          <Button disabled={!name.trim()} onClick={() => setJoined(name.trim())}>
            Join
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          No account needed — your name is only shared while you&apos;re connected.
        </p>
      </Splash>
    );
  }

  return <SessionWorkspace meta={meta} name={joined} />;
}

function Splash({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {label && (
        <p className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {label}
        </p>
      )}
      {children}
    </div>
  );
}
