import { useMemo, useState } from "react";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as api from "@/features/admin/api";
import { useAdminMutation, useProductTags, useTags } from "@/features/admin/queries";
import type { TagRow } from "@/features/admin/types";
import { ConfirmDialog, DataList, EmptyState, Field, FormDialog, IconButton, Panel, RowActions } from "./ui";
import type { Column } from "./ui";

const DEFAULT_COLOR = "#C97A2B";

export function TagsSection() {
  const tags = useTags();
  const productTags = useProductTags();
  const [editing, setEditing] = useState<TagRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<TagRow | null>(null);

  const remove = useAdminMutation(api.deleteTag, {
    success: "Tag deleted",
    error: "Couldn't delete tag",
    onSuccess: () => setDeleting(null),
  });

  const usage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const link of productTags.data ?? []) counts[link.tag_id] = (counts[link.tag_id] ?? 0) + 1;
    return counts;
  }, [productTags.data]);

  const usageLabel = (tag: TagRow) => {
    const count = usage[tag.id] ?? 0;
    return `${count} ${count === 1 ? "product" : "products"}`;
  };

  const swatch = (tag: TagRow) => (
    <span className="flex items-center gap-2 font-medium">
      <span className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: tag.color ?? DEFAULT_COLOR }} />
      {tag.name}
    </span>
  );

  const actions = (tag: TagRow) => (
    <RowActions>
      <IconButton label={`Edit ${tag.name}`} icon={Pencil} onClick={() => setEditing(tag)} />
      <IconButton label={`Delete ${tag.name}`} icon={Trash2} tone="danger" onClick={() => setDeleting(tag)} />
    </RowActions>
  );

  const columns: Column<TagRow>[] = [
    { header: "Tag", cell: swatch },
    { header: "Colour", cell: (tag) => <span className="font-mono text-xs uppercase">{tag.color}</span> },
    { header: "Used on", cell: usageLabel },
    { header: "", cell: actions, className: "text-right" },
  ];

  return (
    <Panel
      title="Tags"
      description="Labels such as “Bestseller” or “New” shown on product cards."
      actions={
        <Button onClick={() => setEditing("new")}>
          <Plus className="mr-1.5 h-4 w-4" /> Add tag
        </Button>
      }
    >
      <DataList
        query={tags}
        rowKey={(tag) => tag.id}
        columns={columns}
        card={(tag) => (
          <div className="flex items-center justify-between gap-3">
            <div>
              {swatch(tag)}
              <p className="mt-0.5 text-xs text-muted-foreground">{usageLabel(tag)}</p>
            </div>
            {actions(tag)}
          </div>
        )}
        empty={<EmptyState icon={Tag} title="No tags yet" hint="Add one to highlight products on the storefront." />}
      />

      {editing && <TagDialog tag={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete “${deleting.name}”?`}
          description={`This removes the tag from ${usageLabel(deleting)}. The products themselves are kept.`}
          pending={remove.isPending}
          onConfirm={() => remove.mutate(deleting.id)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </Panel>
  );
}

function TagDialog({ tag, onClose }: { tag: TagRow | null; onClose: () => void }) {
  const [name, setName] = useState(tag?.name ?? "");
  const [color, setColor] = useState(tag?.color ?? DEFAULT_COLOR);
  const save = useAdminMutation(api.saveTag, {
    success: tag ? "Tag updated" : "Tag added",
    error: "Couldn't save tag",
    onSuccess: onClose,
  });

  return (
    <FormDialog
      title={tag ? "Edit tag" : "Add tag"}
      submitLabel={tag ? "Save changes" : "Add tag"}
      pending={save.isPending}
      onClose={onClose}
      onSubmit={() => name.trim() && save.mutate({ id: tag?.id ?? null, name, color })}
    >
      <Field label="Name">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Bestseller" required autoFocus />
      </Field>
      <Field label="Colour">
        <span className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            aria-label="Pick a colour"
            className="h-10 w-14 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
          />
          <Input value={color} onChange={(event) => setColor(event.target.value)} placeholder={DEFAULT_COLOR} className="font-mono" />
        </span>
      </Field>
    </FormDialog>
  );
}
