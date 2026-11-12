import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AnnouncementBar } from "@/components/storefront/AnnouncementBar";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { CatalogToolbar } from "@/components/storefront/CatalogToolbar";
import { CategoryNav } from "@/components/storefront/CategoryNav";
import { Footer } from "@/components/storefront/Footer";
import { Header } from "@/components/storefront/Header";
import { Hero } from "@/components/storefront/Hero";
import { MobileCartBar } from "@/components/storefront/MobileCartBar";
import { OrderTracker } from "@/components/storefront/OrderTracker";
import { ProductDetail } from "@/components/storefront/ProductDetail";
import { ProductGrid, ProductGridSkeleton } from "@/components/storefront/ProductGrid";
import { CartProvider, useCart } from "@/features/cart/CartContext";
import { useCatalog } from "@/features/catalog/useCatalog";
import { useCatalogFilters } from "@/features/catalog/useCatalogFilters";
import { filterProducts } from "@/lib/catalog";

/** Height of the sticky header + category bar, used when scrolling to the menu. */
const STICKY_OFFSET = 180;

function Storefront() {
  const { data: catalog, isPending, isError, refetch, isFetching } = useCatalog();
  const nav = useCatalogFilters(catalog);
  const cart = useCart();
  const { filters } = nav;
  const menuRef = useRef<HTMLElement>(null);
  const [trackerOpen, setTrackerOpen] = useState(Boolean(nav.trackOrderId));

  // The storefront sizes its own touch targets (see index.css).
  useEffect(() => {
    document.documentElement.classList.add("storefront");
    return () => document.documentElement.classList.remove("storefront");
  }, []);

  const products = useMemo(() => (catalog ? filterProducts(catalog, filters) : []), [catalog, filters]);
  const selected = useMemo(
    () => catalog?.products.find((p) => p.id === nav.productId) ?? null,
    [catalog, nav.productId],
  );

  const scrollToMenu = useCallback((onlyIfBelow = false) => {
    const menu = menuRef.current;
    if (!menu) return;
    const top = menu.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET;
    if (onlyIfBelow && window.scrollY <= top) return;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  const searching = filters.query.trim().length > 0;
  const group = catalog?.groups.find((g) => g.id === filters.groupId);
  const category = filters.categoryId ? catalog?.categoriesById[filters.categoryId] : undefined;
  const title = searching
    ? `Results for “${filters.query.trim()}”`
    : category?.label ?? group?.label ?? "Our menu";
  // Decided from the URL, not the resolved filters, so deep links don't flash the hero while loading.
  const isHome = !nav.hasFilters;

  const { setQuery, setGroup, setCategory } = nav;
  const onQuery = useCallback(
    (query: string) => {
      setQuery(query);
      if (query) scrollToMenu();
    },
    [setQuery, scrollToMenu],
  );
  const onGroup = useCallback(
    (id: string | null) => {
      setGroup(id);
      scrollToMenu(true);
    },
    [setGroup, scrollToMenu],
  );
  const onCategory = useCallback(
    (id: string | null) => {
      setCategory(id);
      scrollToMenu(true);
    },
    [setCategory, scrollToMenu],
  );

  return (
    <div className="flex min-h-screen flex-col bg-brand-cream font-sans text-brand-cocoa">
      <a
        href="#menu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-brand-cocoa focus:px-4 focus:py-2 focus:text-brand-cream"
      >
        Skip to menu
      </a>
      <AnnouncementBar />
      <Header query={filters.query} onQueryChange={onQuery} onTrackOrder={() => setTrackerOpen(true)} />

      <main className="flex-1">
        {isHome && (
          <Hero
            hasEggless={Boolean(catalog?.groups.some((g) => /eggless/i.test(g.label)))}
            onBrowse={() => scrollToMenu()}
          />
        )}

        <section id="menu" ref={menuRef} className="scroll-mt-48 pt-8 md:pt-12">
          {catalog && catalog.groups.length > 0 && (
            <CategoryNav
              groups={catalog.groups}
              groupId={filters.groupId}
              categoryId={filters.categoryId}
              searching={searching}
              onGroup={onGroup}
              onCategory={onCategory}
            />
          )}

          <div className={`container px-4 pt-8 md:pt-10 ${cart.count > 0 ? "pb-24 md:pb-0" : ""}`}>
            {isPending ? (
              <ProductGridSkeleton />
            ) : isError || !catalog ? (
              <div className="mx-auto max-w-md rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-brand-cocoa/10">
                <h2 className="font-display text-xl font-semibold">The oven's taking a moment</h2>
                <p className="mt-2 text-sm text-brand-cocoa/70">
                  We couldn't load the menu. Check your connection and try again.
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-brand-cocoa px-6 text-sm font-semibold text-brand-cream disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                  Try again
                </button>
              </div>
            ) : (
              <>
                <CatalogToolbar title={title} count={products.length} sort={filters.sort} onSort={nav.setSort} />
                <ProductGrid
                  // Re-key so the entrance animation replays when the view changes.
                  key={`${filters.groupId}-${filters.categoryId}-${filters.sort}-${searching}`}
                  catalog={catalog}
                  products={products}
                  sectioned={!searching && !filters.categoryId && filters.sort === "featured"}
                  query={filters.query.trim()}
                  onOpen={nav.openProduct}
                  onClearSearch={() => setQuery("")}
                />
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
      <MobileCartBar />
      <CartDrawer />
      <ProductDetail
        product={selected}
        category={selected?.categoryId ? catalog?.categoriesById[selected.categoryId] : undefined}
        onClose={nav.closeProduct}
      />
      <OrderTracker
        open={trackerOpen}
        initialOrderId={nav.trackOrderId}
        onOpenChange={(open) => {
          setTrackerOpen(open);
          if (!open && nav.trackOrderId) nav.update({ order: null }, { replace: true });
        }}
      />
    </div>
  );
}

const Landing = () => (
  <CartProvider>
    <Storefront />
  </CartProvider>
);

export default Landing;
