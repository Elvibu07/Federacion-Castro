import React, { useState, useMemo } from 'react';
import { Aspirante, Judge, Tribunal, Evaluacion, ParteBloqueComun, VotoJuez, ViaExamen } from '../types';
import { GRADOS_CONFIG } from '../data';
import { useUI } from '../contexts/UIContext';

interface JudgePortalProps {
  activeJudgeId: string;
  judges: Judge[];
  tribunals: Tribunal[];
  aspirantes: Aspirante[];
  onUpdateAspirantes: (updated: Aspirante[]) => void;
  onUpdateAspiranteAtomic?: (id: string, updates: Partial<Aspirante>) => void;
  onLogout: () => void;
}

const toggleDarkMode = () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  window.dispatchEvent(new Event('theme_changed'));
};

const PARTES_BLOQUE_COMUN: Omit<ParteBloqueComun, 'completada' | 'resultado'>[] = [
  { id: 'kihon',    nombre: 'Kihon Waza' },
  { id: 'kata',     nombre: 'Kata' },
  { id: 'kihon_kumite', nombre: 'Kihon Kumite' },
  { id: 'bunkai',   nombre: 'Bunkai Kumite' },
  { id: 'oyo',      nombre: 'Oyo Waza' },
  { id: 'coloquio', nombre: 'Coloquio / Temario' },
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

export default function JudgePortal({
  activeJudgeId,
  judges,
  tribunals,
  aspirantes,
  onUpdateAspirantes,
  onUpdateAspiranteAtomic,
  onLogout,
}: JudgePortalProps) {
  const { showConfirm, showAlert } = useUI();
  const [selectedAspId, setSelectedAspId] = useState<string | null>(null);

  // Identify the active judge and their assigned tribunal
  const activeJudge = judges.find(j => j.id === activeJudgeId);
  const myTribunal = tribunals.find(t => t.judges.some(j => j.id === activeJudgeId));

  // Find aspirantes assigned to my tribunal who are admitted/in-evaluation
  const myAspirantes = useMemo(() => {
    if (!myTribunal) return [];
    return aspirantes.filter(a => 
      a.assignedTribunalId === myTribunal.id && 
      (a.status === 'Validada' || a.status === 'Admitida' || a.status === 'En evaluación' || a.status === 'Apto provisional' || a.status === 'No Apto provisional')
    );
  }, [aspirantes, myTribunal]);

  // Evaluacion Helpers
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
  };

  const handleIniciarMiPlanilla = (aspId: string) => {
    const asp = aspirantes.find(a => a.id === aspId)!;
    const ev = getOrBuildEval(asp);
    
    // Inicia la evaluación general si no estaba
    const updatedEv = { ...ev, bloqueComun: { ...ev.bloqueComun, iniciado: true } };

    const newVoto: VotoJuez = {
      judgeId: activeJudge.id,
      bloqueComun: {
        partes: PARTES_BLOQUE_COMUN.map(p => ({ ...p, completada: false })),
        resultado: null,
      },
      bloqueEspecifico: { resultado: null },
      resultado: null
    };

    updatedEv.votos = [...updatedEv.votos.filter(v => v.judgeId !== activeJudge.id), newVoto];
    
    if (onUpdateAspiranteAtomic) {
      onUpdateAspiranteAtomic(aspId, { evaluacion: updatedEv, status: 'En evaluación' });
    } else {
      onUpdateAspirantes(aspirantes.map(a =>
        a.id === aspId ? { ...a, evaluacion: updatedEv, status: 'En evaluación' } : a
      ));
    }
  };

  const handleToggleParte = (aspId: string, parteId: string, resultado: 'Apto' | 'No Apto') => {
    const asp = aspirantes.find(a => a.id === aspId)!;
    const ev = getOrBuildEval(asp);
    const miVoto = ev.votos.find(v => v.judgeId === activeJudge.id);
    if (!miVoto) return;

    const partes = miVoto.bloqueComun.partes.map(p =>
      p.id === parteId ? { ...p, completada: true, resultado } : p
    );
    const todasCompletas = partes.every(p => p.completada);
    const todosAptos     = partes.every(p => p.resultado === 'Apto');
    
    const updatedMiVoto: VotoJuez = {
      ...miVoto,
      bloqueComun: {
        partes,
        resultado: todasCompletas ? (todosAptos ? 'Apto' : 'No Apto') : null
      }
    };

    const votos = ev.votos.map(v => v.judgeId === activeJudge.id ? updatedMiVoto : v);
    updateEval(aspId, { ...ev, votos });
  };

  const handleResultadoBloqueEsp = (aspId: string, resultado: 'Apto' | 'No Apto') => {
    const asp = aspirantes.find(a => a.id === aspId)!;
    showConfirm(
      'Calificar Bloque Específico',
      `¿Confirmar calificación de ${resultado} para el bloque específico de ${asp.name}?`,
      () => {
        const ev = getOrBuildEval(asp);
        const miVoto = ev.votos.find(v => v.judgeId === activeJudge.id);
        if (!miVoto) return;

        const updatedMiVoto: VotoJuez = {
          ...miVoto,
          bloqueEspecifico: { resultado }
        };

        const votos = ev.votos.map(v => v.judgeId === activeJudge.id ? updatedMiVoto : v);
        updateEval(aspId, { ...ev, votos });
        showAlert('Calificación Guardada', `La calificación de ${resultado} ha sido registrada exitosamente.`);
      },
      'Confirmar'
    );
  };

  const handleVoto = (aspId: string, res: 'Apto' | 'No Apto') => {
    if (!activeJudge) return;
    const asp = aspirantes.find(a => a.id === aspId)!;
    
    showConfirm(
      'Emitir Voto Final',
      `¿Estás seguro de emitir tu voto final como ${res} para ${asp.name}? Tu decisión se enviará al Director del Tribunal.`,
      () => {
        const ev = getOrBuildEval(asp);
        const miVoto = ev.votos.find(v => v.judgeId === activeJudge.id);
        if (!miVoto) return;

        const updatedMiVoto: VotoJuez = { ...miVoto, resultado: res };
        const votos = ev.votos.map(v => v.judgeId === activeJudge.id ? updatedMiVoto : v);
        
        updateEval(aspId, { ...ev, votos });
        showAlert('Voto Registrado', `Tu voto como ${res} ha sido enviado correctamente.`);
      },
      'Emitir Voto'
    );
  };

  if (!activeJudge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] dark:bg-[#0a0a0a]">
        <div className="bg-white dark:bg-[#151515] p-8 rounded-2xl shadow-xl border border-stone-200 dark:border-white/10 text-center">
           <span className="material-symbols-outlined text-red-600 text-5xl mb-4">error</span>
           <h2 className="font-black text-xl text-stone-800 dark:text-stone-100 mb-2">Error de Identidad</h2>
           <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">No se ha podido cargar tu perfil de Juez Evaluador.</p>
           <button onClick={onLogout} className="px-5 py-2.5 bg-stone-900 text-white rounded-lg font-bold text-sm hover:bg-stone-800">Cerrar Sesión</button>
        </div>
      </div>
    );
  }

  const selectedAsp = selectedAspId ? myAspirantes.find(a => a.id === selectedAspId) : null;
  const evSelected = selectedAsp ? getOrBuildEval(selectedAsp) : null;
  const miVoto = evSelected?.votos.find(v => v.judgeId === activeJudge.id);

  return (
    <div className="bg-[#f8f9fa] dark:bg-[#0a0a0a] text-stone-800 dark:text-stone-100 font-sans min-h-screen flex">
      
      {/* Mobile Header */}
      <div className="xl:hidden sticky top-0 z-40 bg-white/80 dark:bg-[#151515]/80 backdrop-blur-md border-b border-stone-200 dark:border-white/20 p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
           <img src={activeJudge.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border-2 border-red-600 shadow-sm" />
           <div>
             <span className="font-bold text-stone-800 dark:text-stone-100 text-sm leading-tight block">{activeJudge.name}</span>
             <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest block">{activeJudge.rank}</span>
           </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleDarkMode} className="text-stone-500 dark:text-stone-400 flex items-center justify-center w-8 h-8 hover:bg-stone-100 dark:hover:bg-white/10 rounded-md transition-all">
            <span className="material-symbols-outlined text-[18px]">dark_mode</span>
          </button>
          <button onClick={onLogout} className="text-stone-500 dark:text-stone-400 flex items-center justify-center w-8 h-8 hover:bg-red-50 hover:text-red-600 rounded-md transition-all">
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>

      {/* ── Sidebar: Lista de Aspirantes ── */}
      <nav className="hidden xl:flex flex-col h-screen w-80 fixed left-0 top-0 border-r border-stone-200/50 dark:border-white/10 shadow-2xl shadow-stone-200/20 bg-white dark:bg-[#151515] py-8 z-50 overflow-hidden print:hidden">
        
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-br from-red-50 to-red-100/50 rounded-full blur-3xl -translate-y-24 translate-x-12 mix-blend-multiply pointer-events-none" />

        {/* Header Perfil Juez */}
        <div className="px-8 mb-10 relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <img src={activeJudge.avatarUrl} alt="Avatar" className="w-12 h-12 rounded-2xl border-2 border-red-600 shadow-sm object-cover" />
             <div className="flex flex-col">
               <span className="font-black text-stone-800 dark:text-stone-100 text-lg tracking-wide leading-tight truncate max-w-[140px]" title={activeJudge.name}>{activeJudge.name}</span>
               <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">{activeJudge.rank}</span>
             </div>
          </div>
          <button onClick={toggleDarkMode} className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/10 flex items-center justify-center text-stone-500 dark:text-stone-300 hover:text-stone-800 dark:hover:text-white transition-colors" title="Cambiar Tema">
            <span className="material-symbols-outlined text-[18px]">dark_mode</span>
          </button>
        </div>

        {/* Info Mesa */}
        <div className="p-6 bg-red-700 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-red-500 rounded-full blur-2xl opacity-50 -translate-y-10 translate-x-10 pointer-events-none"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-red-200 mb-2">Mesa Evaluadora Asignada</p>
          <h2 className="font-black text-2xl flex items-center gap-2 relative z-10">
            <span className="material-symbols-outlined text-[28px]">gavel</span>
            {myTribunal ? myTribunal.name : 'Sin Asignar'}
          </h2>
          {myTribunal && (
             <p className="text-sm text-red-100 mt-2 font-bold flex items-center gap-1">
               <span className="material-symbols-outlined text-[16px]">groups</span> {myTribunal.judges.length} Jueces en sala
             </p>
          )}
        </div>

        {/* Lista Aspirantes */}
        <div className="flex-1 overflow-y-auto kanban-scroll p-6 flex flex-col gap-4">
          <h3 className="font-bold text-xs uppercase tracking-widest text-stone-400 mb-2">Aspirantes ({myAspirantes.length})</h3>
          
          {!myTribunal ? (
            <div className="text-center p-6 bg-amber-50 rounded-xl border border-amber-200">
               <span className="material-symbols-outlined text-amber-500 text-3xl mb-2">warning</span>
               <p className="text-xs font-bold text-amber-800">No tienes ninguna mesa asignada hoy. Consulta con el administrador.</p>
            </div>
          ) : myAspirantes.length === 0 ? (
            <div className="text-center p-6 border border-dashed border-stone-300 dark:border-white/20 rounded-xl">
               <span className="material-symbols-outlined text-stone-400 text-3xl mb-2">person_off</span>
               <p className="text-xs font-bold text-stone-500">No hay aspirantes pendientes.</p>
            </div>
          ) : (
            myAspirantes.map(asp => {
              const ev = getOrBuildEval(asp);
              const miV = ev.votos.find(v => v.judgeId === activeJudge.id);
              const isSelected = selectedAspId === asp.id;
              
              let statusColor = "bg-white dark:bg-[#151515] border-stone-200 dark:border-white/10 text-stone-800 dark:text-stone-100";
              let statusBadge = "";
              if (isSelected) statusColor = "bg-red-50 dark:bg-red-900/20 border-red-300 text-red-900 dark:text-red-100 shadow-md ring-2 ring-red-500/20";
              
              if (miV?.resultado === 'Apto') statusBadge = "bg-green-100 text-green-800 border-green-200";
              else if (miV?.resultado === 'No Apto') statusBadge = "bg-red-100 text-red-800 border-red-200";
              else if (ev.bloqueComun.iniciado) statusBadge = "bg-blue-100 text-blue-800 border-blue-200";

              return (
                <div 
                  key={asp.id} 
                  onClick={() => setSelectedAspId(asp.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:border-red-400 hover:shadow-md flex flex-col gap-2 ${statusColor}`}
                >
                  <div className="flex justify-between items-start">
                     <div>
                       <p className="font-black text-sm">{asp.name}</p>
                       <p className="font-mono text-[10px] opacity-70 mt-0.5">{asp.club}</p>
                     </div>
                     {statusBadge && (
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${statusBadge}`}>
                          {miV ? `Tu Voto: ${miV.resultado}` : 'En Proceso'}
                        </span>
                     )}
                  </div>
                  <div className="flex justify-between items-end mt-2">
                     <span className="font-black text-xs text-red-700 bg-red-100/50 dark:bg-white/10 px-2 py-1 rounded">{asp.requestedBelt}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {/* Footer Actions */}
        <div className="mt-auto px-8 pt-8 border-t border-stone-100 dark:border-white/10 relative z-10 bg-white dark:bg-[#151515] space-y-2">
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl border border-stone-200 dark:border-white/20 text-stone-500 dark:text-stone-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all text-sm font-bold cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* ── Main Content Area ── */}
      <main className="flex-1 xl:ml-80 flex flex-col h-screen overflow-y-auto bg-stone-100 dark:bg-[#0a0a0a]">
        {!selectedAsp || !evSelected ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-50">
             <span className="material-symbols-outlined text-8xl mb-6 text-stone-300">fact_check</span>
             <h2 className="font-black text-4xl mb-4">Panel de Calificación</h2>
             <p className="font-bold text-lg max-w-lg">Selecciona un aspirante de la lista para comenzar su evaluación.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 lg:p-12 kanban-scroll animate-in fade-in slide-in-from-right-8 duration-300 max-w-7xl mx-auto w-full">
            
            {/* Header Aspirante */}
            <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl shadow-xl shadow-stone-200/30 border border-stone-200 dark:border-white/10 mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
               <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/10 flex items-center justify-center shadow-inner">
                    <span className="material-symbols-outlined text-4xl text-stone-400">person</span>
                  </div>
                  <div>
                    <h2 className="font-black text-4xl tracking-tight text-stone-900 dark:text-stone-100 mb-2">{selectedAsp.name}</h2>
                    <div className="flex flex-wrap gap-2 text-sm font-bold text-stone-500 uppercase tracking-widest">
                       <span className="bg-stone-100 dark:bg-white/10 px-2 py-1 rounded-md">#{selectedAsp.id}</span>
                       <span className="bg-stone-100 dark:bg-white/10 px-2 py-1 rounded-md">{selectedAsp.club}</span>
                       <span className="bg-red-50 text-red-700 px-2 py-1 rounded-md border border-red-200">A {selectedAsp.requestedBelt}</span>
                       <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-200">Vía: {selectedAsp.via || 'Regular'}</span>
                    </div>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
               
               {/* Columna Izquierda: Bloque Común y Específico */}
               <div className="flex flex-col gap-6">
                  
                  {/* Bloque Común */}
                  <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-stone-200 dark:border-white/10 shadow-sm">
                     <h3 className="font-black text-lg mb-4 flex items-center gap-2">
                       <span className="material-symbols-outlined text-red-600">lists</span> Bloque Común (RF-35)
                     </h3>
                     
                     {!miVoto ? (
                       <button onClick={() => handleIniciarMiPlanilla(selectedAsp.id)} className="w-full py-4 bg-stone-900 dark:bg-white hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all">
                         Iniciar Mi Planilla
                       </button>
                     ) : (
                       <div className="space-y-3">
                         {miVoto.bloqueComun.partes.map(parte => (
                           <div key={parte.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border-2 transition-all ${
                             parte.resultado === 'Apto' ? 'bg-green-50 border-green-300' :
                             parte.resultado === 'No Apto' ? 'bg-red-50 border-red-300' :
                             'bg-stone-50 dark:bg-white/5 border-stone-200 dark:border-white/10'
                           }`}>
                             <span className="font-black text-sm mb-2 sm:mb-0 text-stone-800 dark:text-stone-100">{parte.nombre}</span>
                             {parte.completada ? (
                               <span className={`text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg ${
                                 parte.resultado === 'Apto' ? 'bg-green-500 text-white shadow-md shadow-green-500/20' : 'bg-red-500 text-white shadow-md shadow-red-500/20'
                               }`}>{parte.resultado}</span>
                             ) : (
                               <div className="flex gap-2">
                                 <button onClick={() => handleToggleParte(selectedAsp.id, parte.id, 'No Apto')} disabled={miVoto.resultado !== null} className="flex-1 sm:flex-none px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-black text-xs rounded-lg uppercase tracking-widest border border-red-200 transition-colors disabled:opacity-50">No Apto</button>
                                 <button onClick={() => handleToggleParte(selectedAsp.id, parte.id, 'Apto')} disabled={miVoto.resultado !== null} className="flex-1 sm:flex-none px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 font-black text-xs rounded-lg uppercase tracking-widest border border-green-200 transition-colors disabled:opacity-50">Apto</button>
                               </div>
                             )}
                           </div>
                         ))}
                         {miVoto.bloqueComun.resultado && (
                           <div className={`mt-4 p-4 rounded-xl text-center font-black uppercase tracking-widest ${
                             miVoto.bloqueComun.resultado === 'Apto' ? 'bg-green-100 text-green-800 border-2 border-green-400' : 'bg-red-100 text-red-800 border-2 border-red-400'
                           }`}>
                             Bloque Común: {miVoto.bloqueComun.resultado}
                           </div>
                         )}
                       </div>
                     )}
                  </div>

                  {/* Bloque Específico */}
                  <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-stone-200 dark:border-white/10 shadow-sm">
                     <h3 className="font-black text-lg mb-4 flex items-center gap-2">
                       <span className="material-symbols-outlined text-red-600">sports_martial_arts</span> Bloque Específico
                     </h3>
                     {evSelected.exentoBloqueEspecifico ? (
                        <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl text-green-800 font-bold flex items-center gap-3">
                          <span className="material-symbols-outlined text-green-600">check_circle</span> Exento (Mayores de 41 años)
                        </div>
                     ) : !miVoto ? (
                        <div className="p-4 bg-stone-50 dark:bg-white/5 border border-dashed border-stone-300 dark:border-white/20 rounded-xl text-stone-500 dark:text-stone-400 font-bold text-center">
                          Inicia tu planilla primero.
                        </div>
                     ) : miVoto.bloqueComun.resultado === 'No Apto' ? (
                        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-800 font-bold text-center">
                          Bloqueado (No superó fase técnica).
                        </div>
                     ) : miVoto.bloqueEspecifico?.resultado ? (
                        <div className={`p-4 rounded-xl text-center font-black uppercase tracking-widest ${
                             miVoto.bloqueEspecifico.resultado === 'Apto' ? 'bg-green-100 text-green-800 border-2 border-green-400' : 'bg-red-100 text-red-800 border-2 border-red-400'
                           }`}>
                             Bloque Específico: {miVoto.bloqueEspecifico.resultado}
                        </div>
                     ) : (
                        <div className="flex flex-col gap-4">
                           {selectedAsp.via === 'Kumite' && (
                             <div className="p-4 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl">
                                <p className="text-xs font-bold text-stone-500 uppercase mb-1">Reporte del Árbitro Auxiliar</p>
                                {evSelected.bloqueEspecifico?.kumiteDetalles?.resultadoCombate ? (
                                   <div className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-green-600">verified</span>
                                      <span className="font-black text-lg">{evSelected.bloqueEspecifico.kumiteDetalles.resultadoCombate}</span>
                                   </div>
                                ) : (
                                   <div className="flex items-center gap-2 text-amber-600">
                                      <span className="material-symbols-outlined">pending</span>
                                      <span className="font-bold text-sm">Esperando resultado del tatami...</span>
                                   </div>
                                )}
                             </div>
                           )}
                           <div className="flex gap-4">
                              <button 
                                onClick={() => handleResultadoBloqueEsp(selectedAsp.id, 'No Apto')} 
                                disabled={selectedAsp.via === 'Kumite' && !evSelected.bloqueEspecifico?.kumiteDetalles?.resultadoCombate}
                                className="flex-1 py-4 bg-red-100 hover:bg-red-200 text-red-700 font-black rounded-xl uppercase tracking-widest border border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                No Apto
                              </button>
                              <button 
                                onClick={() => handleResultadoBloqueEsp(selectedAsp.id, 'Apto')} 
                                disabled={selectedAsp.via === 'Kumite' && !evSelected.bloqueEspecifico?.kumiteDetalles?.resultadoCombate}
                                className="flex-1 py-4 bg-green-100 hover:bg-green-200 text-green-700 font-black rounded-xl uppercase tracking-widest border border-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                Apto
                              </button>
                           </div>
                        </div>
                     )}
                     
                     {!evSelected.exentoBloqueEspecifico && evSelected.bloqueComun.iniciado && (
                        <button onClick={() => {
                          const ev = getOrBuildEval(selectedAsp);
                          updateEval(selectedAsp.id, { ...ev, exentoBloqueEspecifico: true });
                        }} className="mt-4 text-[10px] font-bold text-stone-400 hover:text-red-600 uppercase tracking-widest underline w-full text-center">
                          Aplicar Exención por Edad (+41)
                        </button>
                     )}
                  </div>
               </div>

               {/* Columna Derecha: Veredicto Final */}
               <div>
                 <div className={`bg-white dark:bg-[#151515] p-6 lg:p-8 rounded-3xl border-4 shadow-2xl sticky top-8 transition-colors duration-500 ${
                   miVoto?.resultado === 'Apto' ? 'border-green-500 shadow-green-500/10' :
                   miVoto?.resultado === 'No Apto' ? 'border-red-500 shadow-red-500/10' :
                   'border-stone-200 dark:border-white/10'
                 }`}>
                    <h3 className="font-black text-2xl mb-2 text-center text-stone-800 dark:text-stone-100">Tu Veredicto</h3>
                    <p className="text-xs font-bold text-stone-500 text-center uppercase tracking-widest mb-8">Decisión Final Individual (RF-44)</p>
                    
                    {(!miVoto || !miVoto.bloqueComun.resultado || (!evSelected.exentoBloqueEspecifico && !miVoto.bloqueEspecifico?.resultado)) ? (
                      <div className="p-8 text-center bg-stone-50 dark:bg-white/5 rounded-2xl border border-dashed border-stone-300 dark:border-white/20">
                         <span className="material-symbols-outlined text-4xl text-stone-300 mb-2">lock</span>
                         <p className="font-bold text-stone-500 text-sm">Rellena tu planilla técnica y específica para habilitar tu voto final.</p>
                      </div>
                    ) : miVoto.resultado !== null ? (
                      <div className="flex flex-col items-center justify-center p-6 text-center">
                         <span className={`material-symbols-outlined text-6xl mb-4 ${miVoto.resultado === 'Apto' ? 'text-green-500' : 'text-red-500'}`}>
                           {miVoto.resultado === 'Apto' ? 'verified' : 'cancel'}
                         </span>
                         <h4 className="font-black text-3xl uppercase tracking-tighter mb-2">Has votado: {miVoto.resultado}</h4>
                         <p className="font-bold text-stone-500 text-sm">Tu voto se sumará al del resto de la mesa. El Director emitirá el acta.</p>
                         <button onClick={() => {
                            const updatedMiVoto = { ...miVoto, resultado: null };
                            const votos = evSelected.votos.map(v => v.judgeId === activeJudge.id ? updatedMiVoto : v);
                            updateEval(selectedAsp.id, { ...evSelected, votos });
                         }} className="mt-8 text-xs font-bold px-4 py-2 bg-stone-100 dark:bg-white/10 hover:bg-stone-200 text-stone-600 rounded-lg uppercase tracking-widest transition-colors">
                           Modificar mi voto
                         </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                         <button onClick={() => handleVoto(selectedAsp.id, 'Apto')} className="w-full py-8 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black text-2xl shadow-xl shadow-green-500/30 uppercase tracking-widest flex flex-col items-center gap-2 hover:-translate-y-1 transition-all">
                           <span className="material-symbols-outlined text-4xl">thumb_up</span> APTO
                         </button>
                         <button onClick={() => handleVoto(selectedAsp.id, 'No Apto')} className="w-full py-8 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black text-2xl shadow-xl shadow-red-500/30 uppercase tracking-widest flex flex-col items-center gap-2 hover:-translate-y-1 transition-all">
                           <span className="material-symbols-outlined text-4xl">thumb_down</span> NO APTO
                         </button>
                      </div>
                    )}
                 </div>
               </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}
