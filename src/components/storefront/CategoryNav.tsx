import { useEffect, useRef } from "react";
import type { CatalogGroup } from "@/types/catalog";
import { cn } from "@/lib/utils";

interface CategoryNavProps {
  groups: CatalogGroup[];
  groupId: string | null;
  categoryId: string | null;
  /** While searching, nothing is highlighted. */
  searching: boolean;
  onGroup: (groupId: string | null) => void;
  onCategory: (categoryId: string | null) => void;
}

function Pill({
  active,
  children,
  onClick,
  variant = "primary",
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary";
}) {
  const ref = useRef<HTMLButtonElement>(null);

  // Keep the active pill visible inside the horizontal scroller.
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full font-medium transition-all duration-200 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-crust focus-visible:ring-offset-2 focus-visible:ring-offset-brand-cream",
        variant === "primary" ? "h-10 px-5 text-sm" : "h-9 px-4 text-[13px]",
        active
          ? variant === "primary"
            ? "bg-brand-cocoa text-brand-cream shadow-md shadow-brand-cocoa/20"
            : "bg-brand-butter text-brand-cocoa ring-1 ring-brand-crust/50"
          : variant === "primary"
            ? "bg-white text-brand-cocoa ring-1 ring-brand-cocoa/10 hover:ring-brand-crust/60"
            : "text-brand-cocoa/70 hover:bg-white hover:text-brand-cocoa",
      )}
    >
      {children}
    </button>
  );
}

const scroller =
  "scrollbar-hide -mx-4 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0";

export function CategoryNav({ groups, groupId, categoryId, searching, onGroup, onCategory }: CategoryNavProps) {
  const group = groups.find((g) => g.id === groupId) ?? null;
  const showSubnav = !searching && group && group.categories.length > 1;

  return (
    <nav
      aria-label="Menu categories"
      className="sticky top-20 z-30 border-b border-brand-cocoa/10 bg-brand-cream/90 backdrop-blur-md md:top-28"
    >
      <div className="container space-y-2 px-4 py-3">
        <div className={scroller}>
          <Pill active={!searching && !groupId} onClick={() => onGroup(null)}>
            All
          </Pill>
          {groups.map((g) => (
            <Pill key={g.id} active={!searching && g.id === groupId} onClick={() => onGroup(g.id)}>
              {g.label}
            </Pill>
          ))}
        </div>

        {showSubnav && (
          <div className={cn(scroller, "animate-fade-in")}>
            <Pill variant="secondary" active={!categoryId} onClick={() => onGroup(group.id)}>
              All {group.label.toLowerCase()}
            </Pill>
            {group.categories.map((c) => (
              <Pill
                key={c.id}
                variant="secondary"
                active={c.id === categoryId}
                onClick={() => onCategory(c.id)}
              >
                {c.label}
              </Pill>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
