import { supabase } from "@/integrations/supabase/client";

export const ORDER_STEPS = ["pending", "preparing", "ready", "shipped", "delivered"] as const;
export type OrderStatus = (typeof ORDER_STEPS)[number] | "cancelled";

export interface TrackedOrder {
  id: string;
  customerName: string;
  status: string;
  shipmentNumber: string | null;
  total: number;
  createdAt: string;
}

export const STATUS_COPY: Record<string, { title: string; description: string }> = {
  pending: {
    title: "Order received",
    description: "Your order has been received and is waiting to be processed.",
  },
  preparing: {
    title: "Baking",
    description: "Our team is preparing your treats with care.",
  },
  ready: {
    title: "Packed",
    description: "Your order is ready and will be handed over for delivery soon.",
  },
  shipped: {
    title: "Shipped",
    description: "Your order is on its way to you.",
  },
  delivered: {
    title: "Delivered",
    description: "Your order has been delivered. Enjoy your treats!",
  },
  cancelled: {
    title: "Cancelled",
    description: "This order has been cancelled. Please contact us if you have any questions.",
  },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isOrderId = (value: string) => UUID.test(value.trim());

interface OrderRow {
  id: string;
  customer_name: string;
  status: string | null;
  shipment_number: string | null;
  total: number;
  created_at: string;
}

const toTrackedOrder = (row: OrderRow): TrackedOrder => ({
  id: row.id,
  customerName: row.customer_name,
  status: (row.status ?? "pending").toLowerCase(),
  shipmentNumber: row.shipment_number,
  total: row.total,
  createdAt: row.created_at,
});

/**
 * Looks an order up by id. Returns null when it does not exist.
 *
 * Uses the `track_order` RPC (see supabase/migrations/*_public_order_tracking.sql),
 * which exposes only the fields below to visitors. Until that migration is
 * applied it falls back to a direct read, which row level security only allows
 * for the signed-in owner of the order.
 */
export async function trackOrder(orderId: string): Promise<TrackedOrder | null> {
  const id = orderId.trim();
  if (!isOrderId(id)) return null;

  const rpc = await supabase.rpc("track_order", { p_order_id: id });
  if (!rpc.error) {
    const row = (rpc.data ?? [])[0];
    return row ? toTrackedOrder(row) : null;
  }
  // PGRST202 = function not found, i.e. the migration has not been applied yet.
  if (rpc.error.code !== "PGRST202") throw rpc.error;

  const { data, error } = await supabase
    .from("orders")
    .select("id, customer_name, status, shipment_number, total, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toTrackedOrder(data) : null;
}
