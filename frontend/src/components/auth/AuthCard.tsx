import Link from "next/link";

export function AuthCard({ title, description, children }: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl sm:p-10">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">StockFlow</Link>
        <h1 className="mt-8 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 mb-8 text-slate-400">{description}</p>
        {children}
      </section>
    </main>
  );
}
