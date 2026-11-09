import { csrfFetch } from "@/lib/auth-client";
import type { DashboardSummary, OrganizationSettings, Product } from "@/types/inventory";

async function request<T>(path: string, init?: RequestInit, csrf = false): Promise<T> {
  const response = csrf
    ? await csrfFetch(path, init)
    : await fetch(path, { ...init, credentials: "same-origin", cache: "no-store" });
  if (!response.ok) {
    let message = "The request could not be completed";
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch { /* use a generic message for non-JSON errors */ }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const inventoryApi = {
  products: () => request<Product[]>("/api/app/products"),
  product: (id: string) => request<Product>(`/api/app/products/${id}`),
  createProduct: (data: Partial<Product>) => request<Product>("/api/app/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }, true),
  updateProduct: (id: string, data: Partial<Product>) => request<Product>(`/api/app/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }, true),
  updateQuantity: (id: string, quantity_on_hand: number) => request<Product>(`/api/app/products/${id}/quantity`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity_on_hand }) }, true),
  deleteProduct: (id: string) => request<void>(`/api/app/products/${id}`, { method: "DELETE" }, true),
  dashboard: () => request<DashboardSummary>("/api/app/dashboard/summary"),
  settings: () => request<OrganizationSettings>("/api/app/organization/settings"),
  updateSettings: (value: number) => request<OrganizationSettings>("/api/app/organization/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ default_low_stock_threshold: value }) }, true),
};
