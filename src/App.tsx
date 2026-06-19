import React, { useState, useEffect } from 'react';
import { Aspirante, Judge, Tribunal, Convocatoria } from './types';
import { INITIAL_ASPIRANTES, INITIAL_JUDGES, INITIAL_TRIBUNALS, INITIAL_CONVOCATORIAS } from './data';
import LoginPortal from './components/LoginPortal';
import AspirantPortal from './components/AspirantPortal';
import DeportistaPortal from './components/DeportistaPortal';
import AdminPortal from './components/AdminPortal';
import TribunalsPortal from './components/TribunalsPortal';
import ProfesorPortal from './components/ProfesorPortal';
import AcademyLanding from './components/AcademyLanding';
import JudgePortal from './components/JudgePortal';
import ArbitroPortal from './components/ArbitroPortal';
import { type LoginMode } from './components/LoginPortal';

type AppRole = 'landing' | 'login' | 'deportista' | 'aspirante' | 'admin' | 'tribunal' | 'profesor' | 'juez' | 'arbitro';

export default function App() {
  const [role, setRole] = useState<AppRole>('landing');
  const [loginMode, setLoginMode] = useState<LoginMode>('estudiante');
  const [activeUserId, setActiveUserId] = useState<string>('REQ-8492');
  const [activeClubName, setActiveClubName] = useState<string>('');
  const [showDemoBar, setShowDemoBar] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // ── Persistent state ──────────────────────────────────────────────────────
  const [aspirantes, setAspirantes] = useState<Aspirante[]>(() => {
    const saved = localStorage.getItem('fmk_aspirantes');
    return saved ? JSON.parse(saved) : INITIAL_ASPIRANTES;
  });

  const [tribunals, setTribunals] = useState<Tribunal[]>(() => {
    const saved = localStorage.getItem('fmk_tribunals');
    return saved ? JSON.parse(saved) : INITIAL_TRIBUNALS;
  });

  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>(() => {
    const saved = localStorage.getItem('fmk_convocatorias');
    return saved ? JSON.parse(saved) : INITIAL_CONVOCATORIAS;
  });

  const [judges, setJudges] = useState<Judge[]>(() => {
    const saved = localStorage.getItem('fmk_judges');
    return saved ? JSON.parse(saved) : INITIAL_JUDGES;
  });

  // ── Sync to localStorage ──────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem('fmk_aspirantes',   JSON.stringify(aspirantes));   }, [aspirantes]);
  useEffect(() => { localStorage.setItem('fmk_tribunals',    JSON.stringify(tribunals));    }, [tribunals]);
  useEffect(() => { localStorage.setItem('fmk_convocatorias',JSON.stringify(convocatorias));}, [convocatorias]);
  useEffect(() => { localStorage.setItem('fmk_judges',       JSON.stringify(judges));       }, [judges]);

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
  const handleLogin = (
    userRole: 'aspirante' | 'deportista' | 'admin' | 'tribunal' | 'profesor' | 'juez' | 'arbitro',
    userEmail?: string
  ) => {
    if (userRole === 'aspirante' || userRole === 'deportista') {
      const email = (userEmail || '').toLowerCase();
      const found = aspirantes.find(a => a.email.toLowerCase() === email);

      if (found) {
        setActiveUserId(found.id);
      } else {
        // Crear deportista nuevo si no existe
        const newId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
        const rawName = email.split('@')[0].replace(/[._]/g, ' ');
        const name = rawName.replace(/\b\w/g, c => c.toUpperCase());
        const newAspirante: Aspirante = {
          id: newId,
          name,
          email,
          club: 'Club Karate Madrid',
          currentBelt: 'Cinturón Blanco',
          requestedBelt: '1º Dan',
          status: 'Borrador',
          progressStep: 1,
          documentos: [],
          documents: {
            dni:   { name: '', uploaded: false },
            photo: { name: '', uploaded: false },
            license:{ name: '', uploaded: false },
          },
          paymentStatus: 'Unpaid',
        };
        setAspirantes(prev => [newAspirante, ...prev]);
        setActiveUserId(newId);
      }
      setRole(userRole);
    } else if (userRole === 'profesor') {
      setActiveClubName(userEmail && userEmail.trim().length > 0 ? userEmail : 'Club Karate Madrid');
      setRole('profesor');
    } else if (userRole === 'juez') {
      setActiveUserId(userEmail || 'j-1');
      setRole('juez');
    } else if (userRole === 'arbitro') {
      setActiveUserId(userEmail || 'Arb-Kumite-01');
      setRole('arbitro');
    } else {
      setRole(userRole);
    }
  };

  const handleRegister = (data: { name: string; email: string; club: string; birthDate: string }) => {
    const newId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const newAspirante: Aspirante = {
      id: newId,
      name: data.name,
      email: data.email.toLowerCase(),
      club: data.club,
      birthDate: data.birthDate,
      currentBelt: 'Cinturón Blanco',
      requestedBelt: 'Cinturón Amarillo',
      status: 'Borrador',
      progressStep: 1,
      documentos: [],
      documents: {
        dni:   { name: '', uploaded: false },
        photo: { name: '', uploaded: false },
        license:{ name: '', uploaded: false },
      },
      paymentStatus: 'Unpaid',
      licenciasConsecutivas: 0,
      licenciasAcumuladas: 0,
    };
    setAspirantes(prev => [newAspirante, ...prev]);
    setActiveUserId(newId);
    setRole('deportista');
  };

  const activeUser = aspirantes.find(a => a.id === activeUserId) || aspirantes[0];

  const handleUpdateAspirante = (updated: Aspirante) => {
    setAspirantes(prev => prev.map(a => a.id === updated.id ? updated : a));
  };

  // Cuando el deportista quiere solicitar examen → cambia a rol aspirante
  const handleIniciarSolicitud = () => {
    setRole('aspirante');
  };

  const isDev = import.meta.env.DEV;

  return (
    <div className="min-h-screen flex flex-col">

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
            onGoToPortal={() => { setLoginMode('federativo'); setRole('login'); }}
            onGoToStudentPortal={() => { setLoginMode('estudiante'); setRole('login'); }}
          />
        )}

        {role === 'login' && (
          <LoginPortal
            onLogin={handleLogin}
            onRegister={handleRegister}
            mode={loginMode}
            onBack={() => setRole('landing')}
          />
        )}

        {role === 'deportista' && activeUser && (
          <DeportistaPortal
            deportista={activeUser}
            onUpdateDeportista={handleUpdateAspirante}
            onLogout={() => setRole('login')}
            convocatorias={convocatorias}
            onIniciarSolicitud={handleIniciarSolicitud}
          />
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
            onLogout={() => setRole('login')}
            allTribunals={tribunals}
            onUpdateTribunals={setTribunals}
            judges={judges}
            onUpdateJudges={setJudges}
            convocatorias={convocatorias}
            onUpdateConvocatorias={setConvocatorias}
          />
        )}

        {role === 'tribunal' && (
          <TribunalsPortal
            judges={judges}
            tribunals={tribunals}
            aspirantes={aspirantes}
            convocatorias={convocatorias}
            onUpdateTribunals={setTribunals}
            onUpdateAspirantes={setAspirantes}
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
            onLogout={() => setRole('login')}
          />
        )}

        {role === 'arbitro' && activeUserId && (
          <ArbitroPortal
            activeArbitroId={activeUserId}
            tribunals={tribunals}
            aspirantes={aspirantes}
            onUpdateAspirantes={setAspirantes}
            onLogout={() => setRole('login')}
          />
        )}

        {role === 'profesor' && (
          <ProfesorPortal
            clubName={activeClubName}
            aspirantes={aspirantes}
            onUpdateAspirantes={setAspirantes}
            onLogout={() => setRole('login')}
          />
        )}
      </div>
    </div>
  );
}
