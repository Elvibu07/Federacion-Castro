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

  // Consultar la tabla user_roles en Supabase
  const { data, error } = await supabase
    .from('user_roles')
    .select('role, profile_id')
    .ilike('email', emailLower)
    .single();

  if (error) {
    console.error('[auth] Error fetching role for', emailLower, error);
  }

  if (!error && data) {
    console.log(`[auth] Rol encontrado para ${emailLower}:`, data.role);
    return {
      role: data.role as UserRoleType,
      profileId: data.profile_id || undefined
    };
  }

  // Si no está en user_roles, asignar rol por defecto
  console.warn(`[auth] No se encontró rol para ${emailLower}. Rol por defecto: deportista`);
  return { role: 'deportista' };
}
