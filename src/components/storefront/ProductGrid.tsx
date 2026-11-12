import { SearchX } from "lucide-react";
import type { Catalog, Product } from "@/types/catalog";
import { groupByCategory } from "@/lib/catalog";
import { ProductCard } from "./ProductCard";

const grid = "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4";

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={grid} aria-busy="true" aria-label="Loading menu">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl bg-white ring-1 ring-brand-cocoa/10">
          <div className="aspect-square animate-pulse bg-brand-oat" />
          <div className="space-y-2.5 p-3 md:p-4">
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-brand-oat" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-brand-oat" />
            <div className="h-10 animate-pulse rounded-full bg-brand-oat" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface ProductGridProps {
  catalog: Catalog;
  products: Product[];
  /** Split the list into one section per category. */
  sectioned: boolean;
  query: string;
  onOpen: (productId: string) => void;
  onClearSearch: () => void;
}

export function ProductGrid({ catalog, products, sectioned, query, onOpen, onClearSearch }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-brand-cocoa/10">
        <SearchX className="mx-auto h-10 w-10 text-brand-crust" strokeWidth={1.5} />
        <h3 className="mt-4 font-display text-xl font-semibold text-brand-cocoa">
          {query ? "Nothing matches that search" : "Fresh bakes coming soon"}
        </h3>
        <p className="mt-2 text-sm text-brand-cocoa/70">
          {query
            ? `We couldn't find anything for “${query}”. Try a different word or browse the full menu.`
            : "We're still stocking this shelf. Check back shortly."}
        </p>
        {query && (
          <button
            type="button"
            onClick={onClearSearch}
            className="mt-5 inline-flex h-10 items-center rounded-full bg-brand-cocoa px-5 text-sm font-semibold text-brand-cream"
          >
            Show full menu
          </button>
        )}
      </div>
    );
  }

  if (!sectioned) {
    return (
      <div className={grid}>
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} onOpen={onOpen} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-10 md:space-y-14">
      {groupByCategory(catalog, products).map(({ category, products: items }) => (
        <section key={category.id} aria-labelledby={`cat-${category.id}`}>
          <div className="mb-4 flex items-baseline gap-3 md:mb-6">
            <h2 id={`cat-${category.id}`} className="font-display text-2xl font-semibold text-brand-cocoa md:text-3xl">
              {category.label}
            </h2>
            <span className="text-sm text-brand-cocoa/50">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
            <span className="h-px flex-1 bg-brand-cocoa/10" aria-hidden />
          </div>
          <div className={grid}>
            {items.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} onOpen={onOpen} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
