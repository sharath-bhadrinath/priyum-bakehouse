import { useState } from "react";
import type { ReactNode } from "react";
import { FileDown, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import * as api from "@/features/admin/api";
import { orderDate } from "@/features/admin/analytics";
import { useAdminMutation, useOrderItems } from "@/features/admin/queries";
import { ORDER_STATUSES, normalizeStatus, statusMeta } from "@/features/admin/status";
import type { OrderItemRow, OrderRow } from "@/features/admin/types";
import { formatDate, formatINR, formatSize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Field, FormDialog, ViewDialog } from "./ui";

const toDateInput = (date: Date) => (Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0]);

export function StatusDot({ status }: { status: string | null }) {
  return <span aria-hidden className={cn("h-2.5 w-2.5 shrink-0 rounded-full", statusMeta(status).dot)} />;
}

function Detail({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium">{children}</dd>
    </div>
  );
}

function Totals({ order }: { order: OrderRow }) {
  return (
    <dl className="ml-auto w-full max-w-xs space-y-1 text-sm tabular-nums">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd>{formatINR(order.subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Shipping</dt>
        <dd>{formatINR(order.shipping_charges ?? 0)}</dd>
      </div>
      {(order.discount_amount ?? 0) > 0 && (
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Discount</dt>
          <dd>−{formatINR(order.discount_amount ?? 0)}</dd>
        </div>
      )}
      <div className="flex justify-between border-t border-brand-cocoa/10 pt-2 text-base font-semibold">
        <dt>Total</dt>
        <dd>{formatINR(order.total)}</dd>
      </div>
    </dl>
  );
}

interface OrderDetailsDialogProps {
  order: OrderRow;
  invoicePending: boolean;
  onInvoice: () => void;
  onEdit: () => void;
  onClose: () => void;
}

export function OrderDetailsDialog({ order, invoicePending, onInvoice, onEdit, onClose }: OrderDetailsDialogProps) {
  const items = useOrderItems(order.id);

  return (
    <ViewDialog title={`Order #${order.id.slice(0, 8).toUpperCase()}`} onClose={onClose}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 rounded-full bg-brand-oat/60 px-3 py-1.5 text-sm font-medium">
            <StatusDot status={order.status} /> {statusMeta(order.status).label}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="mr-1.5 h-4 w-4" /> Edit
            </Button>
            <Button size="sm" onClick={onInvoice} disabled={invoicePending}>
              {invoicePending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileDown className="mr-1.5 h-4 w-4" />}
              Invoice
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 rounded-xl bg-brand-oat/40 p-4 sm:grid-cols-3">
          <Detail label="Customer">{order.customer_name}</Detail>
          <Detail label="Phone">{order.customer_phone || "—"}</Detail>
          <Detail label="Email">{order.customer_email || "—"}</Detail>
          <Detail label="Order date">{formatDate(orderDate(order))}</Detail>
          <Detail label="Delivery date">{order.delivery_date ? formatDate(order.delivery_date) : "Not set"}</Detail>
          <Detail label="Shipment number">{order.shipment_number || "Not set"}</Detail>
          <Detail label="Address" className="col-span-2 sm:col-span-3">
            {order.customer_address || "—"}
          </Detail>
          <Detail label="Order ID" className="col-span-2 sm:col-span-3">
            <span className="font-mono text-xs">{order.id}</span>
          </Detail>
        </dl>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Items{items.data ? ` (${items.data.length})` : ""}</h3>
          {items.isPending ? (
            <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-brand-cocoa/40" />
          ) : items.isError ? (
            <p className="text-sm text-brand-berry">Couldn't load the items for this order.</p>
          ) : (
            <ul className="divide-y divide-brand-cocoa/10 rounded-xl ring-1 ring-brand-cocoa/10">
              {items.data.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[formatSize(item.weight, item.weight_unit), `${item.quantity} × ${formatINR(item.product_price)}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">{formatINR(item.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Totals order={order} />
      </div>
    </ViewDialog>
  );
}

/** Orders are billed in whole rupees. */
const totalOf = (order: OrderRow) =>
  Math.round((order.subtotal || 0) + (order.shipping_charges || 0) - (order.discount_amount || 0));

export function OrderEditDialog({ order, onClose }: { order: OrderRow; onClose: () => void }) {
  const loaded = useOrderItems(order.id);
  const [draft, setDraft] = useState(order);
  // Null until an item is edited, so items that load late still appear.
  const [editedItems, setEditedItems] = useState<OrderItemRow[] | null>(null);
  const items = editedItems ?? loaded.data ?? [];

  const save = useAdminMutation(api.updateOrder, {
    success: "Order updated",
    error: "Couldn't update order",
    onSuccess: onClose,
  });

  /** Applies a change to the order and keeps the total in step with its parts. */
  const patch = (changes: Partial<OrderRow>) =>
    setDraft((current) => {
      const next = { ...current, ...changes };
      return { ...next, total: totalOf(next) };
    });
  const text = (field: "customer_name" | "customer_email" | "customer_phone" | "customer_address" | "shipment_number") => ({
    value: draft[field] ?? "",
    onChange: (event: { target: { value: string } }) => setDraft((current) => ({ ...current, [field]: event.target.value })),
  });
  const date = (field: "custom_order_date" | "custom_invoice_date" | "delivery_date") => (event: { target: { value: string } }) =>
    setDraft((current) => ({ ...current, [field]: event.target.value || null }));

  /** Changing a line recalculates its total and the order's subtotal. */
  const patchItem = (id: string, changes: Partial<OrderItemRow>) => {
    const next = items.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, ...changes };
      return { ...updated, total: Math.round(updated.product_price * updated.quantity) };
    });
    setEditedItems(next);
    if ("quantity" in changes || "product_price" in changes) {
      patch({ subtotal: next.reduce((sum, item) => sum + item.total, 0) });
    }
  };

  return (
    <FormDialog
      title="Edit order"
      description={`#${order.id.slice(0, 8).toUpperCase()} · ${order.customer_name}`}
      submitLabel="Save changes"
      pending={save.isPending}
      size="lg"
      onClose={onClose}
      onSubmit={() => save.mutate({ order: draft, items })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer name">
          <Input {...text("customer_name")} required />
        </Field>
        <Field label="Phone">
          <Input {...text("customer_phone")} type="tel" />
        </Field>
        <Field label="Email">
          <Input {...text("customer_email")} type="email" />
        </Field>
        <Field label="Status">
          <Select value={normalizeStatus(draft.status)} onValueChange={(status) => setDraft((current) => ({ ...current, status }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusMeta(status).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Textarea {...text("customer_address")} rows={3} />
        </Field>

        <Field label="Order date">
          <Input type="date" value={draft.custom_order_date || toDateInput(new Date(draft.order_date))} onChange={date("custom_order_date")} />
        </Field>
        <Field label="Invoice date" hint="Defaults to the day the invoice is downloaded.">
          <Input type="date" value={draft.custom_invoice_date ?? ""} onChange={date("custom_invoice_date")} />
        </Field>
        <Field label="Delivery date">
          <Input type="date" value={draft.delivery_date ?? ""} onChange={date("delivery_date")} />
        </Field>
        <Field label="Shipment number" hint="Customers see this on the tracking page.">
          <Input {...text("shipment_number")} placeholder="Courier tracking number" className="font-mono" />
        </Field>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Items</h3>
        {loaded.isPending && <Loader2 className="mx-auto my-4 h-5 w-5 animate-spin text-brand-cocoa/40" />}
        {loaded.isError && <p className="text-sm text-brand-berry">Couldn't load the items. Other details can still be saved.</p>}
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-2 gap-2 rounded-xl bg-brand-oat/40 p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
            <Field label="Item" className="col-span-2 sm:col-span-1">
              <Input value={item.product_name} onChange={(event) => patchItem(item.id, { product_name: event.target.value })} />
            </Field>
            <Field label="Size">
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={item.weight ?? ""}
                onChange={(event) => patchItem(item.id, { weight: parseFloat(event.target.value) || null })}
              />
            </Field>
            <Field label="Unit">
              <Input value={item.weight_unit ?? ""} onChange={(event) => patchItem(item.id, { weight_unit: event.target.value })} />
            </Field>
            <Field label="Qty">
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={item.quantity}
                onChange={(event) => patchItem(item.id, { quantity: parseInt(event.target.value, 10) || 1 })}
              />
            </Field>
            <Field label="Price (₹)">
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={item.product_price}
                onChange={(event) => patchItem(item.id, { product_price: parseFloat(event.target.value) || 0 })}
              />
            </Field>
            <p className="col-span-2 text-right text-sm tabular-nums sm:col-span-5">
              Line total <span className="font-semibold">{formatINR(item.total)}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Shipping charges (₹)">
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            value={draft.shipping_charges || ""}
            onChange={(event) => patch({ shipping_charges: parseFloat(event.target.value) || 0 })}
          />
        </Field>
        <Field label="Discount (₹)">
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            value={draft.discount_amount || ""}
            onChange={(event) => patch({ discount_amount: parseFloat(event.target.value) || 0 })}
          />
        </Field>
      </div>

      <Totals order={draft} />
    </FormDialog>
  );
}
