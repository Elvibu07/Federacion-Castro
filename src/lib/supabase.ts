import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 🕵️‍♂️ Trampa de depuración: Nos dirá en la consola web qué está recibiendo Vercel
console.log("🔍 [Supabase Init] URL existe:", !!supabaseUrl);
console.log("🔍 [Supabase Init] Llave existe:", !!supabaseAnonKey);
if (supabaseAnonKey) {
  console.log("🔍 [Supabase Init] Longitud de la llave:", supabaseAnonKey.length);
  console.log("🔍 [Supabase Init] ¿Tiene comillas por error?:", supabaseAnonKey.startsWith('"'));
}

// Si no hay llave, creamos un cliente "falso" para que no explote la app antes de ver los logs
export const supabase = createClient(
  supabaseUrl || 'https://dummy.supabase.co',
  supabaseAnonKey || 'dummy-key'
);
