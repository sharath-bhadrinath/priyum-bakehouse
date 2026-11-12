import type { Tables } from "@/integrations/supabase/types";

export type OrderRow = Tables<"orders">;
export type OrderItemRow = Tables<"order_items">;
export type ProfileRow = Tables<"profiles">;
export type TagRow = Tables<"tags">;
export type ProductTagRow = Tables<"product_tags">;
export type CategoryRow = Tables<"categories">;
export type BaseCategoryRow = Tables<"base_categories">;

export interface WeightOption {
  weight: number;
  unit: string;
  mrp: number;
  selling_price: number;
}

/** A products row with prices and weight options normalised for the admin UI. */
export type AdminProduct = Omit<Tables<"products">, "mrp" | "weight_options"> & {
  mrp: number;
  weight_options: WeightOption[];
};

export interface ProductInput {
  name: string;
  mrp: number;
  selling_price: number;
  description: string;
  info: string;
  image: string;
  category_id: string | null;
  /** Legacy category name column, kept in sync with category_id. */
  category: string | null;
  stock: number;
  base_weight: number;
  weight_unit: string;
  weight_options: WeightOption[];
  site_display: boolean;
  tagIds: string[];
}

export interface UserInput {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  address: string;
}

export interface InvoiceSettings {
  businessName: string;
  businessSubtitle: string;
  phone: string;
  email: string;
}

export const WEIGHT_UNITS = ["grams", "kg", "pieces"] as const;
