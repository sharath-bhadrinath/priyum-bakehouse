import { useMemo } from "react";
import { IndianRupee, Package, Receipt, ShoppingBag, Users } from "lucide-react";
import { orderStats, weeklySeries } from "@/features/admin/analytics";
import type { WeekPoint } from "@/features/admin/analytics";
import { useOrders, useProducts, useUsers } from "@/features/admin/queries";
import { ORDER_STATUSES, statusMeta } from "@/features/admin/status";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState, Panel, StatCard } from "./ui";

const WEEKS = 12;

export function AnalyticsSection() {
  const orders = useOrders();
  const products = useProducts();
  const users = useUsers();

  const stats = useMemo(() => orderStats(orders.data ?? []), [orders.data]);
  const weeks = useMemo(() => weeklySeries(orders.data ?? [], WEEKS), [orders.data]);
  const statuses = ORDER_STATUSES.filter((status) => stats.byStatus[status]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Revenue" value={formatINR(stats.revenue)} hint="Excludes cancelled" icon={IndianRupee} />
        <StatCard label="Orders" value={stats.total} icon={ShoppingBag} />
        <StatCard label="Average order" value={formatINR(Math.round(stats.average))} icon={Receipt} />
        <StatCard label="Users" value={users.data?.length ?? "—"} icon={Users} />
        <StatCard label="Products" value={products.data?.length ?? "—"} icon={Package} />
      </div>

      {/* Two measures on different scales get a chart each, never a shared axis. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Revenue per week" description={`Last ${WEEKS} weeks, cancelled orders excluded.`}>
          <WeeklyBars weeks={weeks} value={(week) => week.revenue} format={formatINR} measure="Revenue" />
        </Panel>
        <Panel title="Orders per week" description={`Last ${WEEKS} weeks, cancelled orders excluded.`}>
          <WeeklyBars weeks={weeks} value={(week) => week.orders} format={(count) => String(count)} measure="Orders" />
        </Panel>
      </div>

      <Panel title="Orders by status" description="Every order placed so far.">
        {statuses.length === 0 ? (
          <EmptyState title="No orders yet" />
        ) : (
          <ul className="space-y-3 p-4 sm:p-6">
            {statuses.map((status) => {
              const count = stats.byStatus[status];
              const meta = statusMeta(status);
              return (
                <li key={status} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
                    {meta.label}
                  </span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-brand-oat/70">
                    <span className={cn("block h-full rounded-full", meta.dot)} style={{ width: `${(count / stats.total) * 100}%` }} />
                  </span>
                  <span className="text-right font-semibold tabular-nums">{count}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

interface WeeklyBarsProps {
  weeks: WeekPoint[];
  value: (week: WeekPoint) => number;
  format: (value: number) => string;
  measure: string;
}

/** Single-series bar chart: one bar per week, hover or focus a bar for its value. */
function WeeklyBars({ weeks, value, format, measure }: WeeklyBarsProps) {
  const max = Math.max(...weeks.map(value));
  if (max === 0) return <EmptyState title="Nothing to show yet" hint={`No orders in the last ${weeks.length} weeks.`} />;

  return (
    <div className="p-4 sm:p-6">
      <p className="mb-3 text-xs text-muted-foreground">
        Peak week <span className="font-semibold text-brand-cocoa">{format(max)}</span>
      </p>
      <div className="flex h-44 items-end gap-1 border-b border-brand-cocoa/15 sm:gap-2" role="img" aria-label={`${measure} per week, table below`}>
        {weeks.map((week, index) => {
          const amount = value(week);
          return (
            <div key={week.key} tabIndex={0} className="group relative flex h-full flex-1 items-end rounded-t outline-none">
              <div
                className="w-full rounded-t bg-brand-crust transition-colors group-hover:bg-brand-caramel group-focus-visible:bg-brand-caramel"
                style={{ height: `${(amount / max) * 100}%`, minHeight: amount > 0 ? 3 : 0 }}
              />
              <div
                className={cn(
                  "pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg bg-brand-cocoa px-2.5 py-1.5 text-xs text-brand-cream shadow-lg group-hover:block group-focus-visible:block",
                  // Keep the tooltip inside the chart at either edge.
                  index < 2 ? "left-0" : index > weeks.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2",
                )}
              >
                <span className="block text-brand-cream/70">Week of {week.label}</span>
                <span className="font-semibold tabular-nums">{format(amount)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1 sm:gap-2" aria-hidden>
        {weeks.map((week, index) => (
          <span key={week.key} className="flex-1 text-center text-[10px] text-muted-foreground">
            {/* Every third label, anchored so the latest week is always named. */}
            {(weeks.length - 1 - index) % 3 === 0 && <span className="-mx-4 block whitespace-nowrap">{week.label}</span>}
          </span>
        ))}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-brand-caramel">View as table</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">Week of</th>
              <th className="py-1 text-right font-medium">{measure}</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week.key} className="border-t border-brand-cocoa/10">
                <td className="py-1">{week.label}</td>
                <td className="py-1 text-right">{format(value(week))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
