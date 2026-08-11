import { useState, type FormEvent } from "react";
import { Terminal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi, type AuthUser } from "@/services";

export function AuthForms({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user =
        mode === "login"
          ? await authApi.login(username.trim(), password)
          : await authApi.signup(username.trim(), password);
      onAuthenticated(user);
    } catch {
      setError(
        mode === "login"
          ? "Invalid username or password."
          : "Could not sign up — username may already be taken, or the password is too short (min 8 characters).",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Terminal className="size-5 text-primary" />
      <h1 className="mt-3 text-xl font-semibold">
        {mode === "login" ? "Log in" : "Create an account"}
      </h1>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Your account keeps your saved code for every problem across sessions.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex w-full max-w-sm flex-col gap-3 text-left">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-surface font-mono text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-surface font-mono text-sm"
          />
        </div>

        {error && <p className="text-xs text-[color:var(--color-destructive)]">{error}</p>}

        <Button type="submit" disabled={busy || !username.trim() || !password}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {mode === "login" ? "Log in" : "Sign up"}
        </Button>
      </form>

      <button
        type="button"
        className="mt-4 font-mono text-xs text-muted-foreground underline underline-offset-2"
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setError(null);
        }}
      >
        {mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
      </button>
    </div>
  );
}
