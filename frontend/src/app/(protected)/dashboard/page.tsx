"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { inventoryApi } from "@/lib/inventory-client";
import type { DashboardSummary } from "@/types/inventory";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { inventoryApi.dashboard().then(setData).catch((e: Error) => setError(e.message)); }, []);
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-cyan-300">Overview</p><h1 className="mt-2 text-3xl font-bold">Dashboard</h1></div><Link href="/products/new" className="rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950">Add product</Link></div>
    {error && <p role="alert" className="mt-6 text-rose-300">{error}</p>}{!data && !error && <p className="mt-8 text-slate-400">Loading your inventory…</p>}
    {data && <><div className="mt-8 grid gap-4 sm:grid-cols-3">{[["Products",data.total_products],["Units on hand",data.total_quantity],["Low stock",data.low_stock_count]].map(([label,value])=><article key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"><p className="text-sm text-slate-400">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p></article>)}</div>
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6"><div className="flex justify-between"><h2 className="text-xl font-semibold">Low-stock products</h2><Link className="text-cyan-300" href="/products">View products</Link></div>{data.low_stock_products.length===0?<p className="mt-5 text-slate-400">Everything is above its low-stock threshold.</p>:<div className="mt-5 divide-y divide-white/10">{data.low_stock_products.map(p=><Link key={p.id} href={`/products/${p.id}`} className="flex justify-between py-4"><span>{p.name} <span className="text-sm text-slate-400">{p.sku}</span></span><span className="text-amber-300">{p.quantity_on_hand} / {p.low_stock_threshold}</span></Link>)}</div>}</section></>}</div>;
}
