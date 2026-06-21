import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nrqciegewjemksdabwsf.supabase.co',
  'sb_publishable_fvZ5_r2zomWBELF3zzSeEA_MLEvOdxg'
);

async function test(email: string) {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role, profile_id')
    .ilike('email', email.trim().toLowerCase())
    .single();
  console.log(`Email: ${email} -> Data:`, data, 'Error:', error);
}

test('lionchan07@gmail.com');
test('elviaheredia53@gmail.com');
test('elvialeonsh@gmail.com');
