import React, { useState } from 'react';
import { Aspirante, Tribunal, Convocatoria, EstadoDocumento, EstadoSolicitud, Documento, Judge } from '../types';
import ActaImprimible from './ActaImprimible';
import ConfiguracionPerfilFederativo from './ConfiguracionPerfilFederativo';
import { useUI } from '../contexts/UIContext';
import { supabase } from '../lib/supabase';
import { createAspirante, createJudge } from '../lib/api';
import { generateUUID } from '../lib/uuid';
import { sendMagicLinkForFirstTime } from '../lib/auth';

interface AdminPortalProps {
  aspirantes: Aspirante[];
  onUpdateAspirantes: (updated: Aspirante[]) => void;
  onUpdateAspiranteAtomic?: (id: string, updates: Partial<Aspirante>) => void;
  onAddAspiranteAtomic?: (newAspirante: Aspirante) => void;
  onLogout: () => void;
  allTribunals: Tribunal[];
  onUpdateTribunals?: (updated: Tribunal[]) => void;
  judges?: Judge[];
  onUpdateJudges?: (updated: Judge[]) => void;
  onUpdateJudgeAtomic?: (id: string, updates: Partial<Judge>) => void;
  onAddJudgeAtomic?: (newJudge: Judge) => void;
  convocatorias: Convocatoria[];
  onUpdateConvocatorias: (updated: Convocatoria[]) => void;
  onUpdateConvocatoriaAtomic?: (id: string, updates: Partial<Convocatoria>) => void;
  onAddConvocatoriaAtomic?: (newConv: Convocatoria) => void;
}


type AdminTab = 'dashboard' | 'kanban' | 'documentos' | 'convocatorias' | 'especiales' | 'estadisticas' | 'configuracion' | 'usuarios' | 'perfil';

const toggleDarkMode = () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  window.dispatchEvent(new Event('theme_changed'));
};

const STATUS_COLORS: Record<string, string> = {
  'Pendiente':    'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700/30 dark:text-amber-400',
  'Subsanación':  'text-red-700 bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-700/30 dark:text-red-400',
  'Validada':     'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700/30 dark:text-blue-400',
  'Rechazada':    'text-stone-600 bg-stone-50 dark:bg-white/5 border-stone-200 dark:border-white/20 dark:text-stone-300',
  'Admitida':     'text-green-700 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700/30 dark:text-green-400',
  'En evaluación':'text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-900/30 dark:border-purple-700/30 dark:text-purple-400',
  'Apto provisional':'text-teal-700 bg-teal-50 border-teal-200 dark:bg-teal-900/30 dark:border-teal-700/30 dark:text-teal-400',
  'No Apto provisional':'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-900/30 dark:border-rose-700/30 dark:text-rose-400',
  'Acta emitida': 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-700/30 dark:text-indigo-400',
  'Cerrada':      'text-stone-700 dark:text-stone-200 bg-stone-200 border-stone-300 dark:bg-stone-800 dark:border-stone-700',
};

function DocEstadoBadge({ estado }: { estado: EstadoDocumento }) {
  const map: Record<EstadoDocumento, { label: string; cls: string }> = {
    no_cargado:           { label: 'Pendiente',    cls: 'text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-white/10 border-stone-200 dark:border-white/20' },
    cargado:              { label: 'Cargado',       cls: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700/30 dark:text-blue-400' },
    en_revision:          { label: 'En revisión',   cls: 'text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-900/30 dark:border-purple-700/30 dark:text-purple-400' },
    aprobado:             { label: 'Aprobado ✓',    cls: 'text-green-700 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700/30 dark:text-green-400' },
    rechazado:            { label: 'Rechazado ✗',   cls: 'text-red-700 bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-700/30 dark:text-red-400' },
    requiere_subsanacion: { label: 'Subsanación',   cls: 'text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-700/30 dark:text-orange-400' },
  };
  const badgeData = map[estado] || { label: String(estado || 'Desconocido'), cls: 'text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-white/10 border-stone-200 dark:border-white/20' };
  const { label, cls } = badgeData;
  return <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border ${cls}`}>{label}</span>;
}

export default function AdminPortal({
  aspirantes,
  onUpdateAspirantes,
  onUpdateAspiranteAtomic,
  onAddAspiranteAtomic,
  onLogout,
  allTribunals,
  onUpdateTribunals,
  judges = [],
  onUpdateJudges,
  onUpdateJudgeAtomic,
  onAddJudgeAtomic,
  convocatorias,
  onUpdateConvocatorias,
  onUpdateConvocatoriaAtomic,
  onAddConvocatoriaAtomic,
}: AdminPortalProps) {
  const { showToast, showConfirm, showAlert, showPrompt } = useUI();
  
  const handleInjectTestData = async () => {
    if (!confirm('¿Deseas inyectar datos de prueba (1 convocatoria, 1 tribunal y 1 aspirante)?')) return;
    try {
      const { generateUUID } = await import('../lib/uuid');
      const api = await import('../lib/api');
      
      const convId = generateUUID();
      const newConv = await api.createConvocatoria({
        id: convId,
        titulo: 'Convocatoria Test Mágico',
        fecha: new Date().toISOString(),
        sede: 'Dojo Pruebas Central',
        gradesAdmitidos: ['Cinturón Negro', '1º Dan', '2º Dan'],
        vias: ['Vía Ordinaria', 'Vía Méritos Deportivos'],
        estado: 'Abierta',
        descripcion: 'Generada automáticamente para pruebas.'
      });

      const tribId = generateUUID();
      const juezPrueba = judges.find(j => j.rank === 'Juez Nacional') || judges[0];
      
      const newTrib = await api.createTribunal({
        id: tribId,
        name: 'Mesa 1 - Especial Test',
        fecha: new Date().toISOString(),
        convocatoriaId: convId,
        judges: juezPrueba ? [juezPrueba] : [],
        arbitros: []
      });

      const aspId = generateUUID();
      const newAsp = await api.createAspirante({
        id: aspId,
        name: 'Goku Son (Test)',
        email: 'goku@capsulecorp.com',
        club: 'Kame House Dojo',
        currentBelt: 'Cinturón Marrón',
        requestedBelt: 'Cinturón Negro',
        via: 'Kumite',
        status: 'En evaluación',
        paymentStatus: 'Paid',
        assignedTribunalId: tribId,
        convocatoriaId: convId,
        documentos: [
          { etiqueta: 'DNI', nombre: 'DNI', tipo: 'dni', url: 'https://ejemplo.com/dni.jpg', estado: 'aprobado' },
          { etiqueta: 'Permiso', nombre: 'Permiso', tipo: 'licencia', url: 'https://ejemplo.com/perm.pdf', estado: 'aprobado' }
        ]
      });

      alert('¡Datos inyectados exitosamente! Recarga la página (F5) para verlos.');
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Error inyectando datos de prueba.');
    }
  };

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [searchQuery, setSearchQuery]     = useState('');
  const [gradeFilter, setGradeFilter]     = useState<'All' | 'Kyu' | 'Dan'>('All');
  const [selectedAspirante, setSelectedAspirante] = useState<Aspirante | null>(null);
  const [subsanacionReason, setSubsanacionReason] = useState('Falta actualizar el certificado médico vigente.');
  const [showSubsanacionModal, setShowSubsanacionModal] = useState(false);
  const [showActaModal, setShowActaModal]   = useState(false);
  const [showInformeModal, setShowInformeModal] = useState(false);
  const [informeText, setInformeText]       = useState('');
  const [convEditId, setConvEditId]         = useState<string | null>(null);

  // User Management
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserType, setNewUserType] = useState<'juez'|'arbitro'|'deportista'|'director'|'medico'>('juez');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');

  // Convocatoria Management
  const [showAddConvModal, setShowAddConvModal] = useState(false);
  const [newConvTitle, setNewConvTitle] = useState('Convocatoria Extraordinaria');
  const [newConvDate, setNewConvDate] = useState('2026-12-01');
  const [newConvSede, setNewConvSede] = useState('Pabellón FMK');

  const [showNotifications, setShowNotifications] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [adminName, setAdminName] = useState<string>('Oficina Central');

  interface NotificationItem {
    id: string;
    title: string;
    desc: string;
    time: string;
    icon: string;
    color: string;
    bg: string;
    read: boolean;
    tab?: AdminTab;
  }

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const prevAspirantesLen = React.useRef(aspirantes.length);

  React.useEffect(() => {
    // Solo notificar si aumentó la longitud y no es la primera carga inicial (length = 0)
    if (aspirantes.length > prevAspirantesLen.current && prevAspirantesLen.current > 0) {
      // Como hacemos unshift en localStorage, el más nuevo está en aspirantes[0]
      const latestAsp = aspirantes[0];
      if (latestAsp) {
        setNotifications(prev => [{
          id: generateUUID(),
          title: 'Nueva Solicitud de Grado',
          desc: `${latestAsp.name} ha solicitado el grado de ${latestAsp.requestedBelt}.`,
          time: 'Justo ahora',
          icon: 'person_add',
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          read: false,
          tab: 'kanban'
        }, ...prev]);
        
        // También podemos hacer que el botón suene o vibre
        try {
          const audio = new Audio('/notification.mp3'); // Opcional, ignora si no existe
          audio.play().catch(() => {});
        } catch (e) {}
      }
    }
    prevAspirantesLen.current = aspirantes.length;
  }, [aspirantes]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleToggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadCount > 0) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  React.useEffect(() => {
    import('../lib/firebase').then(({ auth, db }) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          setAvatarUrl(user.photoURL || '');
          if (user.displayName) {
            setAdminName(user.displayName);
          } else {
            import('firebase/firestore').then(({ getDocs, query, collection, where }) => {
              const q = query(collection(db, 'user_roles'), where('email', '==', user.email?.toLowerCase()));
              getDocs(q).then(snap => {
                if (!snap.empty && snap.docs[0].data().name) {
                  setAdminName(snap.docs[0].data().name);
                } else if (user.email?.toLowerCase() === 'castrokilnger@gmail.com') {
                  setAdminName('CASTRO KILNGER');
                } else {
                  setAdminName(user.email || 'Oficina Central');
                }
              });
            });
          }
        }
      });
      return () => unsubscribe();
    });
  }, []);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const emailLower = newUserEmail.trim().toLowerCase();
    if (newUserType === 'deportista') {
      if (aspirantes.some(a => a.email.toLowerCase() === emailLower)) {
        showAlert('Correo Registrado', `El correo ${emailLower} ya pertenece a un deportista.`);
        return;
      }
    } else {
      if (judges.some(j => j.email?.toLowerCase() === emailLower)) {
        showAlert('Correo Registrado', `El correo ${emailLower} ya está registrado en el Padrón de Personal.`);
        return;
      }
    }

    showConfirm(
      'Confirmar Creación',
      `¿Estás seguro de que deseas crear una nueva cuenta para ${newUserName} (${newUserType})? Se enviarán las credenciales a su correo.`,
      async () => {
        try {
          const emailLower = newUserEmail.trim().toLowerCase();
          // 1. Send Magic Link via Supabase Auth (creates user if doesn't exist)
          await sendMagicLinkForFirstTime(emailLower, newUserName, newUserType);

          // 2. Create Profile in Database & Update Local State
          if (newUserType === 'deportista') {
            const newId = generateUUID();
            const newAsp: Aspirante = {
              id: newId,
              name: newUserName,
              email: emailLower,
              club: 'Club Pendiente',
              currentBelt: 'Cinturón Blanco',
              requestedBelt: '1º Dan',
              status: 'Borrador',
              progressStep: 1,
              documentos: [],
              documents: { dni: { name: '', uploaded: false }, photo: { name: '', uploaded: false }, license: { name: '', uploaded: false } },
              paymentStatus: 'Unpaid',
              active: true
            };
            
            if (onAddAspiranteAtomic) {
              onAddAspiranteAtomic(newAsp);
            } else {
              onUpdateAspirantes([newAsp, ...aspirantes]);
            }
          } else {
            const newId = `${newUserType === 'director' ? 'd' : (newUserType === 'juez' ? 'j' : (newUserType === 'medico' ? 'm' : 'a'))}-${Math.floor(1000 + Math.random() * 9000)}`;
            const rank = newUserType === 'director' ? 'Director' : (newUserType === 'juez' ? 'Juez Regional' : (newUserType === 'medico' ? 'Médico' : 'Árbitro Nacional'));
            const newJudge: Judge = {
              id: newId,
              name: newUserName,
              email: emailLower,
              avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(newUserName)}&background=random`,
              rank: rank,
              active: true
            };
            
            if (onAddJudgeAtomic) {
              onAddJudgeAtomic(newJudge);
            } else if (onUpdateJudges) {
              onUpdateJudges([newJudge, ...judges]);
            }
          }
          
          setShowAddUserModal(false);
          setNewUserName('');
          setNewUserEmail('');
          
          showAlert('Usuario Creado', `Se agregó al usuario exitosamente y las credenciales fueron enviadas a ${emailLower}.`);
        } catch (error: any) {
          console.error("Error creating user:", error);
          showAlert('Error al crear usuario', error.message || 'Ocurrió un error inesperado al conectar con el servidor.');
        }
      },
      'Crear y Notificar'
    );
  };

  const handleToggleActive = (id: string, type: 'juez'|'deportista') => {
    let targetName = '';
    let isCurrentlyActive = true;
    if (type === 'juez') {
      const j = judges.find(x => x.id === id);
      if (j) { targetName = j.name; isCurrentlyActive = j.active !== false; }
    } else {
      const a = aspirantes.find(x => x.id === id);
      if (a) { targetName = a.name; isCurrentlyActive = a.active !== false; }
    }

    const actionText = isCurrentlyActive ? 'Inhabilitar' : 'Rehabilitar';
    const message = isCurrentlyActive 
      ? `¿Estás seguro de que deseas inhabilitar el acceso de ${targetName}? Perderá el acceso a la plataforma pero conservará su historial.`
      : `¿Estás seguro de que deseas restablecer el acceso de ${targetName}?`;

    showConfirm(
      `Confirmar ${actionText}`,
      message,
      () => {
        if (type === 'juez' && onUpdateJudges) {
          const currentJudge = judges.find(j => j.id === id);
          if (currentJudge) {
            const newActiveState = !currentJudge.active;
            if (onUpdateJudgeAtomic) onUpdateJudgeAtomic(id, { active: newActiveState });
            else onUpdateJudges(judges.map(j => j.id === id ? { ...j, active: newActiveState } : j));
          }
        } else if (type === 'deportista') {
          const currentAsp = aspirantes.find(a => a.id === id);
          if (currentAsp) {
            const newActiveState = !currentAsp.active;
            if (onUpdateAspiranteAtomic) onUpdateAspiranteAtomic(id, { active: newActiveState });
            else onUpdateAspirantes(aspirantes.map(a => a.id === id ? { ...a, active: newActiveState } : a));
          }
        }
        showAlert(
          isCurrentlyActive ? 'Cuenta Inhabilitada' : 'Cuenta Habilitada', 
          `La cuenta de ${targetName} ha sido ${isCurrentlyActive ? 'inhabilitada exitosamente' : 'habilitada exitosamente'}.`
        );
      },
      `Sí, ${actionText}`,
      'Cancelar',
      isCurrentlyActive // Usar color rojo de peligro si se está inhabilitando
    );
  };

  const handleAddConv = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConvTitle.trim() || !newConvDate.trim() || !newConvSede.trim()) return;

    showConfirm(
      'Confirmar Convocatoria',
      `¿Estás seguro de crear la convocatoria "${newConvTitle}" en ${newConvSede} para el día ${newConvDate}?`,
      () => {
        const nueva: Convocatoria = {
          id: generateUUID(),
          titulo: newConvTitle,
          fecha: newConvDate,
          sede: newConvSede,
          gradesAdmitidos: ['Cinturón Negro', '1º Dan', '2º Dan'],
          plazoOrdinario: new Date(new Date(newConvDate).getTime() - 35 * 86400000).toISOString().split('T')[0],
          estado: 'Borrador',
          cupoMaximo: 40,
          inscritos: 0,
        };
        if (onAddConvocatoriaAtomic) {
          onAddConvocatoriaAtomic(nueva);
        } else {
          onUpdateConvocatorias([...convocatorias, nueva]);
        }
        setShowAddConvModal(false);
        setNewConvTitle('Convocatoria Extraordinaria');
        setNewConvDate('2026-12-01');
        setNewConvSede('Pabellón FMK');
        showAlert('Convocatoria Creada', 'La convocatoria ha sido creada exitosamente como Borrador.');
      }
    );
  };

  // Filtrado
  const filteredAspirantes = aspirantes.filter(asp => {
    const q = searchQuery.toLowerCase();
    const matchSearch = asp.name.toLowerCase().includes(q) ||
      asp.id.toLowerCase().includes(q) ||
      asp.club.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (gradeFilter === 'Kyu') return asp.requestedBelt.toLowerCase().includes('kyu') || asp.requestedBelt.toLowerCase().includes('marrón') || asp.requestedBelt.toLowerCase().includes('negro') && !asp.requestedBelt.includes('Dan');
    if (gradeFilter === 'Dan') return asp.requestedBelt.toLowerCase().includes('dan') || asp.requestedBelt.toLowerCase().includes('negro');
    return true;
  });

  const pendientes   = filteredAspirantes.filter(a => a.status === 'Pendiente' || a.status === 'Enviada' || a.status === 'Pendiente de revisión' as any);
  const subsanaciones= filteredAspirantes.filter(a => a.status === 'Subsanación');
  const validadas    = filteredAspirantes.filter(a => a.status === 'Validada' || a.status === 'Admitida');
  const rechazadas   = filteredAspirantes.filter(a => a.status === 'Rechazada');
  const enEvaluacion = filteredAspirantes.filter(a => ['En evaluación','Apto provisional','No Apto provisional','Acta emitida'].includes(a.status));

  const totalCount  = filteredAspirantes.length || 1;
  const validadaCount = validadas.length + enEvaluacion.filter(a => a.status === 'Acta emitida' && a.evaluacion?.resultadoFinal === 'Apto').length;
  const completionRate = Math.round((validadaCount / totalCount) * 100);

  // --- Actions ---
  const moveStatus = (id: string, newStatus: EstadoSolicitud, reason?: string) => {
    const updates: Partial<Aspirante> = { status: newStatus };
    if (newStatus === 'Subsanación') {
      updates.correctionReason = reason || 'Revisar documentación.';
      updates.progressStep = 2;
    } else if (newStatus === 'Validada') {
      updates.progressStep = 4;
      updates.correctionReason = undefined;
    } else if (newStatus === 'Admitida') {
      updates.progressStep = 4;
    } else if (newStatus === 'Pendiente') {
      updates.correctionReason = undefined;
    }
    
    if (onUpdateAspiranteAtomic) {
      onUpdateAspiranteAtomic(id, updates);
      const found = aspirantes.find(a => a.id === id);
      if (found) setSelectedAspirante({ ...found, ...updates });
    } else {
      const updated = aspirantes.map(asp => asp.id === id ? { ...asp, ...updates } : asp);
      onUpdateAspirantes(updated);
      const found = updated.find(a => a.id === id);
      if (found) setSelectedAspirante(found);
    }
  };

  const updateDocEstado = (aspId: string, docName: string, newState: EstadoDocumento, reason?: string) => {
    const asp = aspirantes.find(a => a.id === aspId);
    if (!asp) return;

    const newDocs = (asp.documentos || []).map(d =>
      d.nombre === docName ? { ...d, estado: newState, motivoRechazo: reason } : d
    );

    let newStatus = asp.status;
    let correctionReason = asp.correctionReason;
    let progressStep = asp.progressStep;

    const hasRejection = newDocs.some(d => d.estado === 'rechazado' || d.estado === 'requiere_subsanacion');
    const hasPending = newDocs.some(d => d.estado === 'no_cargado' || d.estado === 'cargado' || d.estado === 'en_revision');
    
    if (hasRejection) {
      newStatus = 'Subsanación';
      correctionReason = reason || 'Documentación rechazada o requiere subsanación.';
      progressStep = 2;
    } else if (!hasPending && newDocs.filter(d => d.tipo !== 'justificante_pago').length > 0 && newDocs.every(d => d.estado === 'aprobado' || d.tipo === 'justificante_pago')) {
      if (newStatus === 'Pendiente' || newStatus === 'Enviada' || newStatus === 'Subsanación') {
        newStatus = 'Validada';
        correctionReason = undefined;
        progressStep = 4;
      }
    }

    const updates = { status: newStatus, correctionReason, progressStep, documentos: newDocs };

    if (onUpdateAspiranteAtomic) {
      onUpdateAspiranteAtomic(aspId, updates);
      setSelectedAspirante({ ...asp, ...updates });
    } else {
      const updated = aspirantes.map(a => a.id === aspId ? { ...a, ...updates } : a);
      onUpdateAspirantes(updated);
      const found = updated.find(a => a.id === aspId);
      if (found) setSelectedAspirante(found);
    }
  };

  const handleEmitirActa = () => {
    if (!selectedAspirante) return;
    const result = selectedAspirante.evaluacion?.resultadoFinal;
    const newStatus: EstadoSolicitud = 'Acta emitida';

    showConfirm(
      'Confirmar Emisión de Acta',
      `¿Estás seguro de emitir el acta final para ${selectedAspirante.name}? El resultado es ${result || 'Pendiente'}. Esta acción notificará al aspirante y es irreversible.`,
      () => {
        moveStatus(selectedAspirante.id, newStatus);
        setShowActaModal(false);
        showAlert('Acta Emitida', `El Acta oficial ha sido emitida para ${selectedAspirante.name}. Resultado: ${result || 'pendiente'}`);
      },
      'Emitir Acta Definitiva'
    );
  };

  const handleEmitirInforme = () => {
    if (!selectedAspirante || !informeText.trim()) return;
    
    showConfirm(
      'Confirmar Informe No Apto',
      `¿Estás seguro de enviar este informe de suspensión a ${selectedAspirante.name}? Se registrará en su historial de grados.`,
      () => {
        if (onUpdateAspiranteAtomic) {
          onUpdateAspiranteAtomic(selectedAspirante.id, {
            evaluacion: {
              ...(selectedAspirante.evaluacion || {
                aspiranteId: selectedAspirante.id,
                bloqueComun: { iniciado: false, completado: false, partes: [] },
                exentoBloqueEspecifico: false,
                votos: [],
                actaEmitida: false,
              }),
              informeNoApto: informeText,
            }
          });
        } else {
          const updated = aspirantes.map(asp => {
            if (asp.id !== selectedAspirante.id) return asp;
            return {
              ...asp,
              evaluacion: {
                ...(asp.evaluacion || {
                  aspiranteId: asp.id,
                  bloqueComun: { iniciado: false, completado: false, partes: [] },
                  exentoBloqueEspecifico: false,
                  votos: [],
                  actaEmitida: false,
                }),
                informeNoApto: informeText,
              }
            };
          });
          onUpdateAspirantes(updated);
        }
        setShowInformeModal(false);
        setInformeText('');
        showAlert('Informe Enviado', 'El informe de No Apto ha sido enviado al aspirante.');
      },
      'Enviar Informe',
      'Cancelar',
      true
    );
  };

  const updateConvEstado = (convId: string, newEstado: string) => {
    if (onUpdateConvocatoriaAtomic) {
      onUpdateConvocatoriaAtomic(convId, { estado: newEstado as any });
    } else {
      onUpdateConvocatorias(convocatorias.map(c =>
        c.id === convId ? { ...c, estado: newEstado as any } : c
      ));
    }
  };

  // ── Documento con más documentos faltantes ──
  const aspirantesConPendientes = aspirantes.filter(a =>
    a.status !== 'Borrador' && (a.documentos || []).some(d => d.estado === 'no_cargado' || d.estado === 'cargado')
  );

  // ── Estadísticas ──
  const aptos    = aspirantes.filter(a => a.status === 'Acta emitida' && a.evaluacion?.resultadoFinal === 'Apto').length;
  const noAptos  = aspirantes.filter(a => a.status === 'Acta emitida' && a.evaluacion?.resultadoFinal === 'No Apto').length;
  const byClub   = aspirantes.reduce<Record<string, number>>((acc, a) => { acc[a.club] = (acc[a.club] || 0) + 1; return acc; }, {});
  const byGrade  = aspirantes.reduce<Record<string, number>>((acc, a) => { acc[a.requestedBelt] = (acc[a.requestedBelt] || 0) + 1; return acc; }, {});

  // ─── Nav Items ───────────────────────────────────────────────────────────
  const tabs: { id: AdminTab; label: string; icon: string; count?: number }[] = [
    { id: 'dashboard',    label: 'Dashboard',      icon: 'dashboard' },
    { id: 'kanban',       label: 'Kanban',         icon: 'view_kanban',          count: filteredAspirantes.length },
    { id: 'documentos',   label: 'Documentos',      icon: 'folder_open',          count: aspirantesConPendientes.length },
    { id: 'convocatorias',label: 'Convocatorias',   icon: 'event_note' },
    { id: 'especiales',   label: 'Esp. Especiales', icon: 'medical_information' },
    { id: 'estadisticas', label: 'Estadísticas',    icon: 'bar_chart' },
    { id: 'configuracion',label: 'Plataforma',      icon: 'settings' },
    { id: 'usuarios',     label: 'Usuarios',        icon: 'manage_accounts' },
    { id: 'perfil',       label: 'Mi Perfil',       icon: 'person' },
  ];

  return (
    <div className="bg-[#f8f9fa] dark:bg-[#0a0a0a] text-stone-800 dark:text-stone-100 font-sans min-h-screen flex flex-col">

      {/* ── Premium Top Navigation Bar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-black/60 backdrop-blur-xl border-b border-stone-200/50 dark:border-white/10 shadow-sm w-full">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-lg shadow-red-900/30">
              <span className="text-white font-black tracking-tighter text-lg">FMK</span>
            </div>
            <div className="hidden sm:block">
              <h2 className="font-black text-stone-800 dark:text-stone-100 text-lg tracking-wide leading-tight" title={adminName}>
                {adminName}
              </h2>
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Portal Administrativo</p>
            </div>
          </div>

          {/* Center Navigation Links (Tabs) */}
          <nav className="hidden xl:flex items-center gap-1 mx-4 overflow-x-auto no-scrollbar">
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
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    activeTab === tab.id ? 'bg-red-500 text-white' : 'bg-stone-200 dark:bg-white/10'
                  }`}>{tab.count}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Right Actions (Search, Notifications, Profile) */}
          <div className="flex items-center gap-4">
            {['kanban', 'documentos'].includes(activeTab) && (
              <div className="hidden md:flex items-center relative w-48 lg:w-64">
                <span className="material-symbols-outlined absolute left-3 text-stone-400 text-[18px]">search</span>
                <input
                  className="w-full pl-10 pr-3 py-2 bg-stone-100/50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-stone-800 dark:text-white placeholder:text-stone-500"
                  placeholder="Buscar aspirante..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            )}

            <button onClick={handleInjectTestData} className="hidden lg:flex px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/20 font-bold text-xs uppercase rounded-xl transition-all items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">database</span>
              Poblar
            </button>

            <button onClick={toggleDarkMode} className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-white/5 flex items-center justify-center text-stone-500 hover:text-stone-800 dark:text-stone-300 dark:hover:text-white transition-all">
              <span className="material-symbols-outlined text-[20px]">dark_mode</span>
            </button>

            <div className="relative">
              <button 
                onClick={handleToggleNotifications}
                className={`w-10 h-10 rounded-xl bg-stone-100 dark:bg-white/5 flex items-center justify-center transition-all ${unreadCount > 0 ? 'text-amber-500 ring-2 ring-amber-500/50' : 'text-stone-500 hover:text-stone-800 dark:text-stone-300'}`}
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-[#0a0a0a]"></span>}
              </button>
            </div>

            <div className="w-px h-8 bg-stone-200 dark:bg-white/10 mx-1"></div>

            <button onClick={() => setActiveTab('perfil')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-xl object-cover border border-stone-200 shadow-sm" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-stone-200 dark:bg-white/10 flex items-center justify-center text-stone-600 dark:text-stone-300 font-bold text-sm border border-stone-300 dark:border-white/20">
                  OC
                </div>
              )}
            </button>
            <button onClick={onLogout} className="text-red-500 hover:text-red-700 w-10 h-10 flex items-center justify-center bg-red-50 dark:bg-red-500/10 rounded-xl ml-2">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>

        {/* Mobile Tabs Scrollable row */}
        <div className="xl:hidden w-full overflow-x-auto no-scrollbar border-t border-stone-200 dark:border-white/10 bg-white/50 dark:bg-black/40 backdrop-blur-md">
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

        {/* ════════════════════════════════════════════════
            TAB: DASHBOARD
           ════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <div className="flex-grow overflow-auto p-8 bg-[#fafafa] dark:bg-[#0a0a0a]">
            <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">Hola, {adminName}</h2>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Aquí tienes el resumen del ciclo de grados actual.</p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <div className="bg-white dark:bg-[#151515] p-6 lg:p-8 rounded-2xl border border-stone-200 dark:border-white/20 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Total Solicitudes</p>
                    <span className="material-symbols-outlined text-stone-400 text-2xl">description</span>
                  </div>
                  <p className="text-4xl font-black text-stone-800 dark:text-stone-100">{aspirantes.length}</p>
                </div>
                
                <div className="bg-white dark:bg-[#151515] p-6 lg:p-8 rounded-2xl border border-stone-200 dark:border-white/20 shadow-sm flex flex-col justify-between group cursor-pointer hover:border-amber-300 transition-colors" onClick={() => setActiveTab('kanban')}>
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Por Revisar</p>
                    <span className="material-symbols-outlined text-amber-500 text-2xl">pending_actions</span>
                  </div>
                  <p className="text-4xl font-black text-amber-600">{aspirantesConPendientes.length}</p>
                </div>

                <div className="bg-white dark:bg-[#151515] p-6 lg:p-8 rounded-2xl border border-stone-200 dark:border-white/20 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Validados (Listos)</p>
                    <span className="material-symbols-outlined text-blue-500 text-2xl">how_to_reg</span>
                  </div>
                  <p className="text-4xl font-black text-blue-600">
                    {aspirantes.filter(a => a.status === 'Validada').length}
                  </p>
                </div>

                <div className="bg-white dark:bg-[#151515] p-6 lg:p-8 rounded-2xl border border-stone-200 dark:border-white/20 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Actas Emitidas</p>
                    <span className="material-symbols-outlined text-indigo-500 text-2xl">verified</span>
                  </div>
                  <p className="text-4xl font-black text-indigo-600">
                    {aspirantes.filter(a => a.status === 'Acta emitida').length}
                  </p>
                </div>
              </div>

              {/* Quick Actions & Recent */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-[#151515] rounded-2xl border border-stone-200 dark:border-white/20 shadow-sm p-8">
                  <h3 className="font-bold text-lg text-stone-800 dark:text-stone-100 mb-6">Atención Requerida (Revisión Documental)</h3>
                  {aspirantesConPendientes.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-stone-400">
                      <p className="text-base">Todo al día. No hay documentos pendientes.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {aspirantesConPendientes.slice(0, 5).map(asp => (
                        <div key={asp.id} className="flex items-center justify-between p-4 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/10 hover:bg-stone-100 dark:bg-white/10 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                              {asp.requestedBelt.split(' ')[0]}
                            </div>
                            <div>
                              <p className="text-base font-bold text-stone-800 dark:text-stone-100">{asp.name}</p>
                              <p className="text-xs text-stone-500 dark:text-stone-400">{asp.club} • #{asp.id}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => { setSelectedAspirante(asp); setActiveTab('documentos'); }}
                            className="text-sm font-bold text-indigo-600 hover:text-indigo-800 px-4 py-2 bg-indigo-50 rounded-lg transition-colors"
                          >
                            Revisar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-[#151515] rounded-2xl border border-stone-200 dark:border-white/20 shadow-sm p-8">
                  <h3 className="font-bold text-lg text-stone-800 dark:text-stone-100 mb-6">Resultados (Provisionales)</h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-stone-600">Aptos</span>
                        <span className="font-mono text-stone-500 dark:text-stone-400">{aptos}</span>
                      </div>
                      <div className="w-full bg-stone-100 dark:bg-white/10 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(100, (aptos / (aptos + noAptos || 1)) * 100)}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-stone-600">No Aptos</span>
                        <span className="font-mono text-stone-500 dark:text-stone-400">{noAptos}</span>
                      </div>
                      <div className="w-full bg-stone-100 dark:bg-white/10 rounded-full h-2">
                        <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${Math.min(100, (noAptos / (aptos + noAptos || 1)) * 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-stone-100 dark:border-white/10">
                    <button 
                      onClick={() => setActiveTab('convocatorias')}
                      className="w-full py-2.5 bg-red-700 text-white text-sm font-bold rounded-lg shadow hover:bg-red-800 transition"
                    >
                      Gestionar Convocatorias
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'kanban' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col bg-transparent p-4 sm:p-0">
            <div className="mb-6 flex-shrink-0">
              <h1 className="font-black text-[28px] text-white tracking-tight">Expedientes (Data Grid)</h1>
              <p className="text-sm text-white/50 mt-0.5">Gestión tabular avanzada de solicitudes de grados federativos.</p>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
                {[
                  { label: 'PENDIENTES',   val: pendientes.length,    color: 'text-amber-500 border-amber-500/30 bg-amber-500/10' },
                  { label: 'SUBSANACIÓN',  val: subsanaciones.length, color: 'text-red-500 border-red-500/30 bg-red-500/10' },
                  { label: 'VALIDADAS',    val: validadas.length,     color: 'text-blue-500 border-blue-500/30 bg-blue-500/10' },
                  { label: 'EVALUACIÓN',   val: enEvaluacion.length,  color: 'text-purple-500 border-purple-500/30 bg-purple-500/10' },
                  { label: 'COMPLETADOS',  val: `${completionRate}%`, color: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' },
                ].map(m => (
                  <div key={m.label} className={`border rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center backdrop-blur-md ${m.color}`}>
                    <span className="text-[10px] font-bold mb-1 tracking-widest opacity-80">{m.label}</span>
                    <span className="text-3xl font-black">{m.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-grow overflow-hidden bg-white/5 border border-white/10 rounded-2xl shadow-xl backdrop-blur-xl flex flex-col">
              <div className="overflow-x-auto overflow-y-auto flex-1 p-0 m-0">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-black/60 backdrop-blur-xl border-b border-white/10">
                    <tr className="text-white/50 uppercase text-[10px] font-black tracking-widest">
                      <th className="p-4 pl-6 font-mono w-24">ID</th>
                      <th className="p-4">Aspirante</th>
                      <th className="p-4">Club</th>
                      <th className="p-4">Grado Solicitado</th>
                      <th className="p-4">Docs</th>
                      <th className="p-4">Estado Actual</th>
                      <th className="p-4 text-right pr-6">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredAspirantes.map(asp => (
                      <tr 
                        key={asp.id} 
                        onClick={() => setSelectedAspirante(asp)}
                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        <td className="p-4 pl-6 font-mono text-[11px] text-white/50">#{asp.id}</td>
                        <td className="p-4 font-bold text-white group-hover:text-red-400 transition-colors">{asp.name}</td>
                        <td className="p-4 text-white/70 text-xs">{asp.club}</td>
                        <td className="p-4 font-black text-red-500 text-xs">{asp.requestedBelt}</td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            {(asp.documentos || []).slice(0,5).map(d => (
                              <span key={d.tipo} className={`w-2 h-2 rounded-full ${
                                d.estado === 'aprobado' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                d.estado === 'cargado' ? 'bg-blue-400' :
                                d.estado === 'rechazado' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                                'bg-white/20'
                              }`} title={d.etiqueta} />
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`text-[9px] font-bold border px-2 py-1 rounded-full font-mono shadow-sm ${STATUS_COLORS[asp.status] || 'bg-white/10 text-white/70 border-white/20'}`}>
                            {asp.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-right pr-6">
                          <button 
                            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/30"
                            onClick={(e) => { e.stopPropagation(); setSelectedAspirante(asp); }}
                          >
                            <span className="material-symbols-outlined text-[18px] block">visibility</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredAspirantes.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-white/40 text-sm italic">
                          No hay registros que coincidan con la búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            TAB: DOCUMENTOS
           ════════════════════════════════════════════════ */}
        {activeTab === 'documentos' && (
          <div className="flex-1 overflow-y-auto p-8 bg-[#fafafa] dark:bg-[#0a0a0a]">
            <h1 className="font-black text-[24px] text-stone-800 dark:text-stone-100 tracking-tight mb-1">Gestión Documental</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-8">Aprueba, rechaza o solicita subsanación por cada documento individualmente (RF-27).</p>

            <div className="overflow-x-auto bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl shadow-sm">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-stone-50 dark:bg-white/5 border-b border-stone-200 dark:border-white/20 text-stone-500 dark:text-stone-400 uppercase text-[10px] font-bold tracking-wider">
                    <th className="p-3 pl-5">Expediente</th>
                    <th className="p-3">Aspirante</th>
                    <th className="p-3">Documento</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right pr-5">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {filteredAspirantes.filter(a => (a.documentos || []).length > 0).map(asp => (
                    <React.Fragment key={asp.id}>
                      {(asp.documentos || []).map((doc, i) => (
                        <tr key={`${asp.id}-${doc.tipo}`} className="hover:bg-stone-50 dark:bg-white/5 transition-colors">
                          {i === 0 && (
                            <td className="p-3 pl-5 font-mono text-xs font-bold align-top border-r border-outline-variant/30" rowSpan={(asp.documentos || []).length}>#{asp.id}</td>
                          )}
                          {i === 0 && (
                            <td className="p-3 align-top border-r border-outline-variant/30" rowSpan={(asp.documentos || []).length}>
                              <p className="font-bold text-on-surface">{asp.name}</p>
                              <p className="text-xs text-secondary-custom">{asp.club}</p>
                              <p className="text-[10px] text-primary-container font-bold mt-1">{asp.requestedBelt}</p>
                            </td>
                          )}
                          <td className="p-3">
                            <p className="font-mono text-[11px] font-bold">{doc.etiqueta}</p>
                            {doc.nombre && <p className="text-[9px] text-secondary-custom">{doc.nombre}</p>}
                            {doc.motivoRechazo && <p className="text-[9px] text-red-600 mt-0.5">⚠ {doc.motivoRechazo}</p>}
                          </td>
                          <td className="p-3">
                            <DocEstadoBadge estado={doc.estado} />
                          </td>
                          <td className="p-3 text-right pr-5">
                            {(doc.estado === 'cargado' || doc.estado === 'en_revision') ? (
                              <div className="flex gap-1 justify-end">
                                <button
                                  onClick={() => updateDocEstado(asp.id, doc.tipo, 'aprobado')}
                                  className="text-[10px] px-2 py-1 bg-green-600 text-white rounded font-bold hover:bg-green-700 shadow-sm"
                                  title="Aprobar"
                                >✓</button>
                                <button
                                  onClick={async () => {
                                    const motivo = await showPrompt({ title: 'Motivo de rechazo o subsanación:', confirmText: 'Solicitar' });
                                    if (motivo) updateDocEstado(asp.id, doc.tipo, 'requiere_subsanacion', motivo);
                                  }}
                                  className="text-[10px] px-2 py-1 bg-orange-500 text-white rounded font-bold hover:bg-orange-600 shadow-sm"
                                  title="Solicitar subsanación"
                                >!</button>
                                <button
                                  onClick={async () => {
                                    const motivo = await showPrompt({ title: 'Motivo de rechazo:', confirmText: 'Rechazar' });
                                    if (motivo) updateDocEstado(asp.id, doc.tipo, 'rechazado', motivo);
                                  }}
                                  className="text-[10px] px-2 py-1 bg-red-600 text-white rounded font-bold hover:bg-red-700 shadow-sm"
                                  title="Rechazar"
                                >✗</button>
                              </div>
                            ) : (
                                <span className="text-[10px] text-secondary-custom italic">Revisado</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {filteredAspirantes.filter(a => (a.documentos || []).length > 0).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-secondary-custom text-sm italic">
                        No hay documentos para mostrar con los filtros actuales.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            TAB: CONVOCATORIAS
           ════════════════════════════════════════════════ */}
        {activeTab === 'convocatorias' && (
          <div className="flex-1 overflow-y-auto p-8 bg-[#fafafa] dark:bg-[#0a0a0a]">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="font-black text-[24px] text-stone-800 dark:text-stone-100 tracking-tight">Gestión de Convocatorias</h1>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Crea, publica y gestiona convocatorias de examen (RF-09 a RF-12).</p>
              </div>
              <button
                  onClick={() => setShowAddConvModal(true)}
                  className="px-5 py-2.5 bg-red-700 text-white font-bold text-sm rounded-lg shadow hover:bg-red-800 transition"
                >+ Nueva Convocatoria</button>
            </div>

            <div className="space-y-4">
              {convocatorias.map(conv => {
                const inscritos = aspirantes.filter(a => a.convocatoriaId === conv.id).length;
                return (
                  <div key={conv.id} className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-start gap-4 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full font-mono ${
                            conv.estado === 'Abierta' ? 'bg-green-100 text-green-800 border-green-200' :
                            conv.estado === 'Borrador' ? 'bg-stone-100 dark:bg-white/10 text-stone-600 border-stone-200 dark:border-white/20' :
                            conv.estado === 'Cerrada' ? 'bg-red-100 text-red-700 border-red-200' :
                            'bg-indigo-100 text-indigo-700 border-indigo-200'
                          }`}>{conv.estado}</span>
                        </div>
                        <h3 className="font-bold text-base">{conv.titulo}</h3>
                        <p className="text-xs text-secondary-custom mt-0.5">📅 {conv.fecha} — 📍 {conv.sede}</p>
                        <p className="text-xs text-secondary-custom">Plazo: {conv.plazoOrdinario} · Cupo: {inscritos}/{conv.cupoMaximo}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {conv.estado === 'Borrador' && (
                          <button onClick={() => updateConvEstado(conv.id, 'Abierta')}
                            className="text-xs px-3 py-1.5 bg-green-600 text-white rounded font-bold hover:bg-green-800">Publicar</button>
                        )}
                        {conv.estado === 'Abierta' && (
                          <button onClick={() => updateConvEstado(conv.id, 'Cerrada')}
                            className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded font-bold hover:bg-amber-800">Cerrar Inscripción</button>
                        )}
                        {conv.estado === 'Cerrada' && (
                          <button onClick={() => updateConvEstado(conv.id, 'Finalizada')}
                            className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-800">Finalizar</button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {(conv.gradesAdmitidos || (conv as any).grados || []).map((g: string) => (
                        <span key={g} className="text-[10px] font-mono font-bold bg-surface-container-low dark:bg-white/5 border border-outline-variant px-1.5 py-0.5 rounded">{g}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            TAB: SITUACIONES ESPECIALES
           ════════════════════════════════════════════════ */}
        {activeTab === 'especiales' && (
          <div className="flex-1 overflow-y-auto p-8 bg-[#fafafa] dark:bg-[#0a0a0a]">
            <h1 className="font-black text-[24px] text-stone-800 dark:text-stone-100 tracking-tight mb-1">Situaciones Especiales</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-8">Dispensas médicas, convalidaciones y reconocimiento de méritos (RF-55 a RF-62).</p>

            {/* Dispensas médicas */}
            <section className="mb-6">
              <h2 className="font-bold text-sm text-secondary-custom uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary-container">medical_information</span>
                Dispensas Médicas — RF-55/56
              </h2>
              {aspirantes.filter(a => a.dispensaMedica?.solicitada).length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 border-dashed rounded-xl mt-4">
                  <div className="w-12 h-12 bg-stone-100 dark:bg-white/10 text-stone-400 rounded-full flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-2xl">medical_information</span>
                  </div>
                  <p className="text-sm font-bold text-stone-700 dark:text-stone-200">Todo al día</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 text-center max-w-xs">No hay aspirantes con solicitud de dispensa médica.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aspirantes
                    .filter(a => a.dispensaMedica?.solicitada)
                    .map(asp => (
                      <div key={asp.id} className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl p-6 shadow-sm">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {asp.dispensaMedica?.aprobada === undefined ? (
                                <span className="text-[10px] font-bold border px-2 py-0.5 rounded-full font-mono bg-amber-100 text-amber-800 border-amber-200">Pendiente de Revisión</span>
                              ) : asp.dispensaMedica?.aprobada ? (
                                <span className="text-[10px] font-bold border px-2 py-0.5 rounded-full font-mono bg-green-100 text-green-800 border-green-200">Apto Médico (Aprobada)</span>
                              ) : (
                                <span className="text-[10px] font-bold border px-2 py-0.5 rounded-full font-mono bg-red-100 text-red-800 border-red-200">No Apto (Denegada)</span>
                              )}
                            </div>
                            <h3 className="font-bold text-sm mt-2">{asp.name} <span className="font-mono text-[10px] text-secondary-custom">#{asp.id}</span></h3>
                            <p className="text-xs text-secondary-custom">{asp.club} · {asp.requestedBelt}</p>
                            <p className="text-xs mt-1 italic">"{asp.dispensaMedica?.motivoDispensa}"</p>
                            <p className="text-[10px] text-secondary-custom mt-0.5">Solicitada: {asp.dispensaMedica?.fechaSolicitud}</p>
                            
                            {/* Mostrar dictamen del médico si existe */}
                            {asp.dispensaMedica?.dictamenMedico && (
                              <div className="mt-3 p-3 bg-stone-50 dark:bg-[#111] rounded-lg border border-stone-100 dark:border-white/5">
                                <p className="text-[10px] font-bold text-secondary-custom uppercase mb-1 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">stethoscope</span> Dictamen Médico
                                </p>
                                <p className="text-xs text-stone-700 dark:text-stone-300">{asp.dispensaMedica.dictamenMedico}</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Botones de acción solo si está pendiente */}
                          {asp.dispensaMedica?.aprobada === undefined && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  showConfirm(
                                    'Aprobar Dispensa',
                                    `¿Aprobar dispensa médica para ${asp.name}?`,
                                    () => {
                                      if (onUpdateAspiranteAtomic) {
                                        onUpdateAspiranteAtomic(asp.id, {
                                          dispensaMedica: { ...asp.dispensaMedica!, aprobada: true }
                                        });
                                      } else {
                                        const updated = aspirantes.map(a => a.id === asp.id
                                          ? { ...a, dispensaMedica: { ...a.dispensaMedica!, aprobada: true } } : a
                                        );
                                        onUpdateAspirantes(updated);
                                      }
                                      showAlert('Dispensa Aprobada', 'Se ha aprobado la dispensa médica del aspirante.');
                                    },
                                    'Aprobar'
                                  );
                                }}
                                className="text-xs px-3 py-1.5 bg-green-600 text-white rounded font-bold hover:bg-green-800 transition"
                              >Aprobar</button>
                              <button
                                onClick={() => {
                                  showConfirm(
                                    'Denegar Dispensa',
                                    `¿Denegar dispensa médica para ${asp.name}?`,
                                    () => {
                                      if (onUpdateAspiranteAtomic) {
                                        onUpdateAspiranteAtomic(asp.id, {
                                          dispensaMedica: { ...asp.dispensaMedica!, aprobada: false }
                                        });
                                      } else {
                                        const updated = aspirantes.map(a => a.id === asp.id
                                          ? { ...a, dispensaMedica: { ...a.dispensaMedica!, aprobada: false } } : a
                                        );
                                        onUpdateAspirantes(updated);
                                      }
                                      showAlert('Dispensa Denegada', 'La dispensa médica fue rechazada y notificada.');
                                    },
                                    'Denegar',
                                    'Cancelar',
                                    true
                                  );
                                }}
                                className="text-xs px-3 py-1.5 bg-red-600 text-white rounded font-bold hover:bg-red-800 transition"
                              >Denegar</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </section>

            {/* Méritos deportivos */}
            <section className="mb-6">
              <h2 className="font-bold text-sm text-secondary-custom uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-amber-600 filled">emoji_events</span>
                Aspirantes con Méritos Deportivos — RF-59
              </h2>
              {aspirantes.filter(a => a.meritos && a.meritos.length > 0).length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 border-dashed rounded-xl mt-4">
                  <div className="w-12 h-12 bg-stone-100 dark:bg-white/10 text-stone-400 rounded-full flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-2xl">emoji_events</span>
                  </div>
                  <p className="text-sm font-bold text-stone-700 dark:text-stone-200">Sin registros</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 text-center max-w-xs">No hay aspirantes con méritos deportivos registrados en esta convocatoria.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aspirantes.filter(a => a.meritos && a.meritos.length > 0).map(asp => (
                    <div key={asp.id} className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl p-6 shadow-sm">
                      <h3 className="font-bold text-sm text-stone-800 dark:text-stone-100">{asp.name}</h3>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {asp.meritos!.map((m, i) => (
                          <span key={i} className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-mono">
                            {m.tipo.replace('Campeon', 'Campeón ')} {m.año} — {m.categoria}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            TAB: ESTADÍSTICAS
           ════════════════════════════════════════════════ */}
        {activeTab === 'estadisticas' && (
          <div className="flex-1 overflow-y-auto p-8 bg-[#fafafa] dark:bg-[#0a0a0a]">
            <h1 className="font-black text-[24px] text-stone-800 dark:text-stone-100 tracking-tight mb-1">Estadísticas — RPT-06</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-8">Resumen de la convocatoria actual. Los datos se actualizan en tiempo real.</p>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Aspirantes', val: aspirantes.length, icon: 'group', color: 'text-on-surface', bg: 'bg-stone-100 dark:bg-white/10' },
                { label: 'Aptos (definitivos)', val: aptos, icon: 'verified', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                { label: 'No Aptos', val: noAptos, icon: 'cancel', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
                { label: 'En trámite', val: aspirantes.length - aptos - noAptos, icon: 'pending', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
              ].map(m => (
                <div key={m.label} className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl p-5 shadow-sm">
                  <div className={`w-9 h-9 ${m.bg} rounded-lg flex items-center justify-center mb-3`}>
                    <span className={`material-symbols-outlined text-xl ${m.color}`}>{m.icon}</span>
                  </div>
                  <p className={`font-black text-3xl ${m.color}`}>{m.val}</p>
                  <p className="font-bold text-[11px] text-stone-500 dark:text-stone-400 uppercase mt-1 tracking-wider">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Line Chart — Solicitudes por mes */}
            {(() => {
              const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
              const now = new Date();
              // Build last 6 months labels
              const labels: string[] = [];
              const counts: number[] = [];
              for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                labels.push(MESES[d.getMonth()]);
                const mes = d.getMonth();
                const anio = d.getFullYear();
                counts.push(aspirantes.filter(a => {
                  // Use id prefix as rough date proxy if no created_at
                  return true; // will show 0 until real data
                }).length > 0 ? 0 : 0);
              }
              // Use real aspirantes count spread dummy across last month for demo when data exists
              counts[5] = aspirantes.length;

              const W = 600; const H = 160;
              const PAD = { t: 16, r: 24, b: 32, l: 36 };
              const chartW = W - PAD.l - PAD.r;
              const chartH = H - PAD.t - PAD.b;
              const maxVal = Math.max(...counts, 1);
              const pts = counts.map((v, i) => ({
                x: PAD.l + (i / (counts.length - 1)) * chartW,
                y: PAD.t + chartH - (v / maxVal) * chartH,
                v,
              }));
              const pathD = pts.map((p,i) => `${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
              const areaD = `${pathD} L${pts[pts.length-1].x},${PAD.t+chartH} L${pts[0].x},${PAD.t+chartH} Z`;

              return (
                <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl p-6 shadow-sm mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-sm text-stone-800 dark:text-stone-100">Solicitudes Registradas</h3>
                      <p className="text-xs text-stone-400 mt-0.5">Últimos 6 meses</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${aspirantes.length > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-stone-100 text-stone-400 dark:bg-white/5'}`}>
                      {aspirantes.length > 0 ? `${aspirantes.length} registros` : 'Sin datos aún'}
                    </span>
                  </div>
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height: 160}}>
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#dc2626" stopOpacity="0.25"/>
                        <stop offset="100%" stopColor="#dc2626" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    {[0,1,2,3].map(i => {
                      const y = PAD.t + (i / 3) * chartH;
                      return <line key={i} x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="currentColor" strokeOpacity="0.07" strokeWidth="1"/>;
                    })}
                    {/* Area */}
                    <path d={areaD} fill="url(#lineGrad)"/>
                    {/* Line */}
                    <path d={pathD} fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                    {/* Dots */}
                    {pts.map((p,i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="4" fill="#dc2626" stroke="white" strokeWidth="2"/>
                        {p.v > 0 && (
                          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fill="#dc2626" fontWeight="700">{p.v}</text>
                        )}
                      </g>
                    ))}
                    {/* X Labels */}
                    {labels.map((l, i) => (
                      <text key={i} x={PAD.l + (i / (labels.length - 1)) * chartW} y={H - 6} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.4" fontWeight="600">{l}</text>
                    ))}
                  </svg>
                  {aspirantes.length === 0 && (
                    <p className="text-center text-xs text-stone-400 mt-2 italic">La gráfica se llenará conforme se registren aspirantes</p>
                  )}
                </div>
              );
            })()}

            {/* Bar charts — Por Club y Por Grado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-sm text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-4">Por Club</h3>
                {Object.entries(byClub).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-stone-300 dark:text-stone-600 gap-2">
                    <span className="material-symbols-outlined text-3xl">bar_chart</span>
                    <p className="text-xs italic">Sin datos aún</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(byClub).sort((a,b) => b[1]-a[1]).map(([club, count]) => (
                      <div key={club} className="flex items-center gap-3">
                        <span className="font-sans text-xs flex-1 truncate text-stone-700 dark:text-stone-200 font-medium">{club}</span>
                        <div className="w-24 h-2 bg-stone-100 dark:bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-red-600 rounded-full transition-all" style={{ width: `${(count / aspirantes.length) * 100}%` }} />
                        </div>
                        <span className="font-bold font-mono text-[11px] text-stone-500 dark:text-stone-400 w-4 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/20 rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-sm text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-4">Por Grado Solicitado</h3>
                {Object.entries(byGrade).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-stone-300 dark:text-stone-600 gap-2">
                    <span className="material-symbols-outlined text-3xl">military_tech</span>
                    <p className="text-xs italic">Sin datos aún</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(byGrade).sort((a,b) => b[1]-a[1]).map(([grade, count]) => (
                      <div key={grade} className="flex items-center gap-3">
                        <span className="font-sans text-xs flex-1 truncate text-stone-700 dark:text-stone-200 font-medium">{grade}</span>
                        <div className="w-24 h-2 bg-stone-100 dark:bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-red-600 rounded-full transition-all" style={{ width: `${(count / aspirantes.length) * 100}%` }} />
                        </div>
                        <span className="font-bold font-mono text-[11px] text-stone-500 dark:text-stone-400 w-4 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            TAB: CONFIGURACIÓN / PLATAFORMA
           ════════════════════════════════════════════════ */}
        {activeTab === 'configuracion' && (
          <div className="flex-1 p-6 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto kanban-scroll bg-[#fafafa] dark:bg-[#0f0f0f]">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h2 className="font-black text-3xl text-stone-800 dark:text-stone-100 tracking-tight">Gestión de Plataforma y Usuarios</h2>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-2">Habilita cuentas federativas, gestiona permisos y supervisa la estructura de tribunales.</p>
              </div>
              <button 
                onClick={() => {
                  if (window.confirm('¿Estás seguro de que quieres borrar TODOS los datos de prueba y reiniciar el sistema a cero? Esto eliminará aspirantes, tribunales, convocatorias, etc.')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 font-bold rounded-lg transition-colors text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                Reiniciar Datos (Reset)
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              
              {/* Padrón de Personal Federativo */}
              <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-stone-200 dark:border-white/10 shadow-sm flex flex-col h-[600px]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-lg flex items-center gap-2 text-stone-800 dark:text-stone-100">
                    <span className="material-symbols-outlined text-red-600">badge</span>
                    Padrón de Jueces, Árbitros y Médicos
                  </h3>
                  <button onClick={() => { setNewUserType('juez'); setShowAddUserModal(true); }} className="flex items-center gap-1 text-xs font-bold bg-stone-100 dark:bg-white/10 hover:bg-stone-200 dark:hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-[14px]">person_add</span> Añadir
                  </button>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">Cuentas habilitadas con acceso al portal de calificación, arbitraje y dictamen médico.</p>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 kanban-scroll">
                  {judges.map(j => (
                    <div key={j.id} className={`flex items-center justify-between p-3 border border-stone-100 dark:border-white/5 rounded-xl transition-colors group ${j.active === false ? 'opacity-50 grayscale bg-stone-50 dark:bg-[#111]' : 'hover:bg-stone-50 dark:hover:bg-white/5'}`}>
                      <div className="flex items-center gap-3">
                        <img src={j.avatarUrl} alt={j.name} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                        <div>
                          <p className="font-bold text-sm text-stone-800 dark:text-stone-100">
                            {j.name} {j.active === false && <span className="text-red-500 font-bold ml-1 text-xs">(Inhabilitado)</span>}
                          </p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-red-600">{j.rank}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleToggleActive(j.id, 'juez')} className="w-8 h-8 flex items-center justify-center rounded-full text-stone-400 hover:text-red-600 hover:bg-red-50" title={j.active === false ? "Habilitar cuenta" : "Inhabilitar cuenta"}>
                          <span className="material-symbols-outlined text-sm">{j.active === false ? 'person_check' : 'person_off'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gestión de Tribunales (Lectura para el Admin) */}
              <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-stone-200 dark:border-white/10 shadow-sm flex flex-col h-[600px]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-lg flex items-center gap-2 text-stone-800 dark:text-stone-100">
                    <span className="material-symbols-outlined text-indigo-600">gavel</span>
                    Mesas Evaluadoras (Tribunales)
                  </h3>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
                  Estructura de tribunales configurada. <br/>
                  <strong className="text-indigo-600">Nota:</strong> El Departamento de Grados (Director) es quien asigna los jueces a las mesas.
                </p>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4 kanban-scroll">
                  {allTribunals.map(trib => (
                    <div key={trib.id} className="border border-stone-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-stone-50 dark:bg-white/5 p-4 flex justify-between items-center border-b border-stone-200 dark:border-white/10">
                        <div>
                          <h4 className="font-black text-sm text-stone-800 dark:text-stone-100">{trib.name}</h4>
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${trib.isMain ? 'bg-indigo-100 text-indigo-800' : 'bg-stone-200 text-stone-600'}`}>
                            {trib.isMain ? 'Mesa Principal' : 'Mesa Auxiliar'}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-stone-400">{(trib.judges || []).length} Jueces</span>
                      </div>
                      <div className="p-4 bg-white dark:bg-[#151515]">
                        {(trib.judges || []).length === 0 ? (
                          <p className="text-xs text-stone-400 italic">No hay jueces asignados a esta mesa.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {(trib.judges || []).map(j => (
                              <span key={j.id} className="text-[10px] font-bold uppercase tracking-widest bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-stone-300 px-2.5 py-1 rounded-md border border-stone-200 dark:border-white/20 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> {j.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            TAB: GESTIÓN DE USUARIOS (ASPIRANTES/ESTUDIANTES)
           ════════════════════════════════════════════════ */}
        {activeTab === 'usuarios' && (
          <div className="flex-1 p-6 lg:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto kanban-scroll bg-[#fafafa] dark:bg-[#0f0f0f]">
            <div className="mb-10">
              <h2 className="font-black text-3xl text-stone-800 dark:text-stone-100 tracking-tight">Gestión de Usuarios</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-2">Habilita cuentas para estudiantes y aspirantes (vía correo y código de verificación).</p>
            </div>

            <div className="bg-white dark:bg-[#151515] p-6 rounded-3xl border border-stone-200 dark:border-white/10 shadow-sm flex flex-col min-h-[600px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-lg flex items-center gap-2 text-stone-800 dark:text-stone-100">
                  <span className="material-symbols-outlined text-blue-600">group</span>
                  Padrón de Estudiantes y Aspirantes
                </h3>
                <button onClick={() => { setNewUserType('deportista'); setShowAddUserModal(true); }} className="flex items-center gap-1 text-xs font-bold bg-stone-100 dark:bg-white/10 hover:bg-stone-200 dark:hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-[14px]">person_add</span> Añadir Estudiante
                </button>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">Cuentas creadas para acceder al portal de solicitudes y ver resultados de grados.</p>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 kanban-scroll">
                {aspirantes.map(a => (
                  <div key={a.id} className={`flex items-center justify-between p-3 border border-stone-100 dark:border-white/5 rounded-xl transition-colors group ${a.active === false ? 'opacity-50 grayscale bg-stone-50 dark:bg-[#111]' : 'hover:bg-stone-50 dark:hover:bg-white/5'}`}>
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full flex-shrink-0 bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-800 dark:text-blue-300 shadow-sm text-xs">
                        {a.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-stone-800 dark:text-stone-100 truncate">
                          {a.name} {a.active === false && <span className="text-red-500 font-bold ml-1 text-xs">(Inhabilitado)</span>}
                        </p>
                        <div className="flex items-center gap-4 mt-1 flex-wrap">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">mail</span> {a.email}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">storefront</span> {a.club}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1 bg-stone-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                            <span className="material-symbols-outlined text-[12px]">military_tech</span> Grado actual: <span className="text-stone-700 dark:text-stone-300">{a.currentBelt}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleToggleActive(a.id, 'deportista')} className="w-8 h-8 flex items-center justify-center rounded-full text-stone-400 hover:text-red-600 hover:bg-red-50" title={a.active === false ? "Habilitar cuenta" : "Inhabilitar cuenta"}>
                        <span className="material-symbols-outlined text-sm">{a.active === false ? 'person_check' : 'person_off'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            TAB: PERFIL
           ════════════════════════════════════════════════ */}
        {activeTab === 'perfil' && (
          <div className="flex-grow overflow-auto p-8 bg-[#fafafa] dark:bg-[#0a0a0a] flex flex-col items-start">
            <div className="w-full max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ConfiguracionPerfilFederativo 
                roleName="Administrador Central (Oficina Central)" 
                defaultName={adminName} 
                onUpdateName={(newName) => setAdminName(newName)}
              />
            </div>
          </div>
        )}
      </main>

      {/* ── Drawer detalle aspirante ─────────────────────────────────────── */}
      {selectedAspirante && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-end animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#151515] max-w-[520px] w-full h-full p-6 overflow-y-auto shadow-2xl flex flex-col gap-4 animate-in slide-in-from-right duration-300">

            {/* Header */}
            <div className="flex justify-between items-start border-b border-surface-container-high pb-4">
              <div>
                <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded">#{selectedAspirante.id}</span>
                <h3 className="font-black text-xl text-on-surface mt-2">{selectedAspirante.name}</h3>
                <p className="text-xs text-secondary-custom">{selectedAspirante.email}</p>
                <span className={`mt-1 inline-block text-[10px] font-bold border px-2 py-0.5 rounded font-mono ${STATUS_COLORS[selectedAspirante.status] || ''}`}>
                  {selectedAspirante.status}
                </span>
              </div>
              <button onClick={() => setSelectedAspirante(null)} className="p-1.5 text-stone-400 hover:text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:bg-white/5 rounded-full transition">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Info general */}
            <div className="grid grid-cols-2 gap-3 bg-surface-container-low dark:bg-white/5 p-4 rounded-lg">
              <div><span className="font-mono text-[9px] text-secondary-custom uppercase">Grado Actual</span><p className="font-bold text-sm">{selectedAspirante.currentBelt}</p></div>
              <div><span className="font-mono text-[9px] text-secondary-custom uppercase">Solicitado</span><p className="font-bold text-sm text-primary-container">{selectedAspirante.requestedBelt}</p></div>
              <div><span className="font-mono text-[9px] text-secondary-custom uppercase">Club</span><p className="font-bold text-sm">{selectedAspirante.club}</p></div>
              <div><span className="font-mono text-[9px] text-secondary-custom uppercase">Vía</span><p className="font-bold text-sm">{selectedAspirante.via || '—'}</p></div>
              <div><span className="font-mono text-[9px] text-secondary-custom uppercase">Estilo</span><p className="font-bold text-sm">{selectedAspirante.estilo || '—'}</p></div>
              <div><span className="font-mono text-[9px] text-secondary-custom uppercase">Pago</span>
                <p className={`font-bold text-sm ${selectedAspirante.paymentStatus === 'Paid' || selectedAspirante.paymentStatus === 'Exento' ? 'text-green-700' : 'text-red-700'}`}>
                  {selectedAspirante.paymentStatus}
                </p>
              </div>
            </div>

            {/* Aval */}
            {selectedAspirante.avalTecnico && (
              <div className="p-3 bg-surface-container-low dark:bg-white/5 rounded-lg border border-outline-variant/30">
                <span className="font-mono text-[9px] text-secondary-custom uppercase block mb-1">Aval Técnico</span>
                <p className="text-sm font-semibold">{selectedAspirante.avalTecnico}</p>
                <p className="text-[10px] mt-0.5">{selectedAspirante.avalAceptado ? '✅ Aceptado' : '⏳ Pendiente'}</p>
              </div>
            )}

            {/* Apto Médico */}
            <div className={`p-3 rounded-lg border ${
              selectedAspirante.aptoMedico?.estado === 'apto' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800/30' :
              selectedAspirante.aptoMedico?.estado === 'no_apto' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/30' :
              'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/30'
            }`}>
              <span className="font-mono text-[9px] text-secondary-custom uppercase block mb-1">Dictamen Médico Federativo</span>
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-[16px] ${
                  selectedAspirante.aptoMedico?.estado === 'apto' ? 'text-green-600' :
                  selectedAspirante.aptoMedico?.estado === 'no_apto' ? 'text-red-600' : 'text-amber-600'
                }`}>
                  {selectedAspirante.aptoMedico?.estado === 'apto' ? 'verified' : selectedAspirante.aptoMedico?.estado === 'no_apto' ? 'cancel' : 'pending'}
                </span>
                <p className={`font-bold text-sm ${
                  selectedAspirante.aptoMedico?.estado === 'apto' ? 'text-green-800 dark:text-green-400' :
                  selectedAspirante.aptoMedico?.estado === 'no_apto' ? 'text-red-800 dark:text-red-400' : 'text-amber-800 dark:text-amber-400'
                }`}>
                  {selectedAspirante.aptoMedico?.estado === 'apto' ? 'APTO MÉDICO' : selectedAspirante.aptoMedico?.estado === 'no_apto' ? 'NO APTO MÉDICO' : 'PENDIENTE DE EVALUACIÓN'}
                </p>
              </div>
              {selectedAspirante.aptoMedico?.nota && (
                <p className="text-xs mt-1.5 italic text-stone-600 dark:text-stone-400">"{selectedAspirante.aptoMedico.nota}"</p>
              )}
            </div>

            {/* Documentos */}
            <div>
              <h4 className="font-mono text-[10px] text-secondary-custom uppercase tracking-wider mb-2">Expediente Documental</h4>
              <div className="space-y-1.5">
                {(selectedAspirante.documentos || []).map(doc => (
                  <div key={doc.tipo} className="flex items-center justify-between p-2 bg-surface-container rounded border border-outline-variant/20 text-xs">
                    <span className="font-mono text-[#5a403c] font-bold">{doc.etiqueta}</span>
                    <div className="flex items-center gap-1.5">
                      <DocEstadoBadge estado={doc.estado} />
                      {(doc.estado === 'cargado') && (
                        <>
                          <button onClick={() => updateDocEstado(selectedAspirante.id, doc.tipo, 'aprobado')}
                            className="text-[9px] px-1.5 py-0.5 bg-green-600 text-white rounded font-bold hover:bg-green-800">✓</button>
                          <button onClick={() => {
                            const m = prompt('Motivo subsanación:');
                            if (m) updateDocEstado(selectedAspirante.id, doc.tipo, 'requiere_subsanacion', m);
                          }}
                            className="text-[9px] px-1.5 py-0.5 bg-orange-500 text-white rounded font-bold hover:bg-orange-700">!</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subsanación callout */}
            {selectedAspirante.status === 'Subsanación' && selectedAspirante.correctionReason && (
              <div className="bg-error-container p-3 border border-[#ffb4a8] rounded text-xs text-on-error-container">
                <span className="font-bold block text-primary-custom mb-1">RAZÓN DE SUBSANACIÓN:</span>
                <p className="italic">"{selectedAspirante.correctionReason}"</p>
              </div>
            )}

            {/* Evaluación resultado */}
            {selectedAspirante.evaluacion?.resultadoFinal && (
              <div className={`p-3 rounded-lg border text-sm font-bold ${
                selectedAspirante.evaluacion.resultadoFinal === 'Apto' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                Resultado del Tribunal: {selectedAspirante.evaluacion.resultadoFinal}
                {selectedAspirante.evaluacion.actaEmitida && ' (Acta emitida ✓)'}
              </div>
            )}

            {/* Acciones */}
            <div className="border-t border-surface-container-high pt-4 space-y-2 bg-stone-50 dark:bg-white/5 p-4 rounded-xl mt-auto">
              <span className="font-mono text-[9px] text-[#5a403c] font-bold uppercase tracking-wider block mb-2 text-center">⚙️ ACCIONES DE VALIDACIÓN</span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => moveStatus(selectedAspirante.id, 'Validada')}
                  disabled={selectedAspirante.status === 'Validada' || selectedAspirante.status === 'Admitida'}
                  className="py-2 bg-blue-700 hover:bg-blue-900 disabled:opacity-40 text-white rounded font-bold text-xs transition flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">verified</span> Validar
                </button>
                <button
                  onClick={() => moveStatus(selectedAspirante.id, 'Admitida')}
                  disabled={selectedAspirante.status === 'Admitida'}
                  className="py-2 bg-green-700 hover:bg-green-900 disabled:opacity-40 text-white rounded font-bold text-xs transition flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">how_to_reg</span> Admitir a Examen
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowSubsanacionModal(true)}
                  disabled={selectedAspirante.status === 'Subsanación'}
                  className="py-2 bg-[#ba1a1a] hover:bg-red-800 disabled:opacity-40 text-white rounded font-bold text-xs transition flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">edit_attributes</span> Subsanación
                </button>
                <button
                  onClick={() => moveStatus(selectedAspirante.id, 'Rechazada')}
                  disabled={selectedAspirante.status === 'Rechazada'}
                  className="py-2 bg-stone-700 hover:bg-stone-900 disabled:opacity-40 text-white rounded font-bold text-xs transition"
                >
                  Rechazar Trámite
                </button>
              </div>

              {/* Acta y informes */}
              {['Apto provisional', 'No Apto provisional'].includes(selectedAspirante.status) && (
                <button
                  onClick={() => setShowActaModal(true)}
                  className="w-full py-2 bg-indigo-700 hover:bg-indigo-900 text-white rounded font-bold text-xs transition flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">gavel</span> Emitir Acta Oficial
                </button>
              )}
              {selectedAspirante.status === 'No Apto provisional' && (
                <button
                  onClick={() => setShowInformeModal(true)}
                  className="w-full py-2 bg-stone-600 hover:bg-stone-800 text-white rounded font-bold text-xs transition flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">description</span> Generar Informe de No Apto (RF-54)
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── Modal Añadir Usuario ─────────────────────────────────────────────── */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddUser} className="bg-white dark:bg-[#151515] border-2 border-outline-variant rounded-xl max-w-[420px] w-full p-6 shadow-2xl">
            <h3 className="font-black text-xl text-stone-800 dark:text-stone-100 mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600">person_add</span>
              Añadir Usuario
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-6">El sistema enviará el código de verificación al correo especificado.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Nombre Completo</label>
                <input 
                  required
                  type="text"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all dark:text-white" 
                  placeholder="Ej. Hiroshi Tanaka" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Correo Electrónico</label>
                <input 
                  required
                  type="email"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all dark:text-white" 
                  placeholder="correo@ejemplo.com" 
                />
              </div>

              <div>
                <select 
                  value={newUserType}
                  onChange={e => setNewUserType(e.target.value as 'juez'|'arbitro'|'deportista'|'director'|'medico')}
                  className="w-full p-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all dark:text-white"
                >
                  {activeTab === 'configuracion' ? (
                    <>
                      <option value="director">Director de la FMK (Tribunal)</option>
                      <option value="juez">Juez / Evaluador de Grados</option>
                      <option value="arbitro">Árbitro</option>
                      <option value="medico">Médico (Depto. Médico)</option>
                    </>
                  ) : (
                    <option value="deportista">Deportista (Estudiante / Aspirante)</option>
                  )}
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-8">
              <button type="button" onClick={() => setShowAddUserModal(false)} className="px-4 py-2 text-stone-600 dark:text-stone-400 text-sm font-bold hover:bg-stone-100 dark:hover:bg-white/5 rounded-lg transition-colors">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2">
                Crear y Notificar
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </div>
          </form>
        </div>
      )}
      {/* ── Modal Nueva Convocatoria ────────────────────────────────────────── */}
      {showAddConvModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddConv} className="bg-white dark:bg-[#151515] border border-stone-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 lg:p-8 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-600 to-red-400"></div>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <span className="material-symbols-outlined text-[24px]">event_note</span>
              </div>
              <div>
                <h3 className="font-black text-xl text-stone-800 dark:text-stone-100 leading-tight">Nueva Convocatoria</h3>
                <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mt-0.5">Crear Borrador</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Título de la Convocatoria</label>
                <input 
                  required
                  type="text"
                  value={newConvTitle}
                  onChange={e => setNewConvTitle(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all dark:text-white" 
                  placeholder="Ej. Convocatoria Extraordinaria" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Fecha de Examen</label>
                <input 
                  required
                  type="date"
                  value={newConvDate}
                  onChange={e => setNewConvDate(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all dark:text-white" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">Sede / Ubicación</label>
                <input 
                  required
                  type="text"
                  value={newConvSede}
                  onChange={e => setNewConvSede(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all dark:text-white" 
                  placeholder="Ej. Pabellón FMK" 
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-8">
              <button type="button" onClick={() => setShowAddConvModal(false)} className="px-4 py-2 text-stone-600 dark:text-stone-400 text-sm font-bold hover:bg-stone-100 dark:hover:bg-white/5 rounded-lg transition-colors">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2">
                Crear Convocatoria
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Modal Subsanación ─────────────────────────────────────────────── */}
      {showSubsanacionModal && selectedAspirante && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#151515] border-2 border-outline-variant rounded-xl max-w-[420px] w-full p-5 shadow-2xl">
            <h3 className="font-bold text-base text-primary-container mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined">edit_attributes</span>
              Declarar Subsanación — {selectedAspirante.name}
            </h3>
            <textarea
              value={subsanacionReason}
              onChange={e => setSubsanacionReason(e.target.value)}
              rows={4}
              className="w-full p-2 border border-outline-variant rounded text-xs focus:ring-1 focus:ring-primary-container outline-none resize-none"
              placeholder="Especifique qué falta y cómo subsanarlo..."
            />
            <div className="flex gap-2 justify-end mt-3">
              <button onClick={() => setShowSubsanacionModal(false)} className="px-3 py-1.5 text-stone-600 text-xs font-semibold">Cancelar</button>
              <button
                onClick={() => {
                  moveStatus(selectedAspirante.id, 'Subsanación', subsanacionReason);
                  setShowSubsanacionModal(false);
                }}
                className="px-4 py-1.5 bg-[#ba1a1a] hover:bg-red-900 text-white font-bold text-xs rounded transition"
              >
                Enviar Subsanación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Acta ───────────────────────────────────────────────────── */}
      {showActaModal && selectedAspirante && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#151515] border-2 border-indigo-200 rounded-xl max-w-[420px] w-full p-5 shadow-2xl">
            <h3 className="font-bold text-base text-indigo-700 mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined">gavel</span>
              Emitir Acta Oficial de Examen — RF-50
            </h3>
            <div className="bg-indigo-50 border border-indigo-200 rounded p-3 mb-4 text-sm">
              <p className="font-bold">{selectedAspirante.name}</p>
              <p className="text-xs text-secondary-custom">{selectedAspirante.requestedBelt} · {selectedAspirante.club}</p>
              <p className="mt-2 font-bold text-base text-indigo-800">
                Resultado del Tribunal: {selectedAspirante.evaluacion?.resultadoFinal || 'Pendiente'}
              </p>
            </div>
            <p className="text-xs text-secondary-custom mb-4">
              ⚠️ El resultado pasará a ser <strong>DEFINITIVO</strong> tras emitir el acta. Esta acción no se puede revertir (RF-50, CA-10).
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowActaModal(false)} className="px-3 py-1.5 text-stone-600 text-xs font-semibold">Cancelar</button>
              <button onClick={handleEmitirActa}
                className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-900 text-white font-bold text-xs rounded transition flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">task_alt</span>
                Confirmar y Emitir Acta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Informe No Apto ─────────────────────────────────────────── */}
      {showInformeModal && selectedAspirante && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#151515] border-2 border-outline-variant rounded-xl max-w-[440px] w-full p-5 shadow-2xl">
            <h3 className="font-bold text-base text-primary-container mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined">description</span>
              Informe Explicativo de No Apto — RF-54
            </h3>
            <p className="text-xs text-secondary-custom mb-3">Este informe se enviará al aspirante explicando las causas del suspenso.</p>
            <textarea
              value={informeText}
              onChange={e => setInformeText(e.target.value)}
              rows={5}
              className="w-full p-2 border border-outline-variant rounded text-xs focus:ring-1 focus:ring-primary-container outline-none resize-none"
              placeholder="Describa los motivos del resultado No Apto y las observaciones del tribunal..."
            />
            <div className="flex gap-2 justify-end mt-3">
              <button onClick={() => setShowInformeModal(false)} className="px-3 py-1.5 text-stone-600 text-xs font-semibold">Cancelar</button>
              <button onClick={handleEmitirInforme}
                className="px-4 py-1.5 bg-stone-700 hover:bg-stone-900 text-white font-bold text-xs rounded transition">
                Enviar Informe
              </button>
            </div>
          </div>
        </div>
      )}

      {showActaModal && selectedAspirante && (
        <ActaImprimible
          aspirante={selectedAspirante}
          tribunal={allTribunals.find(t => t.id === selectedAspirante.assignedTribunalId)}
          convocatoria={convocatorias.find(c => c.id === selectedAspirante.convocatoriaId)}
          jueces={judges}
          onClose={() => setShowActaModal(false)}
          onPrint={() => window.print()}
        />
      )}
    </div>
  );
}
