const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nrqciegewjemksdabwsf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fvZ5_r2zomWBELF3zzSeEA_MLEvOdxg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  console.log('Testing connection to Supabase...');
  const { data, error } = await supabase.from('convocatorias').insert({
    id: 'test-1',
    titulo: 'test',
    estado: 'test',
    fecha: 'test'
  });
  
  if (error) {
    console.error('SUPABASE ERROR OBJECT:', JSON.stringify(error, null, 2));
    console.error('ERROR MESSAGE:', error.message);
    console.error('ERROR CODE:', error.code);
    console.error('ERROR DETAILS:', error.details);
  } else {
    console.log('SUCCESS:', data);
  }
}

test();
