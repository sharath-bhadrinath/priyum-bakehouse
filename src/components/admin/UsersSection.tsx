import { useState } from "react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import * as api from "@/features/admin/api";
import { useAdminMutation, useUsers } from "@/features/admin/queries";
import type { ProfileRow, UserInput } from "@/features/admin/types";
import { formatDate } from "@/lib/format";
import { ConfirmDialog, DataList, EmptyState, Field, FormDialog, IconButton, Panel, RowActions } from "./ui";
import type { Column } from "./ui";

const displayName = (user: ProfileRow) => user.full_name || user.email || "Unnamed user";

export function UsersSection() {
  const users = useUsers();
  const [editing, setEditing] = useState<ProfileRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<ProfileRow | null>(null);

  const remove = useAdminMutation(api.deleteProfile, {
    success: "Profile removed",
    error: "Couldn't remove profile",
    onSuccess: () => setDeleting(null),
  });

  const actions = (user: ProfileRow) => (
    <RowActions>
      <IconButton label={`Edit ${displayName(user)}`} icon={Pencil} onClick={() => setEditing(user)} />
      <IconButton label={`Remove ${displayName(user)}`} icon={Trash2} tone="danger" onClick={() => setDeleting(user)} />
    </RowActions>
  );

  const columns: Column<ProfileRow>[] = [
    { header: "Name", cell: (user) => <span className="font-medium">{user.full_name || "—"}</span> },
    { header: "Email", cell: (user) => user.email || "—" },
    { header: "Phone", cell: (user) => user.phone || "—" },
    { header: "Added", cell: (user) => formatDate(user.created_at), className: "whitespace-nowrap" },
    { header: "", cell: actions, className: "text-right" },
  ];

  return (
    <Panel
      title="Users"
      description="People with an account."
      actions={
        <Button onClick={() => setEditing("new")}>
          <Plus className="mr-1.5 h-4 w-4" /> Add user
        </Button>
      }
    >
      <DataList
        query={users}
        rowKey={(user) => user.id}
        columns={columns}
        card={(user) => (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{displayName(user)}</p>
              <p className="truncate text-sm text-muted-foreground">{[user.email, user.phone].filter(Boolean).join(" · ")}</p>
            </div>
            {actions(user)}
          </div>
        )}
        empty={<EmptyState icon={Users} title="No users yet" />}
      />

      {editing && <UserDialog user={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog
          title={`Remove ${displayName(deleting)}?`}
          description="This removes their profile details. Their sign-in account is not deleted; that can only be done from the Supabase dashboard."
          confirmLabel="Remove"
          pending={remove.isPending}
          onConfirm={() => remove.mutate(deleting.user_id)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </Panel>
  );
}

function UserDialog({ user, onClose }: { user: ProfileRow | null; onClose: () => void }) {
  const [form, setForm] = useState<UserInput>({
    email: user?.email ?? "",
    password: "",
    full_name: user?.full_name ?? "",
    phone: user?.phone ?? "",
    address: user?.address ?? "",
  });
  const set = (field: keyof UserInput) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const create = useAdminMutation(api.createUser, {
    success: (result) => (result === "updated" ? "That email already had a profile, so it was updated" : "User created"),
    error: "Couldn't add user",
    onSuccess: onClose,
  });
  const update = useAdminMutation(api.updateProfile, {
    success: "User updated",
    error: "Couldn't update user",
    onSuccess: onClose,
  });

  return (
    <FormDialog
      title={user ? "Edit user" : "Add user"}
      submitLabel={user ? "Save changes" : "Add user"}
      pending={create.isPending || update.isPending}
      onClose={onClose}
      onSubmit={() => (user ? update.mutate({ id: user.id, input: form }) : create.mutate(form))}
    >
      <Field label="Email" hint={user ? "Email can't be changed here." : undefined}>
        <Input type="email" value={form.email} onChange={set("email")} placeholder="name@example.com" required disabled={Boolean(user)} />
      </Field>
      {!user && (
        <Field label="Password" hint="At least 6 characters. Share it with the user so they can sign in.">
          <Input type="password" value={form.password} onChange={set("password")} minLength={6} autoComplete="new-password" />
        </Field>
      )}
      <Field label="Full name">
        <Input value={form.full_name} onChange={set("full_name")} required />
      </Field>
      <Field label="Phone">
        <Input type="tel" value={form.phone} onChange={set("phone")} />
      </Field>
      <Field label="Address">
        <Textarea value={form.address} onChange={set("address")} rows={3} />
      </Field>
    </FormDialog>
  );
}
