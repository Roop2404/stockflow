"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";

export function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const { user, status, logout } = useAuth();
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  async function handleLogout() {
    setLogoutError("");
    try {
      await logout();
      router.replace("/login");
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Unable to sign out");
    }
  }

  if (status !== "authenticated" || !user) {
    return <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">Restoring your secure session…</main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div><span className="font-semibold text-cyan-300">StockFlow</span><span className="ml-3 text-sm text-slate-400">{user.organization.name}</span></div>
          <nav className="hidden items-center gap-4 text-sm sm:flex"><Link href="/dashboard" className="text-slate-300 hover:text-white">Dashboard</Link><Link href="/products" className="text-slate-300 hover:text-white">Products</Link><Link href="/settings" className="text-slate-300 hover:text-white">Settings</Link></nav>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-slate-300 sm:inline">{user.name}</span>
            <button onClick={handleLogout} className="rounded-lg border border-white/15 px-3 py-2 hover:bg-white/5">Sign out</button>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-6 py-12">
        {logoutError && <p role="alert" className="mb-5 rounded-lg bg-rose-950/60 px-3 py-2 text-sm text-rose-200">{logoutError}</p>}
        {children}
      </section>
    </main>
  );
}
