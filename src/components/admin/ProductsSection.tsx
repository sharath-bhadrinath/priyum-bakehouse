import { useMemo, useState } from "react";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import * as api from "@/features/admin/api";
import { useAdminMutation, useCategories, useProductTags, useProducts, useTags } from "@/features/admin/queries";
import type { AdminProduct, TagRow } from "@/features/admin/types";
import { formatINR, formatSize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ProductDialog } from "./ProductDialog";
import { ConfirmDialog, DataList, EmptyState, FilterChips, IconButton, Panel, RowActions, SearchField, Toolbar } from "./ui";
import type { Column } from "./ui";

const ALL = "all";
const UNCATEGORISED = "none";
const LOW_STOCK = 10;

export function ProductsSection() {
  const products = useProducts();
  const categories = useCategories();
  const tags = useTags();
  const productTags = useProductTags();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [editing, setEditing] = useState<AdminProduct | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminProduct | null>(null);

  const remove = useAdminMutation(api.deleteProduct, {
    success: "Product deleted",
    error: "Couldn't delete product",
    onSuccess: () => setDeleting(null),
  });
  const setVisibility = useAdminMutation(api.setProductVisibility, {
    success: (_data, vars) => (vars.visible ? "Now showing on the site" : "Hidden from the site"),
    error: "Couldn't update product",
  });

  /** Resolves a product's category id, falling back to the legacy name column. */
  const categoryIdOf = useMemo(() => {
    const idByName = new Map((categories.data ?? []).map((category) => [category.name, category.id]));
    const known = new Set(idByName.values());
    return (product: AdminProduct) => {
      if (product.category_id && known.has(product.category_id)) return product.category_id;
      return (product.category && idByName.get(product.category)) || UNCATEGORISED;
    };
  }, [categories.data]);

  const tagsByProduct = useMemo(() => {
    const tagById = new Map((tags.data ?? []).map((tag) => [tag.id, tag]));
    const map: Record<string, TagRow[]> = {};
    for (const link of productTags.data ?? []) {
      const tag = tagById.get(link.tag_id);
      if (tag) (map[link.product_id] ??= []).push(tag);
    }
    return map;
  }, [tags.data, productTags.data]);

  const filterOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const product of products.data ?? []) {
      const id = categoryIdOf(product);
      counts[id] = (counts[id] ?? 0) + 1;
    }
    return [
      { value: ALL, label: "All", count: products.data?.length ?? 0 },
      ...(categories.data ?? []).map((category) => ({
        value: category.id,
        label: category.display_name,
        count: counts[category.id] ?? 0,
      })),
      ...(counts[UNCATEGORISED] ? [{ value: UNCATEGORISED, label: "Uncategorised", count: counts[UNCATEGORISED] }] : []),
    ];
  }, [products.data, categories.data, categoryIdOf]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (products.data ?? []).filter(
      (product) =>
        (categoryFilter === ALL || categoryIdOf(product) === categoryFilter) &&
        (!needle || product.name.toLowerCase().includes(needle)),
    );
  }, [products.data, query, categoryFilter, categoryIdOf]);

  const thumb = (product: AdminProduct) => (
    <img
      src={product.image || "/placeholder.svg"}
      alt=""
      loading="lazy"
      className="h-12 w-12 shrink-0 rounded-xl bg-brand-oat object-cover"
    />
  );
  const price = (product: AdminProduct) => (
    <span className="whitespace-nowrap tabular-nums">
      <span className="font-semibold">{formatINR(product.selling_price)}</span>
      {product.mrp > product.selling_price && (
        <span className="ml-1.5 text-xs text-muted-foreground line-through">{formatINR(product.mrp)}</span>
      )}
    </span>
  );
  const sizes = (product: AdminProduct) => {
    const extra = product.weight_options.length;
    return [formatSize(product.base_weight, product.weight_unit), extra > 0 && `+${extra} more`].filter(Boolean).join(" · ") || "—";
  };
  const stock = (product: AdminProduct) => {
    const count = product.stock ?? 0;
    return (
      <span
        className={cn(
          "whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
          count <= 0 ? "bg-brand-berry/10 text-brand-berry" : count <= LOW_STOCK ? "bg-amber-100 text-amber-900" : "bg-brand-oat/70",
        )}
      >
        {count <= 0 ? "Out of stock" : `${count} in stock`}
      </span>
    );
  };
  const tagPills = (product: AdminProduct) => (
    <div className="flex flex-wrap gap-1">
      {(tagsByProduct[product.id] ?? []).map((tag) => (
        <span key={tag.id} className="flex items-center gap-1 rounded-full bg-brand-oat/60 px-2 py-0.5 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color ?? undefined }} />
          {tag.name}
        </span>
      ))}
    </div>
  );
  const visibility = (product: AdminProduct) => (
    <Switch
      checked={product.site_display}
      disabled={setVisibility.isPending}
      onCheckedChange={(visible) => setVisibility.mutate({ id: product.id, visible })}
      aria-label={`Show ${product.name} on the site`}
    />
  );
  const actions = (product: AdminProduct) => (
    <RowActions>
      <IconButton label={`Edit ${product.name}`} icon={Pencil} onClick={() => setEditing(product)} />
      <IconButton label={`Delete ${product.name}`} icon={Trash2} tone="danger" onClick={() => setDeleting(product)} />
    </RowActions>
  );

  const columns: Column<AdminProduct>[] = [
    {
      header: "Product",
      cell: (product) => (
        <div className="flex items-center gap-3">
          {thumb(product)}
          <div className="min-w-0 max-w-xs">
            <p className="truncate font-medium">{product.name}</p>
            <p className="truncate text-xs text-muted-foreground">{product.description}</p>
          </div>
        </div>
      ),
    },
    { header: "Price", cell: price },
    { header: "Sizes", cell: sizes, className: "whitespace-nowrap" },
    { header: "Tags", cell: tagPills },
    { header: "Stock", cell: stock },
    { header: "On site", cell: visibility },
    { header: "", cell: actions, className: "text-right" },
  ];

  return (
    <Panel
      title="Products"
      description="Everything on the menu. Switch a product off to hide it from the storefront."
      actions={
        <Button onClick={() => setEditing("new")}>
          <Plus className="mr-1.5 h-4 w-4" /> Add product
        </Button>
      }
    >
      <Toolbar>
        <SearchField value={query} onChange={setQuery} placeholder="Search products" />
        <FilterChips label="Filter by category" options={filterOptions} value={categoryFilter} onChange={setCategoryFilter} />
      </Toolbar>

      <DataList
        query={products}
        rows={rows}
        rowKey={(product) => product.id}
        columns={columns}
        card={(product) => (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              {thumb(product)}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{product.name}</p>
                <p className="text-sm">{price(product)}</p>
                <p className="text-xs text-muted-foreground">{sizes(product)}</p>
              </div>
              {actions(product)}
            </div>
            {tagPills(product)}
            <div className="flex items-center justify-between">
              {stock(product)}
              <span className="flex items-center gap-2 text-xs text-muted-foreground">On site {visibility(product)}</span>
            </div>
          </div>
        )}
        empty={
          <EmptyState
            icon={Package}
            title={products.data?.length ? "No products match" : "No products yet"}
            hint={products.data?.length ? "Try a different search or category." : "Add your first product to get started."}
          />
        }
      />

      {editing && (
        <ProductDialog
          product={editing === "new" ? null : editing}
          tagIds={editing === "new" ? [] : (tagsByProduct[editing.id] ?? []).map((tag) => tag.id)}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete “${deleting.name}”?`}
          description="The product is removed from the menu for good. Past orders that include it are not affected."
          pending={remove.isPending}
          onConfirm={() => remove.mutate(deleting.id)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </Panel>
  );
}
