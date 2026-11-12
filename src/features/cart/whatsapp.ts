import { formatDate, formatINR } from "@/lib/format";
import type { CartLine } from "./CartContext";

export interface CustomerDetails {
  name: string;
  phone: string;
  address: string;
  deliveryDate?: string;
}

/** Builds the order request the bakery receives on WhatsApp. */
export function buildOrderMessage(lines: CartLine[], subtotal: number, customer: CustomerDetails) {
  const out = [
    "New Order Request",
    "",
    "Customer Details:",
    `- Name: ${customer.name}`,
    `- Phone: ${customer.phone}`,
    `- Address: ${customer.address}`,
  ];
  if (customer.deliveryDate) out.push(`- Expected Delivery: ${formatDate(customer.deliveryDate)}`);
  out.push("", "Order Items:");
  lines.forEach((line, index) => {
    out.push(`${index + 1}. ${line.name} x ${line.quantity} = ${formatINR(line.price * line.quantity)}`);
  });
  out.push(
    "",
    `Subtotal: ${formatINR(subtotal)}`,
    "(Subtotal does not include shipping charges or discounts)",
    "",
    "Please confirm availability and provide final invoice total.",
  );
  return out.join("\n");
}
