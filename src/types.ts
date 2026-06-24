// ============================================================
// TIPOS COMPLETOS — FMK Sistema de Grados
// Basado en SRS Federación Madrileña de Karate y D.A. v1.0
// ============================================================

// --- Roles de usuario ---
export type Rol = 'aspirante' | 'admin' | 'tribunal' | 'juez' | 'director';

// --- Grado / Cinturón ---
export type GradoNombre =
  | 'Cinturón Negro'
  | '1º Dan'
  | '2º Dan'
  | '3º Dan'
  | '4º Dan'
  | '5º Dan'
  | '6º Dan'
  | '7º Dan'
  | '8º Dan'
  | '9º Dan'
  | '10º Dan';

// Catálogo de requisitos por grado (tabla 4.1 SRS)
export interface GradoConfig {
  nombre: GradoNombre;
  etiquetaCorta: string;
  edadMinima: number;
  permanenciaMinMeses: number;
  licenciasConsecutivas: number;
  licenciasAlternas: number;
  requiereAval: boolean;          // hasta 3.er Dan inclusive
  requiereCurriculum: boolean;    // desde 4.º Dan
  requiereTrabajoEscrito: boolean; // desde 5.º Dan
  mayoriaCalificacion: 'simple' | '80pct'; // 80% para 5.º Dan+
  licenciasDesde1erDan?: number;  // años acumulados desde 1.er Dan (5.º Dan+)
}

// --- Vía de examen (bloque específico) ---
export type ViaExamen = 'Kumite' | 'Campeonatos' | 'Técnica';

// --- Estado de solicitud (12 estados normativos SRS 6.1) ---
export type EstadoSolicitud =
  | 'Borrador'
  | 'Enviada'
  | 'Pendiente'
  | 'Subsanación'
  | 'Validada'
  | 'Rechazada'
  | 'Admitida'
  | 'En evaluación'
  | 'Apto provisional'
  | 'No Apto provisional'
  | 'Acta emitida'
  | 'Cerrada';

// --- Estado de documento (SRS 6.2) ---
export type EstadoDocumento =
  | 'no_cargado'
  | 'cargado'
  | 'en_revision'
  | 'aprobado'
  | 'rechazado'
  | 'requiere_subsanacion';

// --- Tipos de documento (RF-26) ---
export type TipoDocumento =
  | 'dni'
  | 'foto'
  | 'licencia'
  | 'carnet_grados'
  | 'solicitud_oficial'
  | 'aval_tecnico'
  | 'curriculum'
  | 'trabajo_escrito'
  | 'certificado_medico'
  | 'justificante_pago'
  | 'acta_deportiva'
  | 'autorizacion_dispensa';

export interface Documento {
  tipo: TipoDocumento;
  etiqueta: string;
  nombre: string;
  estado: EstadoDocumento;
  url?: string;
  fileSize?: string;
  fechaCarga?: string;
  motivoRechazo?: string;
  version?: number;
}

// --- Documento legacy (compatibilidad) ---
export interface DocumentSummary {
  name: string;
  uploaded: boolean;
  fileSize?: string;
  fileType?: string;
}

// --- Estilos reconocidos (RF-64) ---
export type EstiloKarate =
  | 'Gensei Ryu'
  | 'Goju Ryu'
  | 'Kyokushin Kai'
  | 'Renbu Kai'
  | 'Shito Ryu'
  | 'Shoto Kai'
  | 'Shotokan'
  | 'Uechi Ryu'
  | 'Wado Ryu';

// --- Mérito deportivo ---
export type TipoMerito =
  | 'CampeonMadrid'
  | 'CampeonEspaña'
  | 'CampeonEuropa'
  | 'CampeonMundo'
  | 'SeleccionNacional';

export interface MeritoDeportivo {
  tipo: TipoMerito;
  categoria: string;   // ej. "Individual Kumite -75kg"
  año: number;
  acreditado: boolean;
}

// --- Pago extendido ---
export type EstadoPago = 'Unpaid' | 'Paid' | 'Exento' | 'Reduccion50';

export interface Pago {
  estado: EstadoPago;
  monto: number;
  motivoExencion?: string;
  fechaPago?: string;
}

// --- Dispensa médica (RF-55/56) ---
export interface DispensaMedica {
  solicitada: boolean;
  aprobada?: boolean;
  motivoDispensa?: string;
  certificadoAdjunto?: string;
  parteExamenExenta?: string; // qué parte se exime
  fechaSolicitud?: string;
  diasAntelacion?: number;
  dictamenMedico?: string;
}

// --- Evaluación por juez ---
export interface VotoJuez {
  judgeId: string;
  bloqueComun: {
    partes: ParteBloqueComun[];
    resultado: 'Apto' | 'No Apto' | null;
  };
  bloqueEspecifico?: {
    resultado: 'Apto' | 'No Apto' | null;
  };
  resultado: 'Apto' | 'No Apto' | null;
  observacion?: string;
}

// --- Partes del bloque común (RF-35) ---
export interface ParteBloqueComun {
  id: string;
  nombre: string;
  completada: boolean;
  resultado?: 'Apto' | 'No Apto';
}

// --- Evaluación completa (RF-35 a RF-48) ---
export interface Evaluacion {
  aspiranteId: string;

  bloqueComun: {
    iniciado: boolean;
    completado: boolean;
    resultado?: 'Apto' | 'No Apto';
  };

  bloqueEspecifico?: {
    via: ViaExamen;
    iniciado: boolean;
    completado: boolean;
    resultado?: 'Apto' | 'No Apto';
    detalles?: string; // observaciones libres
    kumiteDetalles?: { modalidad: string; encuentros: number; proteccionesWKF: boolean; resultadoCombate?: string; };
    campeonatosDetalles?: { actaDeportivaAcreditada: boolean; combatesGanados: number; puntosAcumulados: number; };
    tecnicaDetalles?: { trabajosRealizados: string[]; };
  };

  exentoBloqueEspecifico: boolean; // 41+ años (RF-41)
  votos: VotoJuez[];
  resultadoFinal?: 'Apto' | 'No Apto';
  actaEmitida: boolean;
  fechaEvaluacion?: string;
  informeNoApto?: string; // texto del informe (RF-54)
}

// --- Juez ---
export interface Judge {
  id: string;
  name: string;
  avatarUrl: string;
  rank: 'Juez Nacional A' | 'Juez Internacional' | 'Juez Regional' | 'Árbitro Nacional' | 'Director' | string;
  email?: string;
  active?: boolean;
}

// --- Tribunal ---
export interface Tribunal {
  id: string;
  name: string;
  isMain: boolean;
  judges: Judge[];
  arbitros?: Judge[]; // Auxiliares para Shiai Kumite (RF-45)
  convocatoriaId?: string;
  fecha?: string;
}

// --- Convocatoria (RF-09 a RF-12) ---
export type EstadoConvocatoria = 'Borrador' | 'Abierta' | 'Cerrada' | 'Finalizada';

export interface Convocatoria {
  id: string;
  titulo: string;
  fecha: string;          // ISO date "2026-09-20"
  sede: string;
  gradesAdmitidos: string[];
  plazoOrdinario: string; // "2026-08-16" (35 días antes)
  estado: EstadoConvocatoria;
  cupoMaximo: number;
  inscritos: number;
  observaciones?: string;
}

// --- Aspirante (completo) ---
export interface Aspirante {
  id: string;
  name: string;
  email: string;
  club: string;
  estilo?: EstiloKarate;
  avatarUrl?: string;
  active?: boolean;

  // Grado
  currentBelt: string;
  requestedBelt: string;
  fechaUltimoGrado?: string;  // cuando obtuvo grado actual (ISO)
  licenciasAcumuladas?: number;
  licenciasConsecutivas?: number;
  
  // Historial Suspensos (RF-52, RF-53)
  fechaUltimoExamen?: string; // ISO date
  resultadoUltimoExamen?: 'Apto' | 'No Apto' | 'No Apto Parcial';
  faseComunAprobadaHasta?: string; // ISO date (1 año de validez)

  // Solicitud
  status: EstadoSolicitud;
  progressStep: number;
  convocatoriaId?: string;
  via?: ViaExamen;
  avalTecnico?: string;    // nombre del avalista
  avalAceptado?: boolean;

  // Documentos
  documentos?: Documento[];
  // Legacy (compatibilidad)
  documents?: {
    dni: DocumentSummary;
    photo: DocumentSummary;
    license: DocumentSummary;
  };

  // Pago
  paymentStatus: EstadoPago;
  correctionReason?: string;

  // Tribunal
  assignedTribunalId?: string;

  // Evaluación
  evaluacion?: Evaluacion;

  // Especiales
  birthDate?: string;       // ISO "YYYY-MM-DD"
  dispensaMedica?: DispensaMedica;
  meritos?: MeritoDeportivo[];

  // Apto Médico Federativo
  aptoMedico?: {
    estado: 'pendiente' | 'apto' | 'no_apto';
    nota?: string;
    fecha?: string;
  };
}
