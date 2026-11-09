"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { csrfFetch } from "@/lib/auth-client";
import { useAuth } from "@/components/auth/AuthProvider";

export function LoginForm() {
  const router = useRouter();
  const { restoreSession } = useAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await csrfFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(typeof body.detail === "string" ? body.detail : "Unable to sign in.");
        return;
      }
      await restoreSession();
      router.replace("/dashboard");
    } catch {
      setError("We could not reach StockFlow. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block space-y-2 text-sm font-medium text-slate-200">Work email
        <input name="email" type="email" required autoComplete="email" maxLength={255}
          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20" />
      </label>
      <label className="block space-y-2 text-sm font-medium text-slate-200">Password
        <input name="password" type="password" required autoComplete="current-password" maxLength={128}
          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20" />
      </label>
      {error && <p role="alert" className="rounded-lg bg-rose-950/60 px-3 py-2 text-sm text-rose-200">{error}</p>}
      <button disabled={pending} className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-slate-400">New to StockFlow? <Link className="text-cyan-300 hover:underline" href="/register">Create an account</Link></p>
    </form>
  );
}
