import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SortKey } from "@/types/catalog";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "discount", label: "Biggest savings" },
  { value: "name", label: "Name: A to Z" },
];

interface CatalogToolbarProps {
  title: string;
  count: number;
  sort: SortKey;
  onSort: (sort: SortKey) => void;
}

export function CatalogToolbar({ title, count, sort, onSort }: CatalogToolbarProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 md:mb-8">
      <div className="min-w-0">
        <h2 className="font-display text-3xl font-semibold text-brand-cocoa md:text-4xl">{title}</h2>
        <p className="mt-1 text-sm text-brand-cocoa/60" aria-live="polite">
          {count} {count === 1 ? "treat" : "treats"}
        </p>
      </div>
      <Select value={sort} onValueChange={(value) => onSort(value as SortKey)}>
        <SelectTrigger
          aria-label="Sort products"
          className="h-10 w-auto min-w-[11rem] gap-2 rounded-full border-brand-cocoa/15 bg-white px-4 text-sm text-brand-cocoa focus:ring-brand-crust/40"
        >
          <span className="text-brand-cocoa/55">Sort:</span>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" className="rounded-2xl border-brand-cocoa/10 bg-white">
          {SORTS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="rounded-xl py-2">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
