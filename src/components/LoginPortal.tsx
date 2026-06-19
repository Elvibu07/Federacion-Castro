import React, { useState } from 'react';
import { useUI } from '../contexts/UIContext';
import { CLUBES_OFICIALES } from '../data';

type UserRole = 'aspirante' | 'deportista' | 'admin' | 'tribunal' | 'profesor' | 'juez' | 'arbitro';

export type LoginMode = 'estudiante' | 'federativo';

interface LoginPortalProps {
  onLogin: (role: UserRole, userEmail?: string) => void;
  onRegister: (data: { name: string; email: string; club: string; birthDate: string }) => void;
  mode?: LoginMode;
  onBack?: () => void;
  aspirantes?: any[];
  judges?: any[];
}

type Tab = 'deportista' | 'club' | 'federativo';

const toggleDarkMode = () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  window.dispatchEvent(new Event('theme_changed'));
};

export default function LoginPortal({ onLogin, onRegister, mode = 'estudiante', onBack, aspirantes = [], judges = [] }: LoginPortalProps) {
  const { showToast } = useUI();
  // En modo federativo arranca en tab 'club', en modo estudiante en 'deportista'
  const [activeTab, setActiveTab] = useState<Tab>(mode === 'federativo' ? 'club' : 'deportista');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [fedId, setFedId]     = useState('');
  const [error, setError]     = useState('');

  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [regName, setRegName] = useState('');
  const [regClub, setRegClub] = useState('');
  const [regBirth, setRegBirth] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegistering) {
      if (!regName.trim() || !email.trim() || !password.trim() || !regClub.trim() || !regBirth) {
        setError('Por favor completa todos los campos obligatorios.');
        return;
      }
      onRegister({
        name: regName.trim(),
        email: email.trim().toLowerCase(),
        club: regClub.trim(),
        birthDate: regBirth
      });
      return;
    }

    if (isForgot) {
      if (!email.trim()) { setError('Introduce tu correo electrónico.'); return; }
      showToast(`Se ha enviado un enlace de recuperación a ${email}. Revisa tu bandeja de entrada.`, 'success');
      setIsForgot(false);
      return;
    }

    if (activeTab === 'deportista') {
      if (!email.trim() || !password.trim()) { setError('Introduce tus credenciales.'); return; }
      
      const foundAsp = aspirantes.find(a => a.email.toLowerCase() === email.trim().toLowerCase());
      if (foundAsp && foundAsp.active === false) {
        setError('Tu cuenta ha sido inhabilitada. Contacta con la federación.');
        return;
      }

      // Mock logic: if email is from the mock aspirante, log as aspirante, else deportista
      if (email.toLowerCase().includes('alejandro')) {
        onLogin('aspirante', email.trim().toLowerCase());
      } else {
        onLogin('deportista', email.trim().toLowerCase());
      }
    } else if (activeTab === 'club') {
      if (!regClub.trim() || !password.trim()) { setError('Selecciona un club e introduce la contraseña.'); return; }
      onLogin('profesor', regClub);
    } else {
      // Federativo
      if (!fedId.trim() || !password.trim()) { setError('Introduce tu ID federativo y contraseña.'); return; }
      
      const foundJudge = judges.find(j => j.id.toLowerCase() === fedId.trim().toLowerCase());
      if (foundJudge && foundJudge.active === false) {
        setError('Tu cuenta ha sido inhabilitada. Contacta con la federación.');
        return;
      }

      if (fedId.toLowerCase().includes('trib') || fedId.toLowerCase().includes('director')) {
        onLogin('tribunal', fedId);
      } else if (fedId.toLowerCase().includes('juez')) {
        onLogin('juez', fedId);
      } else if (fedId.toLowerCase().includes('arb')) {
        onLogin('arbitro', fedId);
      } else {
        onLogin('admin');
      }
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
          
          {mode === 'estudiante' ? (
            <>
              <h2 className="text-5xl font-black leading-tight mb-6">
                Portal del <br/>
                <span className="text-primary-container">Estudiante</span>
              </h2>
              <p className="text-stone-300 text-lg max-w-lg leading-relaxed">
                Accede a tu área personal, consulta convocatorias, sigue tu progreso de grados y gestiona tu solicitud de examen.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-5xl font-black leading-tight mb-6">
                Portal <br/>
                <span className="text-primary-container">Federativo FMK</span>
              </h2>
              <p className="text-stone-300 text-lg max-w-lg leading-relaxed">
                Acceso exclusivo para personal autorizado: Técnicos de club, tribunales, administración y dirección del Departamento de Grados.
              </p>
            </>
          )}

          <div className="flex gap-6 mt-12">
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-xl">
              <span className="material-symbols-outlined text-green-400">verified</span>
              <div>
                <p className="text-sm font-bold">100% Digital</p>
                <p className="text-xs text-stone-400">Cero papeleo</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-xl">
              <span className="material-symbols-outlined text-blue-400">gavel</span>
              <div>
                <p className="text-sm font-bold">Actas Oficiales</p>
                <p className="text-xs text-stone-400">Firma electrónica</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 p-12 text-xs text-stone-500 dark:text-stone-400 flex justify-between font-mono">
          <p>© 2026 Departamento Nacional de Grados.</p>
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

          {/* Botón volver */}
          {onBack && (
            <button onClick={onBack} className="mb-6 flex items-center gap-1 text-sm text-secondary-custom hover:text-on-surface font-bold transition-colors">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Volver al sitio web
            </button>
          )}

          <div className="mb-8">
            <h2 className="text-2xl font-black text-on-surface mb-2">
              {isRegistering ? 'Crear Cuenta' : isForgot ? 'Recuperar Contraseña'
                : mode === 'estudiante' ? 'Acceso Estudiantes'
                : 'Portal Federativo'}
            </h2>
            <p className="text-sm text-secondary-custom">
              {isRegistering ? 'Únete a la plataforma para gestionar tus grados.'
                : isForgot ? 'Te enviaremos instrucciones para restaurar el acceso.'
                : mode === 'estudiante' ? 'Accede a tu panel personal de deportista o aspirante.'
                : 'Acceso exclusivo para personal autorizado de la FMK.'}
            </p>
          </div>

          {/* Role Tabs — solo se muestran según el modo */}
          {!isRegistering && !isForgot && (
            <div className="flex p-1 bg-surface-container-low dark:bg-white/5 rounded-lg mb-6 border border-outline-variant">
              {mode === 'estudiante' ? (
                <button className="flex-1 py-2 text-sm font-bold rounded-md bg-white dark:bg-[#151515] shadow-sm text-on-surface border border-outline-variant">
                  Deportista / Aspirante
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setActiveTab('club')}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'club' ? 'bg-white dark:bg-[#151515] shadow-sm text-on-surface border border-outline-variant' : 'text-secondary-custom hover:text-on-surface'}`}
                  >
                    Técnico / Club
                  </button>
                  <button
                    onClick={() => setActiveTab('federativo')}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'federativo' ? 'bg-white dark:bg-[#151515] shadow-sm text-on-surface border border-outline-variant' : 'text-secondary-custom hover:text-on-surface'}`}
                  >
                    Personal Federativo
                  </button>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {(activeTab === 'deportista' || isRegistering || isForgot) && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Correo Electrónico</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary-custom text-lg">mail</span>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-low dark:bg-white/5est border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>
            )}

            {!isRegistering && !isForgot && activeTab === 'club' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Selecciona tu Club</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary-custom text-lg">domain</span>
                  <select
                    value={regClub}
                    onChange={e => setRegClub(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-low dark:bg-white/5est border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:outline-none transition-all appearance-none text-on-surface"
                  >
                    <option value="" disabled>Selecciona un club...</option>
                    {CLUBES_OFICIALES.map(club => (
                      <option key={club} value={club}>{club}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {!isRegistering && !isForgot && activeTab === 'federativo' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wider">ID Federativo</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary-custom text-lg">badge</span>
                  <input
                    type="text"
                    value={fedId}
                    onChange={e => setFedId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-low dark:bg-white/5est border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
                    placeholder="Ej. FED-102943"
                  />
                </div>
              </div>
            )}

            {isRegistering && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Nombre Completo</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-container-low dark:bg-white/5est border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Club</label>
                    <select
                      value={regClub}
                      onChange={e => setRegClub(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-low dark:bg-white/5est border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:outline-none transition-all appearance-none text-on-surface"
                    >
                      <option value="" disabled>Selecciona...</option>
                      {CLUBES_OFICIALES.map(club => (
                        <option key={club} value={club}>{club}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Nacimiento</label>
                    <input
                      type="date"
                      value={regBirth}
                      onChange={e => setRegBirth(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-low dark:bg-white/5est border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {!isForgot && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">Contraseña</label>
                  {!isRegistering && (
                    <button type="button" onClick={() => { setIsForgot(true); setError(''); }} className="text-xs text-primary-container font-bold hover:underline">
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary-custom text-lg">lock</span>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-surface-container-low dark:bg-white/5est border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-primary-container text-on-primary-container font-black text-sm rounded-lg hover:brightness-110 transition-all shadow-md mt-6"
            >
              {isRegistering ? 'Crear Cuenta' : isForgot ? 'Enviar Enlace' : 'Acceder a la Plataforma'}
            </button>
          </form>

          {/* Toggle modes — solo en modo estudiante */}
          <div className="mt-8 pt-6 border-t border-outline-variant text-center space-y-4">
            {mode === 'estudiante' && !isRegistering && !isForgot && (
              <p className="text-sm text-secondary-custom">
                ¿No tienes cuenta?{' '}
                <button onClick={() => { setIsRegistering(true); setError(''); }} className="text-primary-container font-bold hover:underline">
                  Regístrate ahora
                </button>
              </p>
            )}
            {(isRegistering || isForgot) && (
              <button onClick={() => { setIsRegistering(false); setIsForgot(false); setError(''); }} className="text-sm text-secondary-custom font-bold hover:underline flex items-center justify-center gap-1 mx-auto">
                <span className="material-symbols-outlined text-sm">arrow_back</span> Volver al Login
              </button>
            )}
          </div>

          {/* Quick Demo Access — solo modo estudiante */}
          {mode === 'estudiante' && !isRegistering && !isForgot && (
             <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
               <p className="text-[10px] uppercase font-black text-amber-800 tracking-widest mb-3">🔑 Testing Rápido</p>
               <div className="flex flex-wrap gap-2">
                 <button onClick={() => onLogin('deportista', 'ana.silva@ejemplo.com')} className="text-xs bg-white dark:bg-[#151515] border border-amber-200 px-3 py-1.5 rounded shadow-sm font-bold text-amber-900 hover:bg-amber-100">Ana (Deportista)</button>
                 <button onClick={() => onLogin('aspirante', 'alejandro.ruiz@ejemplo.com')} className="text-xs bg-white dark:bg-[#151515] border border-amber-200 px-3 py-1.5 rounded shadow-sm font-bold text-amber-900 hover:bg-amber-100">Alejandro (Aspirante)</button>
               </div>
             </div>
          )}
          {mode === 'federativo' && !isRegistering && !isForgot && (
             <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
               <p className="text-[10px] uppercase font-black text-amber-800 tracking-widest mb-3">🔑 Testing Rápido</p>
               <div className="flex flex-wrap gap-2">
                 <button onClick={() => onLogin('admin')} className="text-xs bg-white dark:bg-[#151515] border border-amber-200 px-3 py-1.5 rounded shadow-sm font-bold text-amber-900 hover:bg-amber-100">Administración (Oficina)</button>
                 <button onClick={() => onLogin('juez', 'j-1')} className="text-xs bg-white dark:bg-[#151515] border border-amber-200 px-3 py-1.5 rounded shadow-sm font-bold text-amber-900 hover:bg-amber-100">Juez Evaluador (Mesa)</button>
                 <button onClick={() => onLogin('arbitro', 'Arb-Kumite-01')} className="text-xs bg-white dark:bg-[#151515] border border-amber-200 px-3 py-1.5 rounded shadow-sm font-bold text-amber-900 hover:bg-amber-100">Árbitro (Kumite)</button>
                 <button onClick={() => onLogin('tribunal')} className="text-xs bg-white dark:bg-[#151515] border border-amber-200 px-3 py-1.5 rounded shadow-sm font-bold text-amber-900 hover:bg-amber-100">Director (Tribunal)</button>
               </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
}
