/**
 * Auth gate for the whole app. Every route requires a logged-in account
 * (see routes/__root.tsx) — this owns the "logged in or not" decision and
 * exposes the current username to the rest of the tree via `useAuth()`.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { authApi, type AuthUser } from "@/services";
import { AuthForms } from "@/components/AuthForms";

type AuthContextValue = {
  username: string;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthGate");
  return ctx;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null | "loading">("loading");

  useEffect(() => {
    let alive = true;
    void authApi.me().then((resolved) => {
      if (alive) setUser(resolved);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (user === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Checking your session…
        </p>
      </div>
    );
  }

  if (user === null) {
    return <AuthForms onAuthenticated={setUser} />;
  }

  function logout() {
    void authApi.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ username: user.username, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
