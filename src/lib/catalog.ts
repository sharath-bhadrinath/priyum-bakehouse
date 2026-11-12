import type { Catalog, CatalogGroup, Category, Product, SortKey, Tag, Variant } from "@/types/catalog";
import { discountPercent, formatSize } from "@/lib/format";

/** Id of the synthetic group holding categories without a base category. */
export const MORE_GROUP_ID = "more";
/** Id of the synthetic category holding products without a category. */
export const UNCATEGORISED_ID = "uncategorised";

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  info: string | null;
  image: string | null;
  category: string | null;
  category_id?: string | null;
  stock: number | null;
  price?: number | null;
  mrp?: number | null;
  selling_price?: number | null;
  base_weight: number | null;
  weight_unit: string | null;
  weight_options: unknown;
}

interface CategoryRow {
  id: string;
  name: string;
  display_name: string;
  base_category_id?: string | null;
}

interface BaseCategoryRow {
  id: string;
  name: string;
  display_name: string;
}

const toNumber = (value: unknown) => {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(n) ? n : 0;
};

/** Same key the previous storefront used, so carts saved in localStorage stay valid. */
const variantKey = (weight: number | null, unit: string | null) =>
  weight && unit ? `${weight}${unit}` : "base";

export function parseWeightOptions(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function normalizeProduct(row: ProductRow, tags: Tag[] = []): Product {
  const basePrice = toNumber(row.selling_price ?? row.price);
  const baseWeight = row.base_weight || null;
  const baseUnit = row.weight_unit || null;

  const base: Variant = {
    key: variantKey(baseWeight, baseUnit),
    weight: baseWeight,
    unit: baseUnit,
    label: formatSize(baseWeight, baseUnit),
    mrp: Math.max(toNumber(row.mrp ?? row.price), basePrice),
    price: basePrice,
    isBase: true,
  };

  const seen = new Set([base.key]);
  const extras: Variant[] = [];
  for (const option of parseWeightOptions(row.weight_options)) {
    const weight = toNumber(option.weight) || null;
    const unit = typeof option.unit === "string" && option.unit ? option.unit : null;
    const price = toNumber(option.selling_price ?? option.price);
    const key = variantKey(weight, unit);
    if (!weight || !unit || price <= 0 || seen.has(key)) continue;
    seen.add(key);
    extras.push({
      key,
      weight,
      unit,
      label: formatSize(weight, unit),
      mrp: Math.max(toNumber(option.mrp ?? option.price), price),
      price,
      isBase: false,
    });
  }

  const variants = [base, ...extras].sort((a, b) => a.price - b.price);

  return {
    id: row.id,
    name: row.name,
    description: row.description?.trim() || null,
    info: row.info?.trim() || null,
    image: row.image || null,
    categoryId: row.category_id ?? null,
    categoryName: row.category,
    stock: row.stock,
    soldOut: row.stock !== null && row.stock <= 0,
    variants,
    baseVariant: base,
    minVariant: variants[0],
    tags,
  };
}

export function buildCatalog(
  productRows: ProductRow[],
  categoryRows: CategoryRow[],
  baseCategoryRows: BaseCategoryRow[],
  tagsByProduct: Record<string, Tag[]>,
): Catalog {
  const products = productRows.map((row) => normalizeProduct(row, tagsByProduct[row.id]));

  const categoriesById: Record<string, Category> = {};
  for (const row of categoryRows) {
    categoriesById[row.id] = {
      id: row.id,
      name: row.name,
      label: row.display_name,
      baseCategoryId: row.base_category_id ?? null,
    };
  }

  // Products pointing at a missing category fall back to "uncategorised".
  for (const product of products) {
    if (!product.categoryId || !categoriesById[product.categoryId]) {
      product.categoryId = UNCATEGORISED_ID;
    }
  }

  const usedCategoryIds = new Set(products.map((p) => p.categoryId));
  const visible = (c: Category) => usedCategoryIds.has(c.id);
  const all = Object.values(categoriesById).sort((a, b) => a.label.localeCompare(b.label));

  const groups: CatalogGroup[] = baseCategoryRows
    .map((base) => ({
      id: base.id,
      name: base.name,
      label: base.display_name,
      categories: all.filter((c) => c.baseCategoryId === base.id && visible(c)),
    }))
    .filter((group) => group.categories.length > 0);

  const knownBaseIds = new Set(baseCategoryRows.map((b) => b.id));
  const orphans = all.filter(
    (c) => visible(c) && (!c.baseCategoryId || !knownBaseIds.has(c.baseCategoryId)),
  );
  if (usedCategoryIds.has(UNCATEGORISED_ID)) {
    const uncategorised: Category = {
      id: UNCATEGORISED_ID,
      name: UNCATEGORISED_ID,
      label: "Specials",
      baseCategoryId: null,
    };
    categoriesById[UNCATEGORISED_ID] = uncategorised;
    orphans.push(uncategorised);
  }
  if (orphans.length > 0) {
    groups.push({ id: MORE_GROUP_ID, name: MORE_GROUP_ID, label: "More treats", categories: orphans });
  }

  return { products, groups, categoriesById };
}

export interface CatalogFilters {
  query: string;
  groupId: string | null;
  categoryId: string | null;
  sort: SortKey;
}

export function filterProducts(catalog: Catalog, filters: CatalogFilters): Product[] {
  const query = filters.query.trim().toLowerCase();
  const group = filters.groupId ? catalog.groups.find((g) => g.id === filters.groupId) : null;
  const groupCategoryIds = group ? new Set(group.categories.map((c) => c.id)) : null;

  const matches = catalog.products.filter((product) => {
    // A search looks across the whole menu, regardless of the selected category.
    if (query) {
      const haystack = [
        product.name,
        product.description,
        catalog.categoriesById[product.categoryId ?? ""]?.label,
        ...product.tags.map((t) => t.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return query.split(/\s+/).every((word) => haystack.includes(word));
    }
    if (filters.categoryId) return product.categoryId === filters.categoryId;
    if (groupCategoryIds) return groupCategoryIds.has(product.categoryId ?? "");
    return true;
  });

  return sortProducts(matches, filters.sort);
}

export function sortProducts(products: Product[], sort: SortKey): Product[] {
  const list = [...products];
  switch (sort) {
    case "price-asc":
      return list.sort((a, b) => a.minVariant.price - b.minVariant.price);
    case "price-desc":
      return list.sort((a, b) => b.minVariant.price - a.minVariant.price);
    case "discount":
      return list.sort(
        (a, b) =>
          discountPercent(b.baseVariant.mrp, b.baseVariant.price) -
          discountPercent(a.baseVariant.mrp, a.baseVariant.price),
      );
    case "name":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    default:
      // Featured: available first, then alphabetical.
      return list.sort(
        (a, b) => Number(a.soldOut) - Number(b.soldOut) || a.name.localeCompare(b.name),
      );
  }
}

/** Groups products into category sections, in navigation order. */
export function groupByCategory(catalog: Catalog, products: Product[]) {
  const order = catalog.groups.flatMap((g) => g.categories);
  return order
    .map((category) => ({
      category,
      products: products.filter((p) => p.categoryId === category.id),
    }))
    .filter((section) => section.products.length > 0);
}
