import React, { useState } from 'react';
import { Aspirante, Convocatoria } from '../types';
import { GRADOS_CONFIG } from '../data';
import { useUI } from '../contexts/UIContext';

interface DeportistaPortalProps {
  deportista: Aspirante;
  onUpdateDeportista: (updated: Aspirante) => void;
  onLogout: () => void;
  convocatorias: Convocatoria[];
  onIniciarSolicitud: () => void; // Redirige al portal de aspirante
}

type DeportistaTab = 'progreso' | 'perfil' | 'historial' | 'convocatorias' | 'requisitos' | 'estudio';

const toggleDarkMode = () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  window.dispatchEvent(new Event('theme_changed')); // to force re-render if needed
};

export default function DeportistaPortal({
  deportista,
  onUpdateDeportista,
  onLogout,
  convocatorias,
  onIniciarSolicitud,
}: DeportistaPortalProps) {
  const { showToast } = useUI();
  const [activeTab, setActiveTab] = useState<DeportistaTab>('progreso');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editData, setEditData] = useState({
    name: deportista.name,
    club: deportista.club,
    estilo: deportista.estilo || '',
    birthDate: deportista.birthDate || '',
    avatarUrl: deportista.avatarUrl || '',
    fechaUltimoGrado: deportista.fechaUltimoGrado || '',
    licenciasConsecutivas: deportista.licenciasConsecutivas || 0,
    licenciasAcumuladas: deportista.licenciasAcumuladas || 0
  });

  const handleSaveProfile = () => {
    onUpdateDeportista({
      ...deportista,
      name: editData.name,
      club: editData.club,
      estilo: editData.estilo as any,
      birthDate: editData.birthDate,
      avatarUrl: editData.avatarUrl,
      fechaUltimoGrado: editData.fechaUltimoGrado,
      licenciasConsecutivas: Number(editData.licenciasConsecutivas),
      licenciasAcumuladas: Number(editData.licenciasAcumuladas)
    });
    setIsEditingProfile(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setEditData({ ...editData, avatarUrl: url });
      // Si se actualiza directamente sin darle a guardar
      onUpdateDeportista({ ...deportista, avatarUrl: url });
    }
  };

  const convAbiertas = convocatorias.filter(c => c.estado === 'Abierta');

  // Calcular edad actual
  const edadActual = deportista.birthDate
    ? Math.floor((Date.now() - new Date(deportista.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  // Grado siguiente posible
  const gradoIndex = GRADOS_CONFIG.findIndex(g =>
    g.nombre.toLowerCase().includes((deportista.currentBelt || '').toLowerCase().replace('cinturón ', '').split(' ')[0])
  );
  const siguienteGrado = GRADOS_CONFIG[gradoIndex + 1] || GRADOS_CONFIG[0];

  // Calcular meses desde último grado
  const mesesDesdeGrado = deportista.fechaUltimoGrado
    ? Math.floor((Date.now() - new Date(deportista.fechaUltimoGrado).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    : null;

  const mesesDesdeUltimoExamen = deportista.fechaUltimoExamen
    ? Math.floor((Date.now() - new Date(deportista.fechaUltimoExamen).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    : null;
    
  const bloqueadoPorSuspenso = 
    (deportista.resultadoUltimoExamen === 'No Apto' || deportista.resultadoUltimoExamen === 'No Apto Parcial') && 
    mesesDesdeUltimoExamen !== null && 
    mesesDesdeUltimoExamen < 3;

  const tabs: { id: DeportistaTab; label: string; icon: string }[] = [
    { id: 'progreso',     label: 'Mi Progreso',     icon: 'donut_large' },
    { id: 'perfil',       label: 'Perfil',          icon: 'person' },
    { id: 'historial',    label: 'Mis Grados',      icon: 'military_tech' },
    { id: 'estudio',      label: 'Estudio',         icon: 'menu_book' },
    { id: 'convocatorias',label: 'Convocatorias',   icon: 'event_note' },
    { id: 'requisitos',   label: 'Requisitos',      icon: 'checklist' },
  ];

  return (
    <div className="bg-[#f8f9fa] dark:bg-[#0a0a0a] text-stone-800 dark:text-stone-100 font-sans min-h-screen flex flex-col">

      {/* ── Premium Top Navigation Bar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-black/60 backdrop-blur-xl border-b border-stone-200/50 dark:border-white/10 shadow-sm w-full">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-lg shadow-red-900/30">
              <span className="material-symbols-outlined text-white text-2xl">sports_martial_arts</span>
            </div>
            <div className="hidden sm:block">
              <h2 className="font-black text-stone-800 dark:text-stone-100 text-lg tracking-wide leading-tight truncate max-w-[150px]" title={deportista.name}>
                {deportista.name}
              </h2>
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Portal del Deportista</p>
            </div>
          </div>

          {/* Center Navigation Links (Tabs) */}
          <nav className="hidden lg:flex items-center gap-1 mx-4 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all font-bold text-sm ${
                  activeTab === tab.id
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                    : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${activeTab === tab.id ? 'text-red-500' : ''}`}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Right Actions (Actions, Theme, Profile) */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (bloqueadoPorSuspenso) showToast('No puedes inscribirte hasta transcurridos 3 meses desde el último suspenso (RF-53).', 'error');
                else onIniciarSolicitud();
              }}
              className={`hidden md:flex px-4 py-2 rounded-xl text-xs font-bold shadow-lg items-center gap-2 transition-all ${
                bloqueadoPorSuspenso ? 'bg-stone-400/50 text-stone-300 cursor-not-allowed border border-stone-500/20' : 'bg-red-600/80 hover:bg-red-600 text-white border border-red-500/50 shadow-red-900/20'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{bloqueadoPorSuspenso ? 'lock' : 'how_to_reg'}</span>
              Solicitar Examen
            </button>

            <button onClick={toggleDarkMode} className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-white/5 flex items-center justify-center text-stone-500 hover:text-stone-800 dark:text-stone-300 dark:hover:text-white transition-all">
              <span className="material-symbols-outlined text-[20px]">dark_mode</span>
            </button>

            <div className="w-px h-8 bg-stone-200 dark:bg-white/10 mx-1"></div>

            <div className="flex items-center gap-2 cursor-pointer group">
              <label className="relative cursor-pointer">
                {deportista.avatarUrl ? (
                  <img src={deportista.avatarUrl} alt="Avatar" className="w-10 h-10 rounded-xl object-cover border border-stone-200 shadow-sm" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-stone-200 dark:bg-white/10 flex items-center justify-center text-stone-600 dark:text-stone-300 font-bold text-sm border border-stone-300 dark:border-white/20">
                    <span className="material-symbols-outlined">person</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
            
            <button onClick={onLogout} className="text-red-500 hover:text-red-700 w-10 h-10 flex items-center justify-center bg-red-50 dark:bg-red-500/10 rounded-xl ml-2">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>

        {/* Mobile Tabs Scrollable row */}
        <div className="lg:hidden w-full overflow-x-auto no-scrollbar border-t border-stone-200 dark:border-white/10 bg-white/50 dark:bg-black/40 backdrop-blur-md">
          <div className="flex items-center px-4 py-2 gap-2 w-max">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id ? 'bg-red-500/10 text-red-600 border border-red-500/20' : 'text-stone-500'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main Content Area ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col relative z-10">

        {/* Content Wrapper */}
        <div className="flex-1 w-full mx-auto">

        {/* ════════════════════════════
            TAB: PROGRESO (Dashboard Gamificado)
           ════════════════════════════ */}
        {activeTab === 'progreso' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h1 className="font-black text-3xl text-stone-800 dark:text-stone-100 tracking-tight">Tu Progreso Deportivo</h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Sigue tu evolución y prepárate para tu próximo objetivo.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Tarjeta Principal de Siguiente Grado */}
              <div className="lg:col-span-2 bg-white dark:bg-[#151515] border border-stone-100 dark:border-white/10 rounded-3xl shadow-xl shadow-stone-200/40 dark:shadow-none p-8 relative overflow-hidden flex flex-col justify-center">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full blur-3xl -translate-y-12 translate-x-12 pointer-events-none" />
                
                <h3 className="font-bold text-[10px] text-stone-400 uppercase tracking-widest mb-2 relative z-10">Siguiente Objetivo</h3>
                <div className="flex items-center gap-6 relative z-10">
                  <div className="w-24 h-24 rounded-full border-[6px] border-stone-100 dark:border-white/10 flex items-center justify-center relative flex-shrink-0">
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                      <circle cx="42" cy="42" r="42" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-stone-100" />
                      <circle cx="42" cy="42" r="42" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-red-600" strokeDasharray="264" strokeDashoffset={264 - (264 * (Math.min(mesesDesdeGrado || 0, siguienteGrado?.permanenciaMinMeses || 1) / (siguienteGrado?.permanenciaMinMeses || 1)))} />
                    </svg>
                    <span className="material-symbols-outlined text-4xl text-red-600">military_tech</span>
                  </div>
                  <div>
                    <h2 className="font-black text-3xl text-stone-800 dark:text-stone-100">{siguienteGrado?.nombre || '—'}</h2>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                      Has completado <strong>{mesesDesdeGrado || 0} meses</strong> de los {siguienteGrado?.permanenciaMinMeses || 0} requeridos.
                    </p>
                    {mesesDesdeGrado !== null && siguienteGrado && mesesDesdeGrado >= siguienteGrado.permanenciaMinMeses ? (
                      <span className="inline-block mt-3 bg-green-100 text-green-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-green-200">
                        Tiempo Cumplido ✓
                      </span>
                    ) : (
                      <span className="inline-block mt-3 bg-amber-100 text-amber-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-amber-200">
                        En Proceso
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Estadísticas Rápidas */}
              <div className="flex flex-col gap-6">
                <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-3xl p-6 text-white shadow-xl shadow-stone-900/20 relative overflow-hidden">
                  <span className="material-symbols-outlined absolute right-4 bottom-4 text-6xl text-white/5 pointer-events-none">card_membership</span>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">Licencias Activas</p>
                  <p className="font-black text-4xl">{deportista.licenciasConsecutivas || 0}</p>
                  <p className="text-xs text-stone-400 mt-2">Requeridas: {siguienteGrado?.licenciasConsecutivas || 0}</p>
                </div>
                <div className="bg-white dark:bg-[#151515] border border-stone-100 dark:border-white/10 rounded-3xl p-6 shadow-xl shadow-stone-200/40 dark:shadow-none relative">
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">Años Entrenando</p>
                  <p className="font-black text-4xl text-red-700">{Math.floor((deportista.licenciasAcumuladas || 0) / 1) || 0}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">Licencias totales: {deportista.licenciasAcumuladas || 0}</p>
                </div>
              </div>

            </div>

            {/* Banner Motivacional */}
            <div className="bg-red-700 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-red-700/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white dark:bg-[#151515]/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-2xl">workspace_premium</span>
                </div>
                <div>
                  <h3 className="font-black text-xl">¿Sientes que estás listo?</h3>
                  <p className="text-red-100 text-sm mt-1">Revisa el temario, practica tus katas y aplica cuando se abra una convocatoria.</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('estudio')}
                className="bg-white dark:bg-[#151515] text-red-700 px-6 py-3 rounded-xl font-bold text-sm shadow-sm hover:-translate-y-0.5 transition-transform flex-shrink-0"
              >
                Ver Material de Estudio
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════
            TAB: ESTUDIO (Material Dummy)
           ════════════════════════════ */}
        {activeTab === 'estudio' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h1 className="font-black text-3xl text-stone-800 dark:text-stone-100 tracking-tight">Material de Estudio</h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Recursos oficiales para la preparación del examen de {siguienteGrado?.nombre || 'Grado'}.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Temario Teórico */}
              <div className="bg-white dark:bg-[#151515] border border-stone-100 dark:border-white/10 rounded-3xl shadow-xl shadow-stone-200/40 dark:shadow-none p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-red-50 text-red-700 rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined">menu_book</span>
                  </div>
                  <h3 className="font-black text-lg text-stone-800 dark:text-stone-100">Temario Teórico</h3>
                </div>
                <ul className="space-y-3">
                  {['Historia del Karate-Do', 'Filosofía y Budo', 'Reglamento de Arbitraje WKF', 'Anatomía Básica Aplicada'].map((tema, i) => (
                    <li key={i} className="flex items-center justify-between p-3 rounded-xl border border-stone-100 dark:border-white/10 hover:border-red-200 hover:bg-red-50/50 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-stone-300 group-hover:text-red-500 transition-colors">description</span>
                        <span className="font-bold text-sm text-stone-700 dark:text-stone-200 group-hover:text-stone-900">{tema}</span>
                      </div>
                      <span className="material-symbols-outlined text-stone-300 text-sm">download</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Katas */}
              <div className="bg-white dark:bg-[#151515] border border-stone-100 dark:border-white/10 rounded-3xl shadow-xl shadow-stone-200/40 dark:shadow-none p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-stone-800 text-white rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined">smart_display</span>
                  </div>
                  <h3 className="font-black text-lg text-stone-800 dark:text-stone-100">Katas Obligatorios</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {['Heian Shodan', 'Heian Nidan', 'Tekki Shodan', 'Bassai Dai'].map((kata, i) => (
                    <div key={i} className="relative aspect-video bg-stone-100 dark:bg-white/10 rounded-xl overflow-hidden group cursor-pointer border border-stone-200 dark:border-white/20">
                      <div className="absolute inset-0 bg-stone-800/20 group-hover:bg-black/40 transition-colors flex items-center justify-center z-10">
                        <span className="material-symbols-outlined text-white text-3xl opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all">play_circle</span>
                      </div>
                      <img src={`https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=300&h=168`} alt={kata} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent z-20">
                        <p className="text-white text-[10px] font-bold">{kata}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ════════════════════════════
            TAB: PERFIL
           ════════════════════════════ */}
        {activeTab === 'perfil' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-black text-2xl text-on-surface">Mi Perfil Federativo</h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Datos del deportista registrado en la FMK.</p>
            </div>

            {/* Tarjeta deportista */}
            <div className="bg-gradient-to-br from-[#1b191c] via-[#2d1215] to-[#4a1010] rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-white/10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-custom/20 rounded-full blur-3xl -translate-y-24 translate-x-12 mix-blend-screen pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-500/10 rounded-full blur-2xl translate-y-16 -translate-x-8 pointer-events-none" />
              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none mix-blend-overlay"></div>

              <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center md:items-start">
                
                {/* Avatar Grande */}
                <label className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white/20 flex-shrink-0 overflow-hidden cursor-pointer group relative shadow-2xl bg-black/40 backdrop-blur-md flex items-center justify-center">
                  {deportista.avatarUrl ? (
                    <img src={deportista.avatarUrl} alt={deportista.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <span className="material-symbols-outlined text-5xl text-white/50">account_circle</span>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-300">
                    <span className="material-symbols-outlined text-white text-2xl mb-1">photo_camera</span>
                    <span className="text-[9px] font-bold tracking-widest uppercase">Cambiar</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>

                <div className="flex-1 w-full text-center md:text-left flex flex-col h-full">
                  <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-[10px] font-mono tracking-widest text-red-200/70 uppercase">Federación Madrileña de Karate</p>
                      <h2 className="font-black text-3xl md:text-4xl mt-1 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-red-100 drop-shadow-md">{deportista.name}</h2>
                      <p className="text-red-100/80 text-sm mt-1.5 flex items-center justify-center md:justify-start gap-1.5">
                        <span className="material-symbols-outlined text-sm">home_pin</span>
                        {deportista.club}
                      </p>
                    </div>
                    <div className="text-center md:text-right bg-black/20 p-3 rounded-xl backdrop-blur-sm border border-white/5 shadow-inner">
                      <span className="font-mono text-sm text-white block font-bold tracking-wider">{deportista.id}</span>
                      <span className="font-mono text-[10px] text-red-200/60 uppercase mt-0.5 block">{deportista.estilo || 'Estilo no definido'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 md:gap-6 mt-auto pt-5 border-t border-white/10">
                    <div className="flex flex-col items-center md:items-start">
                      <p className="text-[9px] font-mono text-red-200/60 uppercase tracking-widest">Grado Actual</p>
                      <p className="font-black text-base md:text-lg mt-0.5 drop-shadow">{deportista.currentBelt}</p>
                    </div>
                    <div className="flex flex-col items-center md:items-start border-l border-white/10 pl-2 md:pl-6">
                      <p className="text-[9px] font-mono text-red-200/60 uppercase tracking-widest">Edad</p>
                      <p className="font-black text-base md:text-lg mt-0.5 drop-shadow">{edadActual !== null ? `${edadActual} años` : '—'}</p>
                    </div>
                    <div className="flex flex-col items-center md:items-start border-l border-white/10 pl-2 md:pl-6">
                      <p className="text-[9px] font-mono text-red-200/60 uppercase tracking-widest">Licencias</p>
                      <p className="font-black text-base md:text-lg mt-0.5 drop-shadow">{deportista.licenciasAcumuladas ?? '—'} <span className="text-xs font-normal opacity-70">acum.</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Datos personales */}
            <div className="bg-white dark:bg-[#151515] border border-stone-100 dark:border-white/10 rounded-3xl p-6 lg:p-8 shadow-xl shadow-stone-200/40 dark:shadow-none">
              <div className="flex justify-between items-center mb-6 border-b border-stone-100 dark:border-white/10 pb-4">
                <h3 className="font-black text-lg text-stone-800 dark:text-stone-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-700">badge</span>
                  Datos Personales y Federativos
                </h3>
                {!isEditingProfile ? (
                  <button onClick={() => {
                    setEditData({
                      name: deportista.name,
                      club: deportista.club,
                      estilo: deportista.estilo || '',
                      birthDate: deportista.birthDate || '',
                      avatarUrl: deportista.avatarUrl || '',
                      fechaUltimoGrado: deportista.fechaUltimoGrado || '',
                      licenciasConsecutivas: deportista.licenciasConsecutivas || 0,
                      licenciasAcumuladas: deportista.licenciasAcumuladas || 0
                    });
                    setIsEditingProfile(true);
                  }} className="text-xs font-bold text-red-700 hover:text-[#660000] flex items-center gap-1 bg-red-700/10 px-3 py-1.5 rounded-full transition-colors">
                    <span className="material-symbols-outlined text-sm">edit</span> Editar
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setIsEditingProfile(false)} className="text-xs font-bold text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:text-stone-200 px-3 py-1.5 rounded-full transition-colors">
                      Cancelar
                    </button>
                    <button onClick={handleSaveProfile} className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded-full transition-colors flex items-center gap-1 shadow-sm">
                      <span className="material-symbols-outlined text-sm">save</span> Guardar
                    </button>
                  </div>
                )}
              </div>

              {!isEditingProfile ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 text-sm">
                  {[
                    { label: 'Nombre completo', val: deportista.name, icon: 'person' },
                    { label: 'Correo electrónico', val: deportista.email, icon: 'mail' },
                    { label: 'Club / Dojo', val: deportista.club, icon: 'home_pin' },
                    { label: 'Estilo practicado', val: deportista.estilo || '—', icon: 'sports_martial_arts' },
                    { label: 'Fecha nacimiento', val: deportista.birthDate || '—', icon: 'calendar_today' },
                    { label: 'Último grado obtenido', val: deportista.fechaUltimoGrado || '—', icon: 'workspace_premium' },
                    { label: 'Licencias consecutivas', val: deportista.licenciasConsecutivas !== undefined ? String(deportista.licenciasConsecutivas) : '—', icon: 'history' },
                    { label: 'Licencias acumuladas', val: deportista.licenciasAcumuladas !== undefined ? String(deportista.licenciasAcumuladas) : '—', icon: 'functions' },
                  ].map(({ label, val, icon }) => (
                    <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-surface-container-low dark:bg-white/5/50 border border-outline-variant/30 hover:border-red-700/30 transition-colors">
                      <span className="material-symbols-outlined text-stone-500 dark:text-stone-400/70 text-lg mt-0.5">{icon}</span>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-[9px] text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold">{label}</span>
                        <span className="font-semibold text-on-surface">{val}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400">Nombre Completo</label>
                    <input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="px-3 py-2 border rounded-lg focus:border-red-700 focus:ring-1 focus:ring-primary-container outline-none text-sm bg-stone-50 dark:bg-white/5" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400">Club / Dojo</label>
                    <input type="text" value={editData.club} onChange={e => setEditData({...editData, club: e.target.value})} className="px-3 py-2 border rounded-lg focus:border-red-700 focus:ring-1 focus:ring-primary-container outline-none text-sm bg-stone-50 dark:bg-white/5" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400">Estilo Practicado</label>
                    <select value={editData.estilo} onChange={e => setEditData({...editData, estilo: e.target.value})} className="px-3 py-2 border rounded-lg focus:border-red-700 focus:ring-1 focus:ring-primary-container outline-none text-sm bg-stone-50 dark:bg-white/5">
                      <option value="">Seleccionar estilo...</option>
                      {['Gensei Ryu', 'Goju Ryu', 'Kyokushin Kai', 'Renbu Kai', 'Shito Ryu', 'Shoto Kai', 'Shotokan', 'Uechi Ryu', 'Wado Ryu'].map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400">Fecha de Nacimiento</label>
                    <input type="date" value={editData.birthDate} onChange={e => setEditData({...editData, birthDate: e.target.value})} className="px-3 py-2 border rounded-lg focus:border-red-700 focus:ring-1 focus:ring-primary-container outline-none text-sm bg-stone-50 dark:bg-white/5" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400">Fecha Último Grado (Simulación)</label>
                    <input type="date" value={editData.fechaUltimoGrado} onChange={e => setEditData({...editData, fechaUltimoGrado: e.target.value})} className="px-3 py-2 border border-stone-200 dark:border-white/20 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm bg-stone-50/50" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400">Licencias Consecutivas (Simulación)</label>
                    <input type="number" min="0" value={editData.licenciasConsecutivas} onChange={e => setEditData({...editData, licenciasConsecutivas: parseInt(e.target.value) || 0})} className="px-3 py-2 border border-stone-200 dark:border-white/20 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm bg-stone-50/50" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400">Licencias Acumuladas (Simulación)</label>
                    <input type="number" min="0" value={editData.licenciasAcumuladas} onChange={e => setEditData({...editData, licenciasAcumuladas: parseInt(e.target.value) || 0})} className="px-3 py-2 border border-stone-200 dark:border-white/20 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm bg-stone-50/50" />
                  </div>
                  <div className="col-span-1 md:col-span-2 mt-2 p-3 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/20 rounded-lg text-xs text-stone-700 dark:text-stone-200 flex gap-2">
                    <span className="material-symbols-outlined text-base">info</span>
                    <p>He habilitado temporalmente la edición de Fecha de último grado y Licencias para que puedas probar cómo cambian los requisitos. En el sistema real, estos campos los actualiza la Federación automáticamente.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Méritos */}
            {deportista.meritos && deportista.meritos.length > 0 && (
              <div className="bg-white dark:bg-[#151515] border border-stone-100 dark:border-white/10 rounded-3xl shadow-xl shadow-stone-200/40 dark:shadow-none p-6 lg:p-8">
                <h3 className="font-bold text-sm text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 filled">emoji_events</span>
                  Méritos Deportivos
                </h3>
                <div className="space-y-2">
                  {deportista.meritos.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <span className="material-symbols-outlined text-amber-600 filled text-xl">military_tech</span>
                      <div>
                        <p className="font-bold text-sm">{m.tipo.replace('Campeon', 'Campeón ')} — {m.año}</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">{m.categoria}</p>
                      </div>
                      <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        m.tipo === 'CampeonMundo' || m.tipo === 'CampeonEuropa'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {m.tipo === 'CampeonMundo' || m.tipo === 'CampeonEuropa' ? 'EXENCIÓN CUOTA' : '50% DESCUENTO'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════
            TAB: HISTORIAL DE GRADOS
           ════════════════════════════ */}
        {activeTab === 'historial' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-black text-2xl text-on-surface">Historial de Grados</h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Expediente histórico federativo de exámenes y grados.</p>
            </div>

            {/* Timeline */}
            <div className="bg-white dark:bg-[#151515] border border-stone-100 dark:border-white/10 rounded-3xl shadow-xl shadow-stone-200/40 dark:shadow-none p-6 lg:p-8">
              <div className="space-y-0">
                {[
                  { grado: deportista.currentBelt, fecha: deportista.fechaUltimoGrado || '2025', club: deportista.club, estado: 'Grado Actual', current: true },
                  { grado: 'Cinturón Azul / Verde', fecha: '2023', club: deportista.club, estado: 'APTO', current: false },
                  { grado: 'Cinturón Amarillo', fecha: '2021', club: deportista.club, estado: 'APTO', current: false },
                  { grado: 'Cinturón Blanco', fecha: '2020', club: deportista.club, estado: 'Inicio', current: false },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 relative pb-6 last:pb-0">
                    {/* Timeline line */}
                    {idx < 3 && (
                      <div className="absolute left-[15px] top-7 bottom-0 w-0.5 bg-outline-variant/40" />
                    )}
                    {/* Dot */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 ${
                      item.current
                        ? 'bg-red-700 border-red-700 text-white'
                        : 'bg-white dark:bg-[#151515] border-outline-variant text-stone-500 dark:text-stone-400'
                    }`}>
                      <span className="material-symbols-outlined text-sm filled">
                        {item.current ? 'star' : 'check'}
                      </span>
                    </div>
                    {/* Content */}
                    <div className="flex-1 bg-surface-container-low dark:bg-white/5 border border-outline-variant/30 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className={`font-bold text-sm ${item.current ? 'text-red-700' : 'text-on-surface'}`}>{item.grado}</p>
                          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{item.club} · {item.fecha}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono border ${
                          item.current ? 'bg-red-700/10 text-red-700 border-red-700/30' :
                          item.estado === 'APTO' ? 'bg-green-50 text-green-700 border-green-200' :
                          'bg-stone-50 dark:bg-white/5 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-white/20'
                        }`}>{item.estado}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Próximo grado */}
            <div className="bg-white dark:bg-[#151515] border border-stone-100 dark:border-white/10 rounded-3xl shadow-xl shadow-stone-200/40 dark:shadow-none p-6 lg:p-8 mt-6">
              <h3 className="font-black text-lg text-stone-800 dark:text-stone-100 mb-4">
                Siguiente Grado Posible
              </h3>
              <div className="flex items-center gap-4 p-4 bg-surface-container-low dark:bg-white/5 rounded-lg">
                <span className="material-symbols-outlined text-red-700 text-3xl filled">military_tech</span>
                <div>
                  <p className="font-black text-lg text-red-700">{deportista.requestedBelt || siguienteGrado?.nombre || '—'}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    Permanencia requerida: <strong>{siguienteGrado?.permanenciaMinMeses ?? '—'} meses</strong>
                    {mesesDesdeGrado !== null && ` · Acumulados: ${mesesDesdeGrado} meses`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (bloqueadoPorSuspenso) showToast('No puedes inscribirte hasta transcurridos 3 meses desde el último suspenso (RF-53).', 'error');
                    else onIniciarSolicitud();
                  }}
                  className={`ml-auto px-4 py-2 rounded-lg font-bold text-sm transition shadow-sm flex-shrink-0 ${
                    bloqueadoPorSuspenso ? 'bg-stone-300 text-stone-500 dark:text-stone-400 cursor-not-allowed' : 'bg-red-700 text-white hover:bg-[#660000]'
                  }`}
                >
                  {bloqueadoPorSuspenso ? 'Bloqueado (RF-53)' : 'Solicitar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════
            TAB: CONVOCATORIAS
           ════════════════════════════ */}
        {activeTab === 'convocatorias' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-black text-2xl text-on-surface">Convocatorias Abiertas</h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Exámenes oficiales publicados por la Federación.</p>
            </div>

            {convAbiertas.length === 0 ? (
              <div className="text-center py-16 text-stone-500 dark:text-stone-400 bg-white dark:bg-[#151515] border border-stone-100 dark:border-white/10 rounded-3xl shadow-xl shadow-stone-200/40 dark:shadow-none">
                <span className="material-symbols-outlined text-6xl mb-3 block opacity-30">event_busy</span>
                <p className="font-mono text-sm">No hay convocatorias abiertas en este momento.</p>
              </div>
            ) : (
              convAbiertas.map(conv => {
                const diasRestantes = Math.ceil((new Date(conv.plazoOrdinario).getTime() - Date.now()) / 86400000);
                const gradoAplica = (conv.gradesAdmitidos || []).some(g =>
                  (deportista.requestedBelt || '').toLowerCase().includes((g || '').toLowerCase())
                );
                return (
                  <div key={conv.id} className={`bg-white dark:bg-[#151515] border border-stone-100 dark:border-white/10 rounded-3xl shadow-xl shadow-stone-200/40 dark:shadow-none p-6 lg:p-8 transition-all ${gradoAplica ? 'ring-2 ring-red-700/20' : ''}`}>
                    <div className="flex justify-between items-start gap-3 flex-wrap mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded-full font-mono">ABIERTA</span>
                          {gradoAplica && (
                            <span className="text-[10px] font-bold bg-red-700/10 text-red-700 border border-red-700/20 px-2 py-0.5 rounded-full font-mono">
                              ⭐ Aplica para ti
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-base">{conv.titulo}</h3>
                        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">📍 {conv.sede}</p>
                      </div>
                      {gradoAplica && (
                        <button
                          onClick={() => {
                            if (bloqueadoPorSuspenso) showToast('No puedes inscribirte hasta transcurridos 3 meses desde el último suspenso (RF-53).', 'error');
                            else onIniciarSolicitud();
                          }}
                          className={`px-4 py-2 rounded-lg font-bold text-sm transition shadow-sm flex-shrink-0 ${
                            bloqueadoPorSuspenso ? 'bg-stone-300 text-stone-500 dark:text-stone-400 cursor-not-allowed' : 'bg-red-700 text-white hover:bg-[#660000]'
                          }`}
                        >
                          {bloqueadoPorSuspenso ? 'Bloqueado (3 meses)' : 'Inscribirme'}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="bg-surface-container-low dark:bg-white/5 p-2.5 rounded">
                        <span className="font-mono text-[9px] text-stone-500 dark:text-stone-400 uppercase block">Fecha Examen</span>
                        <span className="font-bold">{conv.fecha}</span>
                      </div>
                      <div className={`p-2.5 rounded ${diasRestantes < 10 ? 'bg-red-50' : 'bg-surface-container-low dark:bg-white/5'}`}>
                        <span className="font-mono text-[9px] text-stone-500 dark:text-stone-400 uppercase block">Plazo</span>
                        <span className={`font-bold ${diasRestantes < 10 ? 'text-red-700' : ''}`}>
                          {conv.plazoOrdinario} {diasRestantes > 0 ? `(${diasRestantes}d)` : '(vencido)'}
                        </span>
                      </div>
                      <div className="bg-surface-container-low dark:bg-white/5 p-2.5 rounded">
                        <span className="font-mono text-[9px] text-stone-500 dark:text-stone-400 uppercase block">Cupo</span>
                        <span className="font-bold">{conv.inscritos}/{conv.cupoMaximo}</span>
                      </div>
                      <div className="bg-surface-container-low dark:bg-white/5 p-2.5 rounded">
                        <span className="font-mono text-[9px] text-stone-500 dark:text-stone-400 uppercase block">Grados</span>
                        <span className="font-bold">{(conv.gradesAdmitidos || []).join(' · ')}</span>
                      </div>
                    </div>

                    {conv.observaciones && (
                      <p className="mt-3 text-xs text-stone-500 dark:text-stone-400 italic bg-amber-50 border border-amber-100 p-2 rounded">
                        ℹ️ {conv.observaciones}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ════════════════════════════
            TAB: REQUISITOS
           ════════════════════════════ */}
        {activeTab === 'requisitos' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-black text-2xl text-on-surface">Requisitos para Examinarse</h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Comprueba si cumples los requisitos para el siguiente grado (tabla 4.1 SRS).</p>
            </div>

            <div className="bg-white dark:bg-[#151515] border border-stone-100 dark:border-white/10 rounded-3xl shadow-xl shadow-stone-200/40 dark:shadow-none p-6 lg:p-8">
              <h3 className="font-black text-lg text-stone-800 dark:text-stone-100 mb-4">Tabla de Requisitos por Grado</h3>
              <div className="overflow-x-auto rounded-xl border border-stone-100 dark:border-white/10">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low dark:bg-white/5 border-b border-outline-variant">
                      <th className="p-2.5 text-left font-mono text-[10px] text-stone-500 dark:text-stone-400 uppercase">Grado</th>
                      <th className="p-2.5 text-center font-mono text-[10px] text-stone-500 dark:text-stone-400 uppercase">Edad Mín.</th>
                      <th className="p-2.5 text-center font-mono text-[10px] text-stone-500 dark:text-stone-400 uppercase">Permanencia</th>
                      <th className="p-2.5 text-center font-mono text-[10px] text-stone-500 dark:text-stone-400 uppercase">Lic. Consec.</th>
                      <th className="p-2.5 text-center font-mono text-[10px] text-stone-500 dark:text-stone-400 uppercase">Requisitos Extra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {GRADOS_CONFIG.map(g => {
                      const esSiguiente = g.nombre === deportista.requestedBelt || g.nombre === siguienteGrado?.nombre;
                      return (
                        <tr key={g.nombre} className={esSiguiente ? 'bg-red-700/5 font-bold' : 'hover:bg-surface-container-low dark:bg-white/5'}>
                          <td className={`p-2.5 font-bold ${esSiguiente ? 'text-red-700' : ''}`}>
                            {esSiguiente && '→ '}{g.nombre}
                          </td>
                          <td className="p-2.5 text-center">{g.edadMinima} años</td>
                          <td className="p-2.5 text-center">{g.permanenciaMinMeses} meses</td>
                          <td className="p-2.5 text-center">{g.licenciasConsecutivas}</td>
                          <td className="p-2.5 text-center text-[10px]">
                            {g.requiereAval && <span className="bg-green-100 text-green-800 px-1 rounded font-bold mr-1">Aval</span>}
                            {g.requiereCurriculum && <span className="bg-red-50 text-stone-700 dark:text-stone-200 px-1 rounded font-bold mr-1">CV</span>}
                            {g.requiereTrabajoEscrito && <span className="bg-purple-100 text-purple-800 px-1 rounded font-bold">TFM</span>}
                            {!g.requiereAval && !g.requiereCurriculum && '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-primary-container to-[#660000] rounded-xl p-6 text-white text-center">
              <span className="material-symbols-outlined text-4xl mb-2 block filled">how_to_reg</span>
              <h3 className="font-black text-lg mb-1">¿Listo para examinarte?</h3>
              <p className="text-sm text-white/80 mb-4">Accede al portal de Aspirante para comenzar tu solicitud oficial.</p>
              <button
                onClick={() => {
                  if (bloqueadoPorSuspenso) showToast('No puedes inscribirte hasta transcurridos 3 meses desde el último suspenso (RF-53).', 'error');
                  else onIniciarSolicitud();
                }}
                className={`px-6 py-2.5 rounded-lg font-bold transition shadow-sm ${
                  bloqueadoPorSuspenso ? 'bg-stone-400 text-stone-200 cursor-not-allowed' : 'bg-white dark:bg-[#151515] text-red-700 hover:bg-stone-100 dark:bg-white/10'
                }`}
              >
                {bloqueadoPorSuspenso ? 'Bloqueado (RF-53) →' : 'Iniciar Solicitud de Examen →'}
              </button>
            </div>
          </div>
        )}

        </div>
      </main>
    </div>
  );
}
