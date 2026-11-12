import { site } from "@/config/site";
import { formatDate } from "@/lib/format";
import type { InvoiceSettings, OrderItemRow, OrderRow } from "./types";

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  businessName: "❤️ PRIYUM",
  businessSubtitle: "Cakes & Bakes",
  phone: site.contact.phoneDisplay,
  email: site.contact.email,
};

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const rupees = (amount: number | null | undefined) => `₹${Math.round(amount || 0)}`;

/** "Brownie (120grams)" -> "Brownie". The size has its own column; category suffixes are kept. */
const withoutSize = (name: string) =>
  name.replace(/\s*\(\d+[^)]*(?:grams?|kg|pieces?|g|ml|l|oz|lb)[^)]*\)\s*$/i, "");

const cell = "padding: 6px; border-bottom: 1px solid #ddd;";
const headCell = "padding: 8px; text-align: left; border-bottom: 1px solid #ddd;";
const line = "margin: 3px 0; font-size: 11px;";
const small = "font-size: 10px; color: #666;";

function invoiceHtml(order: OrderRow, items: OrderItemRow[], settings: InvoiceSettings) {
  const today = formatDate(new Date());
  const orderDate = formatDate(order.custom_order_date || order.order_date);
  const invoiceDate = order.custom_invoice_date ? formatDate(order.custom_invoice_date) : today;

  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="${cell}">${escapeHtml(withoutSize(item.product_name))}</td>
          <td style="${cell}">${item.weight ? escapeHtml(`${item.weight} ${item.weight_unit ?? ""}`) : "N/A"}</td>
          <td style="${cell}">${item.quantity}</td>
          <td style="${cell}">${rupees(item.product_price)}</td>
          <td style="${cell}">${rupees(item.total)}</td>
        </tr>`,
    )
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; background: white; width: 600px;">
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #d4a574; padding-bottom: 15px;">
        <div style="color: #8b4513; font-size: 24px; font-weight: bold; margin-bottom: 5px;">${escapeHtml(settings.businessName)}</div>
        <div style="color: #d4a574; font-size: 12px;">${escapeHtml(settings.businessSubtitle)}</div>
        <div style="margin-top: 8px; ${small}">📞 ${escapeHtml(settings.phone)} | 📧 ${escapeHtml(settings.email)}</div>
        <div style="margin-top: 8px; font-size: 12px;">Invoice #INV-${order.id.slice(0, 8)}</div>
        <div style="${small}">Order ID: ${order.id}</div>
        <div style="${small}">Invoice Date: ${invoiceDate}</div>
        <div style="${small}">Order Date: ${orderDate}</div>
      </div>

      <div style="margin: 15px 0; padding: 10px; background: #f9f7f4; border-radius: 5px;">
        <h3 style="color: #8b4513; margin-bottom: 8px; font-size: 14px;">Customer Details:</h3>
        <p style="${line}"><strong>Name:</strong> ${escapeHtml(order.customer_name)}</p>
        <p style="${line}"><strong>Phone:</strong> ${escapeHtml(order.customer_phone || "N/A")}</p>
        <p style="${line}"><strong>Address:</strong> ${escapeHtml(order.customer_address || "N/A")}</p>
        ${order.delivery_date ? `<p style="${line}"><strong>Delivery Date:</strong> ${formatDate(order.delivery_date)}</p>` : ""}
        ${order.shipment_number ? `<p style="${line}"><strong>Shipment Number:</strong> ${escapeHtml(order.shipment_number)}</p>` : ""}
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10px;">
        <thead>
          <tr style="background: #d4a574; color: white;">
            <th style="${headCell}">Item</th>
            <th style="${headCell}">Weight</th>
            <th style="${headCell}">Qty</th>
            <th style="${headCell}">Price</th>
            <th style="${headCell}">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div style="margin-top: 20px; text-align: right;">
        <div style="${line}">Subtotal: ${rupees(order.subtotal)}</div>
        <div style="${line}">Shipping: ${rupees(order.shipping_charges)}</div>
        ${order.discount_amount && order.discount_amount > 0 ? `<div style="${line}">Discount: -${rupees(order.discount_amount)}</div>` : ""}
        <div style="font-size: 14px; font-weight: bold; color: #8b4513; border-top: 2px solid #d4a574; padding-top: 8px; margin-top: 8px;">
          Total Amount: ${rupees(order.total)}
        </div>
      </div>

      <div style="text-align: center; margin-top: 20px; ${small}">
        <p>Thank you for choosing PRIYUM Cakes &amp; Bakes!</p>
        <p>Order Date: ${formatDate(order.order_date)}</p>
        <p>Made with ❤️ for delicious moments</p>
      </div>
    </div>`;
}

/** Renders the invoice off-screen and downloads it as an A4 PDF. */
export async function downloadInvoice(order: OrderRow, items: OrderItemRow[], settings: InvoiceSettings) {
  // Heavy libraries: loaded only when an invoice is actually requested.
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")]);

  const host = document.createElement("div");
  host.style.position = "absolute";
  host.style.left = "-9999px";
  host.innerHTML = invoiceHtml(order, items, settings);
  document.body.appendChild(host);

  try {
    const canvas = await html2canvas(host, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    });
    const image = canvas.toDataURL("image/jpeg", 0.8);
    const pdf = new jsPDF("p", "mm", "a4");
    const width = 190;
    const pageHeight = 277;
    const height = (canvas.height * width) / canvas.width;

    let remaining = height;
    let offset = 0;
    pdf.addImage(image, "JPEG", 10, offset, width, height);
    remaining -= pageHeight;
    while (remaining >= 0) {
      offset = remaining - height;
      pdf.addPage();
      pdf.addImage(image, "JPEG", 10, offset, width, height);
      remaining -= pageHeight;
    }

    const customer = order.customer_name.replace(/[^a-zA-Z0-9]/g, "-");
    pdf.save(`${customer}-invoice-${order.id.slice(0, 8)}.pdf`);
  } finally {
    host.remove();
  }
}
