import React, { useState, useEffect } from 'react';
import { Aspirante, Judge, Tribunal, Convocatoria } from './types';
import * as api from './lib/api';
import { supabase } from './lib/supabase';
import { UIProvider } from './contexts/UIContext';
import { generateUUID } from './lib/uuid';
import LoginPortal from './components/LoginPortal';
import AspirantPortal from './components/AspirantPortal';
import DeportistaPortal from './components/DeportistaPortal';
import AdminPortal from './components/AdminPortal';
import TribunalsPortal from './components/TribunalsPortal';
import ProfesorPortal from './components/ProfesorPortal';
import AcademyLanding from './components/AcademyLanding';
import JudgePortal from './components/JudgePortal';
import ArbitroPortal from './components/ArbitroPortal';
import MedicoPortal from './components/MedicoPortal';


type AppRole = 'landing' | 'login' | 'deportista' | 'aspirante' | 'admin' | 'tribunal' | 'profesor' | 'juez' | 'arbitro' | 'medico';

export default function App() {
  const [role, setRole] = useState<AppRole>('landing');

  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [activeClubName, setActiveClubName] = useState<string>('Club Karate Madrid');
  const [showDemoBar, setShowDemoBar] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [aspirantes, setAspirantes] = useState<Aspirante[]>([]);
  const [tribunals, setTribunals] = useState<Tribunal[]>([]);
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);

  // ── Fetch from Supabase ───────────────────────────────────────────────────
  useEffect(() => {
    let didFinish = false;
    
    // Safety net: if loadData hangs for ANY reason, force-show the app after 8s
    const safetyTimer = setTimeout(() => {
      if (!didFinish) {
        console.warn('[App] ⏰ Safety timeout triggered — forcing app to render');
        setIsLoading(false);
      }
    }, 8000);

    async function loadData() {
      setIsLoading(true);
      try {
        // Load data — each function returns [] on error, so this won't throw
        const [aspData, judgeData] = await Promise.all([
          api.fetchAspirantes().catch(() => []),
          api.fetchJudges().catch(() => [])
        ]);
        
        // Cargar desde Supabase
        const dbConvocatorias = await api.fetchConvocatorias();
        const dbTribunals = await api.fetchTribunals();

        setAspirantes(aspData);
        setConvocatorias(dbConvocatorias);
        setTribunals(dbTribunals);
        setJudges(judgeData);
        console.log('[App] ✅ Data loaded:', { aspirantes: aspData.length, convocatorias: dbConvocatorias.length, tribunals: dbTribunals.length, judges: judgeData.length });

        // Check auth session — wrap in its own race with 5s timeout
        try {
          const { auth } = await import('./lib/firebase');
          const checkAuth = new Promise<any>((resolve) => {
            const unsubscribe = auth.onAuthStateChanged((user: any) => {
              unsubscribe();
              resolve(user);
            });
          });

          let user = await Promise.race([
            checkAuth,
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 5000))
          ]);

          const { checkAndApplyMagicLink } = await import('./lib/auth');
          const magicUser = await checkAndApplyMagicLink();
          if (magicUser) {
            user = magicUser;
          }
          
          if (user && user.email) {
            if (window.location.href.includes('type=recovery') || window.location.href.includes('apiKey=')) {
              setShowPasswordSetup(true);
              window.history.replaceState({}, document.title, window.location.pathname);
            }
            
            const { getUserRoleAndProfile } = await import('./lib/auth');
            let { role, profileId } = await getUserRoleAndProfile(user.email);
            
            if (role) {
              handleLogin(role, profileId || user.email, user.displayName || 'Usuario', aspData, judgeData);
            }
          }
        } catch (authErr) {
          console.warn('[App] ⚠️ Auth check skipped:', (authErr as Error).message);
        }
      } catch (err) {
        console.error('[App] Error loading initial data', err);
      } finally {
        didFinish = true;
        clearTimeout(safetyTimer);
        setIsLoading(false);
      }
    }
    loadData();

    return () => clearTimeout(safetyTimer);
  }, []);

  // ── Sincronizar Cambios Atómicos ──────────────────────────────────────────
  const updateAspiranteAtomic = async (id: string, updates: Partial<Aspirante>) => {
    // Actualización optimista local
    setAspirantes(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    // Persistencia en Supabase
    await api.updateAspirante(id, updates);
  };

  const updateConvocatoriaAtomic = async (id: string, updates: Partial<Convocatoria>) => {
    setConvocatorias(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      return next;
    });
    await api.updateConvocatoria(id, updates);
  };

  const updateTribunalAtomic = async (id: string, updates: Partial<Tribunal>) => {
    setTribunals(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      return next;
    });
    await api.updateTribunal(id, updates);
  };

  const addTribunalAtomic = async (newTribunal: Tribunal) => {
    setTribunals(prev => {
      const next = [...prev, newTribunal];
      return next;
    });
    await api.createTribunal(newTribunal);
  };

  const removeTribunalAtomic = async (id: string) => {
    setTribunals(prev => {
      const next = prev.filter(t => t.id !== id);
      return next;
    });
    await api.deleteTribunal(id);
  };

  const updateJudgeAtomic = async (id: string, updates: Partial<Judge>) => {
    setJudges(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
    await api.updateJudge(id, updates);
  };

  const addConvocatoriaAtomic = async (newConv: Convocatoria) => {
    // 1. Primero esperamos a que la API lo guarde en Supabase y nos devuelva el objeto con el UUID real
    const savedConv = await api.createConvocatoria(newConv);
    
    if (savedConv) {
      // 2. Si se guardó con éxito, lo agregamos a la pantalla de React usando el dato de la BD
      setConvocatorias(prev => [...prev, savedConv]);
      console.log('[addConvocatoriaAtomic] ✅ Guardado exitoso con ID real:', savedConv.id);
    } else {
      console.error('[addConvocatoriaAtomic] ❌ Error al guardar en base de datos.');
      alert('Error al guardar la convocatoria. Revisa la consola de desarrollo (F12).');
    }
  };

  const addAspiranteAtomic = async (newAspirante: Aspirante) => {
    setAspirantes(prev => [newAspirante, ...prev]);
    await api.createAspirante(newAspirante);
  };

  const addJudgeAtomic = async (newJudge: Judge) => {
    setJudges(prev => [...prev, newJudge]);
    await api.createJudge(newJudge);
  };

  // ── Dark Mode Effect ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // ── Login handler ─────────────────────────────────────────────────────────
  const handleLogin = async (userRole: string, profileIdOrEmail?: string, fullName?: string, latestAspirantes?: Aspirante[], latestJudges?: Judge[]) => {
    const identifier = profileIdOrEmail?.toLowerCase() || '';
    let currentAspirantes = latestAspirantes || aspirantes;
    let currentJudges = latestJudges || judges;

    if (currentAspirantes.length === 0) {
      currentAspirantes = await api.fetchAspirantes();
      setAspirantes(currentAspirantes);
    }
    if (currentJudges.length === 0) {
      currentJudges = await api.fetchJudges();
      setJudges(currentJudges);
    }

    if (userRole === 'deportista' || userRole === 'aspirante') {
      // Buscar perfil existente en el estado
      const foundAsp = currentAspirantes.find(a =>
        a.email.toLowerCase() === identifier || a.id.toLowerCase() === identifier
      );

      if (foundAsp) {
        setActiveUserId(foundAsp.id);
      } else {
        // Primera vez que inicia sesión — crear perfil automáticamente
        const newId = generateUUID();
        const newProfile: Aspirante = {
          id: newId,
          name: fullName || identifier.split('@')[0] || 'Deportista',
          email: identifier,
          club: '',
          estilo: 'Shotokan',
          currentBelt: 'Cinturón Blanco',
          requestedBelt: '1º Dan',
          status: 'Borrador',
          progressStep: 1,
          paymentStatus: 'Unpaid',
          licenciasAcumuladas: 0,
          licenciasConsecutivas: 0,
          documents: {
            dni: { name: '', uploaded: false },
            photo: { name: '', uploaded: false },
            license: { name: '', uploaded: false },
          },
          documentos: [],
        };
        // Guardar en localStorage y en el estado
        api.createAspirante(newProfile);
        setAspirantes(prev => [newProfile, ...prev]);
        setActiveUserId(newId);
      }
      setRole(userRole as AppRole);
    } else if (userRole === 'profesor') {
      setActiveClubName(profileIdOrEmail && profileIdOrEmail.trim().length > 0 ? profileIdOrEmail : 'Club Karate Madrid');
      setRole('profesor');
    } else if (userRole === 'juez' || userRole === 'arbitro' || userRole === 'director' || userRole === 'medico') {
      const foundJudge = currentJudges.find(j => j.email?.toLowerCase() === identifier || j.id.toLowerCase() === identifier || j.name.toLowerCase() === identifier);
      if (foundJudge) {
        setActiveUserId(foundJudge.id);
      } else {
        const newId = generateUUID();
        const newJudge: Judge = {
          id: newId,
          name: fullName || identifier.split('@')[0] || 'Juez',
          email: identifier,
          avatarUrl: '',
          rank: userRole === 'director' ? 'Director' : userRole === 'medico' ? 'Médico' : userRole === 'arbitro' ? 'Árbitro Nacional' : 'Juez Regional',
          active: true
        };
        api.createJudge(newJudge);
        setJudges(prev => [...prev, newJudge]);
        setActiveUserId(newId);
      }
      setRole(userRole === 'director' ? 'tribunal' : userRole as AppRole);
    } else {
      setRole(userRole as AppRole);

    }
  };



  const activeUser = aspirantes.find(a => a.id === activeUserId) || aspirantes[0];

  const handleUpdateAspirante = async (updated: Aspirante) => {
    setAspirantes(prev => prev.map(a => a.id === updated.id ? updated : a));
    await api.updateAspirante(updated.id, updated);
  };

  // Cuando el deportista quiere solicitar examen → cambia a rol aspirante
  const handleIniciarSolicitud = () => {
    setRole('aspirante');
  };

  const isDev = import.meta.env.DEV;

  const handleSavePassword = async () => {
    if (newPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setIsSavingPassword(true);
    try {
      const { updatePassword } = await import('./lib/auth');
      await updatePassword(newPassword);
      setShowPasswordSetup(false);
      alert('Contraseña configurada exitosamente. Ya puedes acceder.');
    } catch (err: any) {
      console.warn('Error al guardar contraseña en Supabase (puede ignorarse si usa modo local):', err);
      // Cerramos el modal de todas formas para no bloquear al usuario
      setShowPasswordSetup(false);
      alert('Contraseña guardada localmente (Error del servidor ignorado). Ya puedes acceder.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-[#0a0a0a] text-white' : 'bg-stone-50 text-stone-900'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#8b0000] border-t-transparent rounded-full animate-spin"></div>
          <p className="font-mono text-sm tracking-wider animate-pulse">Conectando con Supabase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">

      {showPasswordSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-surface-custom border border-outline-variant rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-primary-custom">lock_reset</span>
            </div>
            <h2 className="text-2xl font-black text-center mb-2">Configura tu Contraseña</h2>
            <p className="text-sm text-secondary-custom text-center mb-6">
              Has verificado tu correo correctamente. Ahora, crea una contraseña segura para tus futuros accesos.
            </p>
            <div className="relative mb-4">
              <input 
                type={showNewPassword ? "text" : "password"}
                placeholder="Nueva Contraseña"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full pl-4 pr-12 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary-custom"
              />
              <button 
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-custom hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-lg">
                  {showNewPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <button
              onClick={handleSavePassword}
              disabled={isSavingPassword}
              className="w-full bg-primary-custom text-white font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-50"
            >
              {isSavingPassword ? 'Guardando...' : 'Guardar y Continuar'}
            </button>
          </div>
        </div>
      )}

      {/* ── Barra debug (solo en desarrollo) ── */}
      {isDev && showDemoBar && (
        <div className="bg-[#1c1b1b] text-white p-2 flex flex-col sm:flex-row items-center justify-between text-xs font-mono border-b border-[#8b0000] z-50 gap-2 shadow-md relative">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8b0000] animate-pulse" />
            <span className="font-bold tracking-wider text-stone-200">🥋 DEMO FMK —</span>
            <span className="text-[11px] text-stone-400 hidden md:inline">Simula cada rol del sistema.</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {[
              { label: '🏠 WEB',         r: 'landing' as AppRole },
              { label: '🔑 LOGIN',       r: 'login' as AppRole },
              { label: '⚽ DEPORTISTA',  r: 'deportista' as AppRole, email: 'ana.silva@ejemplo.com' },
              { label: '🥋 ASPIRANTE',   r: 'aspirante'  as AppRole, email: 'alejandro.ruiz@ejemplo.com' },
              { label: '📊 ADMIN',       r: 'admin'      as AppRole },
              { label: '⚖️ TRIBUNAL',   r: 'tribunal'   as AppRole },
              { label: '🩺 MÉDICO',     r: 'medico'     as AppRole },
            ].map(({ label, r, email }) => (
              <button
                key={r}
                onClick={() => {
                  if (r === 'login') { setRole('login'); return; }
                  if (r === 'landing') { setRole('landing'); return; }
                  if (email) {
                    const found = aspirantes.find(a => a.email.toLowerCase() === email);
                    if (found) setActiveUserId(found.id);
                  }
                  setRole(r);
                }}
                className={`px-2.5 py-1.5 rounded font-mono font-bold text-[10px] cursor-pointer transition-all ${
                  role === r ? 'bg-[#8b0000] text-white shadow' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="ml-2 px-2.5 py-1.5 rounded font-mono font-bold text-[10px] cursor-pointer transition-all bg-stone-800 text-stone-300 hover:bg-stone-700 flex items-center gap-1"
              title="Toggle Dark Mode"
            >
              <span className="material-symbols-outlined text-[14px]">
                {isDarkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="ml-2 px-2.5 py-1.5 rounded font-mono font-bold text-[10px] cursor-pointer transition-all bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/40 flex items-center gap-1"
              title="Borrar caché y reiniciar datos"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span> Reset
            </button>
            <button
              onClick={() => setShowDemoBar(false)}
              className="ml-2 px-2.5 py-1.5 rounded font-mono font-bold text-[10px] cursor-pointer transition-all bg-[#8b0000]/20 text-red-300 hover:bg-[#8b0000]/40 flex items-center gap-1"
              title="Ocultar barra demo (Simular Producción)"
            >
              Ocultar
            </button>
          </div>
        </div>
      )}

      {isDev && !showDemoBar && (
        <button
          onClick={() => setShowDemoBar(true)}
          className="fixed bottom-4 left-4 z-50 w-8 h-8 bg-[#1c1b1b]/50 hover:bg-[#1c1b1b] text-white rounded-full flex items-center justify-center backdrop-blur shadow-lg transition-all"
          title="Mostrar barra demo"
        >
          <span className="material-symbols-outlined text-sm">construction</span>
        </button>
      )}

      {/* ── Módulos ── */}
      <div className="flex-1 flex flex-col">
        {role === 'landing' && (
          <AcademyLanding
            onGoToPortal={() => setRole('login')}
          />
        )}

        {role === 'login' && (
          <LoginPortal
            onLogin={handleLogin}
            onBack={() => setRole('landing')}
          />
        )}

        {role === 'deportista' && (
          activeUser ? (
            <DeportistaPortal
              deportista={activeUser}
              onUpdateDeportista={handleUpdateAspirante}
              onLogout={async () => { 
                const { signOut } = await import('./lib/auth');
                await signOut();
                setRole('login'); 
              }}
              convocatorias={convocatorias}
              onIniciarSolicitud={handleIniciarSolicitud}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
              <span className="material-symbols-outlined text-6xl text-stone-300 dark:text-stone-700 mb-4">account_circle_off</span>
              <h2 className="text-2xl font-black text-stone-800 dark:text-stone-100 mb-2">Perfil no encontrado</h2>
              <p className="text-stone-500 max-w-md mb-6">
                Tu cuenta ha sido autenticada, pero no encontramos un expediente de deportista asociado a este correo. Por favor, contacta a tu club o a la federación.
              </p>
              <button 
                onClick={async () => { 
                  const { signOut } = await import('./lib/auth');
                  await signOut();
                  setRole('login'); 
                }}
                className="px-6 py-2 bg-red-700 text-white rounded-lg font-bold shadow-md hover:bg-red-800 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          )
        )}

        {role === 'aspirante' && activeUser && (
          <AspirantPortal
            aspirante={activeUser}
            onUpdateAspirante={handleUpdateAspirante}
            onLogout={() => setRole('login')}
            availableJudges={judges}
            allTribunals={tribunals}
            convocatorias={convocatorias}
          />
        )}

        {role === 'admin' && (
          <AdminPortal
            aspirantes={aspirantes}
            onUpdateAspirantes={setAspirantes}
            onUpdateAspiranteAtomic={updateAspiranteAtomic}
            onAddAspiranteAtomic={addAspiranteAtomic}
            onLogout={() => setRole('login')}
            allTribunals={tribunals}
            onUpdateTribunals={setTribunals}
            judges={judges}
            onUpdateJudges={setJudges}
            onUpdateJudgeAtomic={updateJudgeAtomic}
            onAddJudgeAtomic={addJudgeAtomic}
            convocatorias={convocatorias}
            onUpdateConvocatorias={setConvocatorias}
            onUpdateConvocatoriaAtomic={updateConvocatoriaAtomic}
            onAddConvocatoriaAtomic={addConvocatoriaAtomic}
          />
        )}

        {role === 'tribunal' && (
          <TribunalsPortal
            judges={judges}
            activeJudgeId={activeUserId || undefined}
            tribunals={tribunals}
            aspirantes={aspirantes}
            onUpdateAspirantes={setAspirantes}
            onUpdateAspiranteAtomic={updateAspiranteAtomic}
            onUpdateTribunals={setTribunals}
            onUpdateTribunalAtomic={updateTribunalAtomic}
            onAddTribunalAtomic={addTribunalAtomic}
            onRemoveTribunalAtomic={removeTribunalAtomic}
            convocatorias={convocatorias}
            onUpdateJudges={setJudges}
            onLogout={() => setRole('login')}
          />
        )}

        {role === 'juez' && activeUserId && (
          <JudgePortal
            activeJudgeId={activeUserId}
            judges={judges}
            tribunals={tribunals}
            aspirantes={aspirantes}
            onUpdateAspirantes={setAspirantes}
            onUpdateAspiranteAtomic={updateAspiranteAtomic}
            onLogout={() => setRole('login')}
          />
        )}

        {role === 'arbitro' && activeUserId && (
          <ArbitroPortal
            activeArbitroId={activeUserId}
            tribunals={tribunals}
            aspirantes={aspirantes}
            onUpdateAspirantes={setAspirantes}
            onUpdateAspiranteAtomic={updateAspiranteAtomic}
            onLogout={() => setRole('login')}
          />
        )}

        {role === 'profesor' && (
          <ProfesorPortal
            clubName={activeClubName}
            aspirantes={aspirantes}
            onUpdateAspirantes={setAspirantes}
            onUpdateAspiranteAtomic={updateAspiranteAtomic}
            onLogout={() => setRole('login')}
          />
        )}

        {role === 'medico' && (
          <MedicoPortal
            aspirantes={aspirantes}
            convocatorias={convocatorias}
            onUpdateAspirante={updateAspiranteAtomic}
            onLogout={async () => {
              const { signOut } = await import('./lib/auth');
              await signOut();
              setRole('login');
            }}
          />
        )}
      </div>
    </div>
  );
}
