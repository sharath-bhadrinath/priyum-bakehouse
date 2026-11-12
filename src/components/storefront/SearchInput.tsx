import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
}

/** Debounced search box; keeps typing snappy while the URL updates lazily. */
export function SearchInput({ value, onChange, autoFocus, className }: SearchInputProps) {
  const [draft, setDraft] = useState(value);
  const lastSent = useRef(value);

  // Pick up external changes (back button, "clear search") without fighting the user's typing.
  useEffect(() => {
    if (value !== lastSent.current) {
      lastSent.current = value;
      setDraft(value);
    }
  }, [value]);

  useEffect(() => {
    if (draft === lastSent.current) return;
    const timer = setTimeout(() => {
      lastSent.current = draft;
      onChange(draft);
    }, 200);
    return () => clearTimeout(timer);
  }, [draft, onChange]);

  return (
    <div role="search" className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-cocoa/50" />
      <input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        value={draft}
        autoFocus={autoFocus}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Search brownies, cookies, cakes…"
        aria-label="Search the menu"
        className="h-11 w-full rounded-full border border-brand-cocoa/15 bg-white pl-10 pr-10 text-sm text-brand-cocoa placeholder:text-brand-cocoa/45 focus:border-brand-crust focus:outline-none focus:ring-2 focus:ring-brand-crust/30 [&::-webkit-search-cancel-button]:hidden"
      />
      {draft && (
        <button
          type="button"
          onClick={() => setDraft("")}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-brand-cocoa/60 hover:bg-brand-oat hover:text-brand-cocoa"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
