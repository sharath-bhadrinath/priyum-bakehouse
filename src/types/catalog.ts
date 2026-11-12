export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

/** One purchasable size of a product (the base size or an extra weight option). */
export interface Variant {
  /** Stable key, also used in cart line ids. */
  key: string;
  weight: number | null;
  unit: string | null;
  /** Human label, e.g. "120 g" or "12 pcs". Empty when the product has no size. */
  label: string;
  mrp: number;
  price: number;
  isBase: boolean;
}

export interface Category {
  id: string;
  name: string;
  label: string;
  baseCategoryId: string | null;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  info: string | null;
  image: string | null;
  categoryId: string | null;
  /** Raw category name from the products table (legacy column). */
  categoryName: string | null;
  stock: number | null;
  soldOut: boolean;
  variants: Variant[];
  /** The size shown by default: the base variant. */
  baseVariant: Variant;
  /** Cheapest variant, used for "From ₹x" pricing. */
  minVariant: Variant;
  tags: Tag[];
}

/** A top-level navigation group (base category) and the categories under it. */
export interface CatalogGroup {
  id: string;
  name: string;
  label: string;
  categories: Category[];
}

export interface Catalog {
  products: Product[];
  groups: CatalogGroup[];
  categoriesById: Record<string, Category>;
}

export type SortKey = "featured" | "price-asc" | "price-desc" | "name" | "discount";
