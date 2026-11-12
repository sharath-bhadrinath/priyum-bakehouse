/**
 * Building blocks shared by every admin section. A new section should need
 * nothing beyond these, the shadcn primitives, and its own data.
 */
import type { ComponentProps, ReactNode } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/* ---------- Layout ---------- */

interface PanelProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function Panel({ title, description, actions, children }: PanelProps) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-brand-cocoa/10">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-cocoa/10 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold text-brand-cocoa">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

/** Row of filters shown between a panel's header and its list. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="space-y-3 border-b border-brand-cocoa/10 px-4 py-3 sm:px-6">{children}</div>;
}

export function StatCard({ label, value, hint, icon: Icon }: { label: string; value: ReactNode; hint?: string; icon: LucideIcon }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-brand-cocoa/10">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-butter text-brand-cocoa">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-display text-xl font-semibold tabular-nums text-brand-cocoa">{value}</p>
        {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint }: { icon?: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="px-6 py-14 text-center">
      {Icon && <Icon className="mx-auto mb-3 h-10 w-10 text-brand-cocoa/25" />}
      <p className="font-medium text-brand-cocoa">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ---------- Lists ---------- */

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataListProps<T> {
  /** The query backing the list; drives the loading and error states. */
  query: { isPending: boolean; isError: boolean; isFetching: boolean; refetch: () => unknown; data?: T[] };
  /** Rows to show. Defaults to the query's data; pass a filtered list to override. */
  rows?: T[];
  rowKey: (row: T) => string;
  columns: Column<T>[];
  /** Compact layout used instead of the table on small screens. */
  card: (row: T) => ReactNode;
  empty: ReactNode;
}

/** A table on desktop, a stack of cards on mobile, with loading/error/empty handled. */
export function DataList<T>({ query, rows, rowKey, columns, card, empty }: DataListProps<T>) {
  if (query.isPending) {
    return (
      <div className="flex justify-center py-14" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-brand-cocoa/40" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="px-6 py-14 text-center">
        <p className="font-medium text-brand-cocoa">Couldn't load this list</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => query.refetch()} disabled={query.isFetching}>
          <RefreshCw className={cn("mr-2 h-4 w-4", query.isFetching && "animate-spin")} /> Try again
        </Button>
      </div>
    );
  }

  const items = rows ?? query.data ?? [];
  if (items.length === 0) return <>{empty}</>;

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead key={column.header} className={cn("whitespace-nowrap first:pl-6 last:pr-6", column.className)}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((column) => (
                  <TableCell key={column.header} className={cn("first:pl-6 last:pr-6", column.className)}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="divide-y divide-brand-cocoa/10 md:hidden">
        {items.map((row) => (
          <li key={rowKey(row)} className="px-4 py-4">
            {card(row)}
          </li>
        ))}
      </ul>
    </>
  );
}

export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-0.5">{children}</div>;
}

interface IconButtonProps extends Omit<ComponentProps<typeof Button>, "children"> {
  label: string;
  icon: LucideIcon;
  tone?: "default" | "danger";
}

export function IconButton({ label, icon: Icon, tone = "default", className, ...props }: IconButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      className={cn(
        "h-9 w-9 shrink-0 rounded-full",
        tone === "danger" && "text-brand-berry hover:bg-brand-berry/10 hover:text-brand-berry",
        className,
      )}
      {...props}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

/* ---------- Filters ---------- */

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="rounded-full pl-9"
      />
    </div>
  );
}

interface FilterChipsProps<T extends string> {
  label: string;
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}

export function FilterChips<T extends string>({ label, options, value, onChange }: FilterChipsProps<T>) {
  return (
    <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors",
              active ? "bg-brand-cocoa text-brand-cream" : "bg-brand-oat/70 text-brand-cocoa hover:bg-brand-oat",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={cn("text-xs tabular-nums", active ? "text-brand-cream/70" : "text-brand-cocoa/55")}>
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Forms & dialogs ---------- */

/** Label + control. The control is nested in the label, so no ids are needed. */
export function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-medium text-brand-cocoa">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

const dialogShell = "max-h-[90dvh] w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl bg-white sm:rounded-2xl";
const dialogSizes = { sm: "max-w-md", lg: "max-w-3xl" };

interface FormDialogProps {
  title: string;
  description?: string;
  submitLabel: string;
  pending?: boolean;
  size?: keyof typeof dialogSizes;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
}

/** Modal form with a standard footer. Mount it only while it should be open. */
export function FormDialog({ title, description, submitLabel, pending, size = "sm", onSubmit, onClose, children }: FormDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(dialogShell, dialogSizes[size])} {...(description ? {} : { "aria-describedby": undefined })}>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Read-only modal. Mount it only while it should be open. */
export function ViewDialog({ title, size = "lg", onClose, children }: { title: string; size?: keyof typeof dialogSizes; onClose: () => void; children: ReactNode }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn(dialogShell, dialogSizes[size])} aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation for destructive actions. Mount it only while it should be open. */
export function ConfirmDialog({ title, description, confirmLabel = "Delete", pending, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-2xl bg-white sm:rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-xl">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            disabled={pending}
            onClick={(event) => {
              // Stay open until the caller closes it, so failures remain visible.
              event.preventDefault();
              onConfirm();
            }}
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
