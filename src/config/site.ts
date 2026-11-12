/**
 * Single source of truth for business details and storefront copy.
 * Change values here instead of hunting through components.
 */
export const site = {
  name: "Priyum Cakes & Bakes",
  shortName: "Priyum",
  tagline: "Small-batch bakes, made to order and shipped across India.",
  logo: "/lovable-uploads/621d91fb-0a7a-4b83-b539-e0ecd76fb97d.png",
  contact: {
    phoneDisplay: "+91 96773 49169",
    phoneE164: "+919677349169",
    /** Digits only, used for wa.me links. */
    whatsapp: "919677349169",
    email: "priyum.orders@gmail.com",
    instagramHandle: "@priyum.in",
    instagramUrl: "https://www.instagram.com/priyum.in",
  },
  announcements: [
    "Our new range of desserts are here",
    "Shipping available all across India",
    "Shipping charges as applicable",
  ],
  delivery: {
    note: "We typically deliver within 3–4 days of ordering. Delivery times vary by location.",
    courierName: "DTDC",
    courierTrackingUrl: (awb: string) =>
      `https://www.dtdc.in/trace.asp?awb=${encodeURIComponent(awb)}`,
  },
} as const;

export const whatsappLink = (text?: string) =>
  `https://wa.me/${site.contact.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
