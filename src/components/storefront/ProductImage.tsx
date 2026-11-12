import { useState } from "react";
import { Cookie } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImageProps {
  src: string | null;
  alt: string;
  className?: string;
  /** Load immediately instead of lazily (for above-the-fold images). */
  eager?: boolean;
  /** "cover" fills the frame (cards); "contain" shows the whole photo (detail view). */
  fit?: "cover" | "contain";
}

/** Product photo with a fade-in and a branded placeholder when it is missing or fails to load. */
export function ProductImage({ src, alt, className, eager, fit = "cover" }: ProductImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(src ? "loading" : "error");

  return (
    <div className={cn("relative overflow-hidden bg-brand-oat", className)}>
      {status !== "loaded" && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-butter/70 to-brand-oat text-brand-crust/60",
            status === "loading" && "animate-pulse",
          )}
          aria-hidden={status === "loading"}
          role={status === "error" ? "img" : undefined}
          aria-label={status === "error" ? alt : undefined}
        >
          <Cookie className="h-1/4 w-1/4" strokeWidth={1.25} />
        </div>
      )}
      {src && status !== "error" && (
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={cn(
            // Absolutely positioned so it fills frames whose height comes from a grid or aspect ratio.
            "absolute inset-0 h-full w-full transition-[opacity,transform] duration-500",
            fit === "contain" ? "object-contain" : "object-cover",
            status === "loaded" ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </div>
  );
}
