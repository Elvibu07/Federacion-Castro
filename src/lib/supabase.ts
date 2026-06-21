import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nrqciegewjemksdabwsf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fvZ5_r2zomWBELF3zzSeEA_MLEvOdxg';

// En desarrollo (localhost), usar proxy de Vite para evitar problemas de CORS/431.
// En producción (Netlify), conectar directamente a Supabase sin proxy.
const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

const supabaseUrl = isDev
  ? `${window.location.protocol}//${window.location.host}/supabase-proxy`
  : SUPABASE_URL;

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
