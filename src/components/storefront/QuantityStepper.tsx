import { Minus, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  quantity: number;
  onChange: (quantity: number) => void;
  /** Show a bin instead of minus at quantity 1 (decrementing removes the line). */
  removable?: boolean;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  label: string;
  className?: string;
}

export function QuantityStepper({
  quantity,
  onChange,
  removable = false,
  min = removable ? 0 : 1,
  max = 99,
  size = "md",
  label,
  className,
}: QuantityStepperProps) {
  const button = cn(
    "flex shrink-0 items-center justify-center rounded-full text-brand-cocoa transition-colors",
    "hover:bg-brand-butter active:scale-90 disabled:opacity-40 disabled:hover:bg-transparent",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-crust",
    size === "sm" ? "h-8 w-8" : "h-10 w-10",
  );

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-between rounded-full border border-brand-crust/40 bg-white p-0.5",
        className,
      )}
    >
      <button
        type="button"
        className={button}
        onClick={() => onChange(quantity - 1)}
        disabled={quantity <= min}
        aria-label={removable && quantity === 1 ? "Remove from cart" : "Decrease quantity"}
      >
        {removable && quantity === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
      </button>
      <span
        key={quantity}
        className="bump min-w-8 px-1 text-center text-sm font-semibold tabular-nums text-brand-cocoa"
        aria-live="polite"
      >
        {quantity}
      </span>
      <button
        type="button"
        className={button}
        onClick={() => onChange(quantity + 1)}
        disabled={quantity >= max}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
