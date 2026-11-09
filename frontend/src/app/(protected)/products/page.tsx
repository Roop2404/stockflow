"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { inventoryApi } from "@/lib/inventory-client";
import type { Product } from "@/types/inventory";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { inventoryApi.products().then(setProducts).catch((e: Error) => setError(e.message)); }, []);
  return <div><div className="flex items-end justify-between gap-4"><div><p className="text-sm text-cyan-300">Catalog</p><h1 className="mt-2 text-3xl font-bold">Products</h1></div><Link href="/products/new" className="rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950">Add product</Link></div>
    {error && <p role="alert" className="mt-6 text-rose-300">{error}</p>}{!products && !error && <p className="mt-6 text-slate-400">Loading products…</p>}
    {products?.length===0 && <p className="mt-6 rounded-2xl border border-white/10 p-8 text-slate-400">No products yet. Add your first product to get started.</p>}
    {!!products?.length && <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-white/5 text-slate-400"><tr>{["Product","SKU","On hand","Selling price"].map(x=><th key={x} className="px-5 py-4">{x}</th>)}</tr></thead><tbody>{products.map(p=><tr key={p.id} className="border-t border-white/10"><td className="px-5 py-4"><Link href={`/products/${p.id}`} className="font-medium text-cyan-300">{p.name}</Link></td><td className="px-5 py-4">{p.sku}</td><td className="px-5 py-4">{p.quantity_on_hand}</td><td className="px-5 py-4">{p.selling_price ?? "—"}</td></tr>)}</tbody></table></div>}
  </div>;
}
