import React, { useState } from 'react';
import { Aspirante, Judge, Tribunal, Convocatoria, GradoConfig, ViaExamen, Documento, EstadoDocumento } from '../types';
import { GRADOS_CONFIG, ESTILOS_RECONOCIDOS } from '../data';
import { useUI } from '../contexts/UIContext';

interface AspirantPortalProps {
  aspirante: Aspirante;
  onUpdateAspirante: (updated: Aspirante) => void;
  onLogout: () => void;
  availableJudges: Judge[];
  allTribunals: Tribunal[];
  convocatorias: Convocatoria[];
}

// Calcular edad a una fecha dada
function calcularEdad(birthDate: string, fechaExamen: string): number {
  const bd = new Date(birthDate);
  const fe = new Date(fechaExamen);
  let age = fe.getFullYear() - bd.getFullYear();
  const m = fe.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && fe.getDate() < bd.getDate())) age--;
  return age;
}

// Calcular meses entre dos fechas
function calcularMeses(desde: string, hasta: string): number {
  const d = new Date(desde);
  const h = new Date(hasta);
  return (h.getFullYear() - d.getFullYear()) * 12 + (h.getMonth() - d.getMonth());
}

// Obtener etiqueta legible del estado del documento
function etiquetaEstado(estado: EstadoDocumento): { label: string; color: string } {
  const map: Record<EstadoDocumento, { label: string; color: string }> = {
    no_cargado:          { label: 'Pendiente',           color: 'text-amber-700 bg-amber-50 border-amber-200' },
    cargado:             { label: 'Cargado',              color: 'text-red-700 bg-stone-50 dark:bg-white/5 border-stone-200 dark:border-white/20' },
    en_revision:         { label: 'En revisión',          color: 'text-purple-700 bg-purple-50 border-purple-200' },
    aprobado:            { label: 'Aprobado ✓',           color: 'text-green-700 bg-green-50 border-green-200' },
    rechazado:           { label: 'Rechazado ✗',          color: 'text-red-700 bg-red-50 border-red-200' },
    requiere_subsanacion:{ label: 'Requiere subsanación', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  };
  return map[estado];
}

type TabId = 'perfil' | 'tramite' | 'exam' | 'convocatorias' | 'requisitos' | 'documentos' | 'pagos' | 'especiales' | 'historial';

const toggleDarkMode = () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  window.dispatchEvent(new Event('theme_changed'));
};

export default function AspirantPortal({
  aspirante,
  onUpdateAspirante,
  onLogout,
  allTribunals,
  convocatorias,
}: AspirantPortalProps) {
  const { showToast, showConfirm, showAlert } = useUI();
  const [activeTab, setActiveTab] = useState<TabId>('perfil');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDispensaModal, setShowDispensaModal] = useState(false);

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState<string>('');
  const [uploadingDocEtiqueta, setUploadingDocEtiqueta] = useState<string>('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadDocTypeSelected, setUploadDocTypeSelected] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editData, setEditData] = useState({
    name: aspirante.name,
    club: aspirante.club,
    estilo: aspirante.estilo || '',
    birthDate: aspirante.birthDate || '',
    avatarUrl: aspirante.avatarUrl || '',
    fechaUltimoGrado: aspirante.fechaUltimoGrado || '',
    licenciasConsecutivas: aspirante.licenciasConsecutivas || 0,
    licenciasAcumuladas: aspirante.licenciasAcumuladas || 0
  });

  const handleSaveProfile = () => {
    onUpdateAspirante({
      ...aspirante,
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
      onUpdateAspirante({ ...aspirante, avatarUrl: url });
    }
  };

  // Payment form
  const [cardNumber, setCardNumber]   = useState('4532 •••• •••• 8821');
  const [cardName, setCardName]       = useState(aspirante.name);
  const [cardExpiry, setCardExpiry]   = useState('09/29');
  const [cardCvv, setCardCvv]         = useState('342');
  const [isPaying, setIsPaying]       = useState(false);

  // Via selector
  const [selectedVia, setSelectedVia] = useState<ViaExamen | ''>(aspirante.via || '');

  // Dispensa médica
  const [dispensaMotivo, setDispensaMotivo] = useState('');

  const assignedTribunal = allTribunals.find(t => t.id === aspirante.assignedTribunalId);
  const convAbierta = convocatorias.filter(c => c.estado === 'Abierta');
  const convActual  = convocatorias.find(c => c.id === aspirante.convocatoriaId);

  // Gradoconfig del grado solicitado
  const gradoConfig: GradoConfig | undefined = GRADOS_CONFIG.find(g =>
    aspirante.requestedBelt.toLowerCase().includes(g.nombre.toLowerCase()) ||
    aspirante.requestedBelt.toLowerCase().includes(g.etiquetaCorta.toLowerCase())
  ) || GRADOS_CONFIG[1]; // fallback 1º Dan

  // Validaciones automáticas (RF-18, RF-19, RF-20)
  const fechaExamen = convActual?.fecha || new Date().toISOString().split('T')[0];
  const edad = aspirante.birthDate ? calcularEdad(aspirante.birthDate, fechaExamen) : null;
  const mesesPermanencia = aspirante.fechaUltimoGrado
    ? calcularMeses(aspirante.fechaUltimoGrado, fechaExamen) : null;

  const validEdad       = edad !== null ? edad >= gradoConfig.edadMinima : null;
  const validPermanencia = mesesPermanencia !== null
    ? mesesPermanencia >= gradoConfig.permanenciaMinMeses : null;
  const validLicencias  = aspirante.licenciasConsecutivas !== undefined
    ? aspirante.licenciasConsecutivas >= gradoConfig.licenciasConsecutivas ||
      (aspirante.licenciasAcumuladas || 0) >= gradoConfig.licenciasAlternas
    : null;

  // Calculo de validación documental global
  const baseExpected: { tipo: string; etiqueta: string; optional?: boolean }[] = [
    { tipo: 'dni', etiqueta: 'Documento Identidad' },
    { tipo: 'foto', etiqueta: 'Fotografía' },
    { tipo: 'licencia', etiqueta: 'Licencia Federativa' },
    { tipo: 'carnet_grados', etiqueta: 'Carnet de Grados' },
  ];
  if (gradoConfig.requiereAval) baseExpected.push({ tipo: 'aval', etiqueta: 'Aval del Profesor' });
  if (gradoConfig.requiereCurriculum) baseExpected.push({ tipo: 'curriculum', etiqueta: 'Currículum Deportivo' });
  if (gradoConfig.requiereTrabajoEscrito) baseExpected.push({ tipo: 'trabajo_escrito', etiqueta: 'Trabajo Escrito' });
  
  const validDocumentos = baseExpected.every(req => {
     const doc = aspirante.documentos?.find(d => d.tipo === req.tipo);
     return doc && doc.estado !== 'no_cargado' && doc.estado !== 'rechazado';
  });

  const validPago = aspirante.paymentStatus === 'Paid' || aspirante.paymentStatus === 'Exento';
  const isAllValid = validEdad && validPermanencia && validLicencias && validDocumentos && validPago;

  const exentoPorEdad = edad !== null && edad >= 41;

  // Calcular monto cuota según méritos / repetición
  const calcularCuota = () => {
    if (aspirante.meritos?.some(m => m.tipo === 'CampeonMundo' || m.tipo === 'CampeonEuropa')) {
      return { monto: 0, tipo: 'Exento total (Campeonato Internacional)' };
    }
    if (aspirante.meritos?.some(m => m.tipo === 'CampeonEspaña' || m.tipo === 'CampeonMadrid')) {
      return { monto: 42.50, tipo: 'Reducción 50% (Campeonato Nacional/Autonómico)' };
    }
    return { monto: 85.00, tipo: 'Tarifa ordinaria' };
  };
  const cuota = calcularCuota();

  const handleFileUploadConfirm = () => {
    if (!uploadFileName.trim()) {
      showToast('Debes ingresar un nombre de archivo.', 'error');
      return;
    }
    
    let tipo = uploadingDocType;
    if (tipo === 'general') {
      if (!uploadDocTypeSelected) {
        showToast('Debes seleccionar un tipo de documento.', 'error');
        return;
      }
      tipo = uploadDocTypeSelected;
    }

    const updated = { ...aspirante };

    // Actualizar documentos extendidos
    if (!updated.documentos) {
      updated.documentos = [];
    }
    
    const docIndex = updated.documentos.findIndex(d => d.tipo === tipo);
    if (docIndex >= 0) {
      updated.documentos[docIndex] = {
        ...updated.documentos[docIndex],
        nombre: uploadFileName,
        estado: 'cargado' as EstadoDocumento,
        fechaCarga: new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD
      };
    } else {
      updated.documentos.push({
        tipo: tipo,
        etiqueta: tipo.replace('_', ' ').toUpperCase(),
        estado: 'cargado' as EstadoDocumento,
        nombre: uploadFileName,
        fechaCarga: new Date().toISOString().split('T')[0]
      });
    }

    // Actualizar legacy también
    if (tipo === 'dni' && updated.documents) updated.documents.dni = { name: uploadFileName, uploaded: true, fileSize: '1.4 MB' };
    if (tipo === 'foto' && updated.documents) updated.documents.photo = { name: uploadFileName, uploaded: true, fileSize: '700 KB' };
    if (tipo === 'licencia' && updated.documents) updated.documents.license = { name: uploadFileName, uploaded: true, fileSize: '2.2 MB' };

    // Limpiar subsanación si se actualizó documento
    if (updated.status === 'Subsanación') {
      updated.status = 'Pendiente';
      updated.correctionReason = undefined;
    }

    // Verificar si todos los documentos requeridos están cargados
    const allLoaded = updated.documentos?.every(d => d.estado !== 'no_cargado') ?? false;
    if (allLoaded && updated.progressStep < 3 && updated.paymentStatus === 'Unpaid') {
      updated.progressStep = 3;
    }

    setUploadStatus('uploading');
    
    // Simular un pequeño delay de carga
    setTimeout(() => {
      onUpdateAspirante(updated);
      setUploadStatus('success');
      
      // Cerrar el modal después de mostrar el éxito
      setTimeout(() => {
        setUploadModalOpen(false);
        setUploadStatus('idle');
        setUploadFileName('');
      }, 1500);
    }, 800);
  };

  const handleFileDelete = (tipo: string) => {
    if (window.confirm('¿Seguro que quieres eliminar este documento?')) {
      const updated = { ...aspirante };
      
      // Lista de documentos base que siempre deben aparecer en la lista aunque estén vacíos
      const baseDocs = ['dni', 'foto', 'licencia', 'carnet_grados'];
      
      if (updated.documentos) {
        if (baseDocs.includes(tipo)) {
          // Si es un documento base, lo vaciamos pero lo dejamos en la lista para que salga "Subir"
          updated.documentos = updated.documentos.map(d =>
            d.tipo === tipo
              ? { ...d, estado: 'no_cargado' as EstadoDocumento, nombre: '', fechaCarga: '', fileSize: '' }
              : d
          );
        } else {
          // Si es un documento extra (Aval, Curriculum...), lo eliminamos de la lista por completo
          updated.documentos = updated.documentos.filter(d => d.tipo !== tipo);
        }
      }
      
      // Revert progress step if documents are missing
      updated.progressStep = 2; // Si borra algo, asume que ya no está listo para pago
      onUpdateAspirante(updated);
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPaying(true);
    setTimeout(() => {
      const updated = { ...aspirante };
      updated.paymentStatus = 'Paid';
      updated.progressStep = 4;
      if (updated.documentos) {
        updated.documentos = updated.documentos.map(d =>
          d.tipo === 'justificante_pago'
            ? { ...d, nombre: 'Justificante_pago_online.pdf', estado: 'cargado' as EstadoDocumento }
            : d
        );
      }
      onUpdateAspirante(updated);
      setIsPaying(false);
      setShowPaymentModal(false);
      showToast('¡Pago completado! Tu solicitud ha avanzado a evaluación del comité.', 'success');
    }, 1500);
  };

  const handleSelectConvocatoria = (convId: string) => {
    onUpdateAspirante({ ...aspirante, convocatoriaId: convId });
    showToast('Convocatoria seleccionada. Completa tu solicitud en la pestaña "Inscripción".', 'success');
  };

  const handleSaveVia = () => {
    if (!selectedVia) { showToast('Selecciona una vía de examen.', 'error'); return; }
    onUpdateAspirante({ ...aspirante, via: selectedVia as ViaExamen });
    showToast(`Vía "${selectedVia}" guardada en tu solicitud.`, 'success');
  };

  const handleSolicitarDispensa = () => {
    if (!dispensaMotivo.trim()) { showToast('Describe el motivo médico.', 'error'); return; }
    showConfirm(
      'Solicitar Dispensa Médica',
      `¿Confirmar envío de solicitud de dispensa médica a la Federación? Motivo: ${dispensaMotivo}`,
      () => {
        onUpdateAspirante({
          ...aspirante,
          dispensaMedica: {
            solicitada: true,
            motivoDispensa: dispensaMotivo,
            fechaSolicitud: new Date().toISOString().split('T')[0],
          }
        });
        setShowDispensaModal(false);
        showAlert('Dispensa Solicitada', 'Solicitud de dispensa médica enviada a la Federación.');
      },
      'Solicitar Dispensa'
    );
  };

  // ─── Nav items ────────────────────────────────────────────────────────────
  const navItems = [
    { id: 'perfil',        label: 'Mi Perfil',            icon: 'person' },
    { id: 'tramite',       label: 'Estado del Trámite',   icon: 'timeline' },
    { id: 'exam',          label: 'Inscripción',          icon: 'how_to_reg' },
    { id: 'convocatorias', label: 'Convocatorias',        icon: 'event_note' },
    { id: 'requisitos',    label: 'Requisitos',           icon: 'checklist' },
    { id: 'documentos',    label: 'Documentos',           icon: 'description' },
    { id: 'pagos',         label: 'Pagos / Exenciones',   icon: 'payments' },
    { id: 'especiales',    label: 'Situaciones Especiales',icon: 'medical_information' },
    { id: 'historial',     label: 'Historial de Grados',  icon: 'history' },
  ];

  return (
    <div className="bg-[#f8f9fa] dark:bg-[#0a0a0a] text-stone-800 dark:text-stone-100 font-sans min-h-screen flex">
      {/* ── Premium Sidebar ─────────────────────────────────────────────────── */}
      <nav className="hidden lg:flex flex-col h-screen w-80 fixed left-0 top-0 border-r border-stone-200/50 dark:border-white/10 shadow-2xl shadow-stone-200/20 bg-white dark:bg-[#151515] py-8 z-50 overflow-hidden">
        
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-br from-red-50 to-red-100/50 rounded-full blur-3xl -translate-y-24 translate-x-12 mix-blend-multiply pointer-events-none" />

        {/* Brand / Logo Area */}
        <div className="px-8 mb-10 relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-600/30">
              <span className="text-white font-black tracking-tighter text-base">FMK</span>
            </div>
            <div>
              <h2 className="font-black text-stone-800 dark:text-stone-100 text-lg tracking-wide leading-tight">Portal Aspirante</h2>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Federación Madrileña</p>
            </div>
          </div>
          <button onClick={toggleDarkMode} className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/10 flex items-center justify-center text-stone-500 dark:text-stone-300 hover:text-stone-800 dark:hover:text-white transition-colors" title="Cambiar Tema">
            <span className="material-symbols-outlined text-[18px]">dark_mode</span>
          </button>
        </div>

        {/* User Profile Summary */}
        <div className="px-8 mb-10 relative z-10 flex flex-col items-center">
          <label className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-white shadow-xl shadow-stone-200 dark:shadow-none flex items-center justify-center relative cursor-pointer group bg-stone-50 dark:bg-white/5">
            {aspirante.avatarUrl ? (
              <img src={aspirante.avatarUrl} alt={aspirante.name} className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-5xl text-stone-300">person</span>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all">
              <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </label>
          <p className="font-black text-lg text-stone-800 dark:text-stone-100 text-center leading-tight">{aspirante.name}</p>
          <span className={`mt-3 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border shadow-sm ${
            aspirante.status === 'Validada' || aspirante.status === 'Admitida'
              ? 'bg-green-50 text-green-700 border-green-200'
              : aspirante.status === 'Subsanación'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-stone-50 dark:bg-white/5 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-white/20'
          }`}>{aspirante.status}</span>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-6 no-scrollbar space-y-2 relative z-10">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest px-2 mb-4">Menú Principal</p>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all text-left text-base font-medium ${
                activeTab === item.id
                  ? 'bg-red-50 text-red-700 shadow-sm border border-red-100'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:text-stone-100 hover:bg-stone-50 dark:bg-white/5'
              }`}
            >
              <span className={`material-symbols-outlined text-[24px] ${activeTab === item.id ? 'filled text-red-600' : 'text-stone-400'}`}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="mt-auto px-8 pt-8 border-t border-stone-100 dark:border-white/10 relative z-10 bg-white dark:bg-[#151515]">
          {aspirante.paymentStatus === 'Unpaid' && aspirante.progressStep >= 3 && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="w-full mb-4 bg-red-700 hover:bg-red-800 text-white transition-all py-3.5 px-4 rounded-xl text-sm font-bold shadow-lg shadow-red-700/20 flex items-center justify-center gap-3 hover:-translate-y-0.5"
            >
              <span className="material-symbols-outlined text-[20px]">payment</span>
              Pagar Tasas ({cuota.monto.toFixed(2)} €)
            </button>
          )}
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl border border-stone-200 dark:border-white/20 text-stone-500 dark:text-stone-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all text-sm font-bold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* ── Main Content Area ──────────────────────────────────────────────── */}
      <main className="flex-1 lg:ml-80 flex flex-col min-h-screen bg-[#f8f9fa] dark:bg-[#0a0a0a]">
        
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-40 bg-white/80 dark:bg-[#151515]/80 backdrop-blur-md border-b border-stone-200 dark:border-white/20 p-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-red-700 flex items-center justify-center">
                <span className="text-white font-black tracking-tighter text-xs">FMK</span>
             </div>
             <span className="font-bold text-stone-800 dark:text-stone-100 text-sm">Portal Aspirante</span>
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
        <div className="lg:hidden sticky top-[65px] z-30 bg-white dark:bg-[#151515] border-b border-stone-100 dark:border-white/10 px-2 overflow-x-auto no-scrollbar py-2 flex gap-1 shadow-sm">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center min-w-[75px] px-2 py-2 rounded-xl text-[10px] font-bold transition-all ${
                activeTab === item.id
                  ? 'bg-red-50 text-red-700 border border-red-100'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:text-stone-100'
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] mb-1 ${activeTab === item.id ? 'filled text-red-600' : 'text-stone-400'}`}>
                {item.icon}
              </span>
              <span className="truncate w-full text-center">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Content Wrapper */}
        <div className="flex-1 p-6 lg:p-10 max-w-[1200px] w-full mx-auto">

        {/* ── Alerta Subsanación ── */}
        {aspirante.status === 'Subsanación' && (
          <div className="mb-6 bg-error-container border-2 border-[#ffb4a8] rounded-xl p-4 flex gap-3 text-on-error-container shadow-sm">
            <span className="material-symbols-outlined text-error-custom text-[28px] mt-0.5">error</span>
            <div>
              <h4 className="font-sans font-bold text-sm text-[#660000] uppercase tracking-wide">⚠️ Acción Requerida — Solicitud No Conforme</h4>
              <p className="font-sans text-sm mt-1 leading-relaxed">
                La administración ha indicado: <span className="italic font-mono text-xs bg-white/50 px-2 py-0.5 rounded inline-block mt-1">"{aspirante.correctionReason}"</span>
              </p>
              <p className="text-xs mt-2 opacity-80">Sube el documento requerido en la pestaña "Documentos" para reiniciar la validación.</p>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            TAB: PERFIL
           ════════════════════════════════════════════════ */}
        {activeTab === 'perfil' && (
          <div className="space-y-6">
            <div>
              <h1 className="font-black text-[24px] text-stone-800 dark:text-stone-100 tracking-tight">Mi Perfil Federativo</h1>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Datos del deportista registrado en la FMK.</p>
            </div>

            {/* Tarjeta deportista */}
            <div className="bg-gradient-to-br from-[#1b191c] via-[#2d1215] to-[#4a1010] rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-white/10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-custom/20 rounded-full blur-3xl -translate-y-24 translate-x-12 mix-blend-screen pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-500/10 rounded-full blur-2xl translate-y-16 -translate-x-8 pointer-events-none" />
              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none mix-blend-overlay"></div>

              <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center md:items-start">
                
                {/* Avatar Grande */}
                <label className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white/20 flex-shrink-0 overflow-hidden cursor-pointer group relative shadow-2xl bg-black/40 backdrop-blur-md flex items-center justify-center">
                  {aspirante.avatarUrl ? (
                    <img src={aspirante.avatarUrl} alt={aspirante.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
                      <h2 className="font-black text-3xl md:text-4xl mt-1 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-red-100 drop-shadow-md">{aspirante.name}</h2>
                      <p className="text-red-100/80 text-sm mt-1.5 flex items-center justify-center md:justify-start gap-1.5">
                        <span className="material-symbols-outlined text-sm">home_pin</span>
                        {aspirante.club}
                      </p>
                    </div>
                    <div className="text-center md:text-right bg-black/20 p-3 rounded-xl backdrop-blur-sm border border-white/5 shadow-inner">
                      <span className="font-mono text-sm text-white block font-bold tracking-wider">{aspirante.id}</span>
                      <span className="font-mono text-[10px] text-red-200/60 uppercase mt-0.5 block">{aspirante.estilo || 'Estilo no definido'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 md:gap-6 mt-auto pt-5 border-t border-white/10">
                    <div className="flex flex-col items-center md:items-start">
                      <p className="text-[9px] font-mono text-red-200/60 uppercase tracking-widest">Grado Actual</p>
                      <p className="font-black text-base md:text-lg mt-0.5 drop-shadow">{aspirante.currentBelt}</p>
                    </div>
                    <div className="flex flex-col items-center md:items-start border-l border-white/10 pl-2 md:pl-6">
                      <p className="text-[9px] font-mono text-red-200/60 uppercase tracking-widest">Edad</p>
                      <p className="font-black text-base md:text-lg mt-0.5 drop-shadow">{edad !== null ? `${edad} años` : '—'}</p>
                    </div>
                    <div className="flex flex-col items-center md:items-start border-l border-white/10 pl-2 md:pl-6">
                      <p className="text-[9px] font-mono text-red-200/60 uppercase tracking-widest">Licencias</p>
                      <p className="font-black text-base md:text-lg mt-0.5 drop-shadow">{aspirante.licenciasAcumuladas ?? '—'} <span className="text-xs font-normal opacity-70">acum.</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel Semáforo de Validación Automática */}
            <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl shadow-sm p-6 shadow-sm mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-stone-100 dark:bg-white/10 rounded-bl-full -z-10 blur-xl"></div>
              <h3 className="font-black text-xl text-on-surface mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-custom">traffic</span>
                Estado de Preparación
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">El sistema verifica automáticamente tus requisitos para presentarte a la próxima convocatoria de <strong>{aspirante.requestedBelt}</strong>.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className={`p-4 rounded-xl border flex flex-col items-center text-center transition-colors ${validEdad ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700/30' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700/30'}`}>
                  <span className={`material-symbols-outlined text-3xl mb-2 ${validEdad ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{validEdad ? 'check_circle' : 'cancel'}</span>
                  <p className={`font-bold text-sm ${validEdad ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>Edad Mínima</p>
                </div>
                <div className={`p-4 rounded-xl border flex flex-col items-center text-center transition-colors ${validPermanencia ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700/30' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700/30'}`}>
                  <span className={`material-symbols-outlined text-3xl mb-2 ${validPermanencia ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{validPermanencia ? 'check_circle' : 'cancel'}</span>
                  <p className={`font-bold text-sm ${validPermanencia ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>Permanencia</p>
                </div>
                <div className={`p-4 rounded-xl border flex flex-col items-center text-center transition-colors ${validLicencias ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700/30' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700/30'}`}>
                  <span className={`material-symbols-outlined text-3xl mb-2 ${validLicencias ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{validLicencias ? 'check_circle' : 'cancel'}</span>
                  <p className={`font-bold text-sm ${validLicencias ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>Licencias</p>
                </div>
                <div className={`p-4 rounded-xl border flex flex-col items-center text-center transition-colors ${validDocumentos ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700/30' : 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700/30'}`}>
                  <span className={`material-symbols-outlined text-3xl mb-2 ${validDocumentos ? 'text-green-600 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'}`}>{validDocumentos ? 'check_circle' : 'warning'}</span>
                  <p className={`font-bold text-sm ${validDocumentos ? 'text-green-800 dark:text-green-300' : 'text-amber-800 dark:text-amber-300'}`}>Documentos</p>
                </div>
                <div className={`p-4 rounded-xl border flex flex-col items-center text-center transition-colors ${validPago ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700/30' : 'bg-stone-50 dark:bg-white/5 border-stone-200 dark:border-white/20'}`}>
                  <span className={`material-symbols-outlined text-3xl mb-2 ${validPago ? 'text-green-600 dark:text-green-400' : 'text-stone-400 dark:text-stone-400'}`}>{validPago ? 'check_circle' : 'payments'}</span>
                  <p className={`font-bold text-sm ${validPago ? 'text-green-800 dark:text-green-300' : 'text-stone-700 dark:text-stone-300'}`}>Pago de Tasas</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                {isAllValid ? (
                  <button className="bg-green-600 hover:bg-green-700 text-white font-black text-sm px-6 py-3 rounded-lg shadow-md flex items-center gap-2 animate-bounce cursor-pointer" onClick={() => setActiveTab('convocatorias')}>
                    <span className="material-symbols-outlined">how_to_reg</span>
                    ¡Listo para presentarse a Convocatoria!
                  </button>
                ) : (
                  <div className="text-sm font-bold text-stone-500 dark:text-stone-400 flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500">pending</span>
                    Completa los requisitos en rojo o amarillo para habilitar la inscripción.
                  </div>
                )}
              </div>
            </div>

            {/* Datos personales */}
            <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl shadow-sm p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6 border-b border-outline-variant/50 pb-4">
                <h3 className="font-bold text-base text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary-custom">badge</span>
                  Datos Personales y Federativos
                </h3>
                {!isEditingProfile ? (
                  <button onClick={() => {
                    setEditData({
                      name: aspirante.name,
                      club: aspirante.club,
                      estilo: aspirante.estilo || '',
                      birthDate: aspirante.birthDate || '',
                      avatarUrl: aspirante.avatarUrl || '',
                      fechaUltimoGrado: aspirante.fechaUltimoGrado || '',
                      licenciasConsecutivas: aspirante.licenciasConsecutivas || 0,
                      licenciasAcumuladas: aspirante.licenciasAcumuladas || 0
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
                    { label: 'Nombre completo', val: aspirante.name, icon: 'person' },
                    { label: 'Correo electrónico', val: aspirante.email, icon: 'mail' },
                    { label: 'Club / Dojo', val: aspirante.club, icon: 'home_pin' },
                    { label: 'Estilo practicado', val: aspirante.estilo || '—', icon: 'sports_martial_arts' },
                    { label: 'Fecha nacimiento', val: aspirante.birthDate || '—', icon: 'calendar_today' },
                    { label: 'Último grado obtenido', val: aspirante.fechaUltimoGrado || '—', icon: 'workspace_premium' },
                    { label: 'Licencias consecutivas', val: aspirante.licenciasConsecutivas !== undefined ? String(aspirante.licenciasConsecutivas) : '—', icon: 'history' },
                    { label: 'Licencias acumuladas', val: aspirante.licenciasAcumuladas !== undefined ? String(aspirante.licenciasAcumuladas) : '—', icon: 'functions' },
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
          </div>
        )}

        {/* ════════════════════════════════════════════════
            TAB: TRÁMITE (RF-08)
           ════════════════════════════════════════════════ */}
        {activeTab === 'tramite' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="font-sans font-black text-2xl text-on-surface">Seguimiento de Expediente</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Sigue el estado detallado de tu solicitud según el RF-08.</p>
            </div>

            <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl shadow-sm p-8 relative overflow-hidden">
              {/* Timeline implementation */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-custom/5 rounded-full blur-3xl -translate-y-24 translate-x-24 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col max-w-2xl mx-auto">
                {(() => {
                  const estadosRF08 = [
                    { id: 'Borrador', label: 'Borrador', desc: 'Iniciando recopilación de requisitos y datos.' },
                    { id: 'Enviada', label: 'Enviada', desc: 'Solicitud enviada a la F.M.K. y D.A.' },
                    { id: 'Pendiente de revisión', label: 'Pendiente de revisión', desc: 'En cola para ser revisada por un administrativo federativo.' },
                    { id: 'Subsanación', label: 'Pendiente de subsanación', desc: 'Se han detectado errores o faltan documentos. Requiere tu acción.' },
                    { id: 'Validada', label: 'Validada', desc: 'La documentación es correcta. Pendiente de pago de tasas.' },
                    { id: 'Admitida', label: 'Admitida', desc: 'Expediente completo y pago recibido. Estás en la lista definitiva del examen.' },
                    { id: 'Evaluada', label: 'Evaluada', desc: 'Examen realizado. El tribunal está procesando tu calificación.' },
                    { id: 'Cerrada', label: 'Cerrada', desc: 'Acta oficial publicada con el resultado final.' }
                  ];

                  const hierarchy = ['Borrador', 'Enviada', 'Pendiente de revisión', 'Subsanación', 'Validada', 'Admitida', 'Evaluada', 'Cerrada'];
                  
                  let userStatusIndex = hierarchy.indexOf(aspirante.status);
                  if (userStatusIndex === -1) {
                    if (aspirante.status === 'Pendiente') userStatusIndex = 2;
                  }

                  return estadosRF08.map((estado, index) => {
                    const thisIndex = hierarchy.indexOf(estado.id);
                    const isCurrent = thisIndex === userStatusIndex;
                    const isFuture = thisIndex > userStatusIndex;

                    let icon = 'check_circle';
                    let iconColor = 'text-green-600';
                    let bgColor = 'bg-green-100';
                    let lineColor = 'bg-green-500';

                    if (isCurrent) {
                      if (estado.id === 'Subsanación') {
                        icon = 'error';
                        iconColor = 'text-red-600';
                        bgColor = 'bg-red-100';
                        lineColor = 'bg-red-200';
                      } else {
                        icon = 'radio_button_checked';
                        iconColor = 'text-red-600';
                        bgColor = 'bg-red-50 dark:bg-red-900/30';
                        lineColor = 'bg-gray-200';
                      }
                    } else if (isFuture) {
                      icon = 'radio_button_unchecked';
                      iconColor = 'text-gray-300';
                      bgColor = 'bg-gray-50';
                      lineColor = 'bg-gray-200';
                    }

                    return (
                      <div key={estado.id} className="flex gap-4 relative">
                        {index !== estadosRF08.length - 1 && (
                          <div className={`absolute left-[19px] top-10 bottom-0 w-0.5 ${lineColor} -mb-2`} />
                        )}
                        
                        <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${bgColor} ${isCurrent && estado.id !== 'Subsanación' ? 'ring-4 ring-blue-50' : ''}`}>
                          <span className={`material-symbols-outlined ${iconColor} ${isCurrent && estado.id !== 'Subsanación' ? 'animate-pulse' : ''}`}>
                            {icon}
                          </span>
                        </div>
                        
                        <div className={`pb-8 pt-2 flex-1 ${isFuture ? 'opacity-50' : ''}`}>
                          <h4 className={`font-bold text-base ${isCurrent ? (estado.id === 'Subsanación' ? 'text-red-700' : 'text-red-700') : 'text-on-surface'}`}>
                            {estado.label}
                          </h4>
                          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                            {estado.desc}
                          </p>
                          {isCurrent && estado.id === 'Subsanación' && (
                            <div className="mt-3 bg-red-50 border border-red-200 p-3 rounded-lg text-xs text-red-800">
                              <span className="font-bold">Motivo:</span> {aspirante.correctionReason}
                              <br/>
                              <button 
                                onClick={() => setActiveTab('documentos')}
                                className="mt-2 bg-red-600 text-white px-3 py-1.5 rounded font-bold hover:bg-red-700 transition"
                              >
                                Ir a Documentos para subsanar
                              </button>
                            </div>
                          )}
                          {isCurrent && estado.id === 'Validada' && (
                            <div className="mt-3 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/20 p-3 rounded-lg text-xs text-stone-700 dark:text-stone-200 flex items-center justify-between">
                              <span>Falta el abono de la tasa para confirmar tu plaza.</span>
                              <button 
                                onClick={() => setActiveTab('pagos')}
                                className="bg-red-700 text-white px-3 py-1.5 rounded font-bold hover:bg-red-800 transition"
                              >
                                Ir a Pagos
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ── Stepper ── */}
        <section className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 shadow-sm rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {[
              { step: 1, label: 'Convocatoria' },
              { step: 2, label: 'Documentos' },
              { step: 3, label: 'Pago' },
              { step: 4, label: 'Evaluación' },
            ].map(({ step, label }, idx, arr) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    aspirante.progressStep > step
                      ? 'bg-red-700 text-white'
                      : aspirante.progressStep === step
                      ? 'bg-white dark:bg-[#151515] border-2 border-red-700 text-red-700'
                      : 'bg-surface-container border-2 border-outline-variant text-stone-500 dark:text-stone-400'
                  }`}>
                    {aspirante.progressStep > step
                      ? <span className="material-symbols-outlined filled text-[18px]">check</span>
                      : step}
                  </div>
                  <span className={`font-mono text-[10px] ${aspirante.progressStep >= step ? 'text-on-surface font-bold' : 'text-stone-500 dark:text-stone-400'}`}>
                    {label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-4 ${aspirante.progressStep > step ? 'bg-red-700' : 'bg-outline-variant'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* ── Enviar Solicitud (RF-24, CA-02, CA-03, CA-04) ── */}
        {(aspirante.status === 'Borrador' || aspirante.status === 'Pendiente' || aspirante.status === 'Subsanación') && (
          <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl p-5 mb-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-on-surface">Enviar Solicitud Oficial</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                La solicitud se enviará a la Federación para su revisión administrativa.
              </p>
            </div>
            <button
              onClick={() => {
                const docMissing = aspirante.documentos?.some(d => d.estado === 'no_cargado' || d.estado === 'requiere_subsanacion') || !aspirante.documentos;
                if (!validEdad) { showToast('No puedes enviar la solicitud: No cumples la edad mínima requerida.', 'error'); return; }
                if (!validPermanencia) { showToast('No puedes enviar la solicitud: No cumples la permanencia mínima.', 'error'); return; }
                if (!validLicencias) { showToast('No puedes enviar la solicitud: No tienes las licencias requeridas.', 'error'); return; }
                if (docMissing) { showToast('No puedes enviar la solicitud: Faltan documentos obligatorios o hay documentos por subsanar.', 'error'); return; }
                
                showConfirm(
                  'Enviar Solicitud',
                  '¿Estás seguro de que deseas enviar tu solicitud a revisión administrativa? Una vez enviada, no podrás modificarla hasta que la Federación te lo solicite.',
                  () => {
                    onUpdateAspirante({ ...aspirante, status: 'Pendiente de revisión' as any });
                    showAlert('Solicitud Enviada', 'Tu solicitud ha sido enviada con éxito a revisión administrativa. Te notificaremos por correo electrónico.');
                  },
                  'Enviar a Revisión'
                );
              }}
              className="px-6 py-2.5 bg-red-700 text-white rounded font-bold hover:bg-[#660000] transition flex-shrink-0"
            >
              Enviar a Revisión →
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            TAB: INSCRIPCIÓN
           ════════════════════════════════════════════════ */}
        {activeTab === 'exam' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-sans font-black text-2xl text-on-surface">Solicitud de Examen de Grado</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Selecciona tu convocatoria, grado y vía de examen.</p>
            </div>

            {/* Datos actuales */}
            <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined filled text-red-700">badge</span>
                Datos de la Solicitud
              </h3>

              <div className="grid grid-cols-2 gap-4 bg-surface-container-low dark:bg-white/5 p-4 rounded-lg">
                <div>
                  <span className="font-mono text-[10px] text-stone-500 dark:text-stone-400 uppercase">Grado Actual</span>
                  <p className="font-bold text-sm mt-0.5">{aspirante.currentBelt}</p>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-stone-500 dark:text-stone-400 uppercase">Grado Solicitado</span>
                  <p className="font-bold text-sm text-red-700 mt-0.5">{aspirante.requestedBelt}</p>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-stone-500 dark:text-stone-400 uppercase">Club</span>
                  <p className="font-bold text-sm mt-0.5">{aspirante.club}</p>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-stone-500 dark:text-stone-400 uppercase">Estilo</span>
                  <p className="font-bold text-sm mt-0.5">{aspirante.estilo || '—'}</p>
                </div>
              </div>

              {/* Convocatoria seleccionada */}
              {convActual ? (
                <div className="flex items-start gap-3 p-3 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/20 rounded-lg text-sm">
                  <span className="material-symbols-outlined text-red-700 text-xl mt-0.5">event_available</span>
                  <div>
                    <p className="font-bold text-blue-900">{convActual.titulo}</p>
                    <p className="text-red-700 text-xs mt-0.5">📅 {convActual.fecha} — {convActual.sede}</p>
                    <p className="text-red-600 text-xs">⏰ Plazo ordinario: {convActual.plazoOrdinario}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/30 rounded text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">warning</span>
                  Sin convocatoria asignada. Ve a la pestaña <strong>Convocatorias</strong>.
                </div>
              )}

              {/* Vía de examen */}
              <div>
                <label className="font-mono text-[11px] text-stone-500 dark:text-stone-400 uppercase font-bold block mb-2">
                  Vía de Examen — Bloque Específico (RF-15)
                </label>
                {exentoPorEdad ? (
                  <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700/30 rounded text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">elderly</span>
                    Exento del bloque específico por tener 41+ años (RF-41). El Jyu Kumite se evaluará dentro del bloque común.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {(['Kumite', 'Campeonatos', 'Técnica'] as ViaExamen[]).map(via => (
                      <button
                        key={via}
                        onClick={() => setSelectedVia(via)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          selectedVia === via
                            ? 'border-red-700 bg-red-700/10 text-red-700 dark:text-red-400'
                            : 'border-outline-variant hover:border-red-700/40 text-stone-500 dark:text-stone-400'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl block mb-1">
                          {via === 'Kumite' ? 'sports_martial_arts' : via === 'Campeonatos' ? 'emoji_events' : 'self_improvement'}
                        </span>
                        <span className="font-bold text-sm">{via}</span>
                        <p className="text-xs mt-0.5 leading-tight">
                          {via === 'Kumite' && 'Combate con árbitros WKF'}
                          {via === 'Campeonatos' && 'Acta deportiva oficial (10 pts mínimo)'}
                          {via === 'Técnica' && 'Bunkai, Oyo Waza, Jyu Embu'}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                {selectedVia && !exentoPorEdad && (
                  <button
                    onClick={handleSaveVia}
                    className="mt-3 px-4 py-2 bg-red-700 text-white rounded font-bold text-sm hover:bg-red-800 transition"
                  >
                    Confirmar Vía: {selectedVia}
                  </button>
                )}
                {aspirante.via && (
                  <p className="mt-2 text-xs text-green-700 font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm filled">check_circle</span>
                    Vía guardada: {aspirante.via}
                  </p>
                )}
              </div>

              {/* Aval técnico */}
              {gradoConfig.requiereAval && (
                <div className="p-4 bg-surface-container-low dark:bg-white/5 border border-outline-variant rounded-lg">
                  <h4 className="font-bold text-sm text-on-surface mb-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-red-700">verified_user</span>
                    Aval Técnico — Obligatorio hasta 3.er Dan (RF-16)
                  </h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
                    Debe ser avalado por: Entrenador Nacional, Técnico Deportivo Superior del mismo club, o el Director del Departamento de Grados.
                  </p>
                  {aspirante.avalTecnico ? (
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-base filled ${aspirante.avalAceptado ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {aspirante.avalAceptado ? 'verified' : 'pending'}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{aspirante.avalTecnico}</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">{aspirante.avalAceptado ? 'Aval aceptado ✓' : 'Pendiente de aceptación'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                      <span className="material-symbols-outlined text-base">warning</span>
                      Sin avalista asignado. Contacta con tu entrenador.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            TAB: CONVOCATORIAS
           ════════════════════════════════════════════════ */}
        {activeTab === 'convocatorias' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-sans font-black text-2xl text-on-surface">Convocatorias de Examen</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Convocatorias abiertas publicadas por la Federación.</p>
            </div>

            {convAbierta.length === 0 ? (
              <div className="text-center py-16 text-stone-500 dark:text-stone-400">
                <span className="material-symbols-outlined text-6xl mb-4 block opacity-30">event_busy</span>
                <p className="font-mono text-sm">No hay convocatorias abiertas en este momento.</p>
              </div>
            ) : (
              convAbierta.map(conv => {
                const isSelected = aspirante.convocatoriaId === conv.id;
                const diasRestantes = Math.ceil((new Date(conv.plazoOrdinario).getTime() - Date.now()) / 86400000);
                const gradoAdmitido = conv.gradesAdmitidos.some(g =>
                  aspirante.requestedBelt.toLowerCase().includes(g.toLowerCase())
                );

                return (
                  <div
                    key={conv.id}
                    className={`bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl shadow-sm p-6 transition-all ${
                      isSelected ? 'border-red-700 shadow-md' : 'border-outline-variant hover:border-red-700/40'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4 flex-wrap mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-green-100 text-green-800 border border-green-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                            {conv.estado.toUpperCase()}
                          </span>
                          {isSelected && (
                            <span className="bg-red-700/20 text-red-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                              MI CONVOCATORIA ✓
                            </span>
                          )}
                          {!gradoAdmitido && (
                            <span className="bg-stone-100 dark:bg-white/10 text-stone-500 dark:text-stone-400 text-[10px] font-mono px-2 py-0.5 rounded-full">
                              Tu grado no aplica aquí
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-base text-on-surface">{conv.titulo}</h3>
                        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">📍 {conv.sede}</p>
                      </div>
                      {gradoAdmitido && !isSelected && (
                        <button
                          onClick={() => handleSelectConvocatoria(conv.id)}
                          className="px-4 py-2 bg-red-700 text-white rounded-lg font-bold text-sm hover:bg-red-800 transition shadow-sm flex-shrink-0"
                        >
                          Inscribirme
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div className="bg-surface-container-low dark:bg-white/5 p-2.5 rounded">
                        <span className="font-mono text-[9px] text-stone-500 dark:text-stone-400 uppercase block">Fecha Examen</span>
                        <span className="font-bold">{conv.fecha}</span>
                      </div>
                      <div className={`p-2.5 rounded ${diasRestantes < 10 ? 'bg-red-50' : 'bg-surface-container-low dark:bg-white/5'}`}>
                        <span className="font-mono text-[9px] text-stone-500 dark:text-stone-400 uppercase block">Plazo Ordinario</span>
                        <span className={`font-bold ${diasRestantes < 10 ? 'text-red-700' : ''}`}>
                          {conv.plazoOrdinario} {diasRestantes > 0 ? `(${diasRestantes}d)` : '(cerrado)'}
                        </span>
                      </div>
                      <div className="bg-surface-container-low dark:bg-white/5 p-2.5 rounded">
                        <span className="font-mono text-[9px] text-stone-500 dark:text-stone-400 uppercase block">Cupo</span>
                        <span className="font-bold">{conv.inscritos}/{conv.cupoMaximo} inscritos</span>
                      </div>
                      <div className="bg-surface-container-low dark:bg-white/5 p-2.5 rounded">
                        <span className="font-mono text-[9px] text-stone-500 dark:text-stone-400 uppercase block">Grados Admitidos</span>
                        <span className="font-bold">{conv.gradesAdmitidos.join(', ')}</span>
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

        {/* ════════════════════════════════════════════════
            TAB: REQUISITOS (validaciones automáticas)
           ════════════════════════════════════════════════ */}
        {activeTab === 'requisitos' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-sans font-black text-2xl text-on-surface">Validación de Requisitos</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Comprobación automática según normativa FMK (tabla 4.1 SRS).</p>
            </div>

            <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined filled text-red-700">rule</span>
                Requisitos para {aspirante.requestedBelt}
              </h3>

              <div className="space-y-3">
                {/* Edad */}
                <div className={`flex items-start gap-3 p-4 rounded-lg border ${
                  validEdad === true ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700/30' :
                  validEdad === false ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700/30' :
                  'bg-surface-container-low dark:bg-white/5 border-outline-variant'
                }`}>
                  <span className={`material-symbols-outlined filled text-xl mt-0.5 ${
                    validEdad === true ? 'text-green-600 dark:text-green-400' : validEdad === false ? 'text-red-600 dark:text-red-400' : 'text-stone-500 dark:text-stone-400'
                  }`}>
                    {validEdad === true ? 'check_circle' : validEdad === false ? 'cancel' : 'help'}
                  </span>
                  <div>
                    <h4 className="font-bold text-sm">Edad Mínima — RF-18</h4>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                      Requerido: {gradoConfig.edadMinima} años.
                      {edad !== null ? ` Tu edad el día del examen: ${edad} años.` : ' Fecha de nacimiento no registrada.'}
                    </p>
                  </div>
                  {validEdad !== null && (
                    <span className={`ml-auto font-mono text-xs font-bold px-2 py-0.5 rounded ${
                      validEdad ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                    }`}>
                      {validEdad ? 'CUMPLE' : 'NO CUMPLE'}
                    </span>
                  )}
                </div>

                {/* Permanencia */}
                <div className={`flex items-start gap-3 p-4 rounded-lg border ${
                  validPermanencia === true ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700/30' :
                  validPermanencia === false ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700/30' :
                  'bg-surface-container-low dark:bg-white/5 border-outline-variant'
                }`}>
                  <span className={`material-symbols-outlined filled text-xl mt-0.5 ${
                    validPermanencia === true ? 'text-green-600 dark:text-green-400' : validPermanencia === false ? 'text-red-600 dark:text-red-400' : 'text-stone-500 dark:text-stone-400'
                  }`}>
                    {validPermanencia === true ? 'check_circle' : validPermanencia === false ? 'cancel' : 'help'}
                  </span>
                  <div>
                    <h4 className="font-bold text-sm">Permanencia Mínima — RF-19</h4>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                      Requerido: {gradoConfig.permanenciaMinMeses} meses desde {aspirante.currentBelt}.
                      {mesesPermanencia !== null ? ` Tiempo acumulado: ${mesesPermanencia} meses.` : ' Fecha del último grado no registrada.'}
                    </p>
                  </div>
                  {validPermanencia !== null && (
                    <span className={`ml-auto font-mono text-xs font-bold px-2 py-0.5 rounded ${
                      validPermanencia ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                    }`}>
                      {validPermanencia ? 'CUMPLE' : 'NO CUMPLE'}
                    </span>
                  )}
                </div>

                {/* Licencias */}
                <div className={`flex items-start gap-3 p-4 rounded-lg border ${
                  validLicencias === true ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700/30' :
                  validLicencias === false ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700/30' :
                  'bg-surface-container-low dark:bg-white/5 border-outline-variant'
                }`}>
                  <span className={`material-symbols-outlined filled text-xl mt-0.5 ${
                    validLicencias === true ? 'text-green-600 dark:text-green-400' : validLicencias === false ? 'text-red-600 dark:text-red-400' : 'text-stone-500 dark:text-stone-400'
                  }`}>
                    {validLicencias === true ? 'check_circle' : validLicencias === false ? 'cancel' : 'help'}
                  </span>
                  <div>
                    <h4 className="font-bold text-sm">Licencias Federativas — RF-20</h4>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                      Requerido: {gradoConfig.licenciasConsecutivas} consecutivas o {gradoConfig.licenciasAlternas} alternas.
                      {aspirante.licenciasConsecutivas !== undefined
                        ? ` Tienes: ${aspirante.licenciasConsecutivas} consecutivas / ${aspirante.licenciasAcumuladas || 0} acumuladas.`
                        : ' Datos de licencias no disponibles.'}
                    </p>
                  </div>
                  {validLicencias !== null && (
                    <span className={`ml-auto font-mono text-xs font-bold px-2 py-0.5 rounded ${
                      validLicencias ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                    }`}>
                      {validLicencias ? 'CUMPLE' : 'NO CUMPLE'}
                    </span>
                  )}
                </div>

                {/* Méritos */}
                {aspirante.meritos && aspirante.meritos.length > 0 && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/30 rounded-lg">
                    <h4 className="font-bold text-sm flex items-center gap-1.5 mb-2">
                      <span className="material-symbols-outlined filled text-amber-600 dark:text-amber-400 text-base">emoji_events</span>
                      Méritos Deportivos Registrados — RF-59
                    </h4>
                    {aspirante.meritos.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-sm filled">star</span>
                        <span>{m.categoria} — {m.tipo.replace('Campeon', 'Campeón ')} {m.año}</span>
                        {(m.tipo === 'CampeonMundo' || m.tipo === 'CampeonEuropa') && (
                          <span className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 font-bold text-[9px] px-1.5 py-0.5 rounded">EXENCIÓN TOTAL</span>
                        )}
                        {(m.tipo === 'CampeonEspaña' || m.tipo === 'CampeonMadrid') && (
                          <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold text-[9px] px-1.5 py-0.5 rounded">REDUCCIÓN 50%</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Resumen normativo */}
                <div className="p-4 bg-surface-container-low dark:bg-white/5 rounded-lg border border-outline-variant">
                  <h4 className="font-bold text-sm text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">Documentación Obligatoria</h4>
                  {(() => {
                    const checkDoc = (tipo: string) => {
                      const doc = aspirante.documentos?.find(d => d.tipo === tipo);
                      return doc && (doc.estado === 'cargado' || doc.estado === 'aprobado');
                    };
                    
                    const renderItem = (isOk: boolean | undefined, label: string, color: string = 'text-red-700 dark:text-red-400') => (
                      <li className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-sm ${isOk ? 'text-green-600 dark:text-green-400 filled' : color}`}>
                          {isOk ? 'check_circle' : 'circle'}
                        </span> 
                        <span className={isOk ? 'text-green-800 dark:text-green-300 font-medium' : ''}>{label}</span>
                      </li>
                    );

                    return (
                      <ul className="text-sm space-y-2 text-on-surface-variant">
                        {renderItem(checkDoc('solicitud'), 'Solicitud oficial de examen')}
                        {renderItem(checkDoc('licencia'), 'Licencia federativa vigente (año en curso)')}
                        {renderItem(checkDoc('dni'), 'Copia del DNI')}
                        {renderItem(checkDoc('foto'), 'Fotografías tamaño carnet')}
                        {renderItem(checkDoc('carnet_grados'), 'Carnet de grados con firmas')}
                        {edad !== null && edad < 18 && renderItem(checkDoc('autorizacion'), 'Autorización paterna/materna (Menores de edad)')}
                        {gradoConfig.requiereAval && renderItem(checkDoc('aval'), 'Aval técnico (hasta 3.er Dan)', 'text-amber-600 dark:text-amber-400')}
                        {gradoConfig.requiereCurriculum && renderItem(checkDoc('curriculum'), 'Currículum deportivo (desde 4.º Dan)', 'text-amber-600 dark:text-amber-400')}
                        {gradoConfig.requiereTrabajoEscrito && renderItem(checkDoc('trabajo_escrito'), 'Trabajo escrito técnico (desde 5.º Dan — 2 meses antes)', 'text-amber-600 dark:text-amber-400')}
                        {aspirante.via === 'Campeonatos' && renderItem(checkDoc('acta_deportiva'), 'Acta deportiva oficial (Vía Campeonatos)', 'text-amber-600 dark:text-amber-400')}
                        {renderItem(checkDoc('justificante_pago') || aspirante.paymentStatus === 'Paid' || aspirante.paymentStatus === 'Exento', 'Justificante de pago o exención')}
                      </ul>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            TAB: DOCUMENTOS
           ════════════════════════════════════════════════ */}
        {activeTab === 'documentos' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-sans font-black text-2xl text-on-surface">Expediente Documental</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Carga todos los documentos requeridos (PDF, JPG, PNG — máx. 5 MB).</p>
            </div>

            <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl shadow-sm p-6">
              <div className="space-y-2">
                {(() => {
                  const baseExpected = [
                    { tipo: 'solicitud', etiqueta: 'Solicitud Oficial de Examen' },
                    { tipo: 'licencia', etiqueta: 'Licencia Federativa (año en curso)' },
                    { tipo: 'dni', etiqueta: 'Copia del DNI' },
                    { tipo: 'foto', etiqueta: 'Fotografías Tamaño Carnet' },
                    { tipo: 'carnet_grados', etiqueta: 'Carnet de Grados con Firmas' },
                  ];
                  
                  if (edad !== null && edad < 18) baseExpected.push({ tipo: 'autorizacion', etiqueta: 'Autorización Paterna/Materna' });
                  if (gradoConfig.requiereAval) baseExpected.push({ tipo: 'aval', etiqueta: 'Aval Técnico' });
                  if (gradoConfig.requiereCurriculum) baseExpected.push({ tipo: 'curriculum', etiqueta: 'Currículum Deportivo' });
                  if (gradoConfig.requiereTrabajoEscrito) baseExpected.push({ tipo: 'trabajo_escrito', etiqueta: 'Trabajo Escrito Técnico' });
                  if (aspirante.via === 'Campeonatos') baseExpected.push({ tipo: 'acta_deportiva', etiqueta: 'Acta Deportiva Oficial' });
                  
                  // Siempre debe haber un hueco para el justificante de pago a menos que el sistema ya detecte que pagó online
                  if (aspirante.paymentStatus === 'Unpaid') {
                    baseExpected.push({ tipo: 'justificante_pago', etiqueta: 'Justificante de Pago o Exención' });
                  }
                  
                  // Add extras that were uploaded
                  const extraDocs = (aspirante.documentos || []).filter(d => !baseExpected.some(b => b.tipo === d.tipo) && d.estado !== 'no_cargado');

                  const allDocsToRender: Documento[] = [...baseExpected, ...extraDocs].map(base => {
                    const found = aspirante.documentos?.find(d => d.tipo === base.tipo);
                    return (found || { tipo: base.tipo as any, etiqueta: base.etiqueta || '', estado: 'no_cargado' as EstadoDocumento, nombre: '' }) as Documento;
                  });

                  return allDocsToRender.map(doc => {
                    const est = etiquetaEstado(doc.estado);
                    return (
                    <div
                      key={doc.tipo}
                      className="flex items-center justify-between p-3 bg-surface-container rounded-lg border border-outline-variant/20"
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-stone-500 dark:text-stone-400 text-lg">
                          {doc.estado === 'aprobado' ? 'task' : doc.estado === 'no_cargado' ? 'upload_file' : 'description'}
                        </span>
                        <div>
                          <p className="font-mono text-xs font-bold text-on-surface">{doc.etiqueta}</p>
                          {doc.nombre && (
                            <p className="text-[10px] text-stone-500 dark:text-stone-400 flex items-center gap-1">
                              <span className="font-bold text-primary-custom">{doc.nombre}</span>
                              {doc.fechaCarga ? ` • Subido: ${doc.fechaCarga}` : ''}
                              {doc.fileSize ? ` • ${doc.fileSize}` : ''}
                            </p>
                          )}
                          {doc.motivoRechazo && <p className="text-[10px] text-red-600 mt-0.5">⚠️ {doc.motivoRechazo}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(doc.estado === 'cargado' || doc.estado === 'aprobado') ? (
                          <>
                            <button
                              onClick={() => alert(`Simulación: Abriendo visualizador para "${doc.nombre}"...`)}
                              className="text-[10px] font-bold px-3 py-1.5 bg-stone-50 dark:bg-white/5 text-red-700 border border-stone-200 dark:border-white/20 rounded hover:bg-red-50 transition flex items-center gap-1"
                              title="Mirar documento"
                            >
                              <span className="material-symbols-outlined text-[14px]">visibility</span>
                              Mirar
                            </button>
                            <button
                              onClick={() => handleFileDelete(doc.tipo)}
                              className="text-[10px] font-bold px-2 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 transition flex items-center gap-1"
                              title="Eliminar documento"
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                              Eliminar
                            </button>
                          </>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${est.color}`}>
                            {est.label}
                          </span>
                        )}

                        {(doc.estado === 'no_cargado' || doc.estado === 'requiere_subsanacion' || doc.estado === 'rechazado') ? (
                          <button
                            onClick={() => {
                              setUploadingDocType(doc.tipo);
                              setUploadingDocEtiqueta(doc.etiqueta);
                              setUploadFileName('');
                              setUploadStatus('idle');
                              setUploadModalOpen(true);
                            }}
                            className="text-[10px] font-bold px-3 py-1.5 bg-red-700 text-white rounded hover:bg-red-800 transition flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">upload</span>
                            Subir
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })})()}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            TAB: PAGOS
           ════════════════════════════════════════════════ */}
        {activeTab === 'pagos' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-sans font-black text-2xl text-on-surface">Pagos y Exenciones</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Estado de la tasa de examen y exenciones aplicables.</p>
            </div>

            <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl shadow-sm p-6 space-y-4">
              {/* Estado actual */}
              <div className={`flex items-center gap-4 p-4 rounded-lg border ${
                aspirante.paymentStatus === 'Paid' || aspirante.paymentStatus === 'Exento'
                  ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700/30'
                  : aspirante.paymentStatus === 'Reduccion50'
                  ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700/30'
                  : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700/30'
              }`}>
                <span className={`material-symbols-outlined filled text-3xl ${
                  aspirante.paymentStatus === 'Paid' || aspirante.paymentStatus === 'Exento' ? 'text-green-600 dark:text-green-400' :
                  aspirante.paymentStatus === 'Reduccion50' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {aspirante.paymentStatus === 'Paid' ? 'check_circle' : aspirante.paymentStatus === 'Exento' ? 'star' : 'pending'}
                </span>
                <div>
                  <p className="font-bold text-base">
                    {aspirante.paymentStatus === 'Paid' && 'Pago completado ✓'}
                    {aspirante.paymentStatus === 'Unpaid' && 'Pago pendiente'}
                    {aspirante.paymentStatus === 'Exento' && 'Exento de pago ✓'}
                    {aspirante.paymentStatus === 'Reduccion50' && 'Reducción del 50% aplicada'}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{cuota.tipo}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-black text-2xl">{cuota.monto === 0 ? 'GRATIS' : `${cuota.monto.toFixed(2)} €`}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Tasa examen {new Date().getFullYear()}</p>
                </div>
              </div>

              {/* Tabla de exenciones y reducciones */}
              <div>
                <h3 className="font-bold text-sm text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3">Tabla de Exenciones y Reducciones (RF-30 a RF-34)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low dark:bg-white/5 border-b border-stone-200 dark:border-white/10">
                        <th className="p-3 text-left font-mono text-xs text-stone-500 dark:text-stone-400 uppercase">Situación</th>
                        <th className="p-3 text-left font-mono text-xs text-stone-500 dark:text-stone-400 uppercase">Reducción</th>
                        <th className="p-3 text-left font-mono text-xs text-stone-500 dark:text-stone-400 uppercase">Aplica</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 dark:divide-white/10">
                      {[
                        { sit: 'Repite solo bloque específico (Cint. Negro)', red: 'Exención total', aplica: false },
                        { sit: 'Repite fase desde 1.er Dan / bloque común Cint. Negro', red: '50% durante 1 año', aplica: false },
                        { sit: 'Campeón de España / Madrid (individual)', red: '50% durante 1 año', aplica: aspirante.meritos?.some(m => m.tipo === 'CampeonEspaña' || m.tipo === 'CampeonMadrid') },
                        { sit: 'Campeón del Mundo / Europa (individual)', red: 'Exención total', aplica: aspirante.meritos?.some(m => m.tipo === 'CampeonMundo' || m.tipo === 'CampeonEuropa') },
                        { sit: 'Aplazamiento por causa justificada (15 días)', red: 'Aplazamiento hasta 1 año', aplica: false },
                      ].map((row, i) => (
                        <tr key={i} className={`hover:bg-stone-50 dark:hover:bg-white/5 transition-colors ${row.aplica ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                          <td className="p-3 text-stone-800 dark:text-stone-200">{row.sit}</td>
                          <td className="p-3 font-bold text-stone-800 dark:text-stone-200">{row.red}</td>
                          <td className="p-3">
                            {row.aplica
                              ? <span className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 font-bold text-xs px-2 py-1 rounded">APLICA ✓</span>
                              : <span className="text-stone-400 dark:text-stone-500">—</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {aspirante.paymentStatus === 'Unpaid' && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full py-3 bg-red-700 text-white rounded-lg font-bold hover:bg-red-800 transition flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">credit_card</span>
                  Pagar {cuota.monto.toFixed(2)} € — Tasa de Examen
                </button>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            TAB: SITUACIONES ESPECIALES
           ════════════════════════════════════════════════ */}
        {activeTab === 'especiales' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-sans font-black text-2xl text-on-surface">Situaciones Especiales</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Dispensas médicas, convalidaciones y méritos deportivos.</p>
            </div>

            {/* Dispensa médica */}
            <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl shadow-sm p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-700 text-xl">medical_information</span>
                    Dispensa Médica — RF-55/56
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    La solicitud debe presentarse con <strong>60 días mínimo de antelación</strong> al examen, con certificado e informe médico.
                  </p>
                </div>
                {!aspirante.dispensaMedica?.solicitada && (
                  <button
                    onClick={() => setShowDispensaModal(true)}
                    className="px-4 py-2 border border-red-700 text-red-700 rounded font-bold text-sm hover:bg-red-700/10 transition flex-shrink-0"
                  >
                    Solicitar Dispensa
                  </button>
                )}
              </div>

              {aspirante.dispensaMedica?.solicitada ? (
                <div className={`p-3 rounded-lg border text-sm ${
                  aspirante.dispensaMedica.aprobada === true ? 'bg-green-50 border-green-200' :
                  aspirante.dispensaMedica.aprobada === false ? 'bg-red-50 border-red-200' :
                  'bg-amber-50 border-amber-200'
                }`}>
                  <p className="font-bold">
                    {aspirante.dispensaMedica.aprobada === true && '✅ Dispensa aprobada por la Federación'}
                    {aspirante.dispensaMedica.aprobada === false && '❌ Dispensa denegada'}
                    {aspirante.dispensaMedica.aprobada === undefined && '⏳ Pendiente de resolución federativa'}
                  </p>
                  <p className="text-xs mt-1 text-stone-500 dark:text-stone-400">Motivo: {aspirante.dispensaMedica.motivoDispensa}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Fecha solicitud: {aspirante.dispensaMedica.fechaSolicitud}</p>
                  <p className="text-xs mt-2 font-medium">
                    ⚠️ La dispensa no se considera válida hasta que la Federación emita respuesta formal (RF-56).
                  </p>
                </div>
              ) : (
                <p className="text-xs text-stone-500 dark:text-stone-400 italic">Sin solicitud de dispensa médica registrada.</p>
              )}
            </div>

            {/* Méritos deportivos */}
            <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-base flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-amber-500 text-xl filled">emoji_events</span>
                Méritos Deportivos — RF-59
              </h3>
              {aspirante.meritos && aspirante.meritos.length > 0 ? (
                <div className="space-y-2">
                  {aspirante.meritos.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded">
                      <span className="material-symbols-outlined text-amber-600 filled">military_tech</span>
                      <div>
                        <p className="font-bold text-sm">{m.tipo.replace('Campeon', 'Campeón ')} — {m.año}</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">{m.categoria}</p>
                      </div>
                      <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded ${
                        m.tipo === 'CampeonMundo' || m.tipo === 'CampeonEuropa'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {m.tipo === 'CampeonMundo' || m.tipo === 'CampeonEuropa' ? 'EXENCIÓN TOTAL' : 'REDUCCIÓN 50%'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-500 dark:text-stone-400 italic">Sin méritos deportivos registrados.</p>
              )}
            </div>

            {/* Tribunal asignado */}
            {assignedTribunal && (
              <div className="bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/20 rounded-xl p-6">
                <h3 className="font-bold text-base text-blue-900 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined filled text-red-700">gavel</span>
                  Tribunal Asignado
                </h3>
                <p className="font-bold text-sm text-stone-700 dark:text-stone-200">{assignedTribunal.name}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {assignedTribunal.judges.map(j => (
                    <div key={j.id} className="flex items-center gap-1.5 bg-white dark:bg-[#151515] py-1 px-2 rounded-full border border-stone-200 dark:border-white/20 text-xs">
                      <img alt={j.name} className="w-4 h-4 rounded-full object-cover" src={j.avatarUrl} referrerPolicy="no-referrer" />
                      <span className="font-semibold text-blue-900">{j.name}</span>
                      <span className="text-blue-500 text-[9px]">{j.rank}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════
            TAB: HISTORIAL
           ════════════════════════════════════════════════ */}
        {activeTab === 'historial' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-sans font-black text-2xl text-on-surface">Historial de Grados y Exámenes</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Expediente federativo histórico.</p>
            </div>

            {/* Resultado actual */}
            {(aspirante.status === 'Apto provisional' || aspirante.status === 'No Apto provisional' || aspirante.status === 'Acta emitida') && (
              <div className={`rounded-xl border-2 p-6 ${
                aspirante.status === 'Apto provisional' || aspirante.status === 'Acta emitida'
                  ? 'bg-green-50 border-green-300'
                  : 'bg-red-50 border-red-300'
              }`}>
                <div className="flex items-center gap-4">
                  <span className={`material-symbols-outlined filled text-5xl ${
                    aspirante.status.includes('Apto') ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {aspirante.status.includes('Apto') ? 'verified' : 'cancel'}
                  </span>
                  <div>
                    <h3 className="font-black text-2xl">
                      {aspirante.status === 'Acta emitida' ? '✅ RESULTADO DEFINITIVO' : '📋 RESULTADO PROVISIONAL'}
                    </h3>
                    <p className={`font-black text-xl mt-1 ${aspirante.status.includes('Apto') ? 'text-green-700' : 'text-red-700'}`}>
                      {aspirante.status.includes('No Apto') ? 'NO APTO' : 'APTO'}
                    </p>
                    {aspirante.status === 'Acta emitida' ? (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">El resultado es definitivo. Acta oficial emitida por la Federación.</p>
                    ) : (
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Resultado provisional. Se confirma con la emisión del acta oficial.</p>
                    )}
                  </div>
                </div>
                {aspirante.evaluacion?.informeNoApto && (
                  <div className="mt-4 p-3 bg-white/60 rounded border">
                    <p className="font-bold text-xs text-stone-500 dark:text-stone-400 uppercase mb-1">Informe del Tribunal</p>
                    <p className="text-sm italic">{aspirante.evaluacion.informeNoApto}</p>
                  </div>
                )}
              </div>
            )}

            {/* Tabla histórica */}
            <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-sm text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-4">Solicitudes Históricas</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-outline-variant font-mono text-[#5a403c] text-xs">
                      <th className="pb-2">ID Trámite</th>
                      <th className="pb-2">Grado Postulado</th>
                      <th className="pb-2">Fecha</th>
                      <th className="pb-2">Club</th>
                      <th className="pb-2 text-right">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30 text-on-surface-variant font-sans">
                    <tr>
                      <td className="py-2.5 font-mono">{aspirante.id}</td>
                      <td>{aspirante.requestedBelt}</td>
                      <td>{new Date().getFullYear()}</td>
                      <td>{aspirante.club}</td>
                      <td className="py-2.5 text-right font-bold text-amber-700">EN CURSO</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono">REQ-2941</td>
                      <td>{aspirante.currentBelt}</td>
                      <td>14/10/2024</td>
                      <td>{aspirante.club}</td>
                      <td className="py-2.5 text-right font-bold text-green-700">APTO</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-mono">REQ-1039</td>
                      <td>Cinturón Azul</td>
                      <td>04/04/2023</td>
                      <td>{aspirante.club}</td>
                      <td className="py-2.5 text-right font-bold text-green-700">APTO</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        </div>
      </main>

      {/* ── Modal Pago ──────────────────────────────────────────────────── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl shadow-sm max-w-[440px] w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowPaymentModal(false)} className="absolute right-4 top-4 text-stone-400 hover:text-stone-700 dark:text-stone-200">
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-2xl text-red-700">credit_card</span>
              <h3 className="font-bold text-lg">Pagar Derechos de Examen</h3>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
              {cuota.tipo}. Importe: <strong className="text-on-surface text-sm">{cuota.monto.toFixed(2)} €</strong>
            </p>

            {/* Card preview */}
            <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-stone-100 p-4 rounded-lg mb-5 h-[140px] flex flex-col justify-between font-mono text-sm">
              <div className="flex justify-between">
                <span className="font-black tracking-widest text-[#a80000]">FMK PASS</span>
                <span className="material-symbols-outlined text-2xl opacity-60">contactless</span>
              </div>
              <div className="text-center font-bold tracking-[0.15em]">{cardNumber}</div>
              <div className="flex justify-between text-[10px]">
                <div><span className="opacity-50 text-[8px] block">TITULAR</span>{cardName.toUpperCase()}</div>
                <div className="text-right"><span className="opacity-50 text-[8px] block">VENCE</span>{cardExpiry}</div>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] uppercase text-stone-500 dark:text-stone-400 font-bold">Número de Tarjeta</label>
                <input type="text" value={cardNumber} onChange={e => setCardNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded font-mono text-sm focus:ring-1 focus:ring-primary-container outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[10px] uppercase text-stone-500 dark:text-stone-400 font-bold">Vencimiento</label>
                  <input type="text" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} placeholder="MM/YY"
                    className="w-full px-3 py-2 border border-outline-variant rounded font-mono text-sm focus:ring-1 focus:ring-primary-container outline-none text-center" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[10px] uppercase text-stone-500 dark:text-stone-400 font-bold">CVV</label>
                  <input type="password" maxLength={4} value={cardCvv} onChange={e => setCardCvv(e.target.value)} placeholder="•••"
                    className="w-full px-3 py-2 border border-outline-variant rounded font-mono text-sm focus:ring-1 focus:ring-primary-container outline-none text-center" required />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-stone-600 hover:text-stone-900 text-sm font-semibold">Cancelar</button>
                <button type="submit" disabled={isPaying}
                  className="px-5 py-2 bg-[#8b0000] hover:bg-red-900 text-white rounded font-bold text-sm transition shadow-md flex items-center gap-1 disabled:opacity-50">
                  {isPaying ? 'Procesando...' : `Confirmar ${cuota.monto.toFixed(2)} €`}
                  {!isPaying && <span className="material-symbols-outlined text-sm">payments</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Dispensa Médica ─────────────────────────────────────────── */}
      {showDispensaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl shadow-sm max-w-[440px] w-full p-6 shadow-2xl">
            <h3 className="font-bold text-base text-red-700 mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined">medical_information</span>
              Solicitar Dispensa Médica — RF-55
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-4 leading-relaxed">
              Debe adjuntar certificado e informe médico. La solicitud debe presentarse con al menos <strong>60 días de antelación</strong>. El resultado no será válido hasta que la Federación emita respuesta formal (RF-56).
            </p>
            <div className="flex flex-col gap-1 mb-4">
              <label className="font-mono text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400">Descripción del Motivo Médico</label>
              <textarea
                value={dispensaMotivo}
                onChange={e => setDispensaMotivo(e.target.value)}
                rows={4}
                placeholder="Describa la situación médica que justifica la dispensa parcial del examen..."
                className="w-full p-2 border border-outline-variant rounded text-xs focus:ring-1 focus:ring-primary-container outline-none resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDispensaModal(false)} className="px-3 py-1.5 text-stone-600 text-sm font-semibold">Cancelar</button>
              <button onClick={handleSolicitarDispensa}
                className="px-4 py-1.5 bg-red-700 text-white rounded font-bold text-sm hover:bg-red-800 transition">
                Enviar Solicitud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Subida de Documentos ────────────────────────────────── */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#151515] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up border border-outline-variant transition-all duration-300">
            
            {uploadStatus === 'success' ? (
              <div className="p-10 flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-green-600 text-5xl">check_circle</span>
                </div>
                <h3 className="text-2xl font-black text-on-surface mb-2">¡Archivo Subido!</h3>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  El documento "{uploadFileName}" se ha procesado correctamente.
                </p>
              </div>
            ) : uploadStatus === 'uploading' ? (
              <div className="p-12 flex flex-col items-center justify-center text-center animate-fade-in">
                <span className="material-symbols-outlined text-red-700 text-5xl animate-spin mb-4">progress_activity</span>
                <h3 className="font-bold text-on-surface mb-1">Subiendo archivo...</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">Procesando y validando formato seguro</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="bg-surface-container-low dark:bg-white/5 border-b border-outline-variant p-4 flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-red-700">cloud_upload</span>
                    Subir Documento
                  </h3>
                  <button onClick={() => setUploadModalOpen(false)} className="text-stone-500 dark:text-stone-400 hover:text-on-surface transition-colors">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                  <div className="bg-stone-50 dark:bg-white/5 text-stone-700 dark:text-stone-200 p-3 rounded-lg text-xs flex gap-2 items-start">
                    <span className="material-symbols-outlined text-base">info</span>
                    <p>Sube el archivo en formato PDF, JPG o PNG. Tamaño máximo permitido: 5 MB.</p>
                  </div>

                  {uploadingDocType === 'general' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="font-mono text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400">Tipo de Documento</label>
                      <select
                        value={uploadDocTypeSelected}
                        onChange={e => setUploadDocTypeSelected(e.target.value)}
                        className="w-full border border-outline-variant rounded-lg p-2.5 text-sm focus:border-red-700 focus:ring-1 focus:ring-primary-container outline-none bg-surface-container-low dark:bg-white/5"
                      >
                        <option value="">Selecciona el tipo de documento...</option>
                        <option value="dni">DNI / NIE / Pasaporte</option>
                        <option value="foto">Fotografía Carnet</option>
                        <option value="licencia">Licencia Federativa Actual</option>
                        <option value="carnet_grados">Carnet de Grados</option>
                        <option value="aval_tecnico">Aval Técnico</option>
                        <option value="curriculum">Currículum Deportivo</option>
                        <option value="trabajo_escrito">Trabajo Escrito (Tribunal)</option>
                        <option value="justificante_pago">Justificante de Pago</option>
                      </select>
                    </div>
                  )}

                  {uploadingDocType !== 'general' && (
                    <div className="flex flex-col gap-1">
                      <label className="font-mono text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400">Documento Requerido</label>
                      <div className="font-bold text-sm bg-surface-container p-2.5 rounded-lg border border-outline-variant/40">
                        {uploadingDocEtiqueta}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400">Seleccionar Archivo</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setUploadFileName(e.target.files[0].name);
                        }
                      }}
                      className="w-full border border-outline-variant rounded-lg p-2 text-sm focus:border-red-700 focus:ring-1 focus:ring-primary-container outline-none bg-surface-container-low dark:bg-white/5 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-red-700 file:text-white hover:file:bg-primary-custom cursor-pointer"
                    />
                    {uploadFileName && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        <span>Seleccionado: <strong>{uploadFileName}</strong></span>
                      </div>
                    )}
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1">
                      Selecciona un archivo de tu ordenador. Al subirlo se guardará temporalmente en tu navegador.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-surface-container-low dark:bg-white/5 border-t border-outline-variant p-4 flex justify-end gap-3">
                  <button
                    onClick={() => setUploadModalOpen(false)}
                    className="px-4 py-2 text-sm font-bold text-stone-500 dark:text-stone-400 hover:bg-stone-200 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleFileUploadConfirm}
                    disabled={!uploadFileName}
                    className="px-4 py-2 text-sm font-bold bg-red-700 text-white rounded-lg hover:bg-[#660000] transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[18px]">upload</span>
                    Subir y Guardar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
