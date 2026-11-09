"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProductForm, type ProductPayload } from "@/components/inventory/ProductForm";
import { inventoryApi } from "@/lib/inventory-client";
import type { Product } from "@/types/inventory";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>(); const router = useRouter();
  const [product,setProduct]=useState<Product|null>(null); const [error,setError]=useState(""); const [quantity,setQuantity]=useState(0);
  useEffect(()=>{inventoryApi.product(id).then(p=>{setProduct(p);setQuantity(p.quantity_on_hand)}).catch((e:Error)=>setError(e.message));},[id]);
  async function save(payload:ProductPayload){const updated=await inventoryApi.updateProduct(id,payload);setProduct(updated);}
  async function remove(){if(!window.confirm("Delete this product? This cannot be undone."))return;try{await inventoryApi.deleteProduct(id);router.replace("/products");}catch(e){setError(e instanceof Error?e.message:"Could not delete product");}}
  async function updateQuantity(event:React.FormEvent){event.preventDefault();try{setProduct(await inventoryApi.updateQuantity(id,quantity));}catch(e){setError(e instanceof Error?e.message:"Could not update quantity");}}
  if(error&&!product)return <p role="alert" className="text-rose-300">{error}</p>;
  if(!product)return <p className="text-slate-400">Loading product…</p>;
  return <div className="max-w-3xl"><Link href="/products" className="text-sm text-cyan-300">← Products</Link><div className="mb-7 mt-4 flex justify-between"><div><h1 className="text-3xl font-bold">{product.name}</h1><p className="mt-1 text-slate-400">{product.sku}</p></div><button onClick={remove} className="rounded-lg border border-rose-400/40 px-4 py-2 text-rose-300">Delete</button></div>
    {error&&<p role="alert" className="mb-5 text-rose-300">{error}</p>}<section className="mb-8 rounded-2xl border border-white/10 p-6"><h2 className="mb-4 text-xl font-semibold">Update inventory quantity</h2><form onSubmit={updateQuantity} className="flex gap-3"><input aria-label="Quantity on hand" type="number" min="0" step="1" required value={quantity} onChange={e=>setQuantity(Number(e.target.value))} className="w-40 rounded-lg bg-slate-900 px-3 py-2"/><button className="rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-950">Save quantity</button></form></section><h2 className="mb-4 text-xl font-semibold">Product details</h2><ProductForm key={product.id+product.name+product.sku+product.quantity_on_hand} initial={product} submitLabel="Save changes" onSubmit={save}/></div>;
}
