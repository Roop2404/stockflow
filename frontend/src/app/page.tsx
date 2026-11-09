import Link from "next/link";
import { getApiHealth } from "@/lib/api";

export default async function Home() {
  let status = "unavailable";
  try {
    status = (await getApiHealth()).status;
  } catch {
    // Keep the landing page available while the backend is starting.
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-10 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">StockFlow · Foundation</p>
        <h1 className="mt-5 text-5xl font-bold tracking-tight sm:text-6xl">Inventory, in flow.</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">A clear foundation for managing stock across organizations.</p>
        <div className="mt-10 flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm">
          <span className={`h-2.5 w-2.5 rounded-full ${status === "ok" ? "bg-emerald-400" : "bg-amber-400"}`} />
          <span>Backend API</span><span className="ml-auto font-medium text-slate-300">{status}</span>
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/register" className="rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-200">Create account</Link>
          <Link href="/login" className="rounded-xl border border-white/15 px-5 py-3 font-semibold hover:bg-white/5">Sign in</Link>
        </div>
      </section>
    </main>
  );
}
