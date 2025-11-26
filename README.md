# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/e7a54831-135a-4000-9bf1-c11dae054a52

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/e7a54831-135a-4000-9bf1-c11dae054a52) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/e7a54831-135a-4000-9bf1-c11dae054a52) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

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