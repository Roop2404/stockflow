"use client";

import { FormEvent, useState } from "react";
import type { Product } from "@/types/inventory";

export type ProductPayload = {
  name: string; sku: string; description: string | null; quantity_on_hand: number;
  cost_price: string | null; selling_price: string | null; low_stock_threshold: number | null;
};

export function ProductForm({ initial, submitLabel, onSubmit }: {
  initial?: Product; submitLabel: string; onSubmit: (payload: ProductPayload) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    const form = new FormData(event.currentTarget);
    const number = (key: string) => form.get(key) === "" ? null : Number(form.get(key));
    try {
      await onSubmit({ name: String(form.get("name")).trim(), sku: String(form.get("sku")).trim(), description: String(form.get("description") ?? "").trim() || null, quantity_on_hand: number("quantity_on_hand") ?? 0, cost_price: form.get("cost_price") ? String(form.get("cost_price")) : null, selling_price: form.get("selling_price") ? String(form.get("selling_price")) : null, low_stock_threshold: number("low_stock_threshold") });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save product"); }
    finally { setPending(false); }
  }
  const input = "w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-300";
  return <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
    {[{name:"name",label:"Product name",type:"text",value:initial?.name},{name:"sku",label:"SKU",type:"text",value:initial?.sku},{name:"quantity_on_hand",label:"Quantity on hand",type:"number",value:initial?.quantity_on_hand ?? 0},{name:"cost_price",label:"Cost price",type:"number",value:initial?.cost_price ?? ""},{name:"selling_price",label:"Selling price",type:"number",value:initial?.selling_price ?? ""},{name:"low_stock_threshold",label:"Low-stock threshold (optional)",type:"number",value:initial?.low_stock_threshold ?? ""}].map((field)=> <label key={field.name} className="space-y-2 text-sm text-slate-300">{field.label}<input className={input} name={field.name} type={field.type} defaultValue={field.value} required={field.name==="name"||field.name==="sku"||field.name==="quantity_on_hand"} min={field.type==="number"?0:undefined} step={field.name.includes("price")?"0.01":field.type==="number"?1:undefined} /></label>)}
    <label className="space-y-2 text-sm text-slate-300 md:col-span-2">Description<textarea className={input} name="description" rows={4} defaultValue={initial?.description ?? ""}/></label>
    {error && <p role="alert" className="text-rose-300 md:col-span-2">{error}</p>}
    <button disabled={pending} className="rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50 md:col-span-2">{pending?"Saving…":submitLabel}</button>
  </form>;
}
