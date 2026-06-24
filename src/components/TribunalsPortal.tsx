import React, { useState } from 'react';
import { Aspirante, Judge, Tribunal, Convocatoria, Evaluacion, ParteBloqueComun, VotoJuez, ViaExamen } from '../types';
import { GRADOS_CONFIG } from '../data';
import { generateUUID } from '../lib/uuid';
import ActaImprimible from './ActaImprimible';
import ConfiguracionPerfilFederativo from './ConfiguracionPerfilFederativo';
import { useUI } from '../contexts/UIContext';

interface TribunalsPortalProps {
  judges: Judge[];
  activeJudgeId?: string;
  tribunals: Tribunal[];
  aspirantes: Aspirante[];
  onUpdateTribunals: (updated: Tribunal[]) => void;
  onUpdateTribunalAtomic?: (id: string, updates: Partial<Tribunal>) => void;
  onAddTribunalAtomic?: (newTribunal: Tribunal) => void;
  onRemoveTribunalAtomic?: (id: string) => void;
  onUpdateAspirantes: (updated: Aspirante[]) => void;
  onUpdateAspiranteAtomic?: (id: string, updates: Partial<Aspirante>) => void;
  onUpdateJudges?: (updated: Judge[]) => void;
  onLogout: () => void;
  convocatorias: Convocatoria[];
}

type TribunalTab = 'dashboard' | 'tribunales' | 'evaluacion' | 'historial' | 'jueces' | 'reglas' | 'perfil';

const toggleDarkMode = () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  window.dispatchEvent(new Event('theme_changed'));
};

// Partes fijas del Bloque Común (RF-35)
const PARTES_BLOQUE_COMUN: Omit<ParteBloqueComun, 'completada' | 'resultado'>[] = [
  { id: 'kihon',    nombre: 'Kihon Waza' },
  { id: 'kata',     nombre: 'Kata' },
  { id: 'kihon_kumite', nombre: 'Kihon Kumite' },
  { id: 'bunkai',   nombre: 'Bunkai Kumite' },
  { id: 'oyo',      nombre: 'Oyo Waza' },
  { id: 'coloquio', nombre: 'Coloquio / Temario Teórico' },
];

function buildEvaluacion(aspId: string): Evaluacion {
  return {
    aspiranteId: aspId,
    bloqueComun: {
      iniciado: false,
      completado: false,
    },
    exentoBloqueEspecifico: false,
    votos: [],
    actaEmitida: false,
  };
}

export default function TribunalsPortal({
  judges,
  activeJudgeId,
  tribunals,
  aspirantes,
  onUpdateTribunals,
  onUpdateTribunalAtomic,
  onAddTribunalAtomic,
  onRemoveTribunalAtomic,
  onUpdateAspirantes,
  onUpdateAspiranteAtomic,
  onUpdateJudges,
  onLogout,
  convocatorias,
}: TribunalsPortalProps) {
  const { showPrompt, showToast, showConfirm, showAlert } = useUI();
  const [activeTab, setActiveTab]     = useState<TribunalTab>('dashboard');
  const [assigningAspTribunal, setAssigningAspTribunal] = useState<Tribunal | null>(null);
  const [selectedEvalAsp, setSelectedEvalAsp] = useState<Aspirante | null>(null);
  const [showActaModal, setShowActaModal] = useState<Aspirante | null>(null);
  const [showAddJudgeModal, setShowAddJudgeModal] = useState(false);
  const [showAddTribunalModal, setShowAddTribunalModal] = useState(false);
  const [newTribunalForm, setNewTribunalForm] = useState({ name: '', fecha: '', convocatoriaId: '' });
  const [newJudgeForm, setNewJudgeForm] = useState({ name: '', license: '', rank: 'Juez Regional', federacion: 'Federación Madrileña de Karate', date: '', email: '' });
  const [judgeSearch, setJudgeSearch] = useState('');

  // ── Aspirantes aptos para examen ─────────────────────────────────────────
  const admitidos = aspirantes.filter(a =>
    a.status === 'Validada' || a.status === 'Admitida' ||
    a.status === 'En evaluación' || a.status === 'Apto provisional' ||
    a.status === 'No Apto provisional'
  );

  // ── Judge assignment ──────────────────────────────────────────────────────
  const handleAssignJudge = (judgeId: string, tribunalId: string) => {
    const targetJudge = judges.find(j => j.id === judgeId);
    if (!targetJudge) return;

    if (onUpdateTribunalAtomic) {
      tribunals.forEach(t => {
        if (t.id === tribunalId) {
          onUpdateTribunalAtomic(t.id, { judges: [...t.judges?.filter(j => j.id !== judgeId), targetJudge] });
        } else if (t.judges?.some(j => j.id === judgeId)) {
          onUpdateTribunalAtomic(t.id, { judges: t.judges?.filter(j => j.id !== judgeId) });
        }
      });
    } else {
      const updated = tribunals.map(t => ({
        ...t,
        judges: t.id === tribunalId
          ? [...t.judges?.filter(j => j.id !== judgeId), targetJudge]
          : t.judges?.filter(j => j.id !== judgeId),
      }));
      onUpdateTribunals(updated);
    }
  };

  const handleRemoveJudge = (judgeId: string, tribunalId: string) => {
    if (onUpdateTribunalAtomic) {
      const t = tribunals.find(tr => tr.id === tribunalId);
      if (t) {
        onUpdateTribunalAtomic(tribunalId, { judges: t.judges?.filter(j => j.id !== judgeId) });
      }
    } else {
      onUpdateTribunals(tribunals.map(t =>
        t.id === tribunalId ? { ...t, judges: t.judges?.filter(j => j.id !== judgeId) } : t
      ));
    }
  };

  const handleAddJudge = () => {
    if (!onUpdateJudges) return;
    setNewJudgeForm({ name: '', license: '', rank: 'Juez Regional', federacion: 'Federación Madrileña de Karate', date: '', email: '' });
    setShowAddJudgeModal(true);
  };

  const submitNewJudge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateJudges || !newJudgeForm.name.trim() || !newJudgeForm.email.trim()) return;

    const emailLower = newJudgeForm.email.trim().toLowerCase();
    if (judges.some(j => j.email?.toLowerCase() === emailLower)) {
      showAlert('Correo Registrado', `El correo ${emailLower} ya está registrado en el padrón de personal.`);
      return;
    }

    showConfirm(
      'Registrar Juez',
      `¿Confirmar el registro de ${newJudgeForm.name} como ${newJudgeForm.rank}?`,
      async () => {
        const newJudge: Judge = {
          id: generateUUID(),
          name: newJudgeForm.name.trim(),
          email: newJudgeForm.email.trim(),
          rank: newJudgeForm.rank,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(newJudgeForm.name.trim())}&background=random`
        };

        onUpdateJudges([...judges, newJudge]);
        // Persist to Supabase
        const { createJudge } = await import('../lib/api');
        await createJudge(newJudge);
        setShowAddJudgeModal(false);
        showAlert('Registro Exitoso', `Juez ${newJudge.name} registrado con éxito.`);
      },
      'Registrar'
    );
  };

  // ── Aspirant assignment ───────────────────────────────────────────────────
  const handleToggleAsp = (aspId: string, tribunalId: string) => {
    if (onUpdateAspiranteAtomic) {
      const asp = aspirantes.find(a => a.id === aspId);
      if (asp) {
        const newTribunalId = asp.assignedTribunalId === tribunalId ? undefined : tribunalId;
        onUpdateAspiranteAtomic(aspId, { assignedTribunalId: newTribunalId });
      }
    } else {
      onUpdateAspirantes(aspirantes.map(a =>
        a.id === aspId ? { ...a, assignedTribunalId: a.assignedTribunalId === tribunalId ? undefined : tribunalId } : a
      ));
    }
  };

  // ── Evaluación helpers ────────────────────────────────────────────────────
  const getOrBuildEval = (asp: Aspirante): Evaluacion => {
    if (asp.evaluacion) return asp.evaluacion;
    return buildEvaluacion(asp.id);
  };

  const updateEval = (aspId: string, ev: Evaluacion) => {
    if (onUpdateAspiranteAtomic) {
      onUpdateAspiranteAtomic(aspId, { evaluacion: ev });
    } else {
      onUpdateAspirantes(aspirantes.map(a =>
        a.id === aspId ? { ...a, evaluacion: ev } : a
      ));
    }
    const found = aspirantes.find(a => a.id === aspId);
    if (found) setSelectedEvalAsp({ ...found, evaluacion: ev });
  };

  const handleDeleteTribunal = (tribId: string, tribName: string) => {
    showConfirm(
      'Eliminar Tribunal',
      `¿Estás seguro de que deseas eliminar permanentemente el tribunal "${tribName}"? Esta acción desasignará a todos los aspirantes de esta mesa.`,
      () => {
        // Remover tribunal
        if (onRemoveTribunalAtomic) {
          onRemoveTribunalAtomic(tribId);
        } else {
          onUpdateTribunals(tribunals.filter(t => t.id !== tribId));
        }
        
        // Desasignar aspirantes de ese tribunal
        if (onUpdateAspiranteAtomic) {
          aspirantes.filter(a => a.assignedTribunalId === tribId).forEach(a => {
            onUpdateAspiranteAtomic(a.id, { assignedTribunalId: undefined });
          });
        } else {
          onUpdateAspirantes(aspirantes.map(a => 
            a.assignedTribunalId === tribId ? { ...a, assignedTribunalId: undefined } : a
          ));
        }
        showAlert('Tribunal Eliminado', 'El tribunal ha sido eliminado correctamente.');
      },
      'Eliminar Tribunal',
      'Cancelar',
      true
    );
  };

  const handleEmitirActa = (aspId: string) => {
    const asp = aspirantes.find(a => a.id === aspId)!;
    const ev = getOrBuildEval(asp);
    
    // Calcular resultado final con la regla correcta (SRS RF-44)
    const gradoConfig = GRADOS_CONFIG.find(g =>
      asp.requestedBelt.toLowerCase().includes(g.nombre.toLowerCase()) ||
      asp.requestedBelt.toLowerCase().includes(g.etiquetaCorta.toLowerCase())
    );
    const necesita80 = gradoConfig?.mayoriaCalificacion === '80pct';
    const totalJueces = ev.votos.length;
    const aptosCount  = ev.votos.filter(v => v.resultado === 'Apto').length;
    const trib = tribunals.find(t => t.id === asp.assignedTribunalId);
    const requiredVotes = trib?.judges?.length || 1;

    let resultadoFinal: 'Apto' | 'No Apto' = 'No Apto';
    if (totalJueces >= requiredVotes) {
      if (necesita80) {
        resultadoFinal = aptosCount / totalJueces >= 0.8 ? 'Apto' : 'No Apto';
      } else {
        resultadoFinal = aptosCount > totalJueces / 2 ? 'Apto' : 'No Apto';
      }
    }

    const updEval = { ...ev, resultadoFinal, actaEmitida: true };
    
    // RF-52: Conservar 1ª fase aprobada 1 año si solo falla 2ª fase
    const isParcial = ev.bloqueComun?.resultado === 'Apto' && (ev.bloqueEspecifico?.resultado === 'No Apto' || resultadoFinal === 'No Apto');
    const dateToday = new Date().toISOString();
    
    const finalAspirante = { 
        ...asp, 
        evaluacion: updEval, 
        status: 'Acta emitida' as const,
        fechaUltimoExamen: dateToday,
        resultadoUltimoExamen: (isParcial ? 'No Apto Parcial' : resultadoFinal) as 'Apto' | 'No Apto' | 'No Apto Parcial' | undefined,
        faseComunAprobadaHasta: isParcial ? new Date(Date.now() + 365*24*60*60*1000).toISOString() : undefined
    };

    showConfirm(
      'Finalizar Acta',
      `¿Estás seguro de finalizar y emitir el acta para ${asp.name}? El resultado es ${resultadoFinal.toUpperCase()}.`,
      () => {
        if (onUpdateAspiranteAtomic) {
          onUpdateAspiranteAtomic(aspId, { 
            evaluacion: updEval,
            status: finalAspirante.status
          });
        } else {
          updateEval(aspId, updEval);
          onUpdateAspirantes(aspirantes.map(a => a.id === aspId ? finalAspirante : a));
        }
        
        showAlert('Acta Emitida', `El acta oficial ha sido emitida. El resultado es ${resultadoFinal.toUpperCase()}.`);
        
        // Abrir el modal de acta imprimible con los datos frescos
        setShowActaModal(finalAspirante);
      },
      'Emitir Acta'
    );
  };

  // ────────────────────────────────────────────────────────────────────────
  const navTabs: { id: TribunalTab; label: string; icon: string }[] = [
    { id: 'dashboard',  label: 'Tablero Principal', icon: 'dashboard' },
    { id: 'tribunales', label: 'Constitución',   icon: 'groups' },
    { id: 'evaluacion', label: 'Evaluación',     icon: 'fact_check' },
    { id: 'historial',  label: 'Historial Actas',icon: 'history' },
    { id: 'jueces',     label: 'Padrón Jueces',  icon: 'manage_accounts' },
    { id: 'reglas',     label: 'Reglas Grado',   icon: 'policy' },
    { id: 'perfil',     label: 'Mi Perfil',      icon: 'person' },
  ];

  return (
    <div className="bg-[#f8f9fa] dark:bg-[#0a0a0a] text-stone-800 dark:text-stone-100 font-sans min-h-screen flex">
      
      {/* ── Premium Sidebar ─────────────────────────────────────────────────── */}
      <nav className="hidden xl:flex flex-col h-screen w-80 fixed left-0 top-0 border-r border-stone-200/50 dark:border-white/10 shadow-2xl shadow-stone-200/20 bg-white dark:bg-[#151515] py-8 z-50 overflow-hidden print:hidden">
        
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-br from-red-50 to-red-100/50 rounded-full blur-3xl -translate-y-24 translate-x-12 mix-blend-multiply pointer-events-none" />

        {/* Brand / Logo Area */}
        <div className="px-8 mb-10 relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-600/30">
              <span className="text-white font-black tracking-tighter text-base">FMK</span>
            </div>
            <div>
              <h2 className="font-black text-stone-800 dark:text-stone-100 text-lg tracking-wide leading-tight truncate max-w-[140px]" title={judges.find(j => j.id === activeJudgeId)?.name || 'HolaSoyGerman'}>
                {judges.find(j => j.id === activeJudgeId)?.name || 'HolaSoyGerman'}
              </h2>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Portal de Tribunales</p>
            </div>
          </div>
          <button onClick={toggleDarkMode} className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/10 flex items-center justify-center text-stone-500 dark:text-stone-300 hover:text-stone-800 dark:hover:text-white transition-colors" title="Cambiar Tema">
            <span className="material-symbols-outlined text-[18px]">dark_mode</span>
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-6 no-scrollbar space-y-2 relative z-10">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest px-2 mb-4">Navegación</p>
          {navTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all text-left text-base font-bold ${
                activeTab === tab.id
                  ? 'bg-red-50 text-red-700 shadow-sm border border-red-100'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:text-stone-100 hover:bg-stone-50 dark:bg-white/5'
              }`}
            >
              <span className={`material-symbols-outlined text-[24px] ${activeTab === tab.id ? 'text-red-600' : 'text-stone-400'}`}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="mt-auto px-8 pt-8 border-t border-stone-100 dark:border-white/10 relative z-10 bg-white dark:bg-[#151515]">
          <button
            onClick={() => {
              setNewTribunalForm({ name: '', fecha: '', convocatoriaId: '' });
              setShowAddTribunalModal(true);
            }}
            className="w-full flex items-center justify-center gap-3 px-5 py-4 mb-4 bg-red-700 hover:bg-red-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-700/20 transition-all hover:-translate-y-0.5"
          >
            <span className="material-symbols-outlined text-[20px]">add</span> Crear Mesa
          </button>
          
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl border border-stone-200 dark:border-white/20 text-stone-500 dark:border-stone-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all text-sm font-bold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* ── Main Content Area ──────────────────────────────────────────────── */}
      <main className="flex-1 xl:ml-72 flex flex-col min-h-screen bg-[#f8f9fa] dark:bg-[#0a0a0a] relative w-full print:hidden">
        
        {/* Mobile Header */}
        <div className="xl:hidden sticky top-0 z-40 bg-white/80 dark:bg-[#151515]/80 backdrop-blur-md border-b border-stone-200 dark:border-white/20 p-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-red-700 flex items-center justify-center shadow-sm">
                <span className="text-white font-black tracking-tighter text-xs">FMK</span>
             </div>
             <div>
               <span className="font-bold text-stone-800 dark:text-stone-100 text-sm leading-tight block">FMK Portal</span>
               <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest block">Tribunales</span>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleDarkMode} className="text-stone-500 dark:text-stone-400 flex items-center justify-center w-8 h-8 bg-stone-100 dark:bg-white/10 rounded-full">
              <span className="material-symbols-outlined text-[18px]">dark_mode</span>
            </button>
            <button onClick={onLogout} className="text-stone-500 dark:text-stone-400 flex items-center justify-center w-8 h-8 bg-stone-100 dark:bg-white/10 rounded-full">
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
        
        {/* Mobile Nav Scroll */}
        <div className="xl:hidden sticky top-[65px] z-30 bg-white dark:bg-[#151515] border-b border-stone-100 dark:border-white/10 px-2 overflow-x-auto no-scrollbar py-2 flex gap-1 shadow-sm">
          {navTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[75px] px-2 py-2 rounded-xl text-[10px] font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-red-50 text-red-700 border border-red-100'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:text-stone-100'
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] mb-1 ${activeTab === tab.id ? 'text-red-600' : 'text-stone-400'}`}>
                {tab.icon}
              </span>
              <span className="truncate w-full text-center">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Main Content Container ────────────────────────────────────────── */}
        <div className="flex-grow w-full max-w-[1600px] mx-auto flex flex-col p-6 lg:p-10">

        {/* ════════════════════════════════════════════════
            TAB: DASHBOARD
           ════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <main className="flex-1 p-6 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-12">
              <h2 className="font-black text-4xl text-stone-800 dark:text-stone-100 tracking-tight">Panel de Control General</h2>
              <p className="text-stone-500 dark:text-stone-400 mt-2 text-lg">Resumen en tiempo real de la jornada de exámenes de grados.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div className="bg-white dark:bg-[#151515] p-6 lg:p-8 rounded-3xl shadow-xl shadow-stone-200/40 dark:shadow-none border border-stone-100 dark:border-white/10 flex items-center gap-5 hover:-translate-y-1 transition-transform">
                <div className="w-16 h-16 bg-stone-100 dark:bg-white/10 rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-stone-600 text-4xl">groups</span>
                </div>
                <div>
                  <p className="text-sm text-stone-400 font-bold uppercase tracking-widest mb-1">Aspirantes</p>
                  <p className="text-4xl font-black text-stone-800 dark:text-stone-100">{admitidos.length}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#151515] p-6 lg:p-8 rounded-3xl shadow-xl shadow-amber-200/20 border border-amber-50 flex items-center gap-5 hover:-translate-y-1 transition-transform">
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-500 text-4xl">pending_actions</span>
                </div>
                <div>
                  <p className="text-sm text-stone-400 font-bold uppercase tracking-widest mb-1">Pendientes</p>
                  <p className="text-4xl font-black text-stone-800 dark:text-stone-100">
                    {admitidos.filter(a => !a.evaluacion || (!a.evaluacion.bloqueComun.completado && !a.evaluacion.bloqueEspecifico?.completado)).length}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#151515] p-6 lg:p-8 rounded-3xl shadow-xl shadow-green-200/30 border border-green-50 flex items-center gap-5 hover:-translate-y-1 transition-transform">
                <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-500 text-4xl">workspace_premium</span>
                </div>
                <div>
                  <p className="text-sm text-stone-400 font-bold uppercase tracking-widest mb-1">Aptos</p>
                  <p className="text-4xl font-black text-green-600">
                    {admitidos.filter(a => a.status === 'Acta emitida' && a.evaluacion?.resultadoFinal === 'Apto').length}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#151515] p-6 lg:p-8 rounded-3xl shadow-xl shadow-red-200/30 border border-red-50 flex items-center gap-5 hover:-translate-y-1 transition-transform">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-500 text-4xl">cancel</span>
                </div>
                <div>
                  <p className="text-sm text-stone-400 font-bold uppercase tracking-widest mb-1">No Aptos</p>
                  <p className="text-4xl font-black text-red-600">
                    {admitidos.filter(a => a.evaluacion?.resultadoFinal === 'No Apto').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-xl text-stone-800 dark:text-stone-100">Progreso por Mesa Evaluadora</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {tribunals.map(trib => {
                const asps = admitidos.filter(a => a.assignedTribunalId === trib.id);
                const evaluated = asps.filter(a => a.evaluacion && a.evaluacion.resultadoFinal).length;
                const percent = asps.length === 0 ? 0 : Math.round((evaluated / asps.length) * 100);
                return (
                  <div key={trib.id} className="bg-white dark:bg-[#151515] border border-stone-100 dark:border-white/10 rounded-3xl p-8 shadow-xl shadow-stone-200/40 dark:shadow-none relative overflow-hidden group hover:border-red-100 transition-colors">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="flex justify-between items-start mb-6 relative">
                      <div>
                        <h4 className="font-black text-2xl text-stone-800 dark:text-stone-100">{trib.name}</h4>
                        {trib.fecha && <p className="text-xs text-stone-500 font-medium mt-1"><span className="material-symbols-outlined text-[14px] align-middle mr-1">calendar_today</span>{new Date(trib.fecha).toLocaleDateString()}</p>}
                        {trib.convocatoriaId && <p className="text-xs text-stone-500 font-medium"><span className="material-symbols-outlined text-[14px] align-middle mr-1">event</span>{convocatorias?.find(c => c.id === trib.convocatoriaId)?.titulo || 'Convocatoria'}</p>}
                        <p className="text-sm text-stone-400 font-bold uppercase tracking-wider mt-1">{trib.judges?.length} Jueces Asignados</p>
                      </div>
                      <div className="bg-stone-50 dark:bg-white/5 text-stone-600 font-mono font-bold text-base px-4 py-1.5 rounded-lg border border-stone-200 dark:border-white/20 shadow-sm">
                        {evaluated} / {asps.length}
                      </div>
                    </div>

                    <div className="w-full bg-stone-100 dark:bg-white/10 rounded-full h-3 mb-2 overflow-hidden shadow-inner">
                      <div className="bg-gradient-to-r from-red-500 to-red-600 h-full rounded-full transition-all duration-1000 relative" style={{ width: `${percent}%` }}>
                        <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                      </div>
                    </div>
                    <p className="text-right text-[10px] font-bold text-stone-400 uppercase">{percent}% Completado</p>
                  </div>
                );
              })}
            </div>
          </main>
        )}

        {/* ════════════════════════════════════════════════
            TAB: CONSTITUCIÓN DE TRIBUNALES
           ════════════════════════════════════════════════ */}
        {activeTab === 'tribunales' && (
          <main className="flex-1 p-6 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-12">
              <h2 className="font-black text-4xl text-stone-800 dark:text-stone-100 tracking-tight">Constitución de Tribunales Evaluadores</h2>
              <p className="text-lg text-stone-500 dark:text-stone-400 mt-2">Asigna jueces y aspirantes a cada mesa evaluadora con un diseño intuitivo.</p>
            </div>

            <div className="flex flex-col xl:flex-row gap-8">
              {/* Panel jueces disponibles */}
              <aside className="w-full xl:w-1/3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-lg text-stone-800 dark:text-stone-100">Personal Federativo</h3>
                  <span className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800/30 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest">Con Cobertura</span>
                </div>
                <div className="bg-white dark:bg-[#151515] border border-stone-100 dark:border-white/10 rounded-3xl shadow-xl shadow-stone-200/50 p-4 flex flex-col gap-4 min-h-[400px]">
                  {Array.from(new Map(judges.map(j => [j.name.trim().toLowerCase(), j])).values())
                    .filter(j => !j.rank.toLowerCase().includes('director'))
                    .map(judge => {
                    const assignedTo = tribunals.find(t => t.judges?.some(j => j.id === judge.id));
                    return (
                      <div key={judge.id} className="group flex flex-col p-4 bg-white dark:bg-[#151515] hover:bg-stone-50 dark:hover:bg-white/5/80 rounded-2xl border border-stone-200 dark:border-white/20 hover:border-red-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-4 mb-3">
                          <img alt={judge.name} className="w-12 h-12 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-[#151515]" src={judge.avatarUrl} referrerPolicy="no-referrer" />
                          <div>
                            <p className="font-sans font-black text-stone-800 dark:text-stone-100 leading-tight">{judge.name}</p>
                            <span className={`inline-block font-bold text-[9px] uppercase tracking-wider mt-1 px-2 py-0.5 rounded-md ${
                              judge.rank === 'Juez Internacional' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800/30' : 
                              judge.rank === 'Médico' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30' :
                              judge.rank === 'Árbitro Nacional' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800/30' :
                              'bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-white/20'
                            }`}>{judge.rank}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between bg-stone-50 dark:bg-white/5 p-2 rounded-xl border border-stone-100 dark:border-white/10 group-hover:bg-white dark:bg-[#151515] transition-colors">
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider ml-1">Mesa</span>
                          <select
                            className="font-bold text-xs bg-transparent outline-none text-stone-700 dark:text-stone-200 cursor-pointer"
                            value={assignedTo?.id || ''}
                            onChange={e => {
                              const val = e.target.value;
                              if (!val && assignedTo) handleRemoveJudge(judge.id, assignedTo.id);
                              else if (val) handleAssignJudge(judge.id, val);
                            }}
                          >
                            <option value="" className="bg-white dark:bg-[#151515] text-stone-800 dark:text-stone-100">-- Sin Asignar --</option>
                            {tribunals.map(t => <option key={t.id} value={t.id} className="bg-white dark:bg-[#151515] text-stone-800 dark:text-stone-100">{t.name}</option>)}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </aside>

              {/* Mesas */}
              <section className="w-full xl:flex-1">
                <h3 className="font-black text-lg text-stone-800 dark:text-stone-100 mb-4">Mesas Constituidas</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {tribunals.map(trib => {
                    const tribAsps = admitidos.filter(a => a.assignedTribunalId === trib.id);
                    return (
                      <div key={trib.id} className="bg-white dark:bg-[#151515] border border-stone-100 dark:border-white/10 rounded-3xl shadow-xl shadow-stone-200/40 dark:shadow-none p-6 flex flex-col relative overflow-hidden group">
                        {trib.isMain && <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 blur-3xl rounded-full -mr-10 -mt-10"></div>}
                        
                        <div className="flex justify-between items-start mb-6 relative z-10">
                          <div>
                            <h4 className="font-black text-xl text-stone-800 dark:text-stone-100">{trib.name}</h4>
                            {trib.fecha && <p className="text-xs text-stone-500 font-medium mt-1"><span className="material-symbols-outlined text-[14px] align-middle mr-1">calendar_today</span>{new Date(trib.fecha).toLocaleDateString()}</p>}
                            {trib.convocatoriaId && <p className="text-[10px] text-stone-400 font-medium leading-tight mt-0.5"><span className="material-symbols-outlined text-[14px] align-middle mr-1">event</span>{convocatorias?.find(c => c.id === trib.convocatoriaId)?.titulo || 'Convocatoria'}</p>}
                            <div className="mt-2">
                              {trib.isMain
                                ? <span className="font-bold text-[10px] text-red-700 bg-red-50 border border-red-100 py-1 px-3 rounded-full uppercase tracking-widest shadow-sm">Mesa Principal</span>
                                : <span className="font-bold text-[10px] text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-white/10 border border-stone-200 dark:border-white/20 py-1 px-3 rounded-full uppercase tracking-widest shadow-sm">Mesa Auxiliar</span>
                              }
                            </div>
                          </div>
                          {!trib.isMain && (
                            <button
                              onClick={() => handleDeleteTribunal(trib.id, trib.name)}
                              className="text-stone-300 hover:text-red-600 bg-stone-50 dark:bg-white/5 hover:bg-red-50 w-8 h-8 flex items-center justify-center rounded-full transition-colors shadow-sm border border-stone-100 dark:border-white/10"
                              title="Eliminar Tribunal"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}
                        </div>

                        {/* Jueces */}
                        <div className="bg-stone-50 dark:bg-white/5 border border-stone-200/60 rounded-2xl p-4 min-h-[140px] flex flex-col gap-3 mb-6 relative z-10">
                          {trib.judges?.length === 0 ? (
                            <div className="text-center p-6 flex flex-col items-center justify-center h-full">
                              <span className="material-symbols-outlined text-stone-300 text-4xl mb-2">person_add</span>
                              <p className="font-bold text-xs text-stone-400">Asigne jueces desde el padrón</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <span className="font-bold text-[10px] uppercase tracking-widest text-stone-400 block mb-3">Jueces Evaluadores ({trib.judges?.length})</span>
                              {trib.judges?.map(j => (
                                <div key={j.id} className="flex items-center justify-between bg-white dark:bg-[#151515] px-3 py-2.5 rounded-xl border border-stone-200 dark:border-white/20 shadow-sm hover:shadow-md transition-shadow">
                                  <div className="flex items-center gap-3">
                                    <img alt={j.name} className="w-8 h-8 rounded-full object-cover shadow-sm" src={j.avatarUrl} referrerPolicy="no-referrer" />
                                    <div className="flex flex-col">
                                      <span className="font-black text-xs text-stone-800 dark:text-stone-100">{j.name}</span>
                                      <span className="text-[9px] font-bold text-stone-400 uppercase">{j.rank}</span>
                                    </div>
                                  </div>
                                  <button onClick={() => handleRemoveJudge(j.id, trib.id)} className="text-stone-300 hover:text-red-500 bg-stone-50 dark:bg-white/5 hover:bg-red-50 w-6 h-6 flex items-center justify-center rounded-full transition-colors">
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Aspirantes asignados */}
                        <div className="mb-6 relative z-10">
                          <span className="font-bold text-[10px] uppercase tracking-widest text-stone-400 block mb-3">
                            Aspirantes ({tribAsps.length})
                          </span>
                          {tribAsps.length === 0 ? (
                            <span className="text-xs text-stone-400 font-medium">Ningún aspirante asignado.</span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {tribAsps.map(asp => (
                                <div key={asp.id} className="flex items-center gap-1.5 font-bold text-[11px] bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-white/20 py-1.5 px-3 rounded-full shadow-sm hover:bg-stone-200 transition-colors">
                                  <span>{asp.name}</span>
                                  <button onClick={() => handleToggleAsp(asp.id, trib.id)} className="text-stone-400 hover:text-red-600 rounded-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[14px]">cancel</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => setAssigningAspTribunal(trib)}
                          className="mt-auto w-full border border-secondary-custom text-stone-500 dark:text-stone-400 font-sans font-bold text-xs py-2 rounded-lg hover:bg-[#edeeef] hover:text-on-surface transition"
                        >
                          Asignar Aspirantes
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </main>
        )}

        {/* ════════════════════════════════════════════════
            TAB: EVALUACIÓN DE ASPIRANTES
           ════════════════════════════════════════════════ */}
        {activeTab === 'evaluacion' && (
          <main className="flex-1 p-6 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-10">
              <h2 className="font-black text-3xl text-stone-800 dark:text-stone-100 tracking-tight">Evaluación de Aspirantes</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-2">Registra bloque común, específico y votos individuales de forma estructurada.</p>
            </div>

            {admitidos.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-[#151515] border border-stone-100 dark:border-white/10 rounded-3xl shadow-sm">
                <span className="material-symbols-outlined text-6xl mb-4 text-stone-200">how_to_reg</span>
                <p className="font-bold text-stone-500 dark:text-stone-400">No hay aspirantes listos para examen.</p>
                <p className="text-xs mt-1 text-stone-400">El departamento administrativo debe validarlos primero.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {admitidos.map(asp => {
                  const ev = getOrBuildEval(asp);
                  const tribAsignado = tribunals.find(t => t.id === asp.assignedTribunalId);
                  const juecesDisp = (tribAsignado?.judges || judges).filter(j => j.rank.toLowerCase().includes('juez') || j.rank.toLowerCase().includes('evaluador'));
                  const gradoConfig = GRADOS_CONFIG.find(g =>
                    asp.requestedBelt.toLowerCase().includes(g.nombre.toLowerCase())
                  );
                  const necesita80 = gradoConfig?.mayoriaCalificacion === '80pct';
                  const aptosVotos = ev.votos.filter(v => v.resultado === 'Apto').length;
                  const totalVotos = ev.votos.length;

                  const isExpanded = selectedEvalAsp?.id === asp.id;

                  return (
                    <div key={asp.id} className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      {/* Header tarjeta */}
                      <div
                        className="flex flex-col md:flex-row md:items-center justify-between p-5 cursor-pointer hover:bg-stone-50 dark:bg-white/5 transition-colors"
                        onClick={() => setSelectedEvalAsp(isExpanded ? null : asp)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${isExpanded ? 'bg-red-50 text-red-600 border-red-200' : 'bg-stone-50 dark:bg-white/5 text-stone-400 border-stone-200 dark:border-white/20'}`}>
                            <span className="material-symbols-outlined transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                              expand_more
                            </span>
                          </div>
                          <div>
                            <h4 className="font-black text-lg text-stone-800 dark:text-stone-100">{asp.name}</h4>
                            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">{asp.club} · <strong className="text-red-700">{asp.requestedBelt}</strong> · Vía: <strong>{asp.via || '—'}</strong></p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-4 md:mt-0">
                          {tribAsignado && <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{tribAsignado.name}</span>}
                          <span className={`text-[10px] font-bold border px-3 py-1 rounded-full uppercase tracking-widest shadow-sm ${
                            asp.status === 'Apto provisional' ? 'bg-green-50 text-green-700 border-green-200' :
                            asp.status === 'No Apto provisional' ? 'bg-red-50 text-red-700 border-red-200' :
                            asp.status === 'Acta emitida' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {asp.status}
                          </span>
                        </div>
                      </div>

                      {/* Panel de evaluación (expandible) */}
                      {isExpanded && (
                        <div className="border-t border-stone-100 dark:border-white/10 p-6 bg-stone-50/50">
                          {/* Mini-perfil visual */}
                          <div className="flex items-center gap-5 mb-8 bg-white dark:bg-[#151515] p-5 border border-stone-100 dark:border-white/10 rounded-xl shadow-sm">
                            <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-white/10 flex items-center justify-center border border-stone-200 dark:border-white/20 shadow-inner">
                              <span className="material-symbols-outlined text-3xl text-stone-400">person</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-black text-xl text-stone-800 dark:text-stone-100">{asp.name}</p>
                              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-xs text-stone-500 dark:text-stone-400">
                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">storefront</span> <strong>Club:</strong> {asp.club}</span>
                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">sports_martial_arts</span> <strong>Estilo:</strong> {asp.estilo || '—'}</span>
                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">cake</span> <strong>Edad:</strong> {asp.birthDate ? `${new Date().getFullYear() - new Date(asp.birthDate).getFullYear()} años` : '—'}</span>
                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">military_tech</span> <strong>Grado Actual:</strong> {asp.currentBelt || '—'}</span>
                                <span className="flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full font-bold">Solicitado: {asp.requestedBelt}</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* ── Consolidado de Votos de los Jueces ── */}
                            <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-stone-200 dark:border-white/10 shadow-sm flex flex-col h-full">
                              <h5 className="font-black text-lg mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-700">how_to_vote</span>
                                Votos del Tribunal
                              </h5>
                              <p className="text-xs text-stone-500 mb-6 leading-relaxed">
                                Aquí se reflejan los votos emitidos por los jueces asignados a la mesa de forma independiente.
                              </p>

                              <div className="flex-1 flex flex-col gap-3">
                                {juecesDisp.map(j => {
                                  const voto = ev.votos.find(v => v.judgeId === j.id);
                                  return (
                                    <div key={j.id} className={`p-4 rounded-xl border-2 flex items-center justify-between ${
                                      voto?.resultado === 'Apto' ? 'bg-green-50 border-green-200' :
                                      voto?.resultado === 'No Apto' ? 'bg-red-50 border-red-200' :
                                      'bg-stone-50 dark:bg-white/5 border-stone-200 dark:border-white/10'
                                    }`}>
                                      <div className="flex items-center gap-3">
                                        <img alt={j.name} className="w-10 h-10 rounded-full border border-stone-200" src={j.avatarUrl} referrerPolicy="no-referrer" />
                                        <div>
                                          <p className="font-black text-sm text-stone-800 dark:text-stone-100">{j.name}</p>
                                          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{j.rank}</p>
                                        </div>
                                      </div>
                                      {voto?.resultado ? (
                                        <span className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-sm ${
                                          voto.resultado === 'Apto' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                        }`}>
                                          {voto.resultado}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                          <span className="material-symbols-outlined text-[14px]">pending</span> Esperando...
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* ── Panel del Director: Reporte Tatami y Emisión de Acta ── */}
                            <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-stone-200 dark:border-white/10 shadow-sm flex flex-col h-full">
                              <h5 className="font-black text-lg mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-700">workspace_premium</span>
                                Decisión Final del Director
                              </h5>
                              
                              {asp.via === 'Kumite' && (
                                <div className="mb-6 p-4 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl">
                                  <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2">Reporte Tatami (Árbitro)</p>
                                  {ev.bloqueEspecifico?.kumiteDetalles?.resultadoCombate ? (
                                     <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-indigo-600">verified</span>
                                        <span className="font-black text-lg">{ev.bloqueEspecifico.kumiteDetalles.resultadoCombate}</span>
                                     </div>
                                  ) : (
                                     <div className="flex items-center gap-2 text-amber-600">
                                        <span className="material-symbols-outlined text-[18px]">pending</span>
                                        <span className="font-bold text-sm">Esperando combate...</span>
                                     </div>
                                  )}
                                </div>
                              )}

                              <div className="flex-1 flex flex-col justify-end">
                                {totalVotos < Math.max(1, juecesDisp.length) ? (
                                  <div className="p-6 text-center bg-amber-50 rounded-2xl border border-dashed border-amber-200">
                                    <span className="material-symbols-outlined text-3xl text-amber-400 mb-2">lock_clock</span>
                                    <p className="font-bold text-amber-800 text-sm">Faltan votos del tribunal</p>
                                    <p className="text-xs text-amber-700/70 mt-1">
                                      Todos los jueces evaluadores asignados ({juecesDisp.length}) deben emitir su voto individual para habilitar el acta. (Recibidos: {totalVotos}/{juecesDisp.length})
                                    </p>
                                  </div>
                                ) : ev.actaEmitida ? (
                                  <div className="flex flex-col items-center justify-center p-6 text-center bg-indigo-50 border border-indigo-200 rounded-2xl">
                                    <span className="material-symbols-outlined text-5xl text-indigo-600 mb-3">verified</span>
                                    <h4 className="font-black text-2xl text-indigo-900 mb-1">ACTA EMITIDA</h4>
                                    <p className="font-bold text-indigo-800/70 text-sm">El examen ha concluido.</p>
                                    <button onClick={() => setShowActaModal(asp)} className="mt-4 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-colors shadow-lg shadow-indigo-600/30">
                                      Ver Documento Oficial
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-4">
                                    <div className="p-4 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl flex items-center justify-between">
                                      <div>
                                        <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Pre-cálculo de Votos</p>
                                        <p className="font-black text-lg text-stone-800 dark:text-stone-100">{aptosVotos} Aptos / {totalVotos - aptosVotos} No Aptos</p>
                                      </div>
                                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-md uppercase tracking-widest">
                                        {necesita80 ? 'Requiere 80%' : 'Requiere Mayoría'}
                                      </span>
                                    </div>
                                    <button onClick={() => handleEmitirActa(asp.id)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                                      <span className="material-symbols-outlined">gavel</span> Emitir Acta Oficial Definitiva
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        )}

        {/* ════════════════════════════════════════════════
            TAB: HISTORIAL DE ACTAS
           ════════════════════════════════════════════════ */}
        {activeTab === 'historial' && (
          <main className="flex-1 p-6 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="font-black text-3xl text-stone-800 dark:text-stone-100 tracking-tight mb-2">Historial de Actas</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-8">Registro oficial de aspirantes que han concluido el examen con acta emitida.</p>
            
            <div className="bg-white dark:bg-[#151515] border border-stone-100 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl shadow-stone-200/30">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[800px]">
                  <thead className="bg-stone-50 dark:bg-white/5 border-b border-stone-200 dark:border-white/20">
                    <tr>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-stone-400">Aspirante</th>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-stone-400">Grado Alcanzado</th>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-stone-400">Fecha</th>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-stone-400">Resultado Oficial</th>
                      <th className="p-4 font-bold text-[10px] uppercase tracking-widest text-stone-400 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {aspirantes.filter(a => a.status === 'Acta emitida').map(asp => (
                      <tr key={asp.id} className="hover:bg-stone-50 dark:hover:bg-white/5/50 transition-colors group">
                        <td className="p-4">
                          <p className="font-black text-stone-800 dark:text-stone-100">{asp.name}</p>
                          <p className="text-[11px] text-stone-400 font-bold uppercase tracking-wider">{asp.club}</p>
                        </td>
                        <td className="p-4 text-red-600 font-black">{asp.requestedBelt}</td>
                        <td className="p-4 text-stone-500 dark:text-stone-400 font-mono text-xs">
                          {asp.fechaUltimoExamen ? new Date(asp.fechaUltimoExamen).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                            asp.resultadoUltimoExamen === 'Apto' ? 'bg-green-50 text-green-700 border-green-200' :
                            asp.resultadoUltimoExamen === 'No Apto' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {asp.resultadoUltimoExamen}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setShowActaModal(asp)}
                            className="px-4 py-2 bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 text-stone-600 text-xs font-bold rounded-xl hover:bg-stone-100 dark:bg-white/10 hover:text-stone-800 dark:text-stone-100 hover:border-stone-300 transition-all flex items-center gap-2 ml-auto shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span> Ver Acta
                          </button>
                        </td>
                      </tr>
                    ))}
                    {admitidos.filter(a => a.status === 'Acta emitida').length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <span className="material-symbols-outlined text-5xl text-stone-200 mb-3 block">history</span>
                            <p className="font-bold text-stone-500 dark:text-stone-400">No hay actas emitidas todavía.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        )}

        {/* ════════════════════════════════════════════════
            TAB: PADRÓN DE PERSONAL FEDERATIVO
           ════════════════════════════════════════════════ */}
        {activeTab === 'jueces' && (
          <main className="flex-1 p-6 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
              <div>
                <h2 className="font-black text-3xl text-stone-800 dark:text-stone-100 tracking-tight flex items-center gap-3">
                  Padrón de Personal Federativo
                  {onUpdateJudges && (
                    <button
                      onClick={handleAddJudge}
                      className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-full shadow-md shadow-red-700/20 transition-all hover:-translate-y-0.5 flex items-center gap-2 ml-2"
                    >
                      <span className="material-symbols-outlined text-[16px]">person_add</span>
                      Registrar Personal
                    </button>
                  )}
                </h2>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-2">Colegio de jueces, árbitros y médicos con cobertura vigente (RF-42).</p>
              </div>
              <div className="relative w-full lg:w-80">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-[20px]">search</span>
                <input
                  type="text"
                  placeholder="Buscar por nombre o grado..."
                  value={judgeSearch}
                  onChange={e => setJudgeSearch(e.target.value)}
                  className="w-full pl-12 pr-5 py-3 text-sm font-bold bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-full focus:outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100 transition-all shadow-sm"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from(new Map(judges.map(j => [j.name.trim().toLowerCase(), j])).values())
                .filter(j => !j.rank.toLowerCase().includes('director'))
                .filter(j => j.name.toLowerCase().includes(judgeSearch.toLowerCase()) || j.rank.toLowerCase().includes(judgeSearch.toLowerCase()))
                .map(j => {
                const tribAsig = tribunals.find(t => t.judges?.some(jj => jj.id === j.id));
                const evaluacionesHechas = Math.floor(Math.random() * 20) + 5; 
                return (
                  <div key={j.id} className="bg-white dark:bg-[#151515] border border-stone-100 dark:border-white/10 rounded-3xl p-6 flex flex-col shadow-xl shadow-stone-200/30 hover:-translate-y-1 transition-transform group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-start gap-5">
                      <div className="relative">
                        <img alt={j.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-stone-100 dark:border-white/10 shadow-sm" src={j.avatarUrl} referrerPolicy="no-referrer" />
                        <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-4 border-white dark:border-[#151515] flex items-center justify-center shadow-sm ${tribAsig ? 'bg-amber-400' : 'bg-green-500'}`} title={tribAsig ? 'Ocupado' : 'Disponible'}>
                        </div>
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="font-black text-lg text-stone-800 dark:text-stone-100 leading-tight mb-1">{j.name}</p>
                        <span className={`inline-block text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                          j.rank === 'Juez Internacional' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800/30' : 
                          j.rank === 'Médico' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800/30' :
                          j.rank === 'Árbitro Nacional' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800/30' :
                          'bg-stone-50 dark:bg-white/10 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-white/20'
                        }`}>{j.rank}</span>
                        
                        <div className="mt-3">
                          {tribAsig ? (
                            <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 text-[10px] font-bold flex items-center gap-1 w-max">
                              <span className="material-symbols-outlined text-[12px]">gavel</span> {tribAsig.name}
                            </span>
                          ) : (
                            <span className="text-green-700 bg-green-50 px-2 py-1 rounded-lg border border-green-100 text-[10px] font-bold flex items-center gap-1 w-max">
                              <span className="material-symbols-outlined text-[12px]">check_circle</span> Disponible
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between bg-stone-50 dark:bg-white/5 p-4 rounded-2xl border border-stone-100/50 dark:border-white/10">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mb-0.5">Evaluaciones</span>
                        <span className="text-sm font-black text-stone-700 dark:text-stone-200">{evaluacionesHechas} <span className="text-stone-400 font-bold text-xs">este año</span></span>
                      </div>
                      <div className="w-px h-8 bg-stone-200 mx-2"></div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mb-0.5">Licencia</span>
                        <span className="text-sm font-black text-green-600 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">verified</span> Vigente</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {judges.filter(j => j.name.toLowerCase().includes(judgeSearch.toLowerCase()) || j.rank.toLowerCase().includes(judgeSearch.toLowerCase())).length === 0 && (
                <div className="col-span-1 md:col-span-2 xl:col-span-3 text-center py-20 bg-white dark:bg-[#151515] rounded-3xl border border-stone-100 dark:border-white/10 shadow-sm">
                  <span className="material-symbols-outlined text-5xl text-stone-300 mb-3 block">person_off</span>
                  <p className="font-bold text-stone-500 dark:text-stone-400">No se encontraron jueces que coincidan con la búsqueda.</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* ════════════════════════════════════════════════
            TAB: REGLAS POR GRADO
           ════════════════════════════════════════════════ */}
        {activeTab === 'reglas' && (
          <main className="flex-1 p-6 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="font-black text-3xl text-stone-800 dark:text-stone-100 tracking-tight mb-2">Reglas de Calificación por Grado</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-10">Tabla normativa de composición de tribunales y mayoría requerida (RF-43, RF-44).</p>

            <div className="bg-white dark:bg-[#151515] border border-stone-100 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl shadow-stone-200/30">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-stone-50 dark:bg-white/5 border-b border-stone-200 dark:border-white/20">
                      <th className="p-4 text-left font-bold text-[10px] uppercase tracking-widest text-stone-400">Grado</th>
                      <th className="p-4 text-center font-bold text-[10px] uppercase tracking-widest text-stone-400">Edad Mín.</th>
                      <th className="p-4 text-center font-bold text-[10px] uppercase tracking-widest text-stone-400">Permanencia</th>
                      <th className="p-4 text-center font-bold text-[10px] uppercase tracking-widest text-stone-400">Lic. Consec.</th>
                      <th className="p-4 text-center font-bold text-[10px] uppercase tracking-widest text-stone-400">Lic. Alternas</th>
                      <th className="p-4 text-center font-bold text-[10px] uppercase tracking-widest text-stone-400">Mayoría Requerida</th>
                      <th className="p-4 text-center font-bold text-[10px] uppercase tracking-widest text-stone-400">Aval / Currículum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {GRADOS_CONFIG.map(g => (
                      <tr key={g.nombre} className="hover:bg-stone-50 dark:hover:bg-white/5/50 transition-colors">
                        <td className="p-4 font-black text-red-700">{g.nombre}</td>
                        <td className="p-4 text-center text-stone-600">{g.edadMinima} años</td>
                        <td className="p-4 text-center text-stone-600">{g.permanenciaMinMeses} meses</td>
                        <td className="p-4 text-center text-stone-600 font-black">{g.licenciasConsecutivas}</td>
                        <td className="p-4 text-center text-stone-600">{g.licenciasAlternas}</td>
                        <td className="p-4 text-center">
                          <span className={`font-bold uppercase tracking-widest text-[9px] px-3 py-1 rounded-full border ${
                            g.mayoriaCalificacion === '80pct'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-stone-50 dark:bg-white/5 text-stone-600 border-stone-200 dark:border-white/20'
                          }`}>
                            {g.mayoriaCalificacion === '80pct' ? '≥80% Votos' : 'Simple >50%'}
                          </span>
                        </td>
                        <td className="p-4 text-center text-[10px] uppercase tracking-widest">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {g.requiereAval && <span className="bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 rounded-full font-bold">Aval</span>}
                            {g.requiereCurriculum && <span className="bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded-full font-bold">CV</span>}
                            {g.requiereTrabajoEscrito && <span className="bg-purple-50 border border-purple-200 text-purple-700 px-2 py-0.5 rounded-full font-bold">TFM</span>}
                            {!g.requiereAval && !g.requiereCurriculum && <span className="text-stone-400">—</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8 p-6 bg-amber-50 border border-amber-100 rounded-2xl flex gap-4 items-start shadow-sm">
              <span className="material-symbols-outlined text-amber-500 text-2xl">warning</span>
              <div>
                <p className="font-black text-amber-900 mb-1">Regla especial — Bloque Específico (RF-41)</p>
                <p className="text-sm text-amber-800/80 leading-relaxed">Los aspirantes mayores de <strong>41 años</strong> quedan exentos del bloque específico (Kumite/Campeonatos/Técnica). El Jyu Kumite se integra al bloque común como ejercicio de demostración.</p>
              </div>
            </div>
          </main>
        )}

        {/* ════════════════════════════════════════════════
            TAB: PERFIL
           ════════════════════════════════════════════════ */}
        {activeTab === 'perfil' && (
          <main className="flex-1 p-6 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex flex-col items-start">
            <ConfiguracionPerfilFederativo 
              roleName="Administrador de Tribunales" 
              defaultName={judges.find(j => j.id === activeJudgeId)?.name || "Director de Tribunales"} 
              defaultEmail={judges.find(j => j.id === activeJudgeId)?.email || "No registrado"}
            />
          </main>
        )}

      </div>
      </main>

      {/* ── Modal asignar aspirantes ──────────────────────────────────────── */}
      {assigningAspTribunal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#151515] border border-[#e1e3e4] rounded-xl max-w-[500px] w-full p-6 shadow-2xl relative">
            <button onClick={() => setAssigningAspTribunal(null)} className="absolute right-4 top-4 text-stone-400 hover:text-stone-700 dark:text-stone-200">
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="font-bold text-base text-red-700 mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined">gavel</span>
              Asignar Aspirantes a {assigningAspTribunal.name}
            </h3>
            <p className="font-sans text-xs text-on-surface-variant mb-4 leading-relaxed">
              Solo los aspirantes con expediente <span className="font-bold text-[#1e40af]">Validado o Admitido</span> pueden asignarse a un tribunal (RF-13).
            </p>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 mb-5">
              {admitidos.length === 0 && (
                <div className="text-center py-6 text-xs text-stone-500 dark:text-stone-400 italic">
                  No hay aspirantes admitidos a examen en este momento.
                </div>
              )}
              {admitidos.map(asp => {
                const isHere = asp.assignedTribunalId === assigningAspTribunal.id;
                const isOther = asp.assignedTribunalId && asp.assignedTribunalId !== assigningAspTribunal.id;
                return (
                  <div
                    key={asp.id}
                    onClick={() => handleToggleAsp(asp.id, assigningAspTribunal.id)}
                    className={`flex items-center justify-between p-3 rounded border text-xs cursor-pointer transition-all ${
                      isHere ? 'border-blue-500 bg-stone-50/50' :
                        isOther ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10' :
                      'border-stone-200 dark:border-white/20 hover:bg-stone-50 dark:bg-white/5'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-stone-800 dark:text-stone-100">{asp.name}</h4>
                      <p className="font-mono text-[10px] text-slate-500 mt-0.5">{asp.club} · <span className="text-red-900 font-bold">{asp.requestedBelt}</span></p>
                    </div>
                    {isHere ? <span className="text-[#1e40af] font-bold">Asignado ✓</span> :
                     isOther ? <span className="text-stone-500 dark:text-stone-400 font-mono text-[10px]">Otro tribunal</span> :
                     <span className="text-stone-400">Asignar +</span>}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end pt-3 border-t border-[#e1e3e4]">
              <button onClick={() => setAssigningAspTribunal(null)}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded font-bold text-xs transition shadow cursor-pointer">
                Cerrar Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {showActaModal && (
        <ActaImprimible
          aspirante={showActaModal}
          tribunal={tribunals.find(t => t.id === showActaModal.assignedTribunalId)}
          convocatoria={convocatorias.find(c => c.id === showActaModal.convocatoriaId)}
          jueces={judges}
          onClose={() => {
            setShowActaModal(null);
          }}
          onPrint={() => window.print()}
        />
      )}

      {/* ── Modal Alta de Juez (Estructurado) ───────────────────────────── */}
      {showAddJudgeModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl max-w-[800px] w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header premium */}
            <div className="bg-stone-50 dark:bg-white/5 border-b border-stone-200 dark:border-white/20 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-red-600 bg-red-100 p-2 rounded-lg">how_to_reg</span>
                <div>
                  <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest">Área Administrativa</p>
                  <h3 className="font-black text-lg text-stone-800 dark:text-stone-100">REGISTRO DE NUEVO JUEZ COLEGIADO</h3>
                </div>
              </div>
              <button onClick={() => setShowAddJudgeModal(false)} className="text-stone-400 hover:text-stone-600 bg-stone-100 dark:bg-white/10 hover:bg-stone-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Formulario en Grid */}
            <form onSubmit={submitNewJudge} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-stone-600">Nombre completo del juez *</label>
                  <input
                    required
                    type="text"
                    value={newJudgeForm.name}
                    onChange={e => setNewJudgeForm({...newJudgeForm, name: e.target.value})}
                    placeholder="E.g. Juan Pérez Gómez"
                    className="w-full bg-white dark:bg-[#151515] border border-stone-300 text-stone-800 dark:text-stone-100 placeholder-stone-400 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-stone-600">Número de Licencia / DNI *</label>
                  <input
                    required
                    type="text"
                    value={newJudgeForm.license}
                    onChange={e => setNewJudgeForm({...newJudgeForm, license: e.target.value})}
                    placeholder="E.g. COL-84920"
                    className="w-full bg-white dark:bg-[#151515] border border-stone-300 text-stone-800 dark:text-stone-100 placeholder-stone-400 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-stone-600">Rango / Categoría *</label>
                  <select
                    value={newJudgeForm.rank}
                    onChange={e => setNewJudgeForm({...newJudgeForm, rank: e.target.value})}
                    className="w-full bg-white dark:bg-[#151515] border border-stone-300 text-stone-800 dark:text-stone-100 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  >
                    <option>Juez Regional</option>
                    <option>Juez Nacional B</option>
                    <option>Juez Nacional A</option>
                    <option>Juez Internacional</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-stone-600">Federación / Sede *</label>
                  <select
                    value={newJudgeForm.federacion}
                    onChange={e => setNewJudgeForm({...newJudgeForm, federacion: e.target.value})}
                    className="w-full bg-white dark:bg-[#151515] border border-stone-300 text-stone-800 dark:text-stone-100 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  >
                    <option>Federación Madrileña de Karate</option>
                    <option>Federación Andaluza de Karate</option>
                    <option>RFEK (Nacional)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-stone-600">Fecha de Expedición</label>
                  <input
                    type="date"
                    value={newJudgeForm.date}
                    onChange={e => setNewJudgeForm({...newJudgeForm, date: e.target.value})}
                    className="w-full bg-white dark:bg-[#151515] border border-stone-300 text-stone-800 dark:text-stone-100 placeholder-stone-400 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-stone-600">Correo Electrónico Oficial *</label>
                  <input
                    required
                    type="email"
                    value={newJudgeForm.email}
                    onChange={e => setNewJudgeForm({...newJudgeForm, email: e.target.value})}
                    placeholder="E.g. juez@fmkarate.com"
                    className="w-full bg-white dark:bg-[#151515] border border-stone-300 text-stone-800 dark:text-stone-100 placeholder-stone-400 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                  />
                </div>

              </div>

              <div className="mt-8 pt-6 border-t border-stone-200 dark:border-white/20 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddJudgeModal(false)}
                  className="px-5 py-2 rounded font-bold text-sm text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:text-stone-100 hover:bg-stone-100 dark:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded shadow transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  Completar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Add Tribunal ── */}
      {showAddTribunalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#151515] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-stone-200 dark:border-white/10 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-stone-100 dark:border-white/10 flex justify-between items-center bg-stone-50/50 dark:bg-white/5">
              <h3 className="font-black text-lg text-stone-800 dark:text-stone-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">add_business</span>
                Crear Nueva Mesa
              </h3>
              <button onClick={() => setShowAddTribunalModal(false)} className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-200 dark:hover:bg-white/10">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!newTribunalForm.name.trim()) return;
              
              showConfirm(
                'Crear Mesa',
                `¿Crear el tribunal "${newTribunalForm.name.trim()}"?`,
                () => {
                  const nuevoTribunal: Tribunal = { 
                    id: generateUUID(), 
                    name: newTribunalForm.name.trim(), 
                    isMain: false, 
                    judges: [],
                    fecha: newTribunalForm.fecha || undefined,
                    convocatoriaId: newTribunalForm.convocatoriaId || undefined
                  };
                  if (onAddTribunalAtomic) {
                    onAddTribunalAtomic(nuevoTribunal);
                  } else {
                    onUpdateTribunals([...tribunals, nuevoTribunal]);
                  }
                  setActiveTab('tribunales');
                  setShowAddTribunalModal(false);
                  showAlert('Tribunal Creado', `Tribunal "${nuevoTribunal.name}" creado exitosamente.`);
                },
                'Crear'
              );
            }} className="p-6">
              
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">Nombre de la Mesa *</label>
                  <input
                    required
                    type="text"
                    value={newTribunalForm.name}
                    onChange={e => setNewTribunalForm({...newTribunalForm, name: e.target.value})}
                    placeholder="E.g. Tribunal A - Kyu"
                    className="w-full bg-stone-50 dark:bg-[#111] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-stone-100 placeholder-stone-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">Fecha Asignada</label>
                  <input
                    type="date"
                    value={newTribunalForm.fecha}
                    onChange={e => setNewTribunalForm({...newTribunalForm, fecha: e.target.value})}
                    className="w-full bg-stone-50 dark:bg-[#111] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-stone-100 placeholder-stone-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                  />
                </div>

                {convocatorias && convocatorias.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-stone-600 uppercase tracking-wider">Convocatoria Relacionada</label>
                    <select
                      value={newTribunalForm.convocatoriaId}
                      onChange={e => setNewTribunalForm({...newTribunalForm, convocatoriaId: e.target.value})}
                      className="w-full bg-stone-50 dark:bg-[#111] border border-stone-200 dark:border-white/10 text-stone-800 dark:text-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    >
                      <option value="" className="bg-white dark:bg-[#151515] text-stone-800 dark:text-stone-100">Ninguna / Abierta</option>
                      {convocatorias.map(c => (
                        <option key={c.id} value={c.id} className="bg-white dark:bg-[#151515] text-stone-800 dark:text-stone-100">{c.titulo} ({new Date(c.fecha).toLocaleDateString()})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-stone-100 dark:border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddTribunalModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:text-stone-100 hover:bg-stone-100 dark:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-700/20 transition-all flex items-center gap-2 hover:-translate-y-0.5"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Guardar Mesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
