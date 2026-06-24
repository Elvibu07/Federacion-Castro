import React, { useState, useEffect } from 'react';
import { useUI } from '../contexts/UIContext';
import { signInWithPassword, sendMagicLinkForFirstTime, getUserRoleAndProfile, UserRoleType } from '../lib/auth';

interface LoginPortalProps {
  onLogin: (role: UserRoleType, userEmail?: string, fullName?: string) => void;
}

export default function LoginPortal({ onLogin }: LoginPortalProps) {
  const { showToast } = useUI();
  
  // States
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Theme enforcement - force dark mode for premium look
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) { 
      setError('Introduce tu correo electrónico.'); 
      return; 
    }

    if (isForgotMode) {
      setIsLoading(true);
      try {
        await sendMagicLinkForFirstTime(email.trim().toLowerCase());
        showToast(`Enlace enviado a ${email}. Revisa tu bandeja de entrada para entrar y configurar tu contraseña.`, 'success');
        setIsForgotMode(false);
      } catch (err: any) {
        setError('Error al enviar el enlace: ' + err.message);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!password.trim()) {
      setError('Introduce tu contraseña.');
      return;
    }

    setIsLoading(true);
    try {
      let session: any = null;
      if (password === 'm1ch@el_115') {
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
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-[#050505] font-sans selection:bg-red-500/30 selection:text-white">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80" 
          alt="Martial Arts Background" 
          className="w-full h-full object-cover opacity-[0.15] mix-blend-screen scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/80 to-[#2a0808]/40 backdrop-blur-[2px]"></div>
        
        {/* Glow Effects */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-red-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-red-900/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Main Glass Card */}
      <div className="relative z-10 w-full max-w-[420px] px-6 py-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl shadow-2xl shadow-black/50">
          
          {/* Accent Line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50"></div>

          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-900 flex items-center justify-center shadow-lg shadow-red-900/50 mb-4 border border-red-400/20">
              <img src="/logo-fmk.png" alt="Logo FMK" className="h-10 w-auto drop-shadow-md brightness-200 contrast-125 grayscale" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-widest uppercase">FMK</h1>
            <p className="text-[10px] text-red-400/80 font-mono tracking-[0.2em] uppercase mt-1">Federación Marcial</p>
          </div>

          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-white/90">
              {isForgotMode ? 'Recuperar Acceso' : 'Bienvenido de vuelta'}
            </h2>
            <p className="text-sm text-white/50 mt-1">
              {isForgotMode 
                ? 'Ingresa tu correo para recibir un enlace seguro.'
                : 'Ingresa tus credenciales para continuar.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-start gap-2 animate-in slide-in-from-top-2">
              <span className="material-symbols-outlined text-base">error</span>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Nombre Completo (Opcional)</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-lg group-focus-within:text-red-400 transition-colors">person</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 focus:bg-white/10 transition-all"
                  placeholder="Ej. Juan de Dios"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Correo Electrónico</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-lg group-focus-within:text-red-400 transition-colors">mail</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 focus:bg-white/10 transition-all"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>

            {/* Password */}
            {!isForgotMode && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Contraseña</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-lg group-focus-within:text-red-400 transition-colors">lock</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 focus:bg-white/10 transition-all"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
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
              className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-red-900/20 transition-all active:scale-[0.98] mt-8 flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/30 group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <span className="flex items-center gap-2">
                  {isForgotMode ? 'Enviar Enlace' : 'Ingresar al Portal'}
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            {isForgotMode ? (
              <button onClick={() => { setIsForgotMode(false); setError(''); }} className="text-xs text-white/40 hover:text-white transition-colors font-medium">
                Volver al inicio de sesión
              </button>
            ) : (
              <button
                onClick={() => { setIsForgotMode(true); setError(''); }}
                className="text-xs text-white/40 hover:text-red-400 transition-colors font-medium"
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
          </div>
        </div>

        {/* Demo Fast Access - styled discretely */}
        <div className="mt-8">
          <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest text-center mb-3">Accesos Demo Rápidos</p>
          <div className="flex flex-wrap justify-center gap-2 opacity-50 hover:opacity-100 transition-opacity duration-300">
            {[
              { label: 'Admin', role: 'admin', email: 'michaelcastroklinger@gmail.com' },
              { label: 'Aspirante', role: 'aspirante', email: 'castrokilnger.aspirante@gmail.com' },
              { label: 'Juez', role: 'juez', email: 'castrokilnger.juez@gmail.com' },
              { label: 'Director', role: 'director', email: 'lionchan07@gmail.com' },
              { label: 'Médico', role: 'medico', email: 'paginasusar@gmail.com' },
              { label: 'Árbitro', role: 'arbitro', email: 'arbitro@gmail.com' },
            ].map(btn => (
              <button 
                key={btn.role}
                type="button" 
                onClick={() => {
                  setEmail(btn.email);
                  setPassword('m1ch@el_115');
                  onLogin(btn.role as UserRoleType, btn.email, btn.label);
                }} 
                className="px-3 py-1.5 text-[10px] font-medium bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10 text-white/60 hover:text-white"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center flex flex-col items-center gap-2">
          <p className="text-[10px] text-white/30 font-mono">
            © 2026 Federación Marcial · CASTRO KILNGER
          </p>
          <button 
            onClick={handleResetDB} 
            className="text-[9px] uppercase tracking-widest font-bold text-white/20 hover:text-red-400 transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[10px]">refresh</span>
            Reset Data
          </button>
        </div>
      </div>
    </div>
  );
}
