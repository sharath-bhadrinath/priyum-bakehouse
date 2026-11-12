import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Catalog, SortKey } from "@/types/catalog";
import type { CatalogFilters } from "@/lib/catalog";

const SORT_KEYS: SortKey[] = ["featured", "price-asc", "price-desc", "name", "discount"];

/**
 * Keeps menu state (group, category, search, sort, open product) in the URL so
 * every view is shareable and the browser back button works.
 *
 *   /?group=cakes&category=brownies&q=walnut&sort=price-asc&product=<id>
 */
export function useCatalogFilters(catalog: Catalog | undefined) {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<CatalogFilters>(() => {
    const groups = catalog?.groups ?? [];
    const categoryName = params.get("category");
    const groupName = params.get("group");
    const sort = params.get("sort") as SortKey | null;

    let group = groups.find((g) => g.name === groupName) ?? null;
    const category = categoryName
      ? groups.flatMap((g) => g.categories).find((c) => c.name === categoryName) ?? null
      : null;
    // A category link without a group still highlights the right group.
    if (category && (!group || !group.categories.includes(category))) {
      group = groups.find((g) => g.categories.includes(category)) ?? null;
    }

    return {
      query: params.get("q") ?? "",
      groupId: group?.id ?? null,
      categoryId: category?.id ?? null,
      sort: sort && SORT_KEYS.includes(sort) ? sort : "featured",
    };
  }, [catalog, params]);

  const update = useCallback(
    (changes: Record<string, string | null>, options?: { replace?: boolean }) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          return next;
        },
        { replace: options?.replace ?? false, preventScrollReset: true },
      );
    },
    [setParams],
  );

  const setGroup = useCallback(
    (groupId: string | null) => {
      const group = catalog?.groups.find((g) => g.id === groupId);
      update({ group: group?.name ?? null, category: null, q: null });
    },
    [catalog, update],
  );

  const setCategory = useCallback(
    (categoryId: string | null) => {
      const group = catalog?.groups.find((g) => g.categories.some((c) => c.id === categoryId));
      const category = group?.categories.find((c) => c.id === categoryId);
      update({
        category: category?.name ?? null,
        ...(group ? { group: group.name } : {}),
        q: null,
      });
    },
    [catalog, update],
  );

  const setQuery = useCallback(
    (query: string) => update({ q: query || null }, { replace: true }),
    [update],
  );

  const setSort = useCallback(
    (sort: SortKey) => update({ sort: sort === "featured" ? null : sort }, { replace: true }),
    [update],
  );

  const openProduct = useCallback((productId: string) => update({ product: productId }), [update]);
  const closeProduct = useCallback(() => update({ product: null }), [update]);

  return {
    filters,
    /** True when the URL asks for a filtered view, even before the catalog has loaded. */
    hasFilters: Boolean(params.get("group") || params.get("category") || params.get("q")),
    productId: params.get("product"),
    trackOrderId: params.get("order"),
    setGroup,
    setCategory,
    setQuery,
    setSort,
    openProduct,
    closeProduct,
    update,
  };
}
