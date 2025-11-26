import { createClient } from '@supabase/supabase-js';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// New Supabase project configuration
const NEW_SUPABASE_URL = 'https://cyjxktkyxobjfutlurqf.supabase.co';
const NEW_SUPABASE_KEY =
  process.env.NEW_SUPABASE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5anhrdGt5eG9iamZ1dGx1cnFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2MjQxOSwiZXhwIjoyMDc5NjM4NDE5fQ.WO7Tcb8Cqr-H6KE5uBhspjR8_1i9N4AN80qMnqO8hIs';

// Backup file path (use latest or specify via env)
// If BACKUP_FILE not specified, find the most recent backup file
async function getLatestBackupFile() {
  const backupsDir = path.join(__dirname, '..', 'backups');
  const files = await readdir(backupsDir);
  const backupFiles = files
    .filter((file) => file.startsWith('latest-backup-') && file.endsWith('.json'))
    .map((file) => ({
      name: file,
      path: path.join(backupsDir, file),
      time: file.match(/latest-backup-(.+)\.json/)?.[1] || '',
    }))
    .sort((a, b) => b.time.localeCompare(a.time)); // Sort by time, newest first

  return backupFiles.length > 0 ? backupFiles[0].path : null;
}

const BACKUP_FILE = process.env.BACKUP_FILE ?? null; // Will be set in main()

// Insert order based on foreign key dependencies
const INSERT_ORDER = [
  'base_categories', // No dependencies
  'categories', // May reference base_categories (nullable)
  'tags', // No dependencies
  'products', // References categories (nullable)
  'product_tags', // References products and tags
  'profiles', // References auth.users (may need special handling)
  'invoice_settings', // References auth.users (may need special handling)
  'orders', // References auth.users (may need special handling)
  'order_items', // References orders and products
];

const supabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_KEY);

async function restoreTable(tableName, records, backupFile) {
  if (!records || records.length === 0) {
    console.log(`⏭️  Skipping ${tableName} (no records)`);
    return { inserted: 0, errors: [] };
  }

  console.log(`📦 Restoring ${tableName} (${records.length} records)...`);

  // Pre-process records for specific tables
  let processedRecords = records;

  if (tableName === 'products') {
    // Ensure price field is set (use selling_price if price is missing)
    processedRecords = records.map((record) => {
      if (!record.price && record.selling_price) {
        record.price = record.selling_price;
      }
      return record;
    });

    // Get all categories from new database and create a mapping by name
    const { data: newCategories } = await supabase.from('categories').select('id, name');
    const categoryMapByName = new Map(
      (newCategories || []).map((c) => [c.name.toLowerCase(), c.id])
    );

    // Also get categories from backup to map old IDs to names
    const backupContent = await readFile(backupFile, 'utf8');
    const backup = JSON.parse(backupContent);
    const backupCategories = backup.tables.categories || [];
    const oldIdToName = new Map(
      backupCategories.map((c) => [c.id, c.name.toLowerCase()])
    );

    // Update product category_id references: if old ID doesn't exist, try to find by name
    const validProducts = [];
    const updatedProducts = [];
    const invalidProducts = [];

    for (const product of processedRecords) {
      if (!product.category_id) {
        validProducts.push(product);
        continue;
      }

      // Check if category_id exists in new database
      const { data: categoryExists } = await supabase
        .from('categories')
        .select('id')
        .eq('id', product.category_id)
        .single();

      if (categoryExists) {
        validProducts.push(product);
      } else {
        // Try to find category by name from backup
        const categoryName = oldIdToName.get(product.category_id);
        if (categoryName) {
          const newCategoryId = categoryMapByName.get(categoryName);
          if (newCategoryId) {
            product.category_id = newCategoryId;
            updatedProducts.push(product.name);
            validProducts.push(product);
          } else {
            invalidProducts.push({ name: product.name, categoryName });
          }
        } else {
          invalidProducts.push({ name: product.name, categoryId: product.category_id });
        }
      }
    }

    if (updatedProducts.length > 0) {
      console.log(
        `   🔄 Updated category_id for ${updatedProducts.length} products to match existing categories`
      );
    }

    if (invalidProducts.length > 0) {
      console.log(
        `   ⚠️  ${invalidProducts.length} products skipped - categories not found:`
      );
      invalidProducts.forEach((p) => {
        console.log(`      - "${p.name}" (category: ${p.categoryName || p.categoryId})`);
      });
    }

    processedRecords = validProducts;
  }

  if (tableName === 'product_tags') {
    // Get all valid product IDs and tag IDs
    const [productsResult, tagsResult] = await Promise.all([
      supabase.from('products').select('id'),
      supabase.from('tags').select('id'),
    ]);

    const validProductIds = new Set((productsResult.data || []).map((p) => p.id));
    const validTagIds = new Set((tagsResult.data || []).map((t) => t.id));

    // Filter product_tags to only those with valid product_id AND tag_id
    const validTags = [];
    const invalidTags = [];
    for (const tag of records) {
      if (validProductIds.has(tag.product_id) && validTagIds.has(tag.tag_id)) {
        validTags.push(tag);
      } else {
        invalidTags.push(tag);
      }
    }

    if (invalidTags.length > 0) {
      console.log(
        `   ⚠️  ${invalidTags.length} product_tags skipped due to invalid references`
      );
    }

    processedRecords = validTags;
  }

  if (tableName === 'order_items') {
    // Get all valid order IDs and product IDs
    const [ordersResult, productsResult] = await Promise.all([
      supabase.from('orders').select('id'),
      supabase.from('products').select('id'),
    ]);

    const validOrderIds = new Set((ordersResult.data || []).map((o) => o.id));
    const validProductIds = new Set((productsResult.data || []).map((p) => p.id));

    const validItems = [];
    const invalidItems = [];

    for (const item of records) {
      if (validOrderIds.has(item.order_id) && validProductIds.has(item.product_id)) {
        validItems.push(item);
      } else {
        invalidItems.push(item);
      }
    }

    if (invalidItems.length > 0) {
      console.log(
        `   ⚠️  ${invalidItems.length} order_items skipped due to invalid order/product references`
      );
    }

    processedRecords = validItems;
  }

  // For tables with unique constraints (categories, tags), use ignoreDuplicates
  const hasUniqueName = ['categories', 'tags', 'base_categories'].includes(tableName);
  const upsertOptions = hasUniqueName
    ? { onConflict: 'id', ignoreDuplicates: true }
    : { onConflict: 'id', ignoreDuplicates: false };

  // Use upsert to handle conflicts (insert or update on conflict)
  const { data, error } = await supabase
    .from(tableName)
    .upsert(processedRecords, upsertOptions);

  if (error) {
    console.error(`❌ Error restoring ${tableName}:`, error.message);

    // If it's a duplicate key error on name, try inserting one by one
    if (error.message.includes('duplicate key') && hasUniqueName) {
      console.log(`   Attempting individual inserts for ${tableName}...`);
      let successCount = 0;
      for (const record of processedRecords) {
        const { error: singleError } = await supabase
          .from(tableName)
          .upsert(record, { onConflict: 'id', ignoreDuplicates: true });
        if (!singleError) successCount++;
      }
      console.log(`   ✅ Inserted ${successCount}/${processedRecords.length} records`);
      return { inserted: successCount, errors: [] };
    }

    return { inserted: 0, errors: [error] };
  }

  console.log(`✅ Restored ${processedRecords.length} records to ${tableName}`);
  return { inserted: processedRecords.length, errors: [] };
}

async function main() {
  console.log('🚀 Starting backup restoration...\n');

  // Get backup file (use env var or find latest)
  const backupFile = BACKUP_FILE || (await getLatestBackupFile());
  if (!backupFile) {
    console.error(
      '❌ No backup file found. Please specify BACKUP_FILE or ensure backups/ directory has backup files.'
    );
    process.exit(1);
  }

  console.log(`📂 Reading backup from: ${backupFile}\n`);

  try {
    // Read backup file
    const backupContent = await readFile(backupFile, 'utf8');
    const backup = JSON.parse(backupContent);

    console.log(`📅 Backup generated at: ${backup.generatedAt}`);
    console.log(`📊 Backup limit: ${backup.limit}\n`);

    const stats = {
      totalInserted: 0,
      totalErrors: 0,
      skipped: [],
    };

    // Restore tables in dependency order
    for (const tableName of INSERT_ORDER) {
      const records = backup.tables[tableName] || [];

      // Special handling for auth-dependent tables
      if (['profiles', 'invoice_settings', 'orders'].includes(tableName)) {
        if (records.length > 0) {
          // With service role key, we can restore these tables
          // But we need to ensure users exist in auth.users first
          // Extract unique user_ids from records
          const userIds = [...new Set(records.map((r) => r.user_id).filter(Boolean))];

          if (userIds.length > 0) {
            console.log(
              `📋 ${tableName} contains ${records.length} records referencing ${userIds.length} user(s).`
            );
            console.log(
              `   Attempting to restore with service role key (bypasses RLS)...`
            );
            // Continue to restore - service role key should allow this
          } else {
            stats.skipped.push(tableName);
            continue;
          }
        }
      }

      const result = await restoreTable(tableName, records, backupFile);
      stats.totalInserted += result.inserted;
      stats.totalErrors += result.errors.length;

      // Small delay between tables to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Restoration Summary:');
    console.log(`✅ Total records inserted: ${stats.totalInserted}`);
    console.log(`❌ Total errors: ${stats.totalErrors}`);
    if (stats.skipped.length > 0) {
      console.log(`⏭️  Skipped tables: ${stats.skipped.join(', ')}`);
    }
    console.log('='.repeat(50));

    if (stats.totalErrors > 0) {
      console.log(
        '\n⚠️  Some errors occurred. You may need to use SUPABASE_SERVICE_ROLE_KEY for tables with RLS policies.'
      );
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Restoration failed:', error.message);
    if (error.code === 'ENOENT') {
      console.error(`   Backup file not found: ${BACKUP_FILE}`);
      console.error(
        '   Specify a different file with: BACKUP_FILE=path/to/backup.json node scripts/restore-backup.js'
      );
    }
    process.exit(1);
  }
}

main();


