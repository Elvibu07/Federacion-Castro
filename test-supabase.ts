import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nrqciegewjemksdabwsf.supabase.co',
  'sb_publishable_fvZ5_r2zomWBELF3zzSeEA_MLEvOdxg'
);

async function test() {
  const { data, error } = await supabase.from('user_roles').select('*');
  console.log('Data:', data);
  console.log('Error:', error);
}

test();
