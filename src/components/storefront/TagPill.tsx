import type { Tag } from "@/types/catalog";
import { cn } from "@/lib/utils";

/** Tag chip. The tag colour is used as an accent dot so any colour stays readable. */
export function TagPill({ tag, className }: { tag: Tag; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border border-brand-cocoa/10 bg-white/90 px-2 py-0.5 text-[11px] font-medium leading-4 text-brand-cocoa",
        className,
      )}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: tag.color ?? "#C97A2B" }}
        aria-hidden
      />
      <span className="truncate">{tag.name}</span>
    </span>
  );
}
