import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nrqciegewjemksdabwsf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fvZ5_r2zomWBELF3zzSeEA_MLEvOdxg';

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
