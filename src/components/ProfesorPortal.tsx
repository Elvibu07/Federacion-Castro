import React, { useState } from 'react';
import { Aspirante, Documento } from '../types';
import { useUI } from '../contexts/UIContext';

interface ProfesorPortalProps {
  clubName: string;
  aspirantes: Aspirante[];
  onUpdateAspirantes: (updated: Aspirante[]) => void;
  onUpdateAspiranteAtomic?: (id: string, updates: Partial<Aspirante>) => void;
  onLogout: () => void;
}

export default function ProfesorPortal({ clubName, aspirantes, onUpdateAspirantes, onUpdateAspiranteAtomic, onLogout }: ProfesorPortalProps) {
  const { showToast, showConfirm, showAlert } = useUI();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'alumnos' | 'pagos' | 'estadisticas'>('dashboard');

  const toggleDarkMode = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    window.dispatchEvent(new Event('theme_changed'));
  };
  
  // Para subida de aval
  const [selectedAspId, setSelectedAspId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');

  // Detalles de alumno en la lista
  const [expandedAspId, setExpandedAspId] = useState<string | null>(null);

  // Seleccionados para pago en bloque
  const [selectedForPayment, setSelectedForPayment] = useState<Set<string>>(new Set());
  const [isPayingBulk, setIsPayingBulk] = useState(false);

  // Solo nos interesan los alumnos del club del profesor
  const alumnos = aspirantes.filter(a => a.club === clubName);

  const pendientesDeAval = alumnos.filter(a => {
    const hasAvalCargado = a.documentos?.some(d => d.tipo === 'aval_tecnico' && (d.estado === 'cargado' || d.estado === 'aprobado' || d.estado === 'en_revision'));
    return !hasAvalCargado && a.status !== 'Validada' && a.status !== 'Acta emitida';
  });

  const pendientesDePago = alumnos.filter(a => a.paymentStatus === 'Unpaid' && a.progressStep >= 3);

  const handleUploadAval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAspId) return;

    const aspName = aspirantes.find(a => a.id === selectedAspId)?.name || 'alumno';

    showConfirm(
      'Emitir Aval Técnico',
      `¿Estás seguro de emitir y firmar el aval para ${aspName}? Este documento se adjuntará a su expediente.`,
      () => {
        setUploadStatus('uploading');
        setTimeout(() => {
          if (onUpdateAspiranteAtomic) {
            onUpdateAspiranteAtomic(selectedAspId, { avalTecnico: 'emitido' });
          } else {
            const updated = aspirantes.map(asp => {
              if (asp.id !== selectedAspId) return asp;
              const docs = asp.documentos || [];
              const existingAval = docs.find(d => d.tipo === 'aval_tecnico');
              let newDocs: Documento[];
              if (existingAval) {
                newDocs = docs.map(d => d.tipo === 'aval_tecnico' ? { ...d, estado: 'cargado', nombre: 'Aval_Profesor_FMK.pdf', fileSize: '450 KB', fechaCarga: new Date().toISOString().split('T')[0] } : d);
              } else {
                newDocs = [...docs, {
                  tipo: 'aval_tecnico',
                  etiqueta: 'Aval del Profesor',
                  estado: 'cargado',
                  nombre: 'Aval_Profesor_FMK.pdf',
                  fileSize: '450 KB',
                  fechaCarga: new Date().toISOString().split('T')[0]
                }];
              }
              return { ...asp, avalTecnico: 'emitido', documentos: newDocs };
            });
            onUpdateAspirantes(updated);
          }
          setUploadStatus('success');
          showAlert('Aval Emitido', `El aval para ${aspName} ha sido emitido y adjuntado al expediente.`);
          
          setTimeout(() => {
            setUploadStatus('idle');
            setSelectedAspId(null);
          }, 1500);
        }, 1200);
      },
      'Emitir Aval'
    );
  };

  const togglePaymentSelection = (id: string) => {
    const newSet = new Set(selectedForPayment);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedForPayment(newSet);
  };

  const handleBulkPayment = () => {
    if (selectedForPayment.size === 0) return;
    showConfirm(
      'Procesar Pagos',
      `¿Estás seguro de procesar el pago para ${selectedForPayment.size} alumno(s)? Esta acción confirmará el pago en el sistema.`,
      () => {
        setIsPayingBulk(true);
        setTimeout(() => {
          if (onUpdateAspiranteAtomic) {
            selectedForPayment.forEach(id => {
              onUpdateAspiranteAtomic(id, { paymentStatus: 'Paid' });
            });
          } else {
            const updated = aspirantes.map(asp => {
              if (selectedForPayment.has(asp.id)) {
                return { ...asp, paymentStatus: 'Paid' as const, progressStep: 4, status: 'Admitida' as const };
              }
              return asp;
            });
            onUpdateAspirantes(updated);
          }
          showAlert('Pago Procesado', `El pago agrupado para ${selectedForPayment.size} alumno(s) se procesó correctamente.`);
          setIsPayingBulk(false);
          setSelectedForPayment(new Set());
        }, 2000);
      },
      'Procesar Pago Agrupado'
    );
  };

  // Cálculos para estadísticas
  const gradosData = alumnos.reduce((acc, curr) => {
    acc[curr.requestedBelt] = (acc[curr.requestedBelt] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const aptosCount = alumnos.filter(a => a.resultadoUltimoExamen === 'Apto').length;
  const noAptosCount = alumnos.filter(a => a.resultadoUltimoExamen === 'No Apto' || a.resultadoUltimoExamen === 'No Apto Parcial').length;
  const totalEvaluados = aptosCount + noAptosCount;
  const aptosPercent = totalEvaluados > 0 ? Math.round((aptosCount / totalEvaluados) * 100) : 0;

  return (
    <div className="bg-[#f8f9fa] dark:bg-[#0a0a0a] text-stone-800 dark:text-stone-100 font-sans min-h-screen flex">
      
      {/* Mobile Header */}
      <div className="xl:hidden sticky top-0 z-40 bg-white/80 dark:bg-[#151515]/80 backdrop-blur-md border-b border-stone-200 dark:border-white/20 p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-red-700 flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-white text-xs">groups</span>
           </div>
           <div>
             <span className="font-bold text-stone-800 dark:text-stone-100 text-sm leading-tight block truncate max-w-[150px]">{clubName}</span>
             <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest block">Profesor</span>
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

      {/* ── Premium Sidebar ─────────────────────────────────────────────────── */}
      <nav className="hidden xl:flex flex-col h-screen w-80 fixed left-0 top-0 border-r border-stone-200/50 dark:border-white/10 shadow-2xl shadow-stone-200/20 bg-white dark:bg-[#151515] py-8 z-50 overflow-hidden print:hidden">
        
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-br from-red-50 to-red-100/50 rounded-full blur-3xl -translate-y-24 translate-x-12 mix-blend-multiply pointer-events-none" />

        {/* Brand / Logo Area */}
        <div className="px-8 mb-10 relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-600/30">
              <span className="material-symbols-outlined text-white text-base">groups</span>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-stone-800 dark:text-stone-100 text-lg tracking-wide leading-tight truncate max-w-[140px]" title={clubName}>{clubName}</span>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Profesor</span>
            </div>
          </div>
          <button onClick={toggleDarkMode} className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/10 flex items-center justify-center text-stone-500 dark:text-stone-300 hover:text-stone-800 dark:hover:text-white transition-colors" title="Cambiar Tema">
            <span className="material-symbols-outlined text-[18px]">dark_mode</span>
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-6 no-scrollbar space-y-2 relative z-10">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest px-2 mb-4">Navegación</p>
          
          <button onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all text-left text-base font-bold ${
              activeTab === 'dashboard' ? 'bg-red-50 text-red-700 shadow-sm border border-red-100' : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:text-stone-100 hover:bg-stone-50 dark:bg-white/5'
            }`}>
            <span className={`material-symbols-outlined text-[24px] ${activeTab === 'dashboard' ? 'text-red-600' : 'text-stone-400'}`}>dashboard</span>
            <span className="flex-1">Resumen</span>
          </button>
          
          <button onClick={() => setActiveTab('alumnos')}
            className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all text-left text-base font-bold ${
              activeTab === 'alumnos' ? 'bg-red-50 text-red-700 shadow-sm border border-red-100' : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:text-stone-100 hover:bg-stone-50 dark:bg-white/5'
            }`}>
            <span className={`material-symbols-outlined text-[24px] ${activeTab === 'alumnos' ? 'text-red-600' : 'text-stone-400'}`}>sports_martial_arts</span>
            <span className="flex-1">Mis Alumnos</span>
            <span className={`text-xs font-black px-2 py-1 rounded-full ${activeTab === 'alumnos' ? 'bg-red-100 text-red-800' : 'bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-stone-300'}`}>{alumnos.length}</span>
          </button>

          <button onClick={() => setActiveTab('pagos')}
            className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all text-left text-base font-bold ${
              activeTab === 'pagos' ? 'bg-red-50 text-red-700 shadow-sm border border-red-100' : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:text-stone-100 hover:bg-stone-50 dark:bg-white/5'
            }`}>
            <span className={`material-symbols-outlined text-[24px] ${activeTab === 'pagos' ? 'text-red-600' : 'text-stone-400'}`}>payments</span>
            <span className="flex-1">Facturación</span>
            {pendientesDePago.length > 0 && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>}
          </button>

          <button onClick={() => setActiveTab('estadisticas')}
            className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all text-left text-base font-bold ${
              activeTab === 'estadisticas' ? 'bg-red-50 text-red-700 shadow-sm border border-red-100' : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:text-stone-100 hover:bg-stone-50 dark:bg-white/5'
            }`}>
            <span className={`material-symbols-outlined text-[24px] ${activeTab === 'estadisticas' ? 'text-red-600' : 'text-stone-400'}`}>query_stats</span>
            <span className="flex-1">Rendimiento</span>
          </button>
        </div>

        {/* Footer Actions */}
        <div className="mt-auto px-8 pt-8 border-t border-stone-100 dark:border-white/10 relative z-10 bg-white dark:bg-[#151515] space-y-2">
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl border border-stone-200 dark:border-white/20 text-stone-500 dark:text-stone-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all text-sm font-bold cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 xl:ml-80 flex flex-col min-h-screen relative w-full print:hidden overflow-hidden bg-[#f8f9fa] dark:bg-[#0a0a0a]">

        {/* Top bar (SaaS Style) */}
        <header className="bg-white dark:bg-[#151515] border-b border-stone-200/60 flex justify-between items-center w-full px-10 h-24 sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center gap-8">
            <h1 className="text-3xl font-black text-stone-800 dark:text-stone-100 tracking-tight hidden lg:block">
              {activeTab === 'dashboard' && 'Resumen Ejecutivo'}
              {activeTab === 'alumnos' && 'Directorio de Alumnos'}
              {activeTab === 'pagos' && 'Gestión de Facturación'}
              {activeTab === 'estadisticas' && 'Rendimiento y Estadísticas'}
            </h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-[#f8f9fa] dark:bg-[#0a0a0a]">
        
        {/* TAB: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="font-black text-[24px] text-stone-800 dark:text-stone-100 tracking-tight">Panel del Técnico</h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Revisa el progreso de los aspirantes de {clubName} y emite sus avales deportivos.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="material-symbols-outlined text-stone-400 mb-2 block">group</span>
                  <p className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide">Total Alumnos</p>
                </div>
                <p className="text-4xl font-black text-stone-800 dark:text-stone-100 mt-2">{alumnos.length}</p>
              </div>
              <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="material-symbols-outlined text-green-500 mb-2 block">verified</span>
                  <p className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide">Expedientes Validados</p>
                </div>
                <p className="text-4xl font-black text-green-700 mt-2">{alumnos.filter(a => a.status === 'Validada' || a.status === 'Acta emitida').length}</p>
              </div>
              <div className="bg-white dark:bg-[#151515] border border-red-200 rounded-xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-100 rounded-bl-full -z-10 blur-xl"></div>
                <div>
                  <span className="material-symbols-outlined text-red-500 mb-2 block">assignment_late</span>
                  <p className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wide">Pendientes de Aval</p>
                </div>
                <p className="text-4xl font-black text-red-700 mt-2">{pendientesDeAval.length}</p>
              </div>
            </div>

            <h2 className="font-black text-lg text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">notification_important</span>
              Acción Requerida: Avales Pendientes
            </h2>
            
            {pendientesDeAval.length === 0 ? (
               <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 border-dashed rounded-xl mt-4">
                 <div className="w-12 h-12 bg-stone-100 dark:bg-white/10 text-stone-400 rounded-full flex items-center justify-center mb-3">
                   <span className="material-symbols-outlined text-2xl">check_circle</span>
                 </div>
                 <p className="text-sm font-bold text-stone-700 dark:text-stone-200">Todos los avales emitidos</p>
                 <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 text-center max-w-xs">No tienes alumnos pendientes de avalar.</p>
               </div>
            ) : (
              <div className="space-y-4">
                {pendientesDeAval.map(asp => (
                  <div key={asp.id} className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl p-6 shadow-sm flex justify-between items-center flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-stone-100 dark:bg-white/10 rounded-full flex items-center justify-center font-bold text-stone-400">
                        {asp.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-stone-800 dark:text-stone-100">{asp.name}</h3>
                        <p className="text-xs text-stone-500 dark:text-stone-400">Solicita: {asp.requestedBelt} · {asp.via}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedAspId(asp.id)}
                      className="px-4 py-2 bg-red-700 text-white rounded-lg shadow font-bold text-sm hover:bg-red-800 transition"
                    >
                      Emitir Aval
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: MIS ALUMNOS */}
        {activeTab === 'alumnos' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="font-black text-[24px] text-stone-800 dark:text-stone-100 tracking-tight">Mis Alumnos</h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Listado completo de aspirantes inscritos desde tu club y su expediente detallado.</p>
            </div>

            <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 dark:bg-white/5 border-b border-stone-200 dark:border-white/20">
                    <th className="px-6 py-4 text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Aspirante</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Grado Solicitado</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">Estado Trámite</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {alumnos.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-stone-400 italic">No hay alumnos inscritos.</td></tr>
                  )}
                  {alumnos.map(a => (
                    <React.Fragment key={a.id}>
                      <tr className="hover:bg-stone-50 dark:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-stone-800 dark:text-stone-100 text-sm">{a.name}</div>
                          <div className="font-mono text-[10px] text-stone-400 mt-0.5">#{a.id}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-stone-100 dark:bg-white/10 text-stone-600 px-2 py-1 rounded text-xs font-bold border border-stone-200 dark:border-white/20">{a.requestedBelt}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold border ${
                            a.status === 'Validada' || a.status === 'Admitida' ? 'bg-green-50 text-green-700 border-green-200' :
                            a.status === 'Subsanación' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-white/20'
                          }`}>{a.status}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => setExpandedAspId(expandedAspId === a.id ? null : a.id)} className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-500 dark:text-stone-400 transition">
                            <span className="material-symbols-outlined">{expandedAspId === a.id ? 'expand_less' : 'expand_more'}</span>
                          </button>
                        </td>
                      </tr>
                      {expandedAspId === a.id && (
                        <tr className="bg-stone-50/50">
                          <td colSpan={4} className="px-6 py-4 border-l-4 border-stone-300">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2">Expediente Disciplinario / Federativo</p>
                                <p><span className="text-stone-500 dark:text-stone-400">Fecha Último Grado:</span> <span className="font-mono">{a.fechaUltimoGrado || 'N/A'}</span></p>
                                <p><span className="text-stone-500 dark:text-stone-400">Licencias Consecutivas:</span> {a.licenciasConsecutivas || 0}</p>
                                <p><span className="text-stone-500 dark:text-stone-400">Vía Examen:</span> {a.via || 'Sin asignar'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2">Resolución Tribunal</p>
                                {a.resultadoUltimoExamen ? (
                                  <div className={`p-3 rounded-lg border ${a.resultadoUltimoExamen === 'Apto' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                    <p className="font-bold">{a.resultadoUltimoExamen}</p>
                                    {a.evaluacion?.informeNoApto && (
                                      <div className="mt-2 pt-2 border-t border-red-200/50 text-xs italic">
                                        "{a.evaluacion.informeNoApto}"
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-stone-400 italic">No ha sido evaluado aún.</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: FACTURACIÓN */}
        {activeTab === 'pagos' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="font-black text-[24px] text-stone-800 dark:text-stone-100 tracking-tight">Facturación Grupal</h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Realiza el pago de las tasas federativas de inscripción en nombre de tu club.</p>
            </div>

            <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl p-8 shadow-sm">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="font-black text-lg text-stone-800 dark:text-stone-100">Alumnos Pendientes de Pago</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Solo se muestran alumnos que han superado la revisión documental.</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-widest font-bold">Total Seleccionado</p>
                  <p className="text-3xl font-black text-red-700">{selectedForPayment.size * 65} €</p>
                </div>
              </div>

              {pendientesDePago.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-stone-200 dark:border-white/20 rounded-xl bg-stone-50 dark:bg-white/5">
                  <span className="material-symbols-outlined text-4xl text-stone-300 mb-2">payments</span>
                  <p className="text-stone-500 dark:text-stone-400 text-sm font-bold">No hay cobros pendientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendientesDePago.map(asp => (
                    <label key={asp.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedForPayment.has(asp.id) ? 'border-red-600 bg-red-50/30' : 'border-stone-200 dark:border-white/20 hover:border-stone-300'}`}>
                      <input 
                        type="checkbox" 
                        checked={selectedForPayment.has(asp.id)}
                        onChange={() => togglePaymentSelection(asp.id)}
                        className="w-5 h-5 rounded border-stone-300 text-red-600 focus:ring-red-600"
                      />
                      <div className="flex-1">
                        <p className="font-bold text-stone-800 dark:text-stone-100">{asp.name}</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400 font-mono">ID: {asp.id} — Examen {asp.requestedBelt}</p>
                      </div>
                      <div className="font-black text-stone-800 dark:text-stone-100">65.00 €</div>
                    </label>
                  ))}

                  <div className="pt-6 mt-6 border-t border-stone-200 dark:border-white/20 flex justify-end">
                    <button 
                      onClick={handleBulkPayment}
                      disabled={selectedForPayment.size === 0 || isPayingBulk}
                      className="px-8 py-3 bg-red-700 text-white rounded-xl font-bold hover:bg-red-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                    >
                      {isPayingBulk ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined">credit_card</span>}
                      {isPayingBulk ? 'Procesando Pago...' : 'Pagar Tasas Seleccionadas'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: ESTADÍSTICAS */}
        {activeTab === 'estadisticas' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="font-black text-[24px] text-stone-800 dark:text-stone-100 tracking-tight">Rendimiento del Club</h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Análisis de los resultados de tus alumnos frente a los Tribunales de Grados.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Ratio de Aprobados */}
              <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl p-8 shadow-sm flex flex-col justify-center items-center text-center">
                <h3 className="font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-xs mb-6">Ratio de Aprobados Histórico</h3>
                <div className="relative w-48 h-48 rounded-full border-[16px] border-stone-100 dark:border-white/10 flex flex-col items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="16" className="text-red-600" 
                      strokeDasharray={`${aptosPercent * 2.64} 264`} strokeLinecap="round" />
                  </svg>
                  <span className="text-4xl font-black text-stone-800 dark:text-stone-100">{aptosPercent}%</span>
                  <span className="text-[10px] font-bold text-stone-400 mt-1">APTOS</span>
                </div>
                <div className="flex gap-6 mt-8">
                  <div className="text-center">
                    <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider">Aptos</p>
                    <p className="text-xl font-black text-green-700">{aptosCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider">No Aptos</p>
                    <p className="text-xl font-black text-red-700">{noAptosCount}</p>
                  </div>
                </div>
              </div>

              {/* Distribución de Grados */}
              <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl p-8 shadow-sm">
                <h3 className="font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest text-xs mb-6">Alumnos por Grado Solicitado</h3>
                <div className="space-y-4">
                  {Object.entries(gradosData).map(([grado, count]) => (
                    <div key={grado} className="flex items-center gap-4">
                      <span className="w-20 text-xs font-bold text-stone-700 dark:text-stone-200 truncate">{grado}</span>
                      <div className="flex-1 h-3 bg-stone-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-red-600 rounded-full" style={{ width: `${(count / alumnos.length) * 100}%` }}></div>
                      </div>
                      <span className="w-8 text-right text-xs font-mono font-bold text-stone-500 dark:text-stone-400">{count}</span>
                    </div>
                  ))}
                  {Object.keys(gradosData).length === 0 && (
                    <p className="text-sm text-stone-400 italic text-center py-4">No hay datos de alumnos.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        </div>
      </main>

      {/* Modal Emitir Aval */}
      {selectedAspId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#151515] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#0a0a0a] px-6 py-4 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-white font-black text-lg">Emitir Aval Deportivo</h2>
              <button onClick={() => setSelectedAspId(null)} className="text-stone-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-stone-600 mb-6 leading-relaxed">
                Al emitir este aval, certificas que el aspirante cumple con el tiempo de permanencia, ha sido preparado adecuadamente y está capacitado para presentarse al examen de grado.
              </p>
              
              <div className="bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/20 rounded-lg p-4 mb-6">
                <h4 className="font-bold text-stone-800 dark:text-stone-100 text-sm">{alumnos.find(a => a.id === selectedAspId)?.name}</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Cinturón {alumnos.find(a => a.id === selectedAspId)?.requestedBelt}</p>
              </div>

              <form onSubmit={handleUploadAval} className="flex justify-end gap-3">
                <button type="button" onClick={() => setSelectedAspId(null)} className="px-4 py-2 text-stone-500 dark:text-stone-400 font-bold text-sm hover:text-stone-800 dark:text-stone-100">
                  Cancelar
                </button>
                <button type="submit" disabled={uploadStatus === 'uploading' || uploadStatus === 'success'}
                  className="px-6 py-2 bg-red-700 text-white rounded-lg font-bold text-sm hover:bg-red-800 shadow transition flex items-center gap-2 disabled:opacity-50">
                  {uploadStatus === 'idle' && 'Firmar y Emitir Aval'}
                  {uploadStatus === 'uploading' && <><span className="material-symbols-outlined animate-spin text-[16px]">refresh</span> Emitiendo...</>}
                  {uploadStatus === 'success' && <><span className="material-symbols-outlined text-[16px]">check</span> Emitido</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
