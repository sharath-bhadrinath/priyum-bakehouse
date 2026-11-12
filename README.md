# Priyum Cakes & Bakes

Storefront and staff tools for Priyum Cakes & Bakes. Vite + React + TypeScript + Tailwind + shadcn/ui, hosted on Vercel, data in Supabase.

```sh
npm i
npm run dev      # http://localhost:8080
npm run build    # production build into dist/
```

## Routes

| Route | Who | What |
| --- | --- | --- |
| `/` | Customers | Storefront: menu, cart, WhatsApp checkout, order tracking |
| `/dashboard` | Staff (signed in) | Create orders and invoices |
| `/admin` | Staff (signed in) | Products, orders, analytics, tags, categories |
| `/auth` | Staff | Sign in |

Staff routes are lazy-loaded and wrapped in `RequireAuth`, so the storefront bundle stays small.

## Project layout

```
src/
  config/site.ts            Business details, announcements, courier: edit copy here
  types/catalog.ts          Storefront domain types (Product, Variant, Category…)
  lib/catalog.ts            Pure functions: normalise DB rows, filter, sort, group
  lib/format.ts             Currency, size and date formatting
  features/
    catalog/                Supabase queries + React Query hook + URL-driven filters
    cart/                   Cart context (localStorage-backed) + WhatsApp order message
    orders/                 Order tracking
  components/storefront/    Storefront UI, one component per file
  components/ui/            shadcn/ui primitives
  pages/                    Route components (Landing is a thin composition)
```

Conventions:

- Components never call Supabase directly; they go through `features/*`.
- Menu state lives in the URL (`/?group=cakes&category=brownies&q=walnut&product=<id>`), so every view is shareable. `/?order=<id>` opens order tracking.
- Brand colours are Tailwind tokens (`brand-butter`, `brand-cocoa`, …) defined in `tailwind.config.ts`.
- `src/integrations/supabase/types.ts` should mirror the database. Regenerate it with `supabase gen types typescript` after a schema change.

## How do I back up the latest database records?

The repo includes a helper that fetches the most recent rows from the key Supabase tables and stores them as JSON files under `backups/` (gitignored by default).

```sh
# Optionally override the defaults (anon key already baked in via client.ts)
# $env:BACKUP_RECORD_LIMIT="200"           # rows per table (default 100)
# $env:BACKUP_OUTPUT_DIR="D:\safe-place"   # default: <repo>/backups

npm run backup:latest
```

By default the script reuses the same Supabase anon key that the front end uses (see `src/integrations/supabase/client.ts`). If you rotate credentials, set `SUPABASE_ANON_KEY` before running the script. The output files look like `latest-backup-2025-01-15T12-00-00.000Z.json` and include the latest rows from `orders`, `order_items`, `products`, `invoice_settings`, `profiles`, `tags`, `product_tags`, `categories`, and `base_categories`. You can safely share or store these files outside the repo for redundancy.

## How do I restore a backup to a new Supabase project?

Use `scripts/restore-backup.js` (via the npm script) to load backup data into a new Supabase project. **Important:** The target project must have the same database schema (run all migrations first).

```sh
# The script uses the new project credentials (hardcoded in scripts/restore-backup.js)
# Or override with environment variable:
# $env:NEW_SUPABASE_KEY="your-new-key"

# Restore from the latest backup (default)
npm run restore:backup

# Or specify a different backup file:
# $env:BACKUP_FILE="backups/latest-backup-2025-01-15T12-00-00.000Z.json"
# npm run restore:backup
```

The script restores tables in dependency order: `base_categories` → `categories` → `tags` → `products` → `product_tags`. Tables that reference `auth.users` (like `profiles`, `orders`, `invoice_settings`) are skipped unless users exist in the target project's Auth system.

**Note:** If you encounter RLS (Row Level Security) permission errors, you may need to use the `service_role` key instead of the `anon` key. Update `NEW_SUPABASE_KEY` in the script or set it as an environment variable.

## How do I create the database schema from migration files?

Use `scripts/apply-migrations.js` (via the npm script) to apply all database migrations to a new Supabase project. The script reads all `.sql` files from `supabase/migrations/` and applies them in chronological order.

**Prerequisites:**
- Get the **Direct connection** string from your Supabase project:
  - Go to: Supabase Dashboard > Settings > Database > Connection string
  - Select "Direct connection" (not "Connection pooling")
  - Copy the connection string (format: `postgresql://postgres.[ref]:[password]@...`)

```sh
# Set the database connection string
$env:DATABASE_URL="postgresql://postgres.cyjxktkyxobjfutlurqf:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"

# Apply all migrations
npm run migrate:apply
```

The script will:
1. Read all migration files from `supabase/migrations/` in order
2. Apply each migration using direct Postgres connection
3. Show a summary of successful and failed migrations

**Alternative:** If you don't have the database password, you can manually run the migrations in the Supabase Dashboard SQL Editor, or the script will attempt to create an `exec_sql` RPC function (requires DATABASE_URL for initial setup).