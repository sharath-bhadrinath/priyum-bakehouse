import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Use the same credentials as the front-end client, but pointed at the NEW database.
const SUPABASE_URL = 'https://cyjxktkyxobjfutlurqf.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'sb_publishable_bnPaSXk7_-HOqlev-x81GQ_yIHQB37O';

// Authentication credentials for accessing RLS-protected tables
const AUTH_EMAIL = process.env.BACKUP_AUTH_EMAIL;
const AUTH_PASSWORD = process.env.BACKUP_AUTH_PASSWORD;

if (!SUPABASE_ANON_KEY) {
  console.error(
    'Missing SUPABASE_ANON_KEY. Set it via env or ensure the hardcoded key is present.'
  );
  process.exit(1);
}

// Use a very high limit to fetch all records, or set to null for unlimited
const DEFAULT_LIMIT = process.env.BACKUP_RECORD_LIMIT
  ? Number(process.env.BACKUP_RECORD_LIMIT)
  : null; // null means fetch all records

if (DEFAULT_LIMIT !== null && (!Number.isFinite(DEFAULT_LIMIT) || DEFAULT_LIMIT <= 0)) {
  console.error(
    'BACKUP_RECORD_LIMIT must be a positive integer or empty for all records. Received:',
    process.env.BACKUP_RECORD_LIMIT
  );
  process.exit(1);
}

const OUTPUT_DIR =
  process.env.BACKUP_OUTPUT_DIR ?? path.join(process.cwd(), 'backups');

const TABLES = [
  { name: 'orders', orderBy: 'created_at' }, // Admin uses created_at
  { name: 'order_items', orderBy: 'created_at' },
  { name: 'products', orderBy: 'updated_at' },
  { name: 'invoice_settings', orderBy: 'updated_at' }, // Note: Admin filters by user_id, but we'll fetch all
  { name: 'profiles', orderBy: 'created_at' }, // Admin uses created_at
  { name: 'tags', orderBy: 'updated_at' },
  { name: 'product_tags', orderBy: 'created_at' },
  { name: 'categories', orderBy: 'updated_at' },
  { name: 'base_categories', orderBy: 'updated_at' },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Authenticate if credentials provided
async function authenticate() {
  if (AUTH_EMAIL && AUTH_PASSWORD) {
    console.log('🔐 Authenticating...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: AUTH_EMAIL,
      password: AUTH_PASSWORD,
    });

    if (error) {
      console.warn(`⚠️  Authentication failed: ${error.message}`);
      console.warn('   Continuing with anon key (may have limited access)');
      return false;
    }

    console.log(`✅ Authenticated as: ${data.user?.email}`);
    return true;
  }
  return false;
}

async function fetchLatestRecords(table) {
  // Try fetching without ordering first to see if there's data
  let query = supabase.from(table.name).select('*');

  // Apply ordering - match how Admin page fetches data
  if (table.orderBy) {
    const ascending = table.name === 'tags' ? true : false; // Tags are ordered ascending by name
    query = query.order(table.orderBy, { ascending });
  }

  // Only apply limit if specified
  if (DEFAULT_LIMIT !== null) {
    query = query.limit(DEFAULT_LIMIT);
  }

  const { data, error } = await query;

  if (error) {
    // If error, try without ordering as fallback
    console.warn(`   ⚠️  Error with ordering for ${table.name}: ${error.message}`);
    const { data: fallbackData, error: fallbackError } = await supabase
      .from(table.name)
      .select('*')
      .limit(DEFAULT_LIMIT || 1000);

    if (fallbackError) {
      throw new Error(`Failed to fetch ${table.name}: ${fallbackError.message}`);
    }

    return fallbackData ?? [];
  }

  return data ?? [];
}

async function main() {
  const limitText = DEFAULT_LIMIT === null ? 'all' : DEFAULT_LIMIT;
  console.log(`Backing up ${limitText} records per table from old database...\n`);

  // Authenticate if credentials provided
  const isAuthenticated = await authenticate();
  if (isAuthenticated) {
    console.log('');
  }

  const backupPayload = {
    generatedAt: new Date().toISOString(),
    limit: DEFAULT_LIMIT,
    sourceDatabase: SUPABASE_URL,
    authenticated: isAuthenticated,
    tables: {},
  };

  for (const table of TABLES) {
    console.log(`→ Fetching ${table.name}...`);
    try {
      backupPayload.tables[table.name] = await fetchLatestRecords(table);
      const count = backupPayload.tables[table.name].length;
      if (count > 0) {
        console.log(`   ✅ Fetched ${count} records`);
      } else {
        console.log(`   ℹ️  No records`);
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      backupPayload.tables[table.name] = [];
    }
  }

  const timestamp = new Date().toISOString().replace(/[:]/g, '-');
  const outputFile = path.join(OUTPUT_DIR, `latest-backup-${timestamp}.json`);

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(outputFile, JSON.stringify(backupPayload, null, 2), 'utf8');

  console.log(`✅ Backup saved to ${outputFile}`);
}

main().catch((error) => {
  console.error('Backup failed:', error.message);
  process.exit(1);
});


