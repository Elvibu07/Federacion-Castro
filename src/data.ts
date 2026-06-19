import { Aspirante, Judge, Tribunal, GradoConfig, Convocatoria, Documento } from './types';

export const CLUBES_OFICIALES = [
  'Dojo Centro',
  'Gimnasio Samurai',
  'Club Shotokan Madrid',
  'Escuela Shito-Ryu'
];

// =====================================================
// CATÁLOGO DE GRADOS — tabla 4.1 del SRS
// =====================================================
export const GRADOS_CONFIG: GradoConfig[] = [
  {
    nombre: 'Cinturón Negro',
    etiquetaCorta: 'Cint. Negro',
    edadMinima: 12,
    permanenciaMinMeses: 12,
    licenciasConsecutivas: 4,
    licenciasAlternas: 5,
    requiereAval: true,
    requiereCurriculum: false,
    requiereTrabajoEscrito: false,
    mayoriaCalificacion: 'simple',
  },
  {
    nombre: '1º Dan',
    etiquetaCorta: '1.er Dan',
    edadMinima: 16,
    permanenciaMinMeses: 12,
    licenciasConsecutivas: 3,
    licenciasAlternas: 4,
    requiereAval: true,
    requiereCurriculum: false,
    requiereTrabajoEscrito: false,
    mayoriaCalificacion: 'simple',
  },
  {
    nombre: '2º Dan',
    etiquetaCorta: '2.º Dan',
    edadMinima: 18,
    permanenciaMinMeses: 24,
    licenciasConsecutivas: 2,
    licenciasAlternas: 3,
    requiereAval: true,
    requiereCurriculum: false,
    requiereTrabajoEscrito: false,
    mayoriaCalificacion: 'simple',
  },
  {
    nombre: '3º Dan',
    etiquetaCorta: '3.er Dan',
    edadMinima: 21,
    permanenciaMinMeses: 36,
    licenciasConsecutivas: 3,
    licenciasAlternas: 4,
    requiereAval: true,
    requiereCurriculum: false,
    requiereTrabajoEscrito: false,
    mayoriaCalificacion: 'simple',
  },
  {
    nombre: '4º Dan',
    etiquetaCorta: '4.º Dan',
    edadMinima: 25,
    permanenciaMinMeses: 48,
    licenciasConsecutivas: 4,
    licenciasAlternas: 5,
    requiereAval: false,
    requiereCurriculum: true,
    requiereTrabajoEscrito: false,
    mayoriaCalificacion: 'simple',
  },
  {
    nombre: '5º Dan',
    etiquetaCorta: '5.º Dan',
    edadMinima: 30,
    permanenciaMinMeses: 60,
    licenciasConsecutivas: 5,
    licenciasAlternas: 6,
    requiereAval: false,
    requiereCurriculum: true,
    requiereTrabajoEscrito: true,
    mayoriaCalificacion: '80pct',
    licenciasDesde1erDan: 14,
  },
  {
    nombre: '6º Dan',
    etiquetaCorta: '6.º Dan',
    edadMinima: 36,
    permanenciaMinMeses: 72,
    licenciasConsecutivas: 6,
    licenciasAlternas: 7,
    requiereAval: false,
    requiereCurriculum: true,
    requiereTrabajoEscrito: true,
    mayoriaCalificacion: '80pct',
    licenciasDesde1erDan: 20,
  },
  {
    nombre: '7º Dan',
    etiquetaCorta: '7.º Dan',
    edadMinima: 43,
    permanenciaMinMeses: 84,
    licenciasConsecutivas: 7,
    licenciasAlternas: 8,
    requiereAval: false,
    requiereCurriculum: true,
    requiereTrabajoEscrito: true,
    mayoriaCalificacion: '80pct',
    licenciasDesde1erDan: 27,
  },
];

// =====================================================
// ESTILOS Y KATAS (RF-64, RF-65)
// =====================================================
export const ESTILOS_RECONOCIDOS = [
  'Gensei Ryu', 'Goju Ryu', 'Kyokushin Kai', 'Renbu Kai',
  'Shito Ryu', 'Shoto Kai', 'Shotokan', 'Uechi Ryu', 'Wado Ryu'
];

export const KATAS_POR_ESTILO: Record<string, string[]> = {
  'Shotokan': ['Heian Shodan','Heian Nidan','Heian Sandan','Heian Yondan','Heian Godan','Bassai Dai','Kanku Dai','Jion','Empi','Hangetsu'],
  'Goju Ryu': ['Sanchin','Tensho','Saifa','Seiyunchin','Shisochin','Sanseru','Sepai','Kururunfa','Seisan','Suparimpei'],
  'Kyokushin Kai': ['Taikyoku Sono Ichi','Taikyoku Sono Ni','Pinan Sono Ichi','Pinan Sono Ni','Pinan Sono San','Pinan Sono Yon','Pinan Sono Go','Bassai','Kanku','Sushiho'],
  'Wado Ryu': ['Pinan Shodan','Pinan Nidan','Pinan Sandan','Pinan Yondan','Pinan Godan','Kushanku','Seishan','Chinto','Naihanchi','Bassai'],
  'Shito Ryu': ['Pinan Shodan','Pinan Nidan','Pinan Sandan','Pinan Yondan','Pinan Godan','Bassai Dai','Matsukaze','Seipai','Seienchin','Kururunfa'],
};

// =====================================================
// CONVOCATORIAS DEMO
// =====================================================
export const INITIAL_CONVOCATORIAS: Convocatoria[] = [];

// =====================================================
// JUECES
// =====================================================
export const INITIAL_JUDGES: Judge[] = [];

// =====================================================
// TRIBUNALES
// =====================================================
export const INITIAL_TRIBUNALS: Tribunal[] = [];

// Helper: construir documentos requeridos según grado
function buildDocumentos(
  grade: string,
  overrides: Partial<Record<string, { nombre: string; uploaded: boolean }>> = {}
): Documento[] {
  const docs: Documento[] = [
    { tipo: 'solicitud_oficial', etiqueta: 'Solicitud Oficial de Examen', nombre: '', estado: 'no_cargado' },
    { tipo: 'dni',              etiqueta: 'Copia DNI (ambas caras)',       nombre: '', estado: 'no_cargado' },
    { tipo: 'foto',             etiqueta: 'Fotografía Tamaño Carnet',      nombre: '', estado: 'no_cargado' },
    { tipo: 'licencia',         etiqueta: 'Licencia Federativa Vigente 2026', nombre: '', estado: 'no_cargado' },
    { tipo: 'carnet_grados',    etiqueta: 'Carnet de Grados (con firmas)', nombre: '', estado: 'no_cargado' },
    { tipo: 'justificante_pago', etiqueta: 'Justificante de Pago / Exención', nombre: '', estado: 'no_cargado' },
  ];

  const isDan = grade.includes('Dan') || grade.includes('Negro');
  const danNum = parseInt(grade.replace(/[^0-9]/g, '')) || 0;

  // Aval técnico (hasta 3.er Dan)
  if (isDan && danNum <= 3) {
    docs.push({ tipo: 'aval_tecnico', etiqueta: 'Aval Técnico (Entrenador Nacional / TDS)', nombre: '', estado: 'no_cargado' });
  }

  // Currículum deportivo (desde 4.º Dan)
  if (danNum >= 4) {
    docs.push({ tipo: 'curriculum', etiqueta: 'Currículum Deportivo Federativo', nombre: '', estado: 'no_cargado' });
  }

  // Trabajo escrito (desde 5.º Dan)
  if (danNum >= 5) {
    docs.push({ tipo: 'trabajo_escrito', etiqueta: 'Trabajo Escrito Técnico (plazo: 2 meses)', nombre: '', estado: 'no_cargado' });
  }

  // Aplicar overrides de estado
  return docs.map(d => {
    const ov = overrides[d.tipo];
    if (ov) {
      return {
        ...d,
        nombre: ov.nombre,
        estado: ov.uploaded ? 'cargado' : 'no_cargado'
      } as Documento;
    }
    return d;
  });
}

// =====================================================
// ASPIRANTES DEMO
// =====================================================
export const INITIAL_ASPIRANTES: Aspirante[] = [];
