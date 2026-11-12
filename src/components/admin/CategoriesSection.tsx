import { useMemo, useState } from "react";
import { FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as api from "@/features/admin/api";
import { useAdminMutation, useBaseCategories, useCategories } from "@/features/admin/queries";
import type { BaseCategoryRow, CategoryRow } from "@/features/admin/types";
import { ConfirmDialog, DataList, EmptyState, Field, FormDialog, IconButton, Panel, RowActions } from "./ui";
import type { Column } from "./ui";

const NONE = "none";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type Named = { name: string; display_name: string };

/** Display name + system name. The system name follows the display name until it is edited by hand. */
function useNameFields(initial: Named | null) {
  const [displayName, setDisplayName] = useState(initial?.display_name ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [nameEdited, setNameEdited] = useState(Boolean(initial));

  return {
    values: { name: name.trim(), display_name: displayName.trim() },
    valid: Boolean(name.trim() && displayName.trim()),
    fields: (
      <>
        <Field label="Display name" hint="Shown to customers.">
          <Input
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              if (!nameEdited) setName(slugify(event.target.value));
            }}
            placeholder="e.g. Brownies"
            required
            autoFocus
          />
        </Field>
        <Field label="System name" hint="Internal identifier. Filled in for you.">
          <Input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameEdited(true);
            }}
            placeholder="e.g. brownies"
            className="font-mono"
            required
          />
        </Field>
      </>
    ),
  };
}

export function CategoriesSection() {
  const categories = useCategories();
  const baseCategories = useBaseCategories();
  const [editingCategory, setEditingCategory] = useState<CategoryRow | "new" | null>(null);
  const [editingGroup, setEditingGroup] = useState<BaseCategoryRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<{ kind: "category" | "group"; row: Named & { id: string } } | null>(null);

  const closeDelete = () => setDeleting(null);
  const removeCategory = useAdminMutation(api.deleteCategory, {
    success: "Category deleted",
    error: "Couldn't delete category",
    onSuccess: closeDelete,
  });
  const removeGroup = useAdminMutation(api.deleteBaseCategory, {
    success: "Group deleted",
    error: "Couldn't delete group",
    onSuccess: closeDelete,
  });

  const groupLabel = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const group of baseCategories.data ?? []) labels[group.id] = group.display_name;
    return labels;
  }, [baseCategories.data]);

  const nameCell = (row: Named) => (
    <div>
      <p className="font-medium">{row.display_name}</p>
      <p className="font-mono text-xs text-muted-foreground">{row.name}</p>
    </div>
  );
  const groupOf = (category: CategoryRow) =>
    (category.base_category_id && groupLabel[category.base_category_id]) || (
      <span className="text-muted-foreground">No group</span>
    );

  const categoryActions = (category: CategoryRow) => (
    <RowActions>
      <IconButton label={`Edit ${category.display_name}`} icon={Pencil} onClick={() => setEditingCategory(category)} />
      <IconButton
        label={`Delete ${category.display_name}`}
        icon={Trash2}
        tone="danger"
        onClick={() => setDeleting({ kind: "category", row: category })}
      />
    </RowActions>
  );
  const groupActions = (group: BaseCategoryRow) => (
    <RowActions>
      <IconButton label={`Edit ${group.display_name}`} icon={Pencil} onClick={() => setEditingGroup(group)} />
      <IconButton
        label={`Delete ${group.display_name}`}
        icon={Trash2}
        tone="danger"
        onClick={() => setDeleting({ kind: "group", row: group })}
      />
    </RowActions>
  );

  const categoryColumns: Column<CategoryRow>[] = [
    { header: "Category", cell: nameCell },
    { header: "Group", cell: groupOf },
    { header: "", cell: categoryActions, className: "text-right" },
  ];
  const groupColumns: Column<BaseCategoryRow>[] = [
    { header: "Group", cell: nameCell },
    { header: "", cell: groupActions, className: "text-right" },
  ];

  return (
    <div className="space-y-6">
      <Panel
        title="Categories"
        description="What products are filed under, e.g. Brownies or Cookies."
        actions={
          <Button onClick={() => setEditingCategory("new")}>
            <Plus className="mr-1.5 h-4 w-4" /> Add category
          </Button>
        }
      >
        <DataList
          query={categories}
          rowKey={(category) => category.id}
          columns={categoryColumns}
          card={(category) => (
            <div className="flex items-center justify-between gap-3">
              <div>
                {nameCell(category)}
                <p className="mt-1 text-xs">{groupOf(category)}</p>
              </div>
              {categoryActions(category)}
            </div>
          )}
          empty={<EmptyState icon={FolderTree} title="No categories yet" />}
        />
      </Panel>

      <Panel
        title="Groups"
        description="Top-level menu tabs on the storefront. Each holds one or more categories."
        actions={
          <Button variant="outline" onClick={() => setEditingGroup("new")}>
            <Plus className="mr-1.5 h-4 w-4" /> Add group
          </Button>
        }
      >
        <DataList
          query={baseCategories}
          rowKey={(group) => group.id}
          columns={groupColumns}
          card={(group) => (
            <div className="flex items-center justify-between gap-3">
              {nameCell(group)}
              {groupActions(group)}
            </div>
          )}
          empty={<EmptyState icon={FolderTree} title="No groups yet" />}
        />
      </Panel>

      {editingCategory && (
        <CategoryDialog category={editingCategory === "new" ? null : editingCategory} onClose={() => setEditingCategory(null)} />
      )}
      {editingGroup && <GroupDialog group={editingGroup === "new" ? null : editingGroup} onClose={() => setEditingGroup(null)} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete “${deleting.row.display_name}”?`}
          description={
            deleting.kind === "category"
              ? "Products in this category are kept and become uncategorised."
              : "Categories in this group are kept and lose their group."
          }
          pending={removeCategory.isPending || removeGroup.isPending}
          onConfirm={() => (deleting.kind === "category" ? removeCategory : removeGroup).mutate(deleting.row.id)}
          onCancel={closeDelete}
        />
      )}
    </div>
  );
}

interface CategoryDialogProps {
  category: CategoryRow | null;
  onClose: () => void;
  /** Called with the saved row, e.g. to select a category created from the product form. */
  onSaved?: (category: CategoryRow) => void;
}

export function CategoryDialog({ category, onClose, onSaved }: CategoryDialogProps) {
  const baseCategories = useBaseCategories();
  const names = useNameFields(category);
  const [groupId, setGroupId] = useState(category?.base_category_id ?? NONE);
  const save = useAdminMutation(api.saveCategory, {
    success: category ? "Category updated" : "Category added",
    error: "Couldn't save category",
    onSuccess: (saved) => {
      onSaved?.(saved);
      onClose();
    },
  });

  return (
    <FormDialog
      title={category ? "Edit category" : "Add category"}
      submitLabel={category ? "Save changes" : "Add category"}
      pending={save.isPending}
      onClose={onClose}
      onSubmit={() =>
        names.valid &&
        save.mutate({ id: category?.id ?? null, ...names.values, base_category_id: groupId === NONE ? null : groupId })
      }
    >
      {names.fields}
      <Field label="Group" hint="Optional. Ungrouped categories appear under “More”.">
        <Select value={groupId} onValueChange={setGroupId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No group</SelectItem>
            {(baseCategories.data ?? []).map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </FormDialog>
  );
}

function GroupDialog({ group, onClose }: { group: BaseCategoryRow | null; onClose: () => void }) {
  const names = useNameFields(group);
  const save = useAdminMutation(api.saveBaseCategory, {
    success: group ? "Group updated" : "Group added",
    error: "Couldn't save group",
    onSuccess: onClose,
  });

  return (
    <FormDialog
      title={group ? "Edit group" : "Add group"}
      submitLabel={group ? "Save changes" : "Add group"}
      pending={save.isPending}
      onClose={onClose}
      onSubmit={() => names.valid && save.mutate({ id: group?.id ?? null, ...names.values })}
    >
      {names.fields}
    </FormDialog>
  );
}
