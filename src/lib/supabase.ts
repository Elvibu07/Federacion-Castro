import { createClient } from '@supabase/supabase-js';

// Usar trim() para limpiar cualquier espacio invisible o salto de línea fantasma de Vercel
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://nrqciegewjemksdabwsf.supabase.co').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ycWNpZWdld2plbWtzZGFid3NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MzM1MjksImV4cCI6MjA5NzQwOTUyOX0.JWZfHayOEWr1A5OU8ZF6GF7RGSnZg2m-mf99LWOgX0U').trim();

// 🕵️‍♂️ Trampa de depuración
console.log("🔍 [Supabase Init] URL existe:", !!supabaseUrl);
console.log("🔍 [Supabase Init] Llave existe:", !!supabaseAnonKey);
if (supabaseAnonKey) {
  console.log("🔍 [Supabase Init] Longitud de la llave (LIMPIA):", supabaseAnonKey.length);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
