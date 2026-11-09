"use client";

import { useRouter } from "next/navigation";
import { ProductForm, type ProductPayload } from "@/components/inventory/ProductForm";
import { inventoryApi } from "@/lib/inventory-client";

export default function NewProductPage() {
  const router = useRouter();
  async function create(payload: ProductPayload) { const product = await inventoryApi.createProduct(payload); router.replace(`/products/${product.id}`); }
  return <div className="max-w-3xl"><p className="text-sm text-cyan-300">Catalog</p><h1 className="mb-7 mt-2 text-3xl font-bold">Add product</h1><ProductForm submitLabel="Create product" onSubmit={create}/></div>;
}
