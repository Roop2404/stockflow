export type Product = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  quantity_on_hand: number;
  cost_price: string | null;
  selling_price: string | null;
  low_stock_threshold: number | null;
};

export type DashboardSummary = {
  total_products: number;
  total_quantity: number;
  low_stock_count: number;
  low_stock_products: Array<Pick<Product, "id" | "name" | "sku" | "quantity_on_hand"> & { low_stock_threshold: number }>;
};

export type OrganizationSettings = { default_low_stock_threshold: number };
