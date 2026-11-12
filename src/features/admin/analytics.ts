import { normalizeStatus } from "./status";
import type { OrderRow } from "./types";

/** The date an order counts towards: the staff-entered date when present. */
export const orderDate = (order: OrderRow) => new Date(order.custom_order_date || order.order_date);

const isCancelled = (order: OrderRow) => normalizeStatus(order.status) === "cancelled";

export function orderStats(orders: OrderRow[]) {
  const live = orders.filter((order) => !isCancelled(order));
  const revenue = live.reduce((sum, order) => sum + order.total, 0);
  const byStatus: Record<string, number> = {};
  for (const order of orders) {
    const status = normalizeStatus(order.status);
    byStatus[status] = (byStatus[status] ?? 0) + 1;
  }
  return {
    total: orders.length,
    /** Cancelled orders are excluded from revenue. */
    revenue,
    average: live.length > 0 ? revenue / live.length : 0,
    byStatus,
  };
}

export interface WeekPoint {
  /** ISO date of the Monday starting the week. */
  key: string;
  label: string;
  orders: number;
  revenue: number;
}

const startOfWeek = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
};

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Orders and revenue for each of the last `weeks` weeks, oldest first. Cancelled orders are skipped. */
export function weeklySeries(orders: OrderRow[], weeks = 12, now = new Date()): WeekPoint[] {
  const points: WeekPoint[] = [];
  const cursor = startOfWeek(now);
  cursor.setDate(cursor.getDate() - 7 * (weeks - 1));
  for (let i = 0; i < weeks; i++) {
    points.push({
      key: dayKey(cursor),
      label: cursor.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      orders: 0,
      revenue: 0,
    });
    cursor.setDate(cursor.getDate() + 7);
  }

  const byKey = new Map(points.map((point) => [point.key, point]));
  for (const order of orders) {
    if (isCancelled(order)) continue;
    const date = orderDate(order);
    if (Number.isNaN(date.getTime())) continue;
    const point = byKey.get(dayKey(startOfWeek(date)));
    if (!point) continue;
    point.orders += 1;
    point.revenue += order.total;
  }
  return points;
}
