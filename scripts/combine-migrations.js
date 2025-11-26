import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '..', 'sql', 'migrations');
const OUTPUT_FILE = path.join(__dirname, '..', 'all-migrations-combined.sql');

async function combineMigrations() {
  console.log('📦 Combining all migration files...\n');

  const files = await readdir(MIGRATIONS_DIR);
  let migrationFiles = files
    .filter((file) => file.endsWith('.sql'))
    .map((file) => path.join(MIGRATIONS_DIR, file));

  // Read all migrations to understand dependencies
  const migrations = [];
  for (const file of migrationFiles) {
    const sql = await readFile(file, 'utf8');
    const fileName = path.basename(file);
    const hasCreateFunction = /CREATE.*FUNCTION/i.test(sql);
    const hasCreateTable = /CREATE TABLE/i.test(sql);
    const hasCreateTrigger = /CREATE TRIGGER/i.test(sql);
    const hasAlterTable = /ALTER TABLE/i.test(sql);

    migrations.push({
      file,
      fileName,
      sql,
      hasCreateFunction,
      hasCreateTable,
      hasCreateTrigger,
      hasAlterTable,
      timestamp: fileName.split('_')[0], // Extract timestamp for sorting
    });
  }

  // Sort migrations by dependency order:
  // 1. CREATE FUNCTION (functions must exist before triggers use them)
  // 2. CREATE TABLE (tables must exist before ALTER TABLE)
  // 3. CREATE TRIGGER (triggers use functions and tables)
  // 4. ALTER TABLE (modifications come last)
  migrations.sort((a, b) => {
    // Functions come first
    if (a.hasCreateFunction && !b.hasCreateFunction) return -1;
    if (!a.hasCreateFunction && b.hasCreateFunction) return 1;

    // Then tables
    if (a.hasCreateTable && !b.hasCreateTable && !b.hasCreateFunction) return -1;
    if (!a.hasCreateTable && b.hasCreateTable && !a.hasCreateFunction) return 1;

    // Then triggers (after functions and tables)
    if (
      a.hasCreateTrigger &&
      !b.hasCreateTrigger &&
      !b.hasCreateFunction &&
      !b.hasCreateTable
    )
      return -1;
    if (
      !a.hasCreateTrigger &&
      b.hasCreateTrigger &&
      !a.hasCreateFunction &&
      !a.hasCreateTable
    )
      return 1;

    // Then ALTER TABLE
    if (
      a.hasAlterTable &&
      !b.hasAlterTable &&
      !b.hasCreateFunction &&
      !b.hasCreateTable &&
      !b.hasCreateTrigger
    )
      return 1;
    if (
      !a.hasAlterTable &&
      b.hasAlterTable &&
      !a.hasCreateFunction &&
      !a.hasCreateTable &&
      !a.hasCreateTrigger
    )
      return -1;

    // Within same category, sort by timestamp (filename)
    return a.fileName.localeCompare(b.fileName);
  });

  if (migrations.length === 0) {
    console.error('❌ No migration files found');
    process.exit(1);
  }

  console.log(`Found ${migrations.length} migration files\n`);

  let combinedSQL = `-- Combined Migration File
-- Generated: ${new Date().toISOString()}
-- Total migrations: ${migrations.length}
-- 
-- Instructions:
-- 1. Copy this entire file
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Paste and run
--

`;

  for (const migration of migrations) {
    combinedSQL += `-- ============================================================================\n`;
    combinedSQL += `-- Migration: ${migration.fileName}\n`;
    combinedSQL += `-- ============================================================================\n\n`;
    combinedSQL += migration.sql;
    combinedSQL += `\n\n`;

    console.log(`✅ Added: ${migration.fileName}`);
  }

  await writeFile(OUTPUT_FILE, combinedSQL, 'utf8');

  console.log(`\n✅ Combined ${migrationFiles.length} migrations into: ${OUTPUT_FILE}`);
  console.log('\n📋 Next steps:');
  console.log('   1. Open the file: all-migrations-combined.sql');
  console.log('   2. Copy all contents');
  console.log(
    '   3. Go to: https://supabase.com/dashboard/project/cyjxktkyxobjfutlurqf/editor'
  );
  console.log('   4. Paste and click "Run"');
}

combineMigrations().catch((error) => {
  console.error('❌ Failed to combine migrations:', error.message);
  process.exit(1);
});


