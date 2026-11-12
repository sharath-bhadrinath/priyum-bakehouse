import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardList, Copy, Eye, FileDown, Pencil, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as api from "@/features/admin/api";
import { orderDate } from "@/features/admin/analytics";
import { DEFAULT_INVOICE_SETTINGS, downloadInvoice } from "@/features/admin/invoice";
import { adminKeys, useAdminMutation, useInvoiceSettings, useOrders } from "@/features/admin/queries";
import { ORDER_STATUSES, normalizeStatus, statusMeta } from "@/features/admin/status";
import type { OrderRow } from "@/features/admin/types";
import { formatDate, formatINR } from "@/lib/format";
import { OrderDetailsDialog, OrderEditDialog, StatusDot } from "./OrderDialogs";
import { ConfirmDialog, DataList, EmptyState, FilterChips, IconButton, Panel, RowActions, SearchField, Toolbar } from "./ui";
import type { Column } from "./ui";

const ALL = "all";

/** Downloads an order's invoice, fetching its items first. */
function useInvoiceDownload() {
  const queryClient = useQueryClient();
  const settings = useInvoiceSettings();
  return useMutation({
    mutationFn: async (order: OrderRow) => {
      const items = await queryClient.fetchQuery({
        queryKey: adminKeys.orderItems(order.id),
        queryFn: () => api.listOrderItems(order.id),
      });
      await downloadInvoice(order, items, settings.data ?? DEFAULT_INVOICE_SETTINGS);
    },
    onSuccess: () => toast.success("Invoice downloaded"),
    onError: (error) => {
      console.error("Invoice failed", error);
      toast.error("Couldn't create the invoice", { description: "Please try again." });
    },
  });
}

export function OrdersSection() {
  const orders = useOrders();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<OrderRow | null>(null);

  const invoice = useInvoiceDownload();
  const setStatus = useAdminMutation(api.updateOrderStatus, {
    success: (_data, vars) => `Order marked ${statusMeta(vars.status).label.toLowerCase()}`,
    error: "Couldn't update status",
  });
  const remove = useAdminMutation(api.deleteOrder, {
    success: "Order deleted",
    error: "Couldn't delete order",
    onSuccess: () => setDeleting(null),
  });

  // Look the open order up by id so dialogs always show the latest saved data.
  const byId = (id: string | null) => (id ? orders.data?.find((order) => order.id === id) : undefined);
  const viewing = byId(viewingId);
  const editing = byId(editingId);

  const filterOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const order of orders.data ?? []) {
      const status = normalizeStatus(order.status);
      counts[status] = (counts[status] ?? 0) + 1;
    }
    return [
      { value: ALL, label: "All", count: orders.data?.length ?? 0 },
      ...ORDER_STATUSES.map((status) => ({ value: status as string, label: statusMeta(status).label, count: counts[status] ?? 0 })),
    ];
  }, [orders.data]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (orders.data ?? []).filter(
      (order) =>
        (statusFilter === ALL || normalizeStatus(order.status) === statusFilter) &&
        (!needle ||
          [order.customer_name, order.customer_phone, order.shipment_number, order.id].some((value) =>
            value?.toLowerCase().includes(needle),
          )),
    );
  }, [orders.data, query, statusFilter]);

  const copyTrackingLink = async (order: OrderRow) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?order=${order.id}`);
      toast.success("Tracking link copied", { description: "Send it to the customer so they can follow their order." });
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  const reference = (order: OrderRow) => (
    <div>
      <p className="font-mono text-xs font-semibold uppercase" title={order.id}>
        #{order.id.slice(0, 8)}
      </p>
      <p className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(orderDate(order))}</p>
    </div>
  );
  const customer = (order: OrderRow) => (
    <div className="min-w-0">
      <p className="truncate font-medium">{order.customer_name}</p>
      <p className="truncate text-xs text-muted-foreground">{order.customer_phone}</p>
    </div>
  );
  const statusSelect = (order: OrderRow) => (
    <Select value={normalizeStatus(order.status)} onValueChange={(status) => setStatus.mutate({ id: order.id, status })}>
      <SelectTrigger className="h-9 w-[9.5rem] rounded-full" aria-label={`Status of order for ${order.customer_name}`}>
        <span className="flex items-center gap-2">
          <StatusDot status={order.status} />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        {ORDER_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {statusMeta(status).label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  const shipment = (order: OrderRow) =>
    order.shipment_number ? (
      <span className="rounded-md bg-brand-oat/60 px-2 py-1 font-mono text-xs">{order.shipment_number}</span>
    ) : (
      <span className="text-xs text-muted-foreground">—</span>
    );
  const actions = (order: OrderRow) => (
    <RowActions>
      <IconButton label="View order" icon={Eye} onClick={() => setViewingId(order.id)} />
      <IconButton label="Edit order" icon={Pencil} onClick={() => setEditingId(order.id)} />
      <IconButton label="Download invoice" icon={FileDown} disabled={invoice.isPending} onClick={() => invoice.mutate(order)} />
      <IconButton label="Copy tracking link" icon={Copy} onClick={() => copyTrackingLink(order)} />
      <IconButton label="Delete order" icon={Trash2} tone="danger" onClick={() => setDeleting(order)} />
    </RowActions>
  );

  const columns: Column<OrderRow>[] = [
    { header: "Order", cell: reference },
    { header: "Customer", cell: customer, className: "max-w-[14rem]" },
    { header: "Total", cell: (order) => <span className="font-semibold tabular-nums">{formatINR(order.total)}</span> },
    { header: "Status", cell: statusSelect },
    { header: "Shipment", cell: shipment },
    {
      header: "Delivery",
      cell: (order) =>
        order.delivery_date ? formatDate(order.delivery_date) : <span className="text-xs text-muted-foreground">—</span>,
      className: "whitespace-nowrap",
    },
    { header: "", cell: actions, className: "text-right" },
  ];

  return (
    <Panel title="Orders" description="Update a status here and the customer sees it on the tracking page straight away.">
      <Toolbar>
        <SearchField value={query} onChange={setQuery} placeholder="Search name, phone or order ID" />
        <FilterChips label="Filter by status" options={filterOptions} value={statusFilter} onChange={setStatusFilter} />
      </Toolbar>

      <DataList
        query={orders}
        rows={rows}
        rowKey={(order) => order.id}
        columns={columns}
        card={(order) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              {customer(order)}
              <div className="shrink-0 text-right">
                <p className="font-semibold tabular-nums">{formatINR(order.total)}</p>
                {reference(order)}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {statusSelect(order)}
              {order.shipment_number && shipment(order)}
            </div>
            <div className="-ml-2 flex justify-start">{actions(order)}</div>
          </div>
        )}
        empty={
          <EmptyState
            icon={ClipboardList}
            title={orders.data?.length ? "No orders match" : "No orders yet"}
            hint={orders.data?.length ? "Try a different search or status." : "Orders you create will show up here."}
          />
        }
      />

      {viewing && (
        <OrderDetailsDialog
          order={viewing}
          invoicePending={invoice.isPending}
          onInvoice={() => invoice.mutate(viewing)}
          onEdit={() => {
            setViewingId(null);
            setEditingId(viewing.id);
          }}
          onClose={() => setViewingId(null)}
        />
      )}
      {editing && <OrderEditDialog order={editing} onClose={() => setEditingId(null)} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete the order for ${deleting.customer_name}?`}
          description={`This permanently removes the order and its items, and takes ${formatINR(deleting.total)} off your revenue. To keep a record, mark it cancelled instead.`}
          pending={remove.isPending}
          onConfirm={() => remove.mutate(deleting.id)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </Panel>
  );
}
