"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { csrfFetch } from "@/lib/auth-client";
import { useAuth } from "@/components/auth/AuthProvider";

export function RegistrationForm() {
  const router = useRouter();
  const { restoreSession } = useAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm_password") ?? "");
    if (password !== confirm) {
      setError("Passwords do not match.");
      setPending(false);
      return;
    }
    try {
      const response = await csrfFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_name: form.get("organization_name"),
          name: form.get("name"),
          email: form.get("email"),
          password,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(typeof body.detail === "string" ? body.detail : "Please check the submitted information.");
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
      <Field label="Organization name" name="organization_name" autoComplete="organization" />
      <Field label="Your name" name="name" autoComplete="name" />
      <Field label="Work email" name="email" type="email" autoComplete="email" />
      <Field label="Password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} />
      <Field label="Confirm password" name="confirm_password" type="password" autoComplete="new-password" minLength={12} maxLength={128} />
      {error && <p role="alert" className="rounded-lg bg-rose-950/60 px-3 py-2 text-sm text-rose-200">{error}</p>}
      <button disabled={pending} className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60">
        {pending ? "Creating workspace…" : "Create account"}
      </button>
      <p className="text-center text-sm text-slate-400">Already have an account? <Link className="text-cyan-300 hover:underline" href="/login">Sign in</Link></p>
    </form>
  );
}

function Field({ label, name, type = "text", autoComplete, minLength, maxLength }: {
  label: string; name: string; type?: string; autoComplete: string; minLength?: number; maxLength?: number;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium text-slate-200">
      {label}
      <input name={name} type={type} required autoComplete={autoComplete} minLength={minLength} maxLength={maxLength ?? (name === "email" ? 255 : 150)}
        className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20" />
    </label>
  );
}
