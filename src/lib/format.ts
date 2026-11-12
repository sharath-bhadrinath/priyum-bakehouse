const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const formatINR = (amount: number) => inr.format(amount || 0);

const UNIT_ALIASES: Record<string, string> = {
  g: "g",
  gm: "g",
  gms: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kgs: "kg",
  ml: "ml",
  l: "L",
  litre: "L",
  litres: "L",
};

const PIECE_UNITS = new Set(["piece", "pieces", "pc", "pcs"]);

/** "120 grams" -> "120 g", "12 pieces" -> "12 pcs", "1 pieces" -> "1 pc". */
export function formatSize(weight: number | null | undefined, unit: string | null | undefined) {
  if (!weight || !unit) return "";
  const key = unit.trim().toLowerCase();
  if (PIECE_UNITS.has(key)) return `${weight} ${weight === 1 ? "pc" : "pcs"}`;
  return `${weight} ${UNIT_ALIASES[key] ?? unit.trim()}`;
}

export function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export const discountPercent = (mrp: number, price: number) =>
  mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
