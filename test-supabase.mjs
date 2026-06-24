import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = 'https://nrqciegewjemksdabwsf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fvZ5_r2zomWBELF3zzSeEA_MLEvOdxg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const newId = crypto.randomUUID();
  const { data, error } = await supabase.from('user_roles').insert({
    id: newId,
    email: `test-${newId}@local.test`,
    role: 'aspirante',
    data: { name: 'Test User', id: newId }
  });
  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('SUCCESS, inserted with ID:', newId);
    
    // Now test fetch
    const { data: fetched } = await supabase.from('user_roles').select('*').eq('id', newId);
    console.log('FETCHED:', fetched);
  }
}

test();
