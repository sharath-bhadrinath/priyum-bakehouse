import { createClient } from '@supabase/supabase-js';

// Use the NEW database for ad-hoc SQL migrations.
const SUPABASE_URL = 'https://cyjxktkyxobjfutlurqf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.log(
    'You can find this in your Supabase Dashboard > Settings > API > service_role key'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyMigration() {
  try {
    console.log(
      'Applying migration: Adding shipment_number column to orders table...'
    );

    const { error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipment_number TEXT;',
    });

    if (error) {
      console.error('Migration failed:', error);
      return;
    }

    console.log('✅ Migration applied successfully!');
    console.log('The shipment_number column has been added to the orders table.');
  } catch (error) {
    console.error('Error applying migration:', error);
  }
}

applyMigration();


