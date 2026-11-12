import { Sparkles } from "lucide-react";
import { site } from "@/config/site";

export function AnnouncementBar() {
  const items: readonly string[] = site.announcements;
  if (items.length === 0) return null;

  const strip = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((text) => (
        <li key={text} className="flex items-center gap-2 whitespace-nowrap px-6 text-xs font-medium sm:text-sm">
          <Sparkles className="h-3.5 w-3.5 text-brand-butter" aria-hidden />
          {text}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="marquee overflow-hidden bg-brand-cocoa py-2 text-brand-cream">
      {/* Enough copies to fill wide screens; only the first is announced to screen readers. */}
      <div className="marquee-track flex w-max">
        {strip(false)}
        {strip(true)}
        {strip(true)}
        {strip(true)}
      </div>
    </div>
  );
}
