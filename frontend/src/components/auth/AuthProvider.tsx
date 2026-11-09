"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { csrfFetch } from "@/lib/auth-client";
import type { AuthStatus, AuthUser } from "@/types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  restoreSession: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const restoreSession = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" });
      let sessionResponse = response;
      if (response.status === 401) {
        sessionResponse = await csrfFetch("/api/auth/refresh", { method: "POST" });
      }
      if (!sessionResponse.ok) {
        setUser(null);
        setStatus("unauthenticated");
        return null;
      }
      const body = (await sessionResponse.json()) as { user: AuthUser };
      setUser(body.user);
      setStatus("authenticated");
      return body.user;
    } catch {
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const logout = useCallback(async () => {
    const response = await csrfFetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) throw new Error("Unable to end the session; please retry");
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ user, status, restoreSession, logout }),
    [user, status, restoreSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
