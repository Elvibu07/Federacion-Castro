import React, { useState } from 'react';
import { Aspirante, Convocatoria } from '../types';
import { useUI } from '../contexts/UIContext';
import ConfiguracionPerfilFederativo from './ConfiguracionPerfilFederativo';

interface MedicoPortalProps {
  aspirantes: Aspirante[];
  convocatorias: Convocatoria[];
  onUpdateAspirante: (id: string, updates: Partial<Aspirante>) => void;
  onLogout: () => void;
}

type MedicoTab = 'evaluacion' | 'historial' | 'dispensas' | 'perfil';

const toggleDarkMode = () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  window.dispatchEvent(new Event('theme_changed'));
};

function BadgeMedico({ estado }: { estado?: 'pendiente' | 'apto' | 'no_apto' }) {
  if (!estado || estado === 'pendiente') return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-700/30">
      <span className="material-symbols-outlined text-[13px]">pending</span> Pendiente
    </span>
  );
  if (estado === 'apto') return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-700/30">
      <span className="material-symbols-outlined text-[13px]">verified</span> Apto Médico
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-700/30">
      <span className="material-symbols-outlined text-[13px]">cancel</span> No Apto Médico
    </span>
  );
}

export default function MedicoPortal({ aspirantes, convocatorias, onUpdateAspirante, onLogout }: MedicoPortalProps) {
  const { showToast } = useUI();
  const [activeTab, setActiveTab] = useState<MedicoTab>('evaluacion');
  const [search, setSearch] = useState('');
  const [filterConv, setFilterConv] = useState<string>('all');
  const [selectedAsp, setSelectedAsp] = useState<Aspirante | null>(null);
  const [nota, setNota] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDispensa, setSelectedDispensa] = useState<Aspirante | null>(null);
  const [isSavingDispensa, setIsSavingDispensa] = useState(false);

  const candidatos = aspirantes.filter(a =>
    ['Admitida', 'En evaluación', 'Apto provisional', 'No Apto provisional', 'Acta emitida', 'Cerrada'].includes(a.status)
  );
  const historial = aspirantes.filter(a => a.aptoMedico && a.aptoMedico.estado !== 'pendiente');
  const dispensas = aspirantes.filter(a => a.dispensaMedica?.solicitada);

  const filtered = candidatos.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.club.toLowerCase().includes(search.toLowerCase());
    const matchConv = filterConv === 'all' || a.convocatoriaId === filterConv;
    return matchSearch && matchConv;
  });

  const statsApto = candidatos.filter(a => a.aptoMedico?.estado === 'apto').length;
  const statsNoApto = candidatos.filter(a => a.aptoMedico?.estado === 'no_apto').length;
  const statsPendiente = candidatos.filter(a => !a.aptoMedico || a.aptoMedico.estado === 'pendiente').length;

  const handleEmitir = async (estado: 'apto' | 'no_apto') => {
    if (!selectedAsp) return;
    if (estado === 'no_apto' && !nota.trim()) {
      showToast('Debes indicar una observación médica para el No Apto.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      onUpdateAspirante(selectedAsp.id, { aptoMedico: { estado, nota: nota.trim() || undefined, fecha: new Date().toISOString().split('T')[0] } });
      showToast(estado === 'apto' ? `✅ Apto médico emitido para ${selectedAsp.name}` : `❌ No Apto registrado para ${selectedAsp.name}`, estado === 'apto' ? 'success' : 'error');
      setSelectedAsp(null); setNota('');
    } finally { setIsSaving(false); }
  };

  const handleDispensa = async (aprobada: boolean) => {
    if (!selectedDispensa) return;
    setIsSavingDispensa(true);
    try {
      onUpdateAspirante(selectedDispensa.id, { dispensaMedica: { ...selectedDispensa.dispensaMedica!, aprobada } });
      showToast(aprobada ? `✅ Dispensa aprobada para ${selectedDispensa.name}` : `❌ Dispensa rechazada para ${selectedDispensa.name}`, aprobada ? 'success' : 'error');
      setSelectedDispensa(null);
    } finally { setIsSavingDispensa(false); }
  };

  const TABS: { id: MedicoTab; label: string; icon: string; count?: number }[] = [
    { id: 'evaluacion', label: 'Evaluación Médica', icon: 'medical_services', count: statsPendiente },
    { id: 'historial', label: 'Historial', icon: 'history', count: historial.length },
    { id: 'dispensas', label: 'Dispensas', icon: 'healing', count: dispensas.filter(d => d.dispensaMedica?.aprobada === undefined).length },
    { id: 'perfil', label: 'Mi Perfil', icon: 'person' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] dark:bg-[#0a0a0a] text-stone-900 dark:text-stone-100">

      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#151515]/80 backdrop-blur-md border-b border-stone-200 dark:border-white/10 px-8 h-18 flex items-center justify-between" style={{ height: '72px' }}>
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-white text-2xl">medical_services</span>
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tight text-stone-900 dark:text-white leading-none">Portal Médico</h1>
            <p className="text-xs text-stone-400 font-mono uppercase tracking-widest mt-0.5">Federación Madrileña de Karate</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleDarkMode} className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/10 flex items-center justify-center text-stone-500 dark:text-stone-300 hover:text-stone-800 dark:hover:text-white transition-colors">
            <span className="material-symbols-outlined text-xl">dark_mode</span>
          </button>
          <button onClick={onLogout} className="flex items-center gap-2 px-5 py-2.5 bg-stone-100 dark:bg-white/10 hover:bg-stone-200 dark:hover:bg-white/20 text-stone-700 dark:text-stone-300 rounded-xl font-bold text-sm transition-colors">
            <span className="material-symbols-outlined text-lg">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* ── Tabs ── */}
      <div className="border-b border-stone-200 dark:border-white/10 bg-white dark:bg-[#151515] px-8">
        <div className="flex gap-2">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-5 py-4 text-base font-bold border-b-2 transition-all ${activeTab === tab.id ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}>
              <span className="material-symbols-outlined text-xl">{tab.icon}</span>
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-stone-100 dark:bg-white/10 text-stone-500'}`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full px-8 py-10 flex flex-col items-start">
        {activeTab !== 'perfil' && (
          <div className="max-w-7xl mx-auto w-full">
            {/* ══════════ TAB: EVALUACIÓN ══════════ */}
            {activeTab === 'evaluacion' && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-3 gap-5 mb-8">
                  {[
                    { label: 'Pendientes', val: statsPendiente, icon: 'pending', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    { label: 'Aptos Médicos', val: statsApto, icon: 'verified', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    { label: 'No Aptos', val: statsNoApto, icon: 'cancel', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
                  ].map(m => (
                    <div key={m.label} className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                      <div className={`w-12 h-12 ${m.bg} rounded-xl flex items-center justify-center mb-4`}>
                        <span className={`material-symbols-outlined text-2xl ${m.color}`}>{m.icon}</span>
                      </div>
                      <p className={`font-black text-5xl ${m.color}`}>{m.val}</p>
                      <p className="text-sm text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider mt-2">{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* Filters */}
                <div className="flex gap-3 mb-7">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-xl">search</span>
                    <input type="text" placeholder="Buscar por nombre o club..." value={search} onChange={e => setSearch(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/10 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <select value={filterConv} onChange={e => setFilterConv(e.target.value)}
                    className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/10 rounded-xl px-5 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="all">Todas las convocatorias</option>
                    {convocatorias.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
                  </select>
                </div>

                {/* 2-col: list + guide */}
                <div className="flex gap-6">
                  <div className="flex-1 min-w-0">
                    {filtered.length === 0 ? (
                      <div className="bg-white dark:bg-[#151515] border border-dashed border-stone-300 dark:border-white/10 rounded-2xl p-14 flex flex-col items-center text-center gap-4">
                        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center">
                          <span className="material-symbols-outlined text-4xl text-emerald-400">medical_services</span>
                        </div>
                        <p className="font-black text-xl text-stone-600 dark:text-stone-300">Sin aspirantes para revisar</p>
                        <p className="text-base text-stone-400 max-w-sm">El Admin debe admitir aspirantes a una convocatoria para que aparezcan aquí.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {filtered.map(a => (
                          <div key={a.id} className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700/50 transition-all">
                            <div className="flex items-start gap-5">
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-2xl flex-shrink-0 shadow-md">
                                {a.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <p className="font-black text-lg text-stone-900 dark:text-white truncate">{a.name}</p>
                                  <BadgeMedico estado={a.aptoMedico?.estado} />
                                </div>
                                <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">
                                  <span className="material-symbols-outlined text-sm align-middle mr-1">groups</span>{a.club}
                                  <span className="mx-2">·</span>
                                  <span className="material-symbols-outlined text-sm align-middle mr-1">military_tech</span>{a.requestedBelt}
                                </p>
                                {a.aptoMedico?.nota && (
                                  <p className="text-sm italic text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-white/5 rounded-lg px-4 py-2.5 mb-3 border border-stone-100 dark:border-white/5">
                                    📋 {a.aptoMedico.nota}
                                  </p>
                                )}
                                {a.aptoMedico?.fecha && <p className="text-xs text-stone-400 mb-2">Emitido: {a.aptoMedico.fecha}</p>}
                                <button onClick={() => { setSelectedAsp(a); setNota(a.aptoMedico?.nota || ''); }}
                                  className="text-sm font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 transition-colors">
                                  <span className="material-symbols-outlined text-base">edit</span>
                                  {a.aptoMedico?.estado ? 'Modificar dictamen' : 'Emitir dictamen médico'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right guide panel */}
                  <div className="w-80 flex-shrink-0 space-y-5">
                    <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                      <h4 className="font-black text-base text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-500 text-xl">info</span>
                        Guía de Evaluación
                      </h4>
                      <ul className="space-y-4">
                        {[
                          { icon: 'verified', text: 'Emite Apto si el aspirante está en condiciones físicas para el examen.' },
                          { icon: 'cancel', text: 'Emite No Apto si existe limitación física o médica. Incluye siempre una observación.' },
                          { icon: 'edit_note', text: 'Puedes modificar el dictamen hasta que el Acta sea emitida.' },
                          { icon: 'healing', text: 'Las dispensas médicas se gestionan en la pestaña correspondiente.' },
                        ].map((item, i) => (
                          <li key={i} className="flex gap-3 text-sm text-stone-500 dark:text-stone-400">
                            <span className="material-symbols-outlined text-emerald-500 text-lg mt-0.5 flex-shrink-0">{item.icon}</span>
                            <span>{item.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-700/30 rounded-2xl p-6">
                      <h4 className="font-black text-base text-emerald-800 dark:text-emerald-300 mb-2">Normativa Aplicada</h4>
                      <p className="text-sm text-emerald-700 dark:text-emerald-400 leading-relaxed">
                        Según RF-55/56, el médico federativo puede eximir de partes del examen a aspirantes con lesiones documentadas o mayores de 41 años, previa solicitud formal.
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                      <h4 className="font-black text-base text-stone-800 dark:text-stone-100 mb-4">Progreso</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-stone-500">Total a evaluar</span>
                          <span className="font-bold text-stone-800 dark:text-stone-100">{candidatos.length}</span>
                        </div>
                        <div className="w-full h-3 bg-stone-100 dark:bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: candidatos.length ? `${((statsApto + statsNoApto) / candidatos.length) * 100}%` : '0%' }} />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-600 font-bold">{statsApto} aptos</span>
                          <span className="text-amber-600 font-bold">{statsPendiente} pendientes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ══════════ TAB: HISTORIAL ══════════ */}
            {activeTab === 'historial' && (
              <>
                <div className="mb-7">
                  <h2 className="font-black text-3xl text-stone-800 dark:text-stone-100">Historial de Dictámenes</h2>
                  <p className="text-base text-stone-500 dark:text-stone-400 mt-1">Todos los aptos y no aptos médicos emitidos hasta la fecha.</p>
                </div>

                <div className="flex gap-6">
                  <div className="flex-1 min-w-0">
                    {historial.length === 0 ? (
                      <div className="bg-white dark:bg-[#151515] border border-dashed border-stone-300 dark:border-white/10 rounded-2xl p-14 flex flex-col items-center text-center gap-4">
                        <div className="w-20 h-20 bg-stone-100 dark:bg-white/5 rounded-2xl flex items-center justify-center">
                          <span className="material-symbols-outlined text-4xl text-stone-400">history</span>
                        </div>
                        <p className="font-black text-xl text-stone-600 dark:text-stone-300">Sin historial aún</p>
                        <p className="text-base text-stone-400">Los dictámenes emitidos quedarán registrados aquí de forma permanente.</p>
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-stone-100 dark:border-white/5 bg-stone-50 dark:bg-white/5">
                              <th className="text-left px-6 py-4 text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Aspirante</th>
                              <th className="text-left px-6 py-4 text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Club</th>
                              <th className="text-left px-6 py-4 text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Grado</th>
                              <th className="text-left px-6 py-4 text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Dictamen</th>
                              <th className="text-left px-6 py-4 text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Fecha</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historial.map((a, i) => (
                              <tr key={a.id} className={`border-b border-stone-50 dark:border-white/5 hover:bg-stone-50 dark:hover:bg-white/5 transition-colors ${i % 2 === 0 ? '' : 'bg-stone-50/50 dark:bg-white/[0.02]'}`}>
                                <td className="px-6 py-4 font-bold text-base text-stone-900 dark:text-stone-100">{a.name}</td>
                                <td className="px-6 py-4 text-base text-stone-600 dark:text-stone-400">{a.club}</td>
                                <td className="px-6 py-4 text-base text-stone-600 dark:text-stone-400">{a.requestedBelt}</td>
                                <td className="px-6 py-4">
                                  <BadgeMedico estado={a.aptoMedico?.estado} />
                                  {a.aptoMedico?.nota && <p className="text-xs text-stone-400 italic mt-1">{a.aptoMedico.nota}</p>}
                                </td>
                                <td className="px-6 py-4 text-stone-500 dark:text-stone-400 font-mono text-sm">{a.aptoMedico?.fecha || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="w-80 flex-shrink-0 space-y-5">
                    <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                      <h4 className="font-black text-base text-stone-800 dark:text-stone-100 mb-4">Resumen</h4>
                      <div className="space-y-4">
                        {[
                          { label: 'Total dictámenes', val: historial.length, color: 'text-stone-700 dark:text-stone-200' },
                          { label: 'Aptos emitidos', val: historial.filter(a => a.aptoMedico?.estado === 'apto').length, color: 'text-emerald-600' },
                          { label: 'No Aptos emitidos', val: historial.filter(a => a.aptoMedico?.estado === 'no_apto').length, color: 'text-red-600' },
                        ].map(s => (
                          <div key={s.label} className="flex justify-between items-center border-b border-stone-50 dark:border-white/5 pb-3 last:border-0 last:pb-0">
                            <span className="text-sm text-stone-500 dark:text-stone-400">{s.label}</span>
                            <span className={`font-black text-3xl ${s.color}`}>{s.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700/30 rounded-2xl p-6">
                      <h4 className="font-black text-base text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">shield</span> Trazabilidad
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
                        Todos los dictámenes quedan registrados con fecha y firmados por el médico oficial para auditoría de la federación.
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                      <h4 className="font-black text-base text-stone-800 dark:text-stone-100 mb-3">Tasa de Aptos</h4>
                      {historial.length > 0 ? (
                        <>
                          <p className="font-black text-5xl text-emerald-600 mb-2">
                            {Math.round((historial.filter(a => a.aptoMedico?.estado === 'apto').length / historial.length) * 100)}%
                          </p>
                          <div className="w-full h-3 bg-stone-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(historial.filter(a => a.aptoMedico?.estado === 'apto').length / historial.length) * 100}%` }} />
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-stone-400 italic">Sin datos aún</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ══════════ TAB: DISPENSAS ══════════ */}
            {activeTab === 'dispensas' && (
              <>
                <div className="mb-7">
                  <h2 className="font-black text-3xl text-stone-800 dark:text-stone-100">Dispensas Médicas</h2>
                  <p className="text-base text-stone-500 dark:text-stone-400 mt-1">Aspirantes que solicitan exención de alguna parte del examen por motivos médicos.</p>
                </div>

                <div className="flex gap-6">
                  <div className="flex-1 min-w-0">
                    {dispensas.length === 0 ? (
                      <div className="bg-white dark:bg-[#151515] border border-dashed border-stone-300 dark:border-white/10 rounded-2xl p-14 flex flex-col items-center text-center gap-4">
                        <div className="w-20 h-20 bg-teal-50 dark:bg-teal-900/20 rounded-2xl flex items-center justify-center">
                          <span className="material-symbols-outlined text-4xl text-teal-400">healing</span>
                        </div>
                        <p className="font-black text-xl text-stone-600 dark:text-stone-300">Sin solicitudes de dispensa</p>
                        <p className="text-base text-stone-400 max-w-sm">Cuando un aspirante solicite exención médica, aparecerá aquí para tu resolución.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {dispensas.map(a => {
                          const d = a.dispensaMedica!;
                          const estadoColor = d.aprobada === true
                            ? 'text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-700/30'
                            : d.aprobada === false
                              ? 'text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-700/30'
                              : 'text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-700/30';
                          const estadoLabel = d.aprobada === true ? 'Aprobada' : d.aprobada === false ? 'Rechazada' : 'Pendiente';
                          return (
                            <div key={a.id} className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                              <div className="flex items-start justify-between gap-3 mb-4">
                                <div>
                                  <p className="font-black text-lg text-stone-900 dark:text-white">{a.name}</p>
                                  <p className="text-sm text-stone-500 dark:text-stone-400">{a.club} · {a.requestedBelt}</p>
                                </div>
                                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${estadoColor}`}>{estadoLabel}</span>
                              </div>
                              <div className="bg-stone-50 dark:bg-white/5 rounded-xl p-4 space-y-2 mb-4 border border-stone-100 dark:border-white/5">
                                {d.motivoDispensa && <p className="text-sm text-stone-600 dark:text-stone-400"><span className="font-bold">Motivo:</span> {d.motivoDispensa}</p>}
                                {d.certificadoAdjunto && (
                                  <p className="text-sm text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                                    <span className="font-bold">Certificado Adjunto:</span>
                                    <span className="material-symbols-outlined text-[16px] text-red-700">description</span>
                                    <a href="#" onClick={(e) => { e.preventDefault(); showToast(`Simulando visualización de: ${d.certificadoAdjunto}`, 'info'); }} className="text-blue-600 hover:underline">{d.certificadoAdjunto}</a>
                                  </p>
                                )}
                                {d.parteExamenExenta && <p className="text-sm text-stone-600 dark:text-stone-400"><span className="font-bold">Exento de:</span> {d.parteExamenExenta}</p>}
                                {d.fechaSolicitud && <p className="text-xs text-stone-400 font-mono">Solicitado: {d.fechaSolicitud}</p>}
                              </div>
                              {d.aprobada === undefined ? (
                                <div className="flex gap-3">
                                  <button onClick={() => setSelectedDispensa(a)} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 rounded-xl transition-colors">
                                    <span className="material-symbols-outlined text-base">check_circle</span> Aprobar
                                  </button>
                                  <button onClick={() => setSelectedDispensa(a)} className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2.5 rounded-xl transition-colors">
                                    <span className="material-symbols-outlined text-base">cancel</span> Rechazar
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => setSelectedDispensa(a)} className="text-sm font-bold text-stone-400 hover:text-stone-600 flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-base">edit</span> Modificar resolución
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="w-80 flex-shrink-0 space-y-5">
                    <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                      <h4 className="font-black text-base text-stone-800 dark:text-stone-100 mb-3">¿Qué es una Dispensa?</h4>
                      <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed mb-4">
                        Una dispensa médica permite a un aspirante quedar exento de una parte específica del examen por motivos de salud o edad.
                      </p>
                      <ul className="space-y-3">
                        {[
                          'Mayores de 41 años pueden solicitar exención del bloque físico.',
                          'Lesiones documentadas con informe médico previo.',
                          'La dispensa solo exime de una parte, no del examen completo.',
                        ].map((t, i) => (
                          <li key={i} className="flex gap-2.5 text-sm text-stone-500 dark:text-stone-400">
                            <span className="text-teal-500 font-black mt-0.5">•</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30 rounded-2xl p-6">
                      <h4 className="font-black text-base text-amber-800 dark:text-amber-300 mb-2">Pendientes de revisión</h4>
                      <p className="font-black text-5xl text-amber-600">{dispensas.filter(d => d.dispensaMedica?.aprobada === undefined).length}</p>
                      <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">solicitudes sin resolver</p>
                    </div>

                    <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                      <h4 className="font-black text-base text-stone-800 dark:text-stone-100 mb-3">Base Legal</h4>
                      <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
                        Artículo RF-55/56 de la Normativa de Grados FMK. El médico es la única autoridad con potestad para aprobar dispensas médicas oficiales.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════ TAB: PERFIL ══════════ */}
        {activeTab === 'perfil' && (
          <ConfiguracionPerfilFederativo 
            roleName="Médico Federativo" 
            defaultName="Dr. Médico Oficial" 
            defaultEmail="paginasusar@gmail.com"
          />
        )}
      </div>

      {/* ── Modal Dictamen Médico ── */}
      {selectedAsp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedAsp(null)}>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200 dark:border-white/10" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-emerald-700 to-teal-800 px-8 py-6">
              <p className="text-emerald-200 text-xs uppercase tracking-widest font-bold mb-1">Dictamen Médico</p>
              <h3 className="text-white font-black text-2xl">{selectedAsp.name}</h3>
              <p className="text-emerald-200 text-sm mt-1">{selectedAsp.club} · {selectedAsp.requestedBelt}</p>
            </div>
            <div className="p-8">
              <label className="block text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
                Observación Médica <span className="text-stone-400 normal-case">(requerida si es No Apto)</span>
              </label>
              <textarea value={nota} onChange={e => setNota(e.target.value)} rows={4}
                placeholder="Ej: Presenta limitación en rodilla derecha..."
                className="w-full px-4 py-3 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none mb-6" />
              <div className="flex gap-3">
                <button onClick={() => handleEmitir('apto')} disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors text-base">
                  <span className="material-symbols-outlined text-xl">verified</span> Emitir Apto
                </button>
                <button onClick={() => handleEmitir('no_apto')} disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors text-base">
                  <span className="material-symbols-outlined text-xl">cancel</span> No Apto
                </button>
              </div>
              <button onClick={() => setSelectedAsp(null)} className="w-full mt-4 py-3 text-stone-500 hover:text-stone-700 font-bold text-base transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Dispensa ── */}
      {selectedDispensa && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedDispensa(null)}>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200 dark:border-white/10" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-teal-700 to-cyan-800 px-8 py-6">
              <p className="text-teal-200 text-xs uppercase tracking-widest font-bold mb-1">Resolución de Dispensa</p>
              <h3 className="text-white font-black text-2xl">{selectedDispensa.name}</h3>
              <p className="text-teal-200 text-sm mt-1">{selectedDispensa.dispensaMedica?.motivoDispensa || 'Sin motivo especificado'}</p>
            </div>
            <div className="p-8">
              <p className="text-base text-stone-600 dark:text-stone-400 mb-7">
                ¿Apruebas la dispensa médica para <strong>{selectedDispensa.name}</strong>? El aspirante quedará exento de: <em>{selectedDispensa.dispensaMedica?.parteExamenExenta || 'parte no especificada'}</em>.
              </p>
              <div className="flex gap-3">
                <button onClick={() => handleDispensa(true)} disabled={isSavingDispensa}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors text-base">
                  <span className="material-symbols-outlined text-xl">check_circle</span> Aprobar Dispensa
                </button>
                <button onClick={() => handleDispensa(false)} disabled={isSavingDispensa}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors text-base">
                  <span className="material-symbols-outlined text-xl">cancel</span> Rechazar
                </button>
              </div>
              <button onClick={() => setSelectedDispensa(null)} className="w-full mt-4 py-3 text-stone-500 hover:text-stone-700 font-bold text-base transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
