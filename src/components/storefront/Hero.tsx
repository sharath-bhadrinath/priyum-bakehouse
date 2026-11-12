import { ArrowDown, Leaf, MessageCircle, Truck, Wheat } from "lucide-react";
import { site, whatsappLink } from "@/config/site";

interface HeroProps {
  hasEggless: boolean;
  onBrowse: () => void;
}

export function Hero({ hasEggless, onBrowse }: HeroProps) {
  const perks = [
    { icon: Wheat, label: "Baked fresh to order" },
    ...(hasEggless ? [{ icon: Leaf, label: "Eggless options" }] : []),
    { icon: Truck, label: "Shipping across India" },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-butter via-brand-butter/60 to-brand-cream">
      {/* Soft decorative crumbs */}
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-10 h-64 w-64 rounded-full bg-brand-crust/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-brand-berry/10 blur-3xl" />

      <div className="container relative px-4 py-10 text-center md:py-16">
        <p className="rise-in text-xs font-semibold uppercase tracking-[0.2em] text-brand-caramel">
          {site.name}
        </p>
        <h1
          className="rise-in mx-auto mt-3 max-w-3xl font-display text-4xl font-semibold leading-[1.05] text-brand-cocoa sm:text-5xl md:text-6xl"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          Freshly baked happiness, <span className="italic text-brand-caramel">delivered.</span>
        </h1>
        <p
          className="rise-in mx-auto mt-4 max-w-xl text-base text-brand-cocoa/75 md:text-lg"
          style={{ "--i": 2 } as React.CSSProperties}
        >
          {site.tagline}
        </p>

        <div
          className="rise-in mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ "--i": 3 } as React.CSSProperties}
        >
          <button
            type="button"
            onClick={onBrowse}
            className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-cocoa px-7 text-sm font-semibold text-brand-cream shadow-lg shadow-brand-cocoa/20 transition hover:-translate-y-0.5 hover:shadow-xl sm:w-auto"
          >
            Browse the menu
            <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
          </button>
          <a
            href={whatsappLink("Hi! I'd like to know more about your bakes.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-brand-cocoa/25 bg-white/70 px-7 text-sm font-semibold text-brand-cocoa backdrop-blur transition hover:bg-white sm:w-auto"
          >
            <MessageCircle className="h-4 w-4" />
            Chat on WhatsApp
          </a>
        </div>

        <ul
          className="rise-in mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-brand-cocoa/80"
          style={{ "--i": 4 } as React.CSSProperties}
        >
          {perks.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-brand-caramel" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
