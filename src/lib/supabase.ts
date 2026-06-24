import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://nrqciegewjemksdabwsf.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ycWNpZWdld2plbWtzZGFid3NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MzM1MjksImV4cCI6MjA5NzQwOTUyOX0.JWZfHayOEWr1A5OU8ZF6GF7RGSnZg2m-mf99LWOgX0U';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
