import { signInWithEmailAndPassword, sendSignInLinkToEmail, updatePassword as firebaseUpdatePassword, signOut as firebaseSignOut, isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from './firebase';

export type UserRoleType = 'aspirante' | 'deportista' | 'admin' | 'tribunal' | 'director' | 'juez' | 'arbitro' | 'medico' | null;

export async function checkAndApplyMagicLink() {
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
      email = window.prompt('Por favor, confirma tu correo electrónico para acceder:');
    }
    if (email) {
      try {
        const result = await signInWithEmailLink(auth, email, window.location.href);
        window.localStorage.removeItem('emailForSignIn');
        return result.user;
      } catch (err) {
        console.error('Error signing in with email link:', err);
      }
    }
  }
  return null;
}

export async function signInWithPassword(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error('Error al iniciar sesión:', error.message);
    throw error;
  }
}

export async function sendMagicLinkForFirstTime(email: string, name?: string, role?: string) {
  const actionCodeSettings = {
    // URL you want to redirect back to. The domain (www.example.com) for this
    // URL must be in the authorized domains list in the Firebase Console.
    url: 'https://fmkcastrokilnger.vercel.app?type=recovery',
    handleCodeInApp: true,
  };

  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
  } catch (error: any) {
    console.error('Error enviando enlace mágico:', error.message);
    throw error;
  }
}

export async function updatePassword(newPassword: string) {
  if (auth.currentUser) {
    try {
      await firebaseUpdatePassword(auth.currentUser, newPassword);
      return true;
    } catch (error: any) {
      console.error('Error actualizando contraseña:', error.message);
      throw error;
    }
  }
  throw new Error('No hay usuario autenticado');
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.warn('Firebase sign out exception:', err);
  }
}

export async function getUserRoleAndProfile(email: string): Promise<{ role: UserRoleType; profileId?: string }> {
  const emailLower = email.toLowerCase().trim();

  try {
    // 0. Hardcode master admin
    if (emailLower === 'michaelcastroklinger@gmail.com' || emailLower === 'castrokilnger@gmail.com') {
      return { role: 'admin' };
    }

    // 1. Intentar consultar la coleccion user_roles en Firebase (Staff)
    const qRole = query(collection(db, "user_roles"), where("email", "==", emailLower));
    const roleSnapshot = await getDocs(qRole);

    if (!roleSnapshot.empty) {
      const roleData = roleSnapshot.docs[0].data();
      console.log(`[auth] Rol encontrado en Firebase (user_roles) para ${emailLower}:`, roleData.rol);
      return {
        role: roleData.rol as UserRoleType
      };
    }

    // 2. Si no es staff, buscar en la coleccion aspirantes
    const qAsp = query(collection(db, "aspirantes_demo"), where("email", "==", emailLower));
    const aspSnapshot = await getDocs(qAsp);

    if (!aspSnapshot.empty) {
      const aspData = aspSnapshot.docs[0];
      console.log(`[auth] Estudiante encontrado en tabla aspirantes para ${emailLower}`);
      return {
        role: 'deportista',
        profileId: aspData.id
      };
    }
  } catch (e) {
    console.error('[auth] Excepción al consultar Firebase:', e);
  }

  // 3. SISTEMA DE RESPALDO GARANTIZADO (FALLBACK HARDCODEADO)
  console.warn(`[auth] Usando sistema de respaldo local para ${emailLower}...`);
  
  if (emailLower.includes('director')) return { role: 'director' };
  if (emailLower.includes('admin')) return { role: 'admin' };
  if (emailLower.includes('juez')) return { role: 'juez' };
  if (emailLower.includes('medico')) return { role: 'medico' };
  if (emailLower.includes('arbitro')) return { role: 'arbitro' };

  if (emailLower === 'lionchan07@gmail.com') return { role: 'director' };
  if (emailLower === 'castrokilnger@gmail.com') return { role: 'admin' };
  if (emailLower === 'castrokilnger.juez@gmail.com') return { role: 'juez' };
  if (emailLower === 'paginasusar@gmail.com') return { role: 'medico' };
  if (emailLower === 'arbitro@gmail.com') return { role: 'arbitro' };

  // 4. Si no está en Firebase ni en el respaldo, asumir nuevo estudiante (Deportista por defecto)
  console.warn(`[auth] No se encontró rol para ${emailLower}. Rol por defecto: deportista`);
  return { role: 'deportista' };
}
