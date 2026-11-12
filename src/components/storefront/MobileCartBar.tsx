import { ChevronRight, ShoppingBag } from "lucide-react";
import { useCart } from "@/features/cart/CartContext";
import { formatINR } from "@/lib/format";

/** Sticky bottom bar on phones so the cart is always one tap away. */
export function MobileCartBar() {
  const cart = useCart();
  if (cart.count === 0 || cart.isOpen) return null;

  return (
    <div className="pb-safe pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 md:hidden">
      <button
        type="button"
        onClick={() => cart.setOpen(true)}
        className="pointer-events-auto flex h-14 w-full animate-slide-up items-center gap-3 rounded-2xl bg-brand-cocoa px-4 text-brand-cream shadow-2xl shadow-brand-cocoa/40"
      >
        <span className="relative">
          <ShoppingBag className="h-5 w-5" />
        </span>
        <span className="text-sm font-medium">
          {cart.count} {cart.count === 1 ? "item" : "items"}
        </span>
        <span className="text-sm font-semibold tabular-nums">· {formatINR(cart.subtotal)}</span>
        <span className="ml-auto flex items-center gap-1 text-sm font-semibold text-brand-butter">
          View cart <ChevronRight className="h-4 w-4" />
        </span>
      </button>
    </div>
  );
}
