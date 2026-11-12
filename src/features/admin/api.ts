/**
 * Every Supabase call the admin makes lives here. Functions throw on failure so
 * callers (React Query) get one consistent error path.
 */
import { supabase } from "@/integrations/supabase/client";
import { parseWeightOptions } from "@/lib/catalog";
import type {
  AdminProduct,
  BaseCategoryRow,
  CategoryRow,
  InvoiceSettings,
  OrderItemRow,
  OrderRow,
  ProductInput,
  ProductTagRow,
  ProfileRow,
  TagRow,
  UserInput,
  WeightOption,
} from "./types";

function unwrap<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}

/**
 * Row level security blocks updates and deletes silently: the call succeeds
 * but touches nothing. Ask for the affected rows back and fail loudly instead
 * of reporting a save that never happened.
 */
function expectRows<T>(rows: T[] | null, action: string): T[] {
  if (!rows || rows.length === 0) {
    throw new Error(`${action} was blocked. Your account doesn't have permission to change this.`);
  }
  return rows;
}

const isDuplicate = (error: unknown) => (error as { code?: string } | null)?.code === "23505";

const toWeightOption = (raw: Record<string, unknown>): WeightOption => ({
  weight: Number(raw.weight) || 0,
  unit: String(raw.unit ?? "grams"),
  mrp: Number(raw.mrp) || 0,
  selling_price: Number(raw.selling_price) || 0,
});

/* ---------- Products ---------- */

export async function listProducts(): Promise<AdminProduct[]> {
  const rows = unwrap(await supabase.from("products").select("*").order("created_at", { ascending: false }));
  return (rows ?? []).map((row) => ({
    ...row,
    mrp: row.mrp || row.price || 0,
    selling_price: row.selling_price || row.price || 0,
    weight_options: parseWeightOptions(row.weight_options).map(toWeightOption),
  }));
}

/** Creates the product when `id` is null, otherwise updates it. Tags are replaced wholesale. */
export async function saveProduct({ id, input }: { id: string | null; input: ProductInput }) {
  const { tagIds, weight_options, ...fields } = input;
  const row = {
    ...fields,
    description: fields.description || null,
    info: fields.info || null,
    image: fields.image || null,
    price: fields.selling_price, // legacy column, still read by older screens
    weight_options: weight_options.length > 0 ? JSON.stringify(weight_options) : null,
  };

  let productId = id;
  if (productId) {
    unwrap(await supabase.from("products").update(row).eq("id", productId));
  } else {
    productId = unwrap(await supabase.from("products").insert(row).select("id").single()).id;
  }
  await setProductTags(productId, tagIds);
}

/** Makes the product's tags match `tagIds`, writing only the links that actually changed. */
async function setProductTags(productId: string, tagIds: string[]) {
  const current = unwrap(await supabase.from("product_tags").select("tag_id").eq("product_id", productId)) ?? [];
  const existing = new Set(current.map((link) => link.tag_id));
  const wanted = new Set(tagIds);
  const removed = [...existing].filter((tagId) => !wanted.has(tagId));
  const added = [...wanted].filter((tagId) => !existing.has(tagId));

  if (removed.length > 0) {
    const rows = unwrap(
      await supabase.from("product_tags").delete().eq("product_id", productId).in("tag_id", removed).select("id"),
    );
    expectRows(rows, "Removing tags");
  }
  if (added.length > 0) {
    unwrap(await supabase.from("product_tags").insert(added.map((tag_id) => ({ product_id: productId, tag_id }))));
  }
}

export async function setProductVisibility({ id, visible }: { id: string; visible: boolean }) {
  unwrap(await supabase.from("products").update({ site_display: visible }).eq("id", id));
}

export async function deleteProduct(id: string) {
  unwrap(await supabase.from("products").delete().eq("id", id));
}

export async function uploadProductImage(file: File): Promise<string> {
  const extension = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${extension}`;
  unwrap(await supabase.storage.from("product-images").upload(path, file));
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

/* ---------- Tags ---------- */

export async function listTags(): Promise<TagRow[]> {
  return unwrap(await supabase.from("tags").select("*").order("name")) ?? [];
}

export async function listProductTags(): Promise<ProductTagRow[]> {
  return unwrap(await supabase.from("product_tags").select("*")) ?? [];
}

export async function saveTag({ id, name, color }: { id: string | null; name: string; color: string }) {
  const row = { name: name.trim(), color };
  const result = id
    ? await supabase.from("tags").update(row).eq("id", id).select("id")
    : await supabase.from("tags").insert(row).select("id");
  if (isDuplicate(result.error)) throw new Error(`A tag called “${row.name}” already exists.`);
  expectRows(unwrap(result), "Saving the tag");
}

/** Links to products go with the tag (the database cascades the delete). */
export async function deleteTag(id: string) {
  expectRows(unwrap(await supabase.from("tags").delete().eq("id", id).select("id")), "Deleting the tag");
}

/* ---------- Categories ---------- */

export async function listCategories(): Promise<CategoryRow[]> {
  return unwrap(await supabase.from("categories").select("*").order("display_name")) ?? [];
}

export async function listBaseCategories(): Promise<BaseCategoryRow[]> {
  return unwrap(await supabase.from("base_categories").select("*").order("display_name")) ?? [];
}

export interface CategoryInput {
  id: string | null;
  name: string;
  display_name: string;
  base_category_id: string | null;
}

export async function saveCategory({ id, ...row }: CategoryInput): Promise<CategoryRow> {
  const query = id
    ? supabase.from("categories").update(row).eq("id", id)
    : supabase.from("categories").insert(row);
  return unwrap(await query.select("*").single());
}

/** Products in the category are kept and become uncategorised. */
export async function deleteCategory(id: string) {
  unwrap(await supabase.from("products").update({ category_id: null }).eq("category_id", id));
  unwrap(await supabase.from("categories").delete().eq("id", id));
}

export async function saveBaseCategory({ id, ...row }: { id: string | null; name: string; display_name: string }) {
  unwrap(
    id
      ? await supabase.from("base_categories").update(row).eq("id", id)
      : await supabase.from("base_categories").insert(row),
  );
}

/** Categories in the group are kept and lose their group. */
export async function deleteBaseCategory(id: string) {
  unwrap(await supabase.from("categories").update({ base_category_id: null }).eq("base_category_id", id));
  unwrap(await supabase.from("base_categories").delete().eq("id", id));
}

/* ---------- Orders ---------- */

export async function listOrders(): Promise<OrderRow[]> {
  return unwrap(await supabase.from("orders").select("*").order("created_at", { ascending: false })) ?? [];
}

export async function listOrderItems(orderId: string): Promise<OrderItemRow[]> {
  return unwrap(await supabase.from("order_items").select("*").eq("order_id", orderId)) ?? [];
}

export async function updateOrderStatus({ id, status }: { id: string; status: string }) {
  unwrap(await supabase.from("orders").update({ status }).eq("id", id));
}

export async function updateOrder({ order, items }: { order: OrderRow; items: OrderItemRow[] }) {
  unwrap(
    await supabase
      .from("orders")
      .update({
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        customer_address: order.customer_address,
        status: order.status,
        subtotal: order.subtotal,
        shipping_charges: order.shipping_charges,
        discount_amount: order.discount_amount,
        total: order.total,
        custom_order_date: order.custom_order_date,
        custom_invoice_date: order.custom_invoice_date,
        delivery_date: order.delivery_date,
        shipment_number: order.shipment_number,
      })
      .eq("id", order.id),
  );

  await Promise.all(
    items.map(async (item) =>
      unwrap(
        await supabase
          .from("order_items")
          .update({
            product_name: item.product_name,
            product_price: item.product_price,
            quantity: item.quantity,
            total: item.total,
            weight: item.weight,
            weight_unit: item.weight_unit,
          })
          .eq("id", item.id),
      ),
    ),
  );
}

export async function deleteOrder(id: string) {
  unwrap(await supabase.from("order_items").delete().eq("order_id", id));
  unwrap(await supabase.from("orders").delete().eq("id", id));
}

/* ---------- Users ---------- */

export async function listProfiles(): Promise<ProfileRow[]> {
  return unwrap(await supabase.from("profiles").select("*").order("created_at", { ascending: false })) ?? [];
}

export async function updateProfile({ id, input }: { id: string; input: UserInput }) {
  unwrap(
    await supabase
      .from("profiles")
      .update({ full_name: input.full_name, phone: input.phone || null, address: input.address || null })
      .eq("id", id),
  );
}

/**
 * Adds a user. If a profile with that email already exists it is updated
 * instead, so re-adding a known customer never fails.
 */
export async function createUser(input: UserInput): Promise<"created" | "updated"> {
  const existing = unwrap(await supabase.from("profiles").select("id").eq("email", input.email).maybeSingle());
  if (existing) {
    await updateProfile({ id: existing.id, input });
    return "updated";
  }
  if (!input.password) throw new Error("A password is required for new users.");

  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.full_name, phone: input.phone, address: input.address } },
  });
  if (error) throw error;
  return "created";
}

/** Removes the profile row only; the sign-in account can only be removed from the Supabase dashboard. */
export async function deleteProfile(userId: string) {
  unwrap(await supabase.from("profiles").delete().eq("user_id", userId));
}

/* ---------- Invoice settings ---------- */

export async function getInvoiceSettings(): Promise<InvoiceSettings | null> {
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return null;
  const row = unwrap(
    await supabase.from("invoice_settings").select("*").eq("user_id", auth.session.user.id).maybeSingle(),
  );
  return row
    ? {
        businessName: row.business_name,
        businessSubtitle: row.business_subtitle,
        phone: row.phone,
        email: row.email,
      }
    : null;
}
