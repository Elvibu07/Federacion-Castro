import { supabase } from './supabase';

export type UserRoleType = 'aspirante' | 'deportista' | 'admin' | 'tribunal' | 'director' | 'juez' | 'arbitro' | 'medico' | null;

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('Error al iniciar sesión:', error.message);
    throw error;
  }
  return data.session;
}

export async function sendMagicLinkForFirstTime(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: window.location.origin + '?type=recovery'
    },
  });
  if (error) {
    console.error('Error enviando enlace mágico:', error.message);
    throw error;
  }
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    console.error('Error actualizando contraseña:', error.message);
    throw error;
  }
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error.message);
    throw error;
  }
}

export async function getUserRoleAndProfile(email: string): Promise<{ role: UserRoleType; profileId?: string }> {
  const emailLower = email.toLowerCase().trim();

  try {
    // 1. Intentar consultar la tabla user_roles en Supabase
    const { data, error } = await supabase
      .from('user_roles')
      .select('role, profile_id')
      .ilike('email', emailLower)
      .single();

    if (error) {
      console.error('[auth] Error fetching role from Supabase for', emailLower, error);
    }

    if (!error && data && data.role) {
      console.log(`[auth] Rol encontrado en Supabase para ${emailLower}:`, data.role);
      return {
        role: data.role as UserRoleType,
        profileId: data.profile_id || undefined
      };
    }
  } catch (e) {
    console.error('[auth] Excepción al consultar Supabase:', e);
  }

  // 2. SISTEMA DE RESPALDO GARANTIZADO (FALLBACK HARDCODEADO)
  // Si Supabase falla por caché, bloqueadores de anuncios o red, esto garantiza el acceso.
  console.warn(`[auth] Usando sistema de respaldo local para ${emailLower}...`);
  
  if (emailLower === 'lionchan07@gmail.com') return { role: 'director' };
  if (emailLower === 'elvialeonsh@gmail.com') return { role: 'admin' };
  if (emailLower === 'elviaheredia53@gmail.com') return { role: 'juez' };
  if (emailLower === 'paginasusar@gmail.com') return { role: 'medico' };
  if (emailLower === 'elvia.leon.heredia@gmail.com') return { role: 'aspirante' };

  // 3. Si no está en Supabase ni en el respaldo, asignar rol por defecto
  console.warn(`[auth] No se encontró rol para ${emailLower}. Rol por defecto: deportista`);
  return { role: 'deportista' };
}
