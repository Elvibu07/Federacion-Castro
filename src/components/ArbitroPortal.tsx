import React, { useState, useMemo } from 'react';
import { Aspirante, Tribunal, Evaluacion, ViaExamen } from '../types';
import { useUI } from '../contexts/UIContext';

interface ArbitroPortalProps {
  activeArbitroId: string;
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

export default function ArbitroPortal({
  activeArbitroId,
  tribunals,
  aspirantes,
  onUpdateAspirantes,
  onUpdateAspiranteAtomic,
  onLogout,
}: ArbitroPortalProps) {
  const { showToast, showConfirm, showAlert } = useUI();
  const [selectedAspId, setSelectedAspId] = useState<string | null>(null);
  
  // Scoreboard states
  const [matchRunning, setMatchRunning] = useState(false);
  const [matchFinished, setMatchFinished] = useState(false);
  const [scoreAka, setScoreAka] = useState(0);
  const [scoreAo, setScoreAo] = useState(0);
  const [penaltiesAka, setPenaltiesAka] = useState(0);
  const [penaltiesAo, setPenaltiesAo] = useState(0);
  const [senshu, setSenshu] = useState<'aka' | 'ao' | null>(null);

  // Reset match when selecting new aspirante
  const handleSelectAsp = (id: string) => {
    setSelectedAspId(id);
    setMatchRunning(false);
    setMatchFinished(false);
    setScoreAka(0);
    setScoreAo(0);
    setPenaltiesAka(0);
    setPenaltiesAo(0);
    setSenshu(null);
  };

  // Filtrar aspirantes que van por la vía de Kumite y están en proceso de evaluación
  const kumiteAspirantes = useMemo(() => {
    return aspirantes.filter(a => 
      a.via === 'Kumite' && 
      (a.status === 'Validada' || a.status === 'Admitida' || a.status === 'En evaluación' || a.status === 'Apto provisional' || a.status === 'No Apto provisional' || a.status === 'Pendiente' || a.status === 'Subsanación')
    );
  }, [aspirantes]);

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

  const handleEnviarResultadoKumite = (aspId: string) => {
    const asp = aspirantes.find(a => a.id === aspId)!;
    
    showConfirm(
      'Enviar Resultado Kumite',
      `¿Confirmar el envío de los resultados del combate para ${asp.name}?`,
      () => {
        const ev = getOrBuildEval(asp);
        
        let baseDetalles = ev.bloqueEspecifico || { via: 'Kumite' as ViaExamen, iniciado: true, completado: false };
        if (!baseDetalles.kumiteDetalles) {
          baseDetalles.kumiteDetalles = { modalidad: 'Shiai Kumite', encuentros: 3, proteccionesWKF: true };
        }

        const resultadoStr = `AKA ${scoreAka} - ${scoreAo} AO${senshu ? ` (Senshu ${senshu.toUpperCase()})` : ''}`;

        updateEval(aspId, {
          ...ev,
          bloqueEspecifico: {
            ...baseDetalles,
            iniciado: true,
            completado: true,
            kumiteDetalles: {
              ...baseDetalles.kumiteDetalles,
              resultadoCombate: resultadoStr,
            }
          },
        });

        showAlert('Resultado Enviado', `El resultado de Kumite para ${asp.name} ha sido enviado exitosamente al Tribunal.`);
      },
      'Enviar Calificación'
    );
  };

  const selectedAsp = selectedAspId ? kumiteAspirantes.find(a => a.id === selectedAspId) : null;
  const evSelected = selectedAsp ? getOrBuildEval(selectedAsp) : null;

  return (
    <div className="bg-[#f8f9fa] dark:bg-[#0a0a0a] text-stone-800 dark:text-stone-100 font-sans min-h-screen flex">
      
      {/* Mobile Header */}
      <div className="xl:hidden sticky top-0 z-40 bg-white/80 dark:bg-[#151515]/80 backdrop-blur-md border-b border-stone-200 dark:border-white/20 p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-indigo-700 flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-white text-xs">sports</span>
           </div>
           <div>
             <span className="font-bold text-stone-800 dark:text-stone-100 text-sm leading-tight block">Tatami Kumite</span>
             <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest block">{activeArbitroId}</span>
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
        <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-full blur-3xl -translate-y-24 translate-x-12 mix-blend-multiply pointer-events-none" />

        {/* Brand / Logo Area */}
        <div className="px-8 mb-10 relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <span className="material-symbols-outlined text-white text-base">sports</span>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-stone-800 dark:text-stone-100 text-lg tracking-wide leading-tight">Tatami Kumite</span>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">{activeArbitroId}</span>
            </div>
          </div>
          <button onClick={toggleDarkMode} className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/10 flex items-center justify-center text-stone-500 dark:text-stone-300 hover:text-stone-800 dark:hover:text-white transition-colors" title="Cambiar Tema">
            <span className="material-symbols-outlined text-[18px]">dark_mode</span>
          </button>
        </div>

        {/* Info Tatami */}
        <div className="p-6 bg-indigo-700 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500 rounded-full blur-2xl opacity-50 -translate-y-10 translate-x-10 pointer-events-none"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-200 mb-2">Área de Combate</p>
          <h2 className="font-black text-2xl flex items-center gap-2 relative z-10">
            <span className="material-symbols-outlined text-[28px]">sports_martial_arts</span>
            Shiai Kumite
          </h2>
          <p className="text-sm text-indigo-100 mt-2 font-bold">Evaluación del Bloque Específico</p>
        </div>

        {/* Lista Aspirantes Kumite */}
        <div className="flex-1 overflow-y-auto kanban-scroll p-6 flex flex-col gap-4">
          <h3 className="font-bold text-xs uppercase tracking-widest text-stone-400 mb-2">Aspirantes Kumite ({kumiteAspirantes.length})</h3>
          
          {kumiteAspirantes.length === 0 ? (
            <div className="text-center p-6 border border-dashed border-stone-300 dark:border-white/20 rounded-xl">
               <span className="material-symbols-outlined text-stone-400 text-3xl mb-2">person_off</span>
               <p className="text-xs font-bold text-stone-500">No hay aspirantes pendientes en esta vía.</p>
            </div>
          ) : (
            kumiteAspirantes.map(asp => {
              const ev = getOrBuildEval(asp);
              const isSelected = selectedAspId === asp.id;
              const kumiteEnviado = ev.bloqueEspecifico?.kumiteDetalles?.resultadoCombate;
              
              let statusColor = "bg-white dark:bg-[#151515] border-stone-200 dark:border-white/10 text-stone-800 dark:text-stone-100";
              let statusBadge = "";
              if (isSelected) statusColor = "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 text-indigo-900 dark:text-indigo-100 shadow-md ring-2 ring-indigo-500/20";
              
              if (kumiteEnviado) statusBadge = "bg-green-100 text-green-800 border-green-200";

              return (
                <div 
                  key={asp.id} 
                  onClick={() => handleSelectAsp(asp.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:border-indigo-400 hover:shadow-md flex flex-col gap-2 ${statusColor}`}
                >
                  <div className="flex justify-between items-start">
                     <div>
                       <p className="font-black text-sm">{asp.name}</p>
                       <p className="font-mono text-[10px] opacity-70 mt-0.5">{asp.club}</p>
                     </div>
                     {statusBadge ? (
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${statusBadge}`}>
                          Enviado: {kumiteEnviado}
                        </span>
                     ) : (
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-amber-100 text-amber-800 border-amber-200">Pendiente</span>
                     )}
                  </div>
                  <div className="flex justify-between items-end mt-2">
                     <span className="font-black text-xs text-indigo-700 bg-indigo-100/50 dark:bg-white/10 px-2 py-1 rounded">{asp.requestedBelt}</span>
                     {!kumiteEnviado && <span className="text-[10px] font-bold text-stone-400 flex items-center gap-1">Arbitrar <span className="material-symbols-outlined text-[14px]">arrow_forward</span></span>}
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
             <span className="material-symbols-outlined text-8xl mb-6 text-stone-300">sports_martial_arts</span>
             <h2 className="font-black text-4xl mb-4">Panel del Árbitro (Tatami)</h2>
             <p className="font-bold text-lg max-w-lg">Selecciona un aspirante de la lista para registrar el resultado de su combate.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 lg:p-12 kanban-scroll animate-in fade-in slide-in-from-right-8 duration-300 max-w-7xl mx-auto w-full">
            
            {/* Header Aspirante */}
            <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl shadow-xl shadow-stone-200/30 border border-stone-200 dark:border-white/10 mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
               <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/30 flex items-center justify-center shadow-inner">
                    <span className="material-symbols-outlined text-4xl text-indigo-500">sports_martial_arts</span>
                  </div>
                  <div>
                    <h2 className="font-black text-4xl tracking-tight text-stone-900 dark:text-stone-100 mb-2">{selectedAsp.name}</h2>
                    <div className="flex flex-wrap gap-2 text-sm font-bold text-stone-500 uppercase tracking-widest">
                       <span className="bg-stone-100 dark:bg-white/10 px-2 py-1 rounded-md">#{selectedAsp.id}</span>
                       <span className="bg-stone-100 dark:bg-white/10 px-2 py-1 rounded-md">{selectedAsp.club}</span>
                       <span className="bg-red-50 text-red-700 px-2 py-1 rounded-md border border-red-200">A {selectedAsp.requestedBelt}</span>
                    </div>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
               
               {/* Instrucciones y Reglas de Combate */}
               <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-stone-200 dark:border-white/10 shadow-sm flex flex-col gap-4">
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600">gavel</span> Instrucciones de Kumite
                  </h3>
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    Como árbitro, tu responsabilidad es evaluar exclusivamente el <strong>Bloque Específico (Vía Kumite)</strong>.
                    Debes verificar que el aspirante demuestre el nivel técnico, control y actitud necesarios durante los encuentros de Shiai Kumite (mínimo 3 encuentros según reglamento WKF adaptado).
                  </p>
                  <ul className="text-sm font-bold text-stone-700 dark:text-stone-300 space-y-2 mt-2 bg-stone-50 dark:bg-white/5 p-4 rounded-xl border border-stone-100 dark:border-white/10">
                    <li>✓ Uso correcto de protecciones WKF.</li>
                    <li>✓ Actitud deportiva y respeto (Reigi).</li>
                    <li>✓ Control de técnicas (Zanshin).</li>
                    <li>✓ Nivel adecuado al grado solicitado ({selectedAsp.requestedBelt}).</li>
                  </ul>
               </div>

               {/* Calificación */}
               <div className={`bg-white dark:bg-[#151515] p-6 lg:p-8 rounded-3xl border-4 shadow-2xl sticky top-8 transition-colors duration-500 ${
                 evSelected.bloqueEspecifico?.kumiteDetalles?.resultadoCombate ? 'border-green-500 shadow-green-500/10' :
                 'border-stone-200 dark:border-white/10'
               }`}>
                  <h3 className="font-black text-2xl mb-2 text-center text-stone-800 dark:text-stone-100">Resultado de Kumite</h3>
                  <p className="text-xs font-bold text-stone-500 text-center uppercase tracking-widest mb-8">Gestión del Árbitro Auxiliar</p>
                  
                  {evSelected.exentoBloqueEspecifico ? (
                    <div className="p-8 text-center bg-green-50 rounded-2xl border border-green-200">
                       <span className="material-symbols-outlined text-4xl text-green-500 mb-2">check_circle</span>
                       <p className="font-bold text-green-800 text-sm">El aspirante está exento del Bloque Específico por edad (+41 años).</p>
                    </div>
                  ) : evSelected.bloqueEspecifico?.kumiteDetalles?.resultadoCombate ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                       <span className="material-symbols-outlined text-6xl mb-4 text-green-500">verified</span>
                       <h4 className="font-black text-2xl uppercase tracking-tighter mb-2">{evSelected.bloqueEspecifico.kumiteDetalles.resultadoCombate}</h4>
                       <p className="font-bold text-stone-500 text-sm">El resultado del combate ha sido enviado a la Mesa Evaluadora. El Juez emitirá la calificación final.</p>
                       <button onClick={() => {
                          const kumiteDetalles = { ...evSelected.bloqueEspecifico?.kumiteDetalles, resultadoCombate: undefined };
                          updateEval(selectedAsp.id, { ...evSelected, bloqueEspecifico: { ...evSelected.bloqueEspecifico!, kumiteDetalles: kumiteDetalles as any } });
                       }} className="mt-8 text-xs font-bold px-4 py-2 bg-stone-100 dark:bg-white/10 hover:bg-stone-200 text-stone-600 rounded-lg uppercase tracking-widest transition-colors">
                         Corregir Marcador
                       </button>
                    </div>
                  ) : !matchFinished ? (
                    <div className="flex flex-col gap-6">
                       {/* Scoreboard WKF Style */}
                       <div className="bg-stone-900 rounded-2xl overflow-hidden shadow-inner flex flex-col">
                          <div className="bg-black py-2 text-center border-b border-stone-800">
                             <span className="font-mono text-3xl font-bold text-yellow-400 tracking-widest" style={{textShadow: '0 0 10px rgba(250,204,21,0.5)'}}>3:00</span>
                          </div>
                          <div className="flex">
                             {/* AKA (Rojo) */}
                             <div className="flex-1 bg-red-600 p-4 text-white flex flex-col items-center justify-between border-r border-stone-900 relative">
                                {senshu === 'aka' && <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-yellow-400 shadow-md"></div>}
                                <p className="font-black text-sm mb-2">AKA</p>
                                <p className="font-bold text-[10px] truncate w-full text-center uppercase" title={selectedAsp.name}>{selectedAsp.name}</p>
                                <span className="text-6xl font-black my-4">{scoreAka}</span>
                                <div className="grid grid-cols-3 gap-1 w-full">
                                   <button onClick={() => setScoreAka(s => s + 1)} className="bg-white/20 hover:bg-white/30 py-1.5 rounded text-xs font-bold">+1 Y</button>
                                   <button onClick={() => setScoreAka(s => s + 2)} className="bg-white/20 hover:bg-white/30 py-1.5 rounded text-xs font-bold">+2 W</button>
                                   <button onClick={() => setScoreAka(s => s + 3)} className="bg-white/20 hover:bg-white/30 py-1.5 rounded text-xs font-bold">+3 I</button>
                                </div>
                             </div>
                             {/* AO (Azul) */}
                             <div className="flex-1 bg-blue-600 p-4 text-white flex flex-col items-center justify-between relative">
                                {senshu === 'ao' && <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-yellow-400 shadow-md"></div>}
                                <p className="font-black text-sm mb-2">AO</p>
                                <p className="font-bold text-[10px] truncate w-full text-center uppercase">Oponente</p>
                                <span className="text-6xl font-black my-4">{scoreAo}</span>
                                <div className="grid grid-cols-3 gap-1 w-full">
                                   <button onClick={() => setScoreAo(s => s + 1)} className="bg-white/20 hover:bg-white/30 py-1.5 rounded text-xs font-bold">+1 Y</button>
                                   <button onClick={() => setScoreAo(s => s + 2)} className="bg-white/20 hover:bg-white/30 py-1.5 rounded text-xs font-bold">+2 W</button>
                                   <button onClick={() => setScoreAo(s => s + 3)} className="bg-white/20 hover:bg-white/30 py-1.5 rounded text-xs font-bold">+3 I</button>
                                </div>
                             </div>
                          </div>
                          <div className="bg-stone-800 p-2 flex justify-center gap-4">
                             <button onClick={() => setSenshu('aka')} className="text-[10px] font-bold text-stone-400 hover:text-red-400">Senshu AKA</button>
                             <button onClick={() => setSenshu('ao')} className="text-[10px] font-bold text-stone-400 hover:text-blue-400">Senshu AO</button>
                             <button onClick={() => { setScoreAka(0); setScoreAo(0); setSenshu(null); }} className="text-[10px] font-bold text-stone-500 hover:text-white">Reset</button>
                          </div>
                       </div>
                       
                       <button onClick={() => setMatchFinished(true)} className="w-full py-4 bg-stone-800 hover:bg-stone-900 text-white rounded-xl font-black text-lg shadow-lg uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                         <span className="material-symbols-outlined">sports_score</span> FINALIZAR COMBATE
                       </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 animate-in zoom-in-95 duration-300">
                       <div className="p-4 bg-stone-100 dark:bg-white/5 rounded-xl text-center mb-2 border border-stone-200 dark:border-white/10">
                          <p className="font-bold text-sm">Resultado Final del Combate:</p>
                          <p className="font-black text-2xl text-stone-800 dark:text-white mt-1">AKA {scoreAka} - {scoreAo} AO</p>
                          {senshu && scoreAka === scoreAo && (
                            <p className="text-xs font-bold text-yellow-600 mt-1">Gana {senshu.toUpperCase()} por Senshu (Ventaja de primer punto)</p>
                          )}
                          <p className="text-xs text-stone-500 dark:text-stone-400 mt-3">Envía este resultado al Tribunal para que los Jueces puedan calificar el bloque específico.</p>
                       </div>
                       <div className="grid grid-cols-1 gap-4">
                         <button onClick={() => handleEnviarResultadoKumite(selectedAsp.id)} className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-500/30 uppercase tracking-widest flex flex-col items-center gap-1 hover:-translate-y-1 transition-all">
                           <span className="material-symbols-outlined text-3xl">send</span> ENVIAR RESULTADO A TRIBUNAL
                         </button>
                       </div>
                       <button onClick={() => setMatchFinished(false)} className="mt-2 text-xs font-bold text-stone-400 hover:text-stone-600 text-center mx-auto block">Volver al marcador</button>
                    </div>
                  )}
               </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}
