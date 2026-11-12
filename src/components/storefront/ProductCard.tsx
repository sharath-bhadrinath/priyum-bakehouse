import { memo } from "react";
import { toast } from "sonner";
import { Plus, SlidersHorizontal } from "lucide-react";
import type { Product } from "@/types/catalog";
import { cartLineId, useCart } from "@/features/cart/CartContext";
import { discountPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";
import { QuantityStepper } from "./QuantityStepper";
import { TagPill } from "./TagPill";

interface ProductCardProps {
  product: Product;
  /** Position in the list, used to stagger the entrance animation. */
  index?: number;
  onOpen: (productId: string) => void;
  className?: string;
}

const actionButton =
  "flex h-10 w-full items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-crust focus-visible:ring-offset-2";

function ProductCardImpl({ product, index = 0, onOpen, className }: ProductCardProps) {
  const cart = useCart();
  const hasSizes = product.variants.length > 1;
  const shown = hasSizes ? product.minVariant : product.baseVariant;
  const lineId = cartLineId(product, product.baseVariant);
  const inCart = cart.quantityOf(lineId);
  const off = discountPercent(shown.mrp, shown.price);
  // The cheapest size may be full price while a bigger one is on offer; don't hide that.
  const bestOff = Math.max(...product.variants.map((variant) => discountPercent(variant.mrp, variant.price)));

  const addToCart = () => {
    const line = cart.add(product, product.baseVariant);
    toast.success("Added to cart", {
      description: line.name,
      action: { label: "View cart", onClick: () => cart.setOpen(true) },
    });
  };

  return (
    <article
      className={cn(
        "rise-in group relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-brand-cocoa/10 transition duration-300",
        "hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-cocoa/10 hover:ring-brand-crust/40",
        className,
      )}
      style={{ "--i": index } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={() => onOpen(product.id)}
        className="relative block aspect-square w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-crust"
        aria-label={`View ${product.name}`}
      >
        <ProductImage
          src={product.image}
          alt={product.name}
          eager={index < 4}
          className={cn(
            "h-full w-full group-hover:[&>img]:scale-105",
            product.soldOut && "opacity-60 grayscale",
          )}
        />
        {product.soldOut ? (
          <span className="absolute left-2 top-2 rounded-full bg-brand-cocoa px-2.5 py-1 text-[11px] font-semibold text-brand-cream">
            Sold out
          </span>
        ) : (
          bestOff > 0 && (
            <span className="absolute left-2 top-2 rounded-full bg-brand-berry px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
              {bestOff > off ? `Up to ${bestOff}% off` : `${off}% off`}
            </span>
          )
        )}
      </button>

      <div className="flex flex-1 flex-col p-3 md:p-4">
        {product.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {product.tags.slice(0, 2).map((tag) => (
              <TagPill key={tag.id} tag={tag} />
            ))}
          </div>
        )}

        <h3 className="font-display text-[15px] font-semibold leading-snug text-brand-cocoa md:text-lg">
          <button
            type="button"
            onClick={() => onOpen(product.id)}
            className="line-clamp-2 text-left hover:text-brand-caramel focus-visible:underline focus-visible:outline-none"
          >
            {product.name}
          </button>
        </h3>

        {product.description && (
          <p className="mt-1 hidden text-sm leading-relaxed text-brand-cocoa/65 sm:line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="mt-auto pt-3">
          <Price price={shown.price} mrp={shown.mrp} from={hasSizes} />
          {shown.label && <p className="mt-0.5 text-xs text-brand-cocoa/60">{shown.label}</p>}

          <div className="mt-3">
            {product.soldOut ? (
              <button type="button" disabled className={cn(actionButton, "cursor-not-allowed bg-brand-oat text-brand-cocoa/50")}>
                Sold out
              </button>
            ) : hasSizes ? (
              <button
                type="button"
                onClick={() => onOpen(product.id)}
                className={cn(actionButton, "bg-brand-butter text-brand-cocoa hover:bg-brand-cocoa hover:text-brand-cream")}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Choose size
              </button>
            ) : inCart > 0 ? (
              <QuantityStepper
                quantity={inCart}
                onChange={(quantity) => cart.setQuantity(lineId, quantity)}
                removable
                label={`Quantity of ${product.name}`}
                className="w-full"
              />
            ) : (
              <button
                type="button"
                onClick={addToCart}
                className={cn(actionButton, "bg-brand-butter text-brand-cocoa hover:bg-brand-cocoa hover:text-brand-cream")}
              >
                <Plus className="h-4 w-4" />
                <span>
                  Add<span className="hidden sm:inline"> to cart</span>
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export const ProductCard = memo(ProductCardImpl);
