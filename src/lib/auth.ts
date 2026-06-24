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

export async function sendMagicLinkForFirstTime(email: string, name?: string, role?: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: window.location.origin + '?type=recovery',
      data: {
        full_name: name,
        role: role
      }
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
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('Supabase sign out error (ignoring for local logout):', error.message);
    }
  } catch (err) {
    console.warn('Supabase sign out exception:', err);
  }
}

export async function getUserRoleAndProfile(email: string): Promise<{ role: UserRoleType; profileId?: string }> {
  const emailLower = email.toLowerCase().trim();

  try {
    // 1. Intentar consultar la tabla user_roles en Supabase (Staff)
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .ilike('email', emailLower)
      .single();

    if (!roleError && roleData && roleData.role) {
      console.log(`[auth] Rol encontrado en Supabase (user_roles) para ${emailLower}:`, roleData.role);
      return {
        role: roleData.role as UserRoleType
      };
    }

    // 2. Si no es staff, buscar en la tabla aspirantes
    const { data: aspData, error: aspError } = await supabase
      .from('aspirantes')
      .select('id')
      .ilike('email', emailLower)
      .single();

    if (!aspError && aspData) {
      console.log(`[auth] Estudiante encontrado en tabla aspirantes para ${emailLower}`);
      return {
        role: 'aspirante',
        profileId: aspData.id
      };
    }
  } catch (e) {
    console.error('[auth] Excepción al consultar Supabase:', e);
  }

  // 3. SISTEMA DE RESPALDO GARANTIZADO (FALLBACK HARDCODEADO)
  // Si Supabase falla por caché, bloqueadores de anuncios o red, esto garantiza el acceso.
  console.warn(`[auth] Usando sistema de respaldo local para ${emailLower}...`);
  
  if (emailLower === 'lionchan07@gmail.com') return { role: 'director' };
  if (emailLower === 'elvialeonsh@gmail.com') return { role: 'admin' };
  if (emailLower === 'elviaheredia53@gmail.com') return { role: 'juez' };
  if (emailLower === 'paginasusar@gmail.com') return { role: 'medico' };
  if (emailLower === 'arbitro@gmail.com') return { role: 'arbitro' };

  // 4. Si no está en Supabase ni en el respaldo, asumir nuevo estudiante
  console.warn(`[auth] No se encontró rol para ${emailLower}. Rol por defecto: aspirante`);
  return { role: 'aspirante' };
}
