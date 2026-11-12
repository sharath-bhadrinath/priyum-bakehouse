import { discountPercent, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PriceProps {
  price: number;
  mrp: number;
  /** Prefix the price with "From" when other, pricier sizes exist. */
  from?: boolean;
  size?: "md" | "lg";
  className?: string;
}

export function Price({ price, mrp, from, size = "md", className }: PriceProps) {
  const off = discountPercent(mrp, price);
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span
        className={cn(
          "font-semibold tabular-nums text-brand-cocoa",
          size === "lg" ? "text-2xl" : "text-base md:text-lg",
        )}
      >
        {from && <span className="mr-1 text-xs font-medium text-brand-cocoa/60">From</span>}
        {formatINR(price)}
      </span>
      {off > 0 && (
        <>
          <span className="text-xs tabular-nums text-brand-cocoa/50 line-through">
            <span className="sr-only">MRP </span>
            {formatINR(mrp)}
          </span>
          <span className="text-xs font-semibold text-brand-leaf">{off}% off</span>
        </>
      )}
    </div>
  );
}
