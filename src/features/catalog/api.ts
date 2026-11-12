import { supabase } from "@/integrations/supabase/client";
import { buildCatalog } from "@/lib/catalog";
import type { Catalog, Tag } from "@/types/catalog";

/**
 * Loads everything the storefront needs in one parallel round trip.
 * Only the products query is fatal; navigation and tags degrade gracefully.
 */
export async function fetchCatalog(): Promise<Catalog> {
  const [products, categories, baseCategories, productTags] = await Promise.all([
    supabase.from("products").select("*").eq("site_display", true).order("name"),
    supabase.from("categories").select("id, name, display_name, base_category_id").order("display_name"),
    supabase.from("base_categories").select("id, name, display_name").order("display_name"),
    supabase.from("product_tags").select("product_id, tags(id, name, color)"),
  ]);

  if (products.error) throw products.error;
  if (categories.error) console.error("Failed to load categories", categories.error);
  if (baseCategories.error) console.error("Failed to load base categories", baseCategories.error);
  if (productTags.error) console.error("Failed to load product tags", productTags.error);

  const tagsByProduct: Record<string, Tag[]> = {};
  for (const row of productTags.data ?? []) {
    const tag = row.tags as Tag | null;
    if (!tag) continue;
    (tagsByProduct[row.product_id] ??= []).push(tag);
  }

  return buildCatalog(
    products.data ?? [],
    categories.data ?? [],
    baseCategories.data ?? [],
    tagsByProduct,
  );
}
