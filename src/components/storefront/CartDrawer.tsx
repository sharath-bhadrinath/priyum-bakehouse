import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, MessageCircle, ShoppingBag, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { site, whatsappLink } from "@/config/site";
import { useCart } from "@/features/cart/CartContext";
import { buildOrderMessage } from "@/features/cart/whatsapp";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { roomyClose } from "./overlay";
import { ProductImage } from "./ProductImage";
import { QuantityStepper } from "./QuantityStepper";

type Step = "cart" | "details" | "sent";

const CUSTOMER_KEY = "pb_customer";
const today = () => new Date().toLocaleDateString("en-CA"); // yyyy-mm-dd in local time

const detailsSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name"),
  phone: z
    .string()
    .trim()
    .refine((value) => value.replace(/\D/g, "").length >= 10, "Enter a valid phone number"),
  address: z.string().trim().min(10, "Please enter your full delivery address"),
  deliveryDate: z
    .string()
    .optional()
    .refine((value) => !value || value >= today(), "Pick today or a later date"),
});
type Details = z.infer<typeof detailsSchema>;

function loadCustomer(): Partial<Details> {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? "{}");
    return { name: saved.name ?? "", phone: saved.phone ?? "", address: saved.address ?? "" };
  } catch {
    return {};
  }
}

const primaryButton =
  "flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-cocoa px-5 text-sm font-semibold text-brand-cream shadow-lg shadow-brand-cocoa/20 transition hover:bg-brand-cocoa/90 active:scale-[0.98] disabled:opacity-60";
const field =
  "mt-1.5 w-full rounded-xl border border-brand-cocoa/15 bg-white px-3.5 py-2.5 text-[15px] text-brand-cocoa placeholder:text-brand-cocoa/40 focus:border-brand-crust focus:outline-none focus:ring-2 focus:ring-brand-crust/30 aria-[invalid=true]:border-brand-berry";

export function CartDrawer() {
  const cart = useCart();
  const [step, setStep] = useState<Step>("cart");

  // Always reopen on the cart itself.
  useEffect(() => {
    if (cart.isOpen) setStep("cart");
  }, [cart.isOpen]);

  const title = step === "cart" ? "Your cart" : step === "details" ? "Delivery details" : "Almost done";

  return (
    <Sheet open={cart.isOpen} onOpenChange={cart.setOpen}>
      <SheetContent
        side="right"
        className={cn("flex w-full flex-col gap-0 border-0 bg-brand-cream p-0 sm:max-w-md", roomyClose)}
      >
        <header className="flex items-center gap-2 border-b border-brand-cocoa/10 px-4 py-4 pr-14">
          {step === "details" && (
            <button
              type="button"
              onClick={() => setStep("cart")}
              aria-label="Back to cart"
              className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-brand-cocoa hover:bg-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <SheetTitle className="font-display text-xl font-semibold text-brand-cocoa">
            {title}
            {step === "cart" && cart.count > 0 && (
              <span className="ml-2 text-sm font-normal text-brand-cocoa/50">
                {cart.count} {cart.count === 1 ? "item" : "items"}
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">Review your cart and send your order on WhatsApp.</SheetDescription>
        </header>

        {step === "cart" && <CartStep onCheckout={() => setStep("details")} />}
        {step === "details" && <DetailsStep onSent={() => setStep("sent")} />}
        {step === "sent" && <SentStep />}
      </SheetContent>
    </Sheet>
  );
}

function CartStep({ onCheckout }: { onCheckout: () => void }) {
  const cart = useCart();

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-butter">
          <ShoppingBag className="h-9 w-9 text-brand-caramel" strokeWidth={1.5} />
        </span>
        <p className="mt-5 font-display text-xl font-semibold text-brand-cocoa">Your cart is empty</p>
        <p className="mt-1 text-sm text-brand-cocoa/65">Add a few treats and they'll show up here.</p>
        <button type="button" onClick={() => cart.setOpen(false)} className={cn(primaryButton, "mt-6 w-auto px-7")}>
          Browse the menu
        </button>
      </div>
    );
  }

  return (
    <>
      <ul className="flex-1 divide-y divide-brand-cocoa/10 overflow-y-auto px-4">
        {cart.lines.map((line) => (
          <li key={line.id} className="flex gap-3 py-4">
            <ProductImage src={line.image} alt="" className="h-[72px] w-[72px] shrink-0 rounded-xl" />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug text-brand-cocoa">{line.name}</p>
                <button
                  type="button"
                  onClick={() => cart.remove(line.id)}
                  aria-label={`Remove ${line.name}`}
                  className="-mr-1.5 -mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-brand-cocoa/45 hover:bg-white hover:text-brand-berry"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-brand-cocoa/55">{formatINR(line.price)} each</p>
              <div className="mt-auto flex items-center justify-between pt-2">
                <QuantityStepper
                  size="sm"
                  quantity={line.quantity}
                  onChange={(quantity) => cart.setQuantity(line.id, quantity)}
                  removable
                  label={`Quantity of ${line.name}`}
                />
                <p className="text-sm font-semibold tabular-nums text-brand-cocoa">
                  {formatINR(line.price * line.quantity)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <footer className="pb-safe space-y-3 border-t border-brand-cocoa/10 bg-white/60 px-4 pt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-brand-cocoa/70">Subtotal</span>
          <span className="text-xl font-semibold tabular-nums text-brand-cocoa">{formatINR(cart.subtotal)}</span>
        </div>
        <p className="text-xs leading-relaxed text-brand-cocoa/55">
          Shipping and any discounts are added to your final invoice after we confirm the order.
        </p>
        <button type="button" onClick={onCheckout} className={primaryButton}>
          Continue to delivery details
        </button>
        <button
          type="button"
          onClick={cart.clear}
          className="mx-auto block h-9 px-3 text-xs font-medium text-brand-cocoa/55 underline-offset-4 hover:text-brand-berry hover:underline"
        >
          Clear cart
        </button>
      </footer>
    </>
  );
}

function DetailsStep({ onSent }: { onSent: () => void }) {
  const cart = useCart();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Details>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name: "", phone: "", address: "", deliveryDate: "", ...loadCustomer() },
  });

  const submit = (details: Details) => {
    try {
      const { name, phone, address } = details;
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name, phone, address }));
    } catch {
      // Remembering details is a convenience only.
    }
    const message = buildOrderMessage(cart.lines, cart.subtotal, {
      name: details.name,
      phone: details.phone,
      address: details.address,
      deliveryDate: details.deliveryDate || undefined,
    });
    window.open(whatsappLink(message), "_blank", "noopener,noreferrer");
    onSent();
  };

  const error = (name: keyof Details) =>
    errors[name] && (
      <p role="alert" className="mt-1 text-xs font-medium text-brand-berry">
        {errors[name]?.message}
      </p>
    );

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
        <label className="block text-sm font-medium text-brand-cocoa">
          Name
          <input {...register("name")} autoComplete="name" placeholder="Your name" aria-invalid={Boolean(errors.name)} className={field} />
          {error("name")}
        </label>
        <label className="block text-sm font-medium text-brand-cocoa">
          Phone
          <input
            {...register("phone")}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="10-digit mobile number"
            aria-invalid={Boolean(errors.phone)}
            className={field}
          />
          {error("phone")}
        </label>
        <label className="block text-sm font-medium text-brand-cocoa">
          Delivery address
          <textarea
            {...register("address")}
            rows={3}
            autoComplete="street-address"
            placeholder="House / street, area, city, PIN code"
            aria-invalid={Boolean(errors.address)}
            className={cn(field, "resize-none")}
          />
          {error("address")}
        </label>
        <label className="block text-sm font-medium text-brand-cocoa">
          Preferred delivery date <span className="font-normal text-brand-cocoa/50">(optional)</span>
          <input {...register("deliveryDate")} type="date" min={today()} aria-invalid={Boolean(errors.deliveryDate)} className={field} />
          {error("deliveryDate")}
          <span className="mt-1.5 block text-xs font-normal leading-relaxed text-brand-cocoa/55">{site.delivery.note}</span>
        </label>
      </div>

      <footer className="pb-safe space-y-3 border-t border-brand-cocoa/10 bg-white/60 px-4 pt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-brand-cocoa/70">
            {cart.count} {cart.count === 1 ? "item" : "items"}
          </span>
          <span className="text-lg font-semibold tabular-nums text-brand-cocoa">{formatINR(cart.subtotal)}</span>
        </div>
        <button type="submit" disabled={cart.lines.length === 0} className={cn(primaryButton, "bg-[#128C4B] shadow-[#128C4B]/25 hover:bg-[#0f7a41]")}>
          <MessageCircle className="h-5 w-5" />
          Send order on WhatsApp
        </button>
        <p className="text-center text-xs text-brand-cocoa/55">
          Opens WhatsApp with your order filled in. We'll confirm availability and the final total there.
        </p>
      </footer>
    </form>
  );
}

function SentStep() {
  const cart = useCart();
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <CheckCircle2 className="h-16 w-16 text-brand-leaf" strokeWidth={1.5} />
      <p className="mt-5 font-display text-2xl font-semibold text-brand-cocoa">Order ready to send</p>
      <p className="mt-2 text-sm leading-relaxed text-brand-cocoa/70">
        We opened WhatsApp with your order. Tap <strong>send</strong> there to place it — we'll reply with
        availability and your final invoice.
      </p>
      <button
        type="button"
        onClick={() => {
          cart.clear();
          cart.setOpen(false);
        }}
        className={cn(primaryButton, "mt-7")}
      >
        I've sent it — clear my cart
      </button>
      <button
        type="button"
        onClick={() => cart.setOpen(false)}
        className="mt-2 h-11 px-4 text-sm font-medium text-brand-cocoa/70 hover:text-brand-cocoa"
      >
        Keep my cart for now
      </button>
    </div>
  );
}
