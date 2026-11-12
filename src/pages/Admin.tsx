import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { BarChart3, ClipboardList, Clock, FolderTree, IndianRupee, Package, ShoppingBag, Tag, Truck, Users } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import type { AdminSection } from "@/components/admin/AdminShell";
import { AnalyticsSection } from "@/components/admin/AnalyticsSection";
import { CategoriesSection } from "@/components/admin/CategoriesSection";
import { OrdersSection } from "@/components/admin/OrdersSection";
import { ProductsSection } from "@/components/admin/ProductsSection";
import { TagsSection } from "@/components/admin/TagsSection";
import { UsersSection } from "@/components/admin/UsersSection";
import { StatCard } from "@/components/admin/ui";
import { orderStats } from "@/features/admin/analytics";
import { useOrders } from "@/features/admin/queries";
import { formatINR } from "@/lib/format";

/**
 * The admin's sections, in navigation order. To add one, build a component in
 * components/admin and list it here; the first entry is the landing section.
 */
const SECTIONS: AdminSection[] = [
  { id: "orders", label: "Orders", icon: ClipboardList, Component: OrdersSection },
  { id: "products", label: "Products", icon: Package, Component: ProductsSection },
  { id: "categories", label: "Categories", icon: FolderTree, Component: CategoriesSection },
  { id: "tags", label: "Tags", icon: Tag, Component: TagsSection },
  { id: "users", label: "Users", icon: Users, Component: UsersSection },
  { id: "analytics", label: "Analytics", icon: BarChart3, Component: AnalyticsSection },
];

function Overview() {
  const orders = useOrders();
  const stats = useMemo(() => orderStats(orders.data ?? []), [orders.data]);
  const count = (status: string) => (orders.data ? stats.byStatus[status] ?? 0 : "—");

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Pending orders" value={count("pending")} icon={Clock} />
      <StatCard label="Shipped, on the way" value={count("shipped")} icon={Truck} />
      <StatCard label="Total orders" value={orders.data ? stats.total : "—"} icon={ShoppingBag} />
      <StatCard label="Revenue" value={orders.data ? formatINR(stats.revenue) : "—"} hint="Excludes cancelled" icon={IndianRupee} />
    </div>
  );
}

export default function Admin() {
  // The open section lives in the URL (?tab=products) so it survives reloads and can be linked to.
  const [params, setParams] = useSearchParams();
  const active = SECTIONS.find((section) => section.id === params.get("tab")) ?? SECTIONS[0];

  return (
    <AdminShell sections={SECTIONS} activeId={active.id} onSelect={(id) => setParams({ tab: id }, { replace: true })}>
      {active.id !== "analytics" && <Overview />}
      <active.Component />
    </AdminShell>
  );
}
