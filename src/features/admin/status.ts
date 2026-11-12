import { ORDER_STEPS } from "@/features/orders/api";

export const ORDER_STATUSES = [...ORDER_STEPS, "cancelled"] as const;

/** Staff-facing label and colour for each order status. Colour is always paired with the label. */
export const STATUS_META: Record<string, { label: string; dot: string }> = {
  pending: { label: "Pending", dot: "bg-amber-500" },
  preparing: { label: "Preparing", dot: "bg-sky-600" },
  ready: { label: "Ready", dot: "bg-violet-600" },
  shipped: { label: "Shipped", dot: "bg-brand-crust" },
  delivered: { label: "Delivered", dot: "bg-brand-leaf" },
  cancelled: { label: "Cancelled", dot: "bg-brand-berry" },
};

const UNKNOWN = { label: "Unknown", dot: "bg-gray-400" };

export const normalizeStatus = (status: string | null | undefined) => (status ?? "pending").toLowerCase();

export const statusMeta = (status: string | null | undefined) => STATUS_META[normalizeStatus(status)] ?? UNKNOWN;
