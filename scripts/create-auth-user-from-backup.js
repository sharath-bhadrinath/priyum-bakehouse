import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// New Supabase project configuration (same as restore-backup.js)
const NEW_SUPABASE_URL = 'https://cyjxktkyxobjfutlurqf.supabase.co';
const NEW_SUPABASE_KEY =
  process.env.NEW_SUPABASE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5anhrdGt5eG9iamZ1dGx1cnFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2MjQxOSwiZXhwIjoyMDc5NjM4NDE5fQ.WO7Tcb8Cqr-H6KE5uBhspjR8_1i9N4AN80qMnqO8hIs';

// Backup file path (use latest full backup)
const BACKUP_FILE =
  process.env.BACKUP_FILE ??
  path.join(__dirname, '..', 'backups', 'latest-backup-2025-11-26T06-07-03.772Z.json');

// Credentials for the admin user in the *new* project
const ADMIN_EMAIL = process.env.NEW_ADMIN_EMAIL ?? 'priyum.orders@gmail.com';
const ADMIN_PASSWORD = process.env.NEW_ADMIN_PASSWORD ?? 'Demo@123';

const supabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_KEY);

async function main() {
  console.log('🚀 Creating auth user in new Supabase project from backup profile...\n');

  const backupContent = await readFile(BACKUP_FILE, 'utf8');
  const backup = JSON.parse(backupContent);

  const profiles = backup.tables.profiles || [];
  if (profiles.length === 0) {
    console.error('❌ No profiles found in backup.');
    process.exit(1);
  }

  const profile = profiles[0];
  const userId = profile.user_id;
  const fullName = profile.full_name || 'Admin';
  const email = ADMIN_EMAIL;

  console.log('📋 Backup profile:');
  console.log(`   User ID: ${userId}`);
  console.log(`   Full Name: ${fullName}`);
  console.log(`   Email (backup): ${profile.email}`);
  console.log(`   Email (new):    ${email}`);

  // Check if user already exists
  const { data: existing, error: existingError } = await supabase.auth.admin.listUsers();
  if (existingError) {
    console.error('❌ Failed to list users:', existingError.message);
    process.exit(1);
  }

  const already = existing.users.find((u) => u.email === email);
  if (already) {
    console.log('ℹ️  User already exists in auth.users. Skipping creation.');
    console.log(`   auth.users.id: ${already.id}`);
    return;
  }

  console.log('\n🔐 Creating user via auth.admin.createUser...');

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      from_backup: true,
    },
    // Attempt to set the same user ID as in backup so FKs match
    // Note: this is supported when using the service role key
    id: userId,
  });

  if (error) {
    console.error('❌ Failed to create auth user:', error.message);
    process.exit(1);
  }

  console.log('✅ Created auth user:');
  console.log(`   id: ${data.user?.id}`);
  console.log(`   email: ${data.user?.email}`);
}

main().catch((error) => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});


