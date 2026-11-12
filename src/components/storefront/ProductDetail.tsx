import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Share2, ShoppingBag } from "lucide-react";
import type { Category, Product, Variant } from "@/types/catalog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { useCart } from "@/features/cart/CartContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { roomyClose } from "./overlay";
import { Price } from "./Price";
import { ProductImage } from "./ProductImage";
import { QuantityStepper } from "./QuantityStepper";
import { TagPill } from "./TagPill";

interface ProductDetailProps {
  product: Product | null;
  category?: Category;
  onClose: () => void;
}

/** Product sheet: a centred dialog on desktop, a swipe-to-dismiss drawer on phones. */
export function ProductDetail({ product, category, onClose }: ProductDetailProps) {
  const isMobile = useIsMobile();
  // Keep rendering the last product while the overlay animates out.
  const [shown, setShown] = useState(product);
  useEffect(() => {
    if (product) setShown(product);
  }, [product]);

  const open = Boolean(product);
  const onOpenChange = (next: boolean) => {
    if (!next) onClose();
  };
  const body = shown && <DetailBody key={shown.id} product={shown} category={category} onAdded={onClose} isMobile={isMobile} />;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92dvh] border-0 bg-brand-cream">{body}</DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] max-w-4xl gap-0 overflow-hidden border-0 bg-brand-cream p-0 sm:rounded-3xl",
          roomyClose,
        )}
      >
        {body}
      </DialogContent>
    </Dialog>
  );
}

interface DetailBodyProps {
  product: Product;
  category?: Category;
  isMobile: boolean;
  onAdded: () => void;
}

function DetailBody({ product, category, isMobile, onAdded }: DetailBodyProps) {
  const cart = useCart();
  const [variant, setVariant] = useState<Variant>(product.baseVariant);
  const [quantity, setQuantity] = useState(1);
  const Title = isMobile ? DrawerTitle : DialogTitle;
  const Description = isMobile ? DrawerDescription : DialogDescription;

  const addToCart = () => {
    const line = cart.add(product, variant, quantity);
    toast.success("Added to cart", {
      description: `${quantity} × ${line.name}`,
      action: { label: "View cart", onClick: () => cart.setOpen(true) },
    });
    onAdded();
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      // Share sheet dismissed: nothing to do.
    }
  };

  return (
    <div className="flex min-h-0 flex-col md:grid md:max-h-[90vh] md:grid-cols-2 md:grid-rows-[minmax(0,1fr)_auto]">
      <div className="min-h-0 flex-1 overflow-y-auto md:contents">
        <ProductImage
          src={product.image}
          alt={product.name}
          eager
          fit="contain"
          className="mx-4 mt-2 aspect-[4/3] rounded-2xl md:row-span-2 md:m-0 md:aspect-auto md:h-full md:min-h-[460px] md:rounded-none"
        />

        <div className="space-y-5 p-4 md:overflow-y-auto md:p-8 md:pb-4">
          <div>
            {category && (
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-caramel">{category.label}</p>
            )}
            <div className="mt-1 flex items-start justify-between gap-3">
              <Title className="font-display text-2xl font-semibold leading-tight text-brand-cocoa md:text-3xl">
                {product.name}
              </Title>
              <button
                type="button"
                onClick={share}
                aria-label="Share this product"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-brand-cocoa/70 ring-1 ring-brand-cocoa/15 hover:bg-white hover:text-brand-cocoa md:mr-10"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
            {product.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {product.tags.map((tag) => (
                  <TagPill key={tag.id} tag={tag} />
                ))}
              </div>
            )}
          </div>

          <Price price={variant.price} mrp={variant.mrp} size="lg" />

          {product.variants.length > 1 ? (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-brand-cocoa">Choose a size</legend>
              <div className="grid grid-cols-2 gap-2" role="radiogroup">
                {product.variants.map((option) => {
                  const selected = option.key === variant.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setVariant(option)}
                      className={cn(
                        "relative rounded-2xl border-2 px-3 py-2.5 text-left transition",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-crust focus-visible:ring-offset-2",
                        selected
                          ? "border-brand-cocoa bg-white shadow-sm"
                          : "border-transparent bg-white/60 ring-1 ring-brand-cocoa/10 hover:bg-white",
                      )}
                    >
                      <span className="block text-sm font-semibold text-brand-cocoa">{option.label}</span>
                      <span className="block text-sm tabular-nums text-brand-cocoa/70">{formatINR(option.price)}</span>
                      {selected && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-cocoa text-brand-cream">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : (
            variant.label && <p className="text-sm text-brand-cocoa/70">Pack size: {variant.label}</p>
          )}

          {product.description ? (
            <Description className="whitespace-pre-line text-[15px] leading-relaxed text-brand-cocoa/80">
              {product.description}
            </Description>
          ) : (
            <Description className="sr-only">Details for {product.name}</Description>
          )}

          {product.info && (
            <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-brand-cocoa/10">
              <h3 className="text-sm font-semibold text-brand-cocoa">Good to know</h3>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-brand-cocoa/75">{product.info}</p>
            </div>
          )}
        </div>
      </div>

      <div className="pb-safe flex items-center gap-3 border-t border-brand-cocoa/10 bg-brand-cream px-4 pt-3 md:col-start-2 md:px-8 md:pb-6">
        {product.soldOut ? (
          <p className="flex h-12 w-full items-center justify-center rounded-full bg-brand-oat text-sm font-semibold text-brand-cocoa/60">
            Sold out for now
          </p>
        ) : (
          <>
            <QuantityStepper quantity={quantity} onChange={setQuantity} label="Quantity" />
            <button
              type="button"
              onClick={addToCart}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand-cocoa px-5 text-sm font-semibold text-brand-cream shadow-lg shadow-brand-cocoa/20 transition hover:bg-brand-cocoa/90 active:scale-[0.98]"
            >
              <ShoppingBag className="h-4 w-4" />
              Add · {formatINR(variant.price * quantity)}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
