import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Copy, ExternalLink, Loader2, MessageCircle, PackageSearch, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { site, whatsappLink } from "@/config/site";
import { ORDER_STEPS, STATUS_COPY, isOrderId, trackOrder } from "@/features/orders/api";
import type { TrackedOrder } from "@/features/orders/api";
import { formatDate, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { roomyClose } from "./overlay";

interface OrderTrackerProps {
  open: boolean;
  /** Pre-filled order id, e.g. from a shared `/?order=<id>` link. */
  initialOrderId?: string | null;
  onOpenChange: (open: boolean) => void;
}

export function OrderTracker({ open, initialOrderId, onOpenChange }: OrderTrackerProps) {
  const [input, setInput] = useState(initialOrderId ?? "");
  const [orderId, setOrderId] = useState(initialOrderId && isOrderId(initialOrderId) ? initialOrderId : "");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (initialOrderId) {
      setInput(initialOrderId);
      if (isOrderId(initialOrderId)) setOrderId(initialOrderId);
    }
  }, [initialOrderId]);

  const lookup = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => trackOrder(orderId),
    enabled: open && Boolean(orderId),
    retry: false,
    staleTime: 30 * 1000,
  });

  const invalid = touched && !isOrderId(input);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    const id = input.trim();
    if (!isOrderId(id)) return;
    if (id === orderId) lookup.refetch();
    else setOrderId(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg gap-0 overflow-y-auto rounded-3xl border-0 bg-brand-cream p-6 sm:rounded-3xl",
          roomyClose,
        )}
      >
        <DialogTitle className="flex items-center gap-2 font-display text-2xl font-semibold text-brand-cocoa">
          <PackageSearch className="h-6 w-6 text-brand-caramel" />
          Track your order
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm text-brand-cocoa/65">
          Enter the order ID from your invoice to see where your bakes are.
        </DialogDescription>

        <form onSubmit={submit} className="mt-5" noValidate>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="e.g. 3f2b9c1e-…"
              aria-label="Order ID"
              aria-invalid={invalid}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="h-12 min-w-0 flex-1 rounded-full border border-brand-cocoa/15 bg-white px-4 font-mono text-sm text-brand-cocoa placeholder:font-sans placeholder:text-brand-cocoa/40 focus:border-brand-crust focus:outline-none focus:ring-2 focus:ring-brand-crust/30 aria-[invalid=true]:border-brand-berry"
            />
            <button
              type="submit"
              disabled={lookup.isFetching}
              className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-brand-cocoa px-5 text-sm font-semibold text-brand-cream transition hover:bg-brand-cocoa/90 disabled:opacity-60"
            >
              {lookup.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Track"}
            </button>
          </div>
          {invalid && (
            <p role="alert" className="mt-2 text-xs font-medium text-brand-berry">
              That doesn't look like an order ID. It's the long code on your invoice, like
              3f2b9c1e-7a4d-4c1b-9e2f-5d6a7b8c9d0e.
            </p>
          )}
        </form>

        <div className="mt-5" aria-live="polite">
          {lookup.isError && (
            <Notice tone="error" title="We couldn't check that order">
              Something went wrong on our side. Please try again in a moment.
            </Notice>
          )}
          {lookup.isSuccess && !lookup.data && !lookup.isFetching && (
            <Notice tone="error" title="No order found with that ID">
              Double-check the ID on your invoice, or{" "}
              <a
                className="font-semibold underline underline-offset-2"
                href={whatsappLink(`Hi! Could you help me track my order ${orderId}?`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                message us on WhatsApp
              </a>{" "}
              and we'll look it up.
            </Notice>
          )}
          {lookup.data && <OrderResult order={lookup.data} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Notice({ tone, title, children }: { tone: "error"; title: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex gap-3 rounded-2xl p-4 text-sm", tone === "error" && "bg-brand-berry/10 text-brand-cocoa")}>
      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-berry" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 leading-relaxed text-brand-cocoa/75">{children}</p>
      </div>
    </div>
  );
}

function OrderResult({ order }: { order: TrackedOrder }) {
  const cancelled = order.status === "cancelled";
  const currentIndex = ORDER_STEPS.indexOf(order.status as (typeof ORDER_STEPS)[number]);
  const copy = STATUS_COPY[order.status];

  const copyAwb = async () => {
    if (!order.shipmentNumber) return;
    try {
      await navigator.clipboard.writeText(order.shipmentNumber);
      toast.success("Tracking number copied");
    } catch {
      toast.error("Couldn't copy. Please select and copy it manually.");
    }
  };

  return (
    <div className="animate-fade-in space-y-4">
      <dl className="grid grid-cols-3 gap-3 rounded-2xl bg-white p-4 text-sm ring-1 ring-brand-cocoa/10">
        <div>
          <dt className="text-xs text-brand-cocoa/55">For</dt>
          <dd className="truncate font-medium text-brand-cocoa">{order.customerName}</dd>
        </div>
        <div>
          <dt className="text-xs text-brand-cocoa/55">Placed</dt>
          <dd className="font-medium text-brand-cocoa">{formatDate(order.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-brand-cocoa/55">Total</dt>
          <dd className="font-medium tabular-nums text-brand-cocoa">{formatINR(order.total)}</dd>
        </div>
      </dl>

      {cancelled || currentIndex === -1 ? (
        <Notice tone="error" title={copy?.title ?? "Status unavailable"}>
          {copy?.description ?? "We're updating this order. Please check back soon or message us."}
        </Notice>
      ) : (
        <ol className="rounded-2xl bg-white p-4 ring-1 ring-brand-cocoa/10">
          {ORDER_STEPS.map((step, index) => {
            const done = index < currentIndex;
            const current = index === currentIndex;
            const last = index === ORDER_STEPS.length - 1;
            return (
              <li key={step} className="relative flex gap-3 pb-5 last:pb-0" aria-current={current ? "step" : undefined}>
                {!last && (
                  <span
                    aria-hidden
                    className={cn("absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-0.5", done ? "bg-brand-leaf" : "bg-brand-oat")}
                  />
                )}
                <span
                  className={cn(
                    "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    done && "bg-brand-leaf text-white",
                    current && "bg-brand-cocoa text-brand-cream ring-4 ring-brand-butter",
                    !done && !current && "bg-brand-oat text-brand-cocoa/40",
                  )}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
                </span>
                <div className="pt-0.5">
                  <p className={cn("text-sm font-semibold", done || current ? "text-brand-cocoa" : "text-brand-cocoa/40")}>
                    {STATUS_COPY[step].title}
                  </p>
                  {current && <p className="mt-0.5 text-sm leading-relaxed text-brand-cocoa/70">{STATUS_COPY[step].description}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {order.shipmentNumber && !cancelled && (
        <div className="rounded-2xl bg-brand-butter/60 p-4">
          <p className="text-xs text-brand-cocoa/60">{site.delivery.courierName} tracking number</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="break-all font-mono text-base font-semibold text-brand-cocoa">{order.shipmentNumber}</p>
            <button
              type="button"
              onClick={copyAwb}
              aria-label="Copy tracking number"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-cocoa hover:bg-brand-cream"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <a
            href={site.delivery.courierTrackingUrl(order.shipmentNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex h-11 items-center justify-center gap-2 rounded-full bg-brand-cocoa text-sm font-semibold text-brand-cream hover:bg-brand-cocoa/90"
          >
            Track on {site.delivery.courierName} <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}

      <a
        href={whatsappLink(`Hi! I have a question about my order ${order.id}.`)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-10 items-center justify-center gap-2 text-sm font-medium text-brand-cocoa/70 hover:text-brand-cocoa"
      >
        <MessageCircle className="h-4 w-4" /> Need help with this order?
      </a>
    </div>
  );
}
