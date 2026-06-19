import React, { useState, useEffect } from 'react';
import { Aspirante, Judge, Tribunal, Convocatoria } from './types';
import * as api from './lib/api';
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

  const [isLoading, setIsLoading] = useState(true);
  const [aspirantes, setAspirantes] = useState<Aspirante[]>([]);
  const [tribunals, setTribunals] = useState<Tribunal[]>([]);
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);

  // ── Fetch from Supabase ───────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const [aspData, tribData, convData, judgeData] = await Promise.all([
        api.fetchAspirantes(),
        api.fetchTribunals(),
        api.fetchConvocatorias(),
        api.fetchJudges(),
      ]);
      setAspirantes(aspData);
      setTribunals(tribData);
      setConvocatorias(convData);
      setJudges(judgeData);
      setIsLoading(false);
    }
    loadData();
  }, []);

  // ── Sincronizar Cambios Atómicos ──────────────────────────────────────────
  const updateAspiranteAtomic = async (id: string, updates: Partial<Aspirante>) => {
    // Actualización optimista local
    setAspirantes(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    // Persistencia en Supabase
    await api.updateAspirante(id, updates);
  };

  const updateConvocatoriaAtomic = async (id: string, updates: Partial<Convocatoria>) => {
    setConvocatorias(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    await api.updateConvocatoria(id, updates);
  };

  const updateTribunalAtomic = async (id: string, updates: Partial<Tribunal>) => {
    setTribunals(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    await api.updateTribunal(id, updates);
  };

  const addTribunalAtomic = async (newTribunal: Tribunal) => {
    setTribunals(prev => [...prev, newTribunal]);
    await api.createTribunal(newTribunal);
  };

  const updateJudgeAtomic = async (id: string, updates: Partial<Judge>) => {
    setJudges(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
    await api.updateJudge(id, updates);
  };



  const addAspiranteAtomic = async (newAspirante: Aspirante) => {
    setAspirantes(prev => [newAspirante, ...prev]);
    await api.createAspirante(newAspirante);
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
        const newAspirante: Partial<Aspirante> = {
          id: newId,
          name,
          email,
          club: 'Club Karate Madrid',
          currentBelt: 'Cinturón Blanco',
          requestedBelt: '1º Dan',
          status: 'Borrador',
          progressStep: 1,
          paymentStatus: 'Unpaid',
        };
        // Optimistic UI
        setAspirantes(prev => [{ ...newAspirante, documentos: [], documents: { dni: { name: '', uploaded: false }, photo: { name: '', uploaded: false }, license: { name: '', uploaded: false } } } as Aspirante, ...prev]);
        setActiveUserId(newId);
        // Persist to Supabase
        api.createAspirante(newAspirante);
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

  const handleRegister = async (data: { name: string; email: string; club: string; birthDate: string }) => {
    const newId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const newAspirante: Partial<Aspirante> = {
      id: newId,
      name: data.name,
      email: data.email.toLowerCase(),
      club: data.club,
      birthDate: data.birthDate,
      currentBelt: 'Cinturón Blanco',
      requestedBelt: 'Cinturón Amarillo',
      status: 'Borrador',
      progressStep: 1,
      paymentStatus: 'Unpaid',
      licenciasConsecutivas: 0,
      licenciasAcumuladas: 0,
    };
    
    // Optimistic Update
    setAspirantes(prev => [{ ...newAspirante, documentos: [], documents: { dni: { name: '', uploaded: false }, photo: { name: '', uploaded: false }, license: { name: '', uploaded: false } } } as Aspirante, ...prev]);
    setActiveUserId(newId);
    setRole('deportista');

    // Supabase Create
    await api.createAspirante(newAspirante);
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
            onUpdateAspiranteAtomic={updateAspiranteAtomic}
            onAddAspiranteAtomic={addAspiranteAtomic}
            onLogout={() => setRole('login')}
            allTribunals={tribunals}
            onUpdateTribunals={setTribunals}
            judges={judges}
            onUpdateJudges={setJudges}
            onUpdateJudgeAtomic={updateJudgeAtomic}
            convocatorias={convocatorias}
            onUpdateConvocatorias={setConvocatorias}
            onUpdateConvocatoriaAtomic={updateConvocatoriaAtomic}
          />
        )}

        {role === 'tribunal' && (
          <TribunalsPortal
            judges={judges}
            tribunals={tribunals}
            aspirantes={aspirantes}
            onUpdateAspirantes={setAspirantes}
            onUpdateAspiranteAtomic={updateAspiranteAtomic}
            onUpdateTribunals={setTribunals}
            onUpdateTribunalAtomic={updateTribunalAtomic}
            onAddTribunalAtomic={addTribunalAtomic}
            convocatorias={convocatorias}
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
      </div>
    </div>
  );
}
