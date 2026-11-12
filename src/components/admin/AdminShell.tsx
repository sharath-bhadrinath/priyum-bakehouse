import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ExternalLink, LogOut, ReceiptText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { site } from "@/config/site";
import { useDocumentClass } from "@/hooks/use-document-class";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface AdminSection {
  id: string;
  label: string;
  icon: LucideIcon;
  Component: () => JSX.Element;
}

interface AdminShellProps {
  sections: AdminSection[];
  activeId: string;
  onSelect: (id: string) => void;
  children: ReactNode;
}

const headerLink =
  "flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-brand-cocoa transition-colors hover:bg-brand-cocoa/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cocoa/40";

/** Page chrome for the admin: brand header, section navigation, content area. */
export function AdminShell({ sections, activeId, onSelect, children }: AdminShellProps) {
  useDocumentClass("staff");
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-brand-cream font-sans text-brand-cocoa">
      <header className="sticky top-0 z-30 bg-brand-butter shadow-[0_2px_16px_rgba(67,32,15,0.08)]">
        <div className="container flex h-16 items-center gap-3 px-4">
          <Link to="/" className="flex shrink-0 items-center rounded-lg" aria-label={`${site.name} storefront`}>
            <span className="block h-14 w-14 overflow-hidden">
              <img src={site.logo} alt={site.name} width={1408} height={768} className="h-full w-full scale-[1.12] object-cover" />
            </span>
          </Link>
          <span className="rounded-full bg-brand-cocoa px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-cream">
            Admin
          </span>

          <nav className="ml-auto flex items-center gap-0.5" aria-label="Account">
            <Link to="/dashboard" className={headerLink}>
              <ReceiptText className="h-5 w-5" />
              <span className="hidden sm:inline">New order</span>
              <span className="sr-only sm:hidden">New order</span>
            </Link>
            <a href="/" target="_blank" rel="noopener noreferrer" className={cn(headerLink, "hidden md:flex")}>
              <ExternalLink className="h-5 w-5" /> View site
            </a>
            <button type="button" onClick={signOut} className={headerLink}>
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline">Sign out</span>
              <span className="sr-only sm:hidden">Sign out</span>
            </button>
          </nav>
        </div>

        <nav className="border-t border-brand-cocoa/10 bg-brand-cream" aria-label="Admin sections">
          <div className="scrollbar-hide container flex gap-1 overflow-x-auto px-4">
            {sections.map(({ id, label, icon: Icon }) => {
              const active = id === activeId;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelect(id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors",
                    active
                      ? "border-brand-cocoa text-brand-cocoa"
                      : "border-transparent text-brand-cocoa/60 hover:text-brand-cocoa",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="container space-y-6 px-4 py-6 md:py-8">{children}</main>
    </div>
  );
}
