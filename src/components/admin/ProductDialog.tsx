import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import * as api from "@/features/admin/api";
import { useAdminMutation, useCategories, useTags } from "@/features/admin/queries";
import { WEIGHT_UNITS } from "@/features/admin/types";
import type { AdminProduct } from "@/features/admin/types";
import { cn } from "@/lib/utils";
import { CategoryDialog } from "./CategoriesSection";
import { Field, FormDialog, IconButton } from "./ui";

const NO_CATEGORY = "none";

/** Form values are kept as strings so number inputs can be cleared while typing. */
interface OptionDraft {
  weight: string;
  unit: string;
  mrp: string;
  selling_price: string;
}

interface Draft {
  name: string;
  mrp: string;
  selling_price: string;
  description: string;
  info: string;
  image: string;
  category_id: string;
  stock: string;
  base_weight: string;
  weight_unit: string;
  site_display: boolean;
  tagIds: string[];
  options: OptionDraft[];
}

const toDraft = (product: AdminProduct | null, tagIds: string[]): Draft => ({
  name: product?.name ?? "",
  mrp: product ? String(product.mrp) : "",
  selling_price: product ? String(product.selling_price) : "",
  description: product?.description ?? "",
  info: product?.info ?? "",
  image: product?.image ?? "",
  category_id: product?.category_id ?? NO_CATEGORY,
  stock: product ? String(product.stock ?? 0) : "",
  base_weight: String(product?.base_weight ?? 500),
  weight_unit: product?.weight_unit ?? "grams",
  site_display: product?.site_display ?? true,
  tagIds,
  options: (product?.weight_options ?? []).map((option) => ({
    weight: String(option.weight),
    unit: option.unit,
    mrp: String(option.mrp),
    selling_price: String(option.selling_price),
  })),
});

const number = (value: string) => parseFloat(value) || 0;

interface ProductDialogProps {
  /** The product to edit, or null to create one. */
  product: AdminProduct | null;
  tagIds: string[];
  onClose: () => void;
}

export function ProductDialog({ product, tagIds, onClose }: ProductDialogProps) {
  const categories = useCategories();
  const tags = useTags();
  const [draft, setDraft] = useState(() => toDraft(product, tagIds));
  const [addingCategory, setAddingCategory] = useState(false);

  const set = <K extends keyof Draft>(field: K, value: Draft[K]) => setDraft((current) => ({ ...current, [field]: value }));
  const text = (field: "name" | "mrp" | "selling_price" | "description" | "info" | "stock" | "base_weight") => ({
    value: draft[field],
    onChange: (event: { target: { value: string } }) => set(field, event.target.value),
  });
  const setOption = (index: number, patch: Partial<OptionDraft>) =>
    set(
      "options",
      draft.options.map((option, i) => (i === index ? { ...option, ...patch } : option)),
    );

  const save = useAdminMutation(api.saveProduct, {
    success: product ? "Product updated" : "Product added",
    error: "Couldn't save product",
    onSuccess: onClose,
  });
  const upload = useMutation({
    mutationFn: api.uploadProductImage,
    onSuccess: (url) => set("image", url),
    onError: () => toast.error("Couldn't upload image"),
  });

  const submit = () => {
    const category = categories.data?.find((item) => item.id === draft.category_id);
    save.mutate({
      id: product?.id ?? null,
      input: {
        name: draft.name.trim(),
        mrp: number(draft.mrp),
        selling_price: number(draft.selling_price),
        description: draft.description.trim(),
        info: draft.info.trim(),
        image: draft.image,
        category_id: category?.id ?? null,
        // Legacy name column: follows the chosen category. Only an untouched
        // "Uncategorised" keeps whatever older data had there.
        category:
          category?.name ?? (draft.category_id === (product?.category_id ?? NO_CATEGORY) ? product?.category ?? null : null),
        stock: parseInt(draft.stock, 10) || 0,
        base_weight: number(draft.base_weight) || 500,
        weight_unit: draft.weight_unit,
        weight_options: draft.options
          .filter((option) => number(option.weight) > 0)
          .map((option) => ({
            weight: number(option.weight),
            unit: option.unit,
            mrp: number(option.mrp),
            selling_price: number(option.selling_price),
          })),
        site_display: draft.site_display,
        tagIds: draft.tagIds,
      },
    });
  };

  const unitSelect = (value: string, onChange: (unit: string) => void, label: string) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {WEIGHT_UNITS.map((unit) => (
          <SelectItem key={unit} value={unit}>
            {unit}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <>
      <FormDialog
        title={product ? "Edit product" : "Add product"}
        submitLabel={product ? "Save changes" : "Add product"}
        pending={save.isPending || upload.isPending}
        size="lg"
        onClose={onClose}
        onSubmit={submit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <Input {...text("name")} placeholder="e.g. Fudgy Walnut Brownie" required />
          </Field>

          <Field label="Selling price (₹)">
            <Input {...text("selling_price")} type="number" inputMode="decimal" min="0" step="any" placeholder="299" required />
          </Field>
          <Field label="MRP (₹)" hint="Shown struck through when higher than the selling price.">
            <Input {...text("mrp")} type="number" inputMode="decimal" min="0" step="any" placeholder="350" required />
          </Field>

          <Field label="Base size">
            <Input {...text("base_weight")} type="number" inputMode="decimal" min="0" step="any" placeholder="500" />
          </Field>
          <Field label="Unit">{unitSelect(draft.weight_unit, (unit) => set("weight_unit", unit), "Unit")}</Field>

          <div className="space-y-1.5">
            <Field label="Category">
              <Select value={draft.category_id} onValueChange={(value) => set("category_id", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>Uncategorised</SelectItem>
                  {(categories.data ?? []).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <button
              type="button"
              onClick={() => setAddingCategory(true)}
              className="text-xs font-medium text-brand-caramel underline-offset-2 hover:underline"
            >
              + New category
            </button>
          </div>
          <Field label="Stock">
            <Input {...text("stock")} type="number" inputMode="numeric" min="0" step="1" placeholder="50" />
          </Field>

          <Field label="Description" className="sm:col-span-2">
            <Textarea {...text("description")} rows={3} placeholder="What makes it special?" />
          </Field>
          <Field label="Additional information" className="sm:col-span-2" hint="Ingredients, storage, allergens.">
            <Textarea {...text("info")} rows={2} />
          </Field>

          <div className="space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium">Photo</span>
            <div className="flex items-center gap-3">
              {draft.image ? (
                <img src={draft.image} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-brand-oat object-cover" />
              ) : (
                <span className="h-16 w-16 shrink-0 rounded-xl border border-dashed border-input bg-brand-oat/40" />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <Input
                  type="file"
                  accept="image/*"
                  aria-label="Upload a photo"
                  disabled={upload.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) upload.mutate(file);
                  }}
                />
                {upload.isPending ? (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
                  </p>
                ) : (
                  draft.image && (
                    <button type="button" onClick={() => set("image", "")} className="text-xs font-medium text-brand-berry hover:underline">
                      Remove photo
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {(tags.data?.length ?? 0) > 0 && (
            <div className="space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">Tags</span>
              <div className="flex flex-wrap gap-1.5">
                {tags.data?.map((tag) => {
                  const selected = draft.tagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        set("tagIds", selected ? draft.tagIds.filter((id) => id !== tag.id) : [...draft.tagIds, tag.id])
                      }
                      className={cn(
                        "flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
                        selected ? "border-brand-cocoa bg-brand-cocoa text-brand-cream" : "border-input hover:bg-brand-oat/60",
                      )}
                    >
                      <span className="h-2.5 w-2.5 rounded-full ring-1 ring-white/60" style={{ backgroundColor: tag.color ?? undefined }} />
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2 sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">More sizes</p>
                <p className="text-xs text-muted-foreground">Extra sizes customers can choose, each with its own price.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set("options", [...draft.options, { weight: "", unit: draft.weight_unit, mrp: "", selling_price: "" }])}
              >
                <Plus className="mr-1 h-4 w-4" /> Add size
              </Button>
            </div>
            {draft.options.map((option, index) => (
              <div key={index} className="grid grid-cols-2 items-center gap-2 rounded-xl bg-brand-oat/40 p-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder="Size"
                  aria-label="Size"
                  value={option.weight}
                  onChange={(event) => setOption(index, { weight: event.target.value })}
                />
                {unitSelect(option.unit, (unit) => setOption(index, { unit }), "Unit")}
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder="Price ₹"
                  aria-label="Selling price"
                  value={option.selling_price}
                  onChange={(event) => setOption(index, { selling_price: event.target.value })}
                />
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder="MRP ₹"
                  aria-label="MRP"
                  value={option.mrp}
                  onChange={(event) => setOption(index, { mrp: event.target.value })}
                />
                <IconButton
                  label="Remove size"
                  icon={X}
                  className="col-span-2 justify-self-end sm:col-span-1"
                  onClick={() => set("options", draft.options.filter((_, i) => i !== index))}
                />
              </div>
            ))}
          </div>

          <label className="flex items-center justify-between gap-4 rounded-xl bg-brand-oat/40 px-4 py-3 sm:col-span-2">
            <span>
              <span className="block text-sm font-medium">Show on site</span>
              <span className="block text-xs text-muted-foreground">Turn off to keep the product but hide it from customers.</span>
            </span>
            <Switch checked={draft.site_display} onCheckedChange={(checked) => set("site_display", checked)} />
          </label>
        </div>
      </FormDialog>

      {/* Rendered beside the form, not inside it, so its submit doesn't bubble into this one. */}
      {addingCategory && (
        <CategoryDialog category={null} onClose={() => setAddingCategory(false)} onSaved={(category) => set("category_id", category.id)} />
      )}
    </>
  );
}
