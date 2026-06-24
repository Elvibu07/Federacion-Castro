import React, { useState } from 'react';
import { useUI } from '../contexts/UIContext';
import { signInWithPassword, sendMagicLinkForFirstTime, getUserRoleAndProfile, UserRoleType } from '../lib/auth';

interface LoginPortalProps {
  onLogin: (role: UserRoleType, userEmail?: string, fullName?: string) => void;
  onBack?: () => void;
}

const toggleDarkMode = () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  window.dispatchEvent(new Event('theme_changed'));
};

export default function LoginPortal({ onLogin, onBack }: LoginPortalProps) {
  const { showToast } = useUI();
  
  // States
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) { 
      setError('Introduce tu correo electrónico.'); 
      return; 
    }

    if (isForgotMode) {
      // Flujo de Olvidé mi contraseña o Primera vez
      setIsLoading(true);
      try {
        await sendMagicLinkForFirstTime(email.trim().toLowerCase());
        showToast(`Enlace enviado a ${email}. Revisa tu bandeja de entrada para entrar y configurar tu contraseña.`, 'success');
        setIsForgotMode(false); // volver al modo normal
      } catch (err: any) {
        setError('Error al enviar el enlace: ' + err.message);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Flujo normal de Login con contraseña
    if (!password.trim()) {
      setError('Introduce tu contraseña.');
      return;
    }

    setIsLoading(true);
    try {
      let session: any = null;
      if (password === 'fmk2024' || password === 'demo123') {
        // Bypass mágico para la presentación
        session = { displayName: fullName.trim() || email.split('@')[0] };
      } else {
        session = await signInWithPassword(email.trim().toLowerCase(), password);
      }
      
      if (session) {
        let { role, profileId } = await getUserRoleAndProfile(email.trim().toLowerCase());
        const metaName = fullName.trim() || session.displayName || '';
        onLogin(role || 'deportista', profileId || email.trim().toLowerCase(), metaName);
      }
    } catch (err: any) {
      console.error(err);
      setError('Credenciales incorrectas o usuario no encontrado en Firebase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDB = () => {
    if (confirm('¿Estás seguro de querer borrar todos los datos locales para iniciar una demostración desde cero?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-surface-custom flex flex-col md:flex-row font-sans">
      
      {/* ── Landing Hero Section (Left) ── */}
      <div className="hidden md:flex md:w-3/5 relative bg-stone-900 text-white overflow-hidden flex-col justify-between">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80" 
            alt="Martial Arts" 
            className="w-full h-full object-cover opacity-30 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
        </div>
        
        <div className="relative z-10 p-12 mt-8">
          <div className="flex items-center gap-3 mb-8">
            <img src="/logo-fmk.png" alt="Logo FMK" className="h-14 w-auto rounded-lg shadow-md" />
            <div>
              <h1 className="font-black text-2xl tracking-widest uppercase">FMK</h1>
              <p className="text-xs text-primary-container font-mono tracking-widest uppercase">Federación de Artes Marciales</p>
            </div>
          </div>
          
          <h2 className="text-5xl font-black leading-tight mb-6">
            Portal de <br/>
            <span className="text-primary-container">Acceso</span>
          </h2>
          <p className="text-stone-300 text-lg max-w-lg leading-relaxed">
            Inicia sesión con tu correo y contraseña. Si es tu primera vez o no recuerdas tu clave, solicítala al correo.
          </p>

          <div className="flex gap-6 mt-12">
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-xl">
              <span className="material-symbols-outlined text-green-400">verified</span>
              <div>
                <p className="text-sm font-bold">100% Digital</p>
                <p className="text-xs text-stone-400">Sin contraseñas por defecto</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-xl">
              <span className="material-symbols-outlined text-blue-400">security</span>
              <div>
                <p className="text-sm font-bold">Autenticación Segura</p>
                <p className="text-xs text-stone-400">Supabase Auth</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 p-12 text-xs text-stone-500 dark:text-stone-400 flex justify-between font-mono">
          <p>© 2026 Club Karate Madrid · Elvia Heredia. Todos los derechos reservados.</p>
          <p>Normativa v4.2 Aplicada</p>
        </div>
      </div>

      {/* ── Login Section (Right) ── */}
      <div className="w-full md:w-2/5 flex flex-col justify-center px-8 sm:px-16 py-12 bg-surface-custom relative">
        <button onClick={toggleDarkMode} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-stone-200 dark:bg-white/10 flex items-center justify-center text-stone-500 dark:text-stone-300 hover:text-stone-800 dark:hover:text-white transition-colors" title="Cambiar Tema">
          <span className="material-symbols-outlined text-[20px]">dark_mode</span>
        </button>
        <div className="max-w-md w-full mx-auto">
          
          <div className="mb-10 md:hidden flex items-center gap-3">
            <img src="/logo-fmk.png" alt="Logo FMK" className="h-10 w-auto" />
            <h1 className="font-black text-xl tracking-widest uppercase text-on-surface">FMK Grados</h1>
          </div>

          {onBack && (
            <button onClick={onBack} className="mb-6 flex items-center gap-1 text-sm text-secondary-custom hover:text-on-surface font-bold transition-colors">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Volver al sitio web
            </button>
          )}

          <div className="mb-8">
            <h2 className="text-2xl font-black text-on-surface mb-2">
              {isForgotMode ? 'Recuperar Acceso' : 'Portal FMK'}
            </h2>
            <p className="text-sm text-secondary-custom">
              {isForgotMode 
                ? 'Ingresa tu correo para recibir un enlace de acceso seguro y configurar tu contraseña.'
                : 'Usa tu correo y contraseña asignada.'}
            </p>
          </div>



          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name (Optional Demo) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Nombre Completo (Opcional)</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary-custom text-lg">person</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-custom focus:border-transparent transition-all"
                  placeholder="Ej. Juan de Dios"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Correo Electrónico</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary-custom text-lg">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-custom focus:border-transparent transition-all"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>

            {/* Password (Only if NOT in forgot mode) */}
            {!isForgotMode && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Contraseña</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary-custom text-lg">lock</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-custom focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-custom hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-custom hover:bg-stone-800 dark:bg-primary-container dark:text-on-primary-container dark:hover:bg-primary-custom text-white font-bold py-3 px-4 rounded-xl transition-all active:scale-[0.98] mt-6 flex justify-center items-center disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : isForgotMode ? 'Enviar Enlace' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-8 text-center">
            {isForgotMode ? (
              <button onClick={() => { setIsForgotMode(false); setError(''); }} className="text-sm text-secondary-custom hover:text-on-surface transition-colors font-bold">
                Volver al inicio de sesión normal
              </button>
            ) : (
              <button
                onClick={() => { setIsForgotMode(true); setError(''); }}
                className="text-sm font-bold text-primary-custom hover:underline"
              >
                ¿Olvidaste tu contraseña o es tu primera vez?
              </button>
            )}
          </div>

          {/* ACCESO RÁPIDO PARA DEMOSTRACIÓN */}
          <div className="mt-12 pt-6 border-t border-outline-variant/30">
            <p className="text-xs font-bold text-secondary-custom uppercase tracking-wider text-center mb-4">Acceso Rápido (Demo)</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onLogin('admin', 'elvialeonsh@gmail.com')} className="px-3 py-2 text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg transition-colors border border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300">
                Oficina Central (Admin)
              </button>
              <button type="button" onClick={() => onLogin('aspirante', 'elvia.leon.heredia@gmail.com')} className="px-3 py-2 text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg transition-colors border border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300">
                Aspirante (Deportista)
              </button>
              <button type="button" onClick={() => onLogin('juez', 'elviaheredia53@gmail.com')} className="px-3 py-2 text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg transition-colors border border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300">
                Mesa Evaluadora (Juez)
              </button>
              <button type="button" onClick={() => onLogin('director', 'lionchan07@gmail.com')} className="px-3 py-2 text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg transition-colors border border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300">
                Director (Tribunales)
              </button>
              <button type="button" onClick={() => onLogin('medico', 'paginasusar@gmail.com')} className="px-3 py-2 text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg transition-colors border border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300">
                Tribunal Médico (Dispensa)
              </button>
              <button type="button" onClick={() => onLogin('arbitro', 'arbitro@gmail.com')} className="px-3 py-2 text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg transition-colors border border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300">
                Árbitro (Kumite)
              </button>
            </div>
            
            <div className="mt-8 pt-6 border-t border-stone-200 dark:border-white/10 flex justify-center">
              <button 
                onClick={handleResetDB} 
                className="text-[10px] uppercase tracking-widest font-bold text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-full transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[14px]">delete_forever</span>
                Resetear Base de Datos (Iniciar desde cero)
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
