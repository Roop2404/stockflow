"use client";

import { FormEvent, useEffect, useState } from "react";
import { inventoryApi } from "@/lib/inventory-client";

export default function SettingsPage() {
  const [threshold,setThreshold]=useState<number|undefined>();const [message,setMessage]=useState("");const [error,setError]=useState("");const [pending,setPending]=useState(false);
  useEffect(()=>{inventoryApi.settings().then(s=>setThreshold(s.default_low_stock_threshold)).catch((e:Error)=>setError(e.message));},[]);
  async function save(event:FormEvent){event.preventDefault();if(threshold===undefined)return;setPending(true);setMessage("");setError("");try{const result=await inventoryApi.updateSettings(threshold);setThreshold(result.default_low_stock_threshold);setMessage("Settings saved.");}catch(e){setError(e instanceof Error?e.message:"Unable to save settings");}finally{setPending(false);}}
  return <div className="max-w-2xl"><p className="text-sm text-cyan-300">Workspace</p><h1 className="mt-2 text-3xl font-bold">Organization settings</h1><section className="mt-7 rounded-2xl border border-white/10 bg-white/[0.04] p-6"><h2 className="text-xl font-semibold">Inventory defaults</h2><p className="mt-2 text-sm text-slate-400">Used for products without an individual low-stock threshold.</p>{threshold===undefined&&!error&&<p className="mt-5 text-slate-400">Loading settings…</p>}{threshold!==undefined&&<form onSubmit={save} className="mt-5 space-y-4"><label className="block text-sm text-slate-300">Default low-stock threshold<input type="number" min="0" step="1" required value={threshold} onChange={e=>setThreshold(Number(e.target.value))} className="mt-2 block w-full rounded-xl bg-slate-900 px-4 py-3 text-white"/></label><button disabled={pending} className="rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950">{pending?"Saving…":"Save settings"}</button>{message&&<p role="status" className="text-emerald-300">{message}</p>}</form>}{error&&<p role="alert" className="mt-4 text-rose-300">{error}</p>}</section></div>;
}
