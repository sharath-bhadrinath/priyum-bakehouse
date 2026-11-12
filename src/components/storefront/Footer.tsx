import { Instagram, Mail, MessageCircle, Phone } from "lucide-react";
import { site, whatsappLink } from "@/config/site";

const link =
  "inline-flex items-center gap-2.5 rounded-full py-1.5 text-sm text-brand-cream/80 transition-colors hover:text-brand-butter";

export function Footer() {
  const { contact } = site;
  return (
    <footer className="mt-16 bg-brand-cocoa text-brand-cream md:mt-24">
      <div className="container grid gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:py-16">
        <div>
          <p className="font-display text-2xl font-semibold text-brand-butter">{site.name}</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-brand-cream/70">{site.tagline}</p>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-cream/50">Get in touch</h2>
          <ul className="mt-3 space-y-1">
            <li>
              <a className={link} href={`tel:${contact.phoneE164}`}>
                <Phone className="h-4 w-4" /> {contact.phoneDisplay}
              </a>
            </li>
            <li>
              <a className={link} href={`mailto:${contact.email}`}>
                <Mail className="h-4 w-4" /> {contact.email}
              </a>
            </li>
            <li>
              <a className={link} href={contact.instagramUrl} target="_blank" rel="noopener noreferrer">
                <Instagram className="h-4 w-4" /> {contact.instagramHandle}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-cream/50">Bulk &amp; custom orders</h2>
          <p className="mt-3 text-sm leading-relaxed text-brand-cream/70">
            Planning a party, wedding or corporate gifting? Tell us what you need.
          </p>
          <a
            href={whatsappLink("Hi! I'd like to enquire about a bulk order.")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-brand-butter px-5 text-sm font-semibold text-brand-cocoa transition hover:bg-white"
          >
            <MessageCircle className="h-4 w-4" />
            Enquire on WhatsApp
          </a>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container px-4 py-5 text-center text-xs text-brand-cream/50">
          © {new Date().getFullYear()} {site.name}. Made with love.
        </p>
      </div>
    </footer>
  );
}
