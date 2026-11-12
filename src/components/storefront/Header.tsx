import { useEffect, useState } from "react";
import { PackageSearch, Search, ShoppingBag, X } from "lucide-react";
import { site } from "@/config/site";
import { useCart } from "@/features/cart/CartContext";
import { cn } from "@/lib/utils";
import { SearchInput } from "./SearchInput";

interface HeaderProps {
  query: string;
  onQueryChange: (query: string) => void;
  onTrackOrder: () => void;
}

const iconButton =
  "relative flex h-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium text-brand-cocoa transition-colors hover:bg-brand-cocoa/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cocoa/40";

export function Header({ query, onQueryChange, onTrackOrder }: HeaderProps) {
  const cart = useCart();
  const [mobileSearch, setMobileSearch] = useState(Boolean(query));
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-brand-butter transition-shadow duration-300",
        scrolled && "shadow-[0_2px_16px_rgba(67,32,15,0.12)]",
      )}
    >
      {/* Equal side columns keep the logo truly centred whatever sits beside it.
          Heights here must match the sticky offset in CategoryNav. */}
      <div className="container grid h-20 grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 md:h-28">
        <div className="flex items-center">
          <SearchInput value={query} onChange={onQueryChange} className="hidden w-full max-w-sm md:block" />
          <button
            type="button"
            className={cn(iconButton, "-ml-2 md:hidden")}
            onClick={() => {
              if (mobileSearch && query) onQueryChange("");
              setMobileSearch((open) => !open);
            }}
            aria-expanded={mobileSearch}
            aria-label={mobileSearch ? "Close search" : "Search the menu"}
          >
            {mobileSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
        </div>

        <a
          href="/"
          className="flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cocoa/40"
          aria-label={`${site.name} home`}
        >
          {/* The artwork is a centred square inside a wide image: a square box with a
              light zoom shows all of it without the empty sides. */}
          <span className="block h-16 w-16 overflow-hidden md:h-24 md:w-24">
            <img
              src={site.logo}
              alt={site.name}
              width={1408}
              height={768}
              className="h-full w-full scale-[1.12] object-cover"
            />
          </span>
        </a>

        <nav className="flex items-center justify-end gap-0.5" aria-label="Shop actions">
          <button type="button" className={iconButton} onClick={onTrackOrder}>
            <PackageSearch className="h-5 w-5" />
            <span className="hidden lg:inline">Track order</span>
            <span className="sr-only lg:hidden">Track order</span>
          </button>

          <button
            type="button"
            className={cn(iconButton, "bg-brand-cocoa text-brand-cream hover:bg-brand-cocoa/90")}
            onClick={() => cart.setOpen(true)}
            aria-label={`Open cart, ${cart.count} ${cart.count === 1 ? "item" : "items"}`}
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="hidden sm:inline">Cart</span>
            {cart.count > 0 && (
              <span
                key={cart.count}
                className="bump flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-berry px-1 text-[11px] font-bold leading-none text-white"
              >
                {cart.count}
              </span>
            )}
          </button>
        </nav>
      </div>

      {mobileSearch && (
        <div className="container px-4 pb-3 md:hidden">
          <SearchInput value={query} onChange={onQueryChange} autoFocus={!query} />
        </div>
      )}
    </header>
  );
}
