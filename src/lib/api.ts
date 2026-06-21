import { supabase } from './supabase';
import { Aspirante, Convocatoria, Judge, Tribunal } from '../types';

// ==========================================
// ARQUITECTURA:
// - Supabase: SOLO autenticación y roles (manejado en auth.ts)
// - localStorage: TODO el contenido de la app
// ==========================================

const KEYS = {
  ASPIRANTES: 'fmk_aspirantes',
  CONVOCATORIAS: 'fmk_convocatorias',
  TRIBUNALES: 'fmk_tribunales',
  JUDGES: 'fmk_judges',
};

function ls_get<T>(key: string): T[] {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : []; }
  catch { return []; }
}

function ls_set<T>(key: string, data: T[]): void {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch (e) { console.error('localStorage error:', e); }
}

// ==========================================
// ASPIRANTES
// ==========================================
export async function fetchAspirantes(): Promise<Aspirante[]> {
  const local = ls_get<Aspirante>(KEYS.ASPIRANTES);
  const unique = Array.from(new Map(local.map(a => [a.id, a])).values());
  if (unique.length < local.length) ls_set(KEYS.ASPIRANTES, unique);
  return unique.map(a => ({
    ...a,
    documents: a.documents || { dni: { name: '', uploaded: false }, photo: { name: '', uploaded: false }, license: { name: '', uploaded: false } },
    documentos: a.documentos || [],
  }));
}

export async function createAspirante(aspirante: Partial<Aspirante>): Promise<boolean> {
  const nueva: Aspirante = {
    id: aspirante.id || `asp-${Date.now()}`,
    name: aspirante.name || 'Sin Nombre',
    email: aspirante.email || '',
    club: aspirante.club || '',
    estilo: aspirante.estilo || 'Shotokan',
    avatarUrl: aspirante.avatarUrl,
    currentBelt: aspirante.currentBelt || '',
    requestedBelt: aspirante.requestedBelt || '',
    fechaUltimoGrado: aspirante.fechaUltimoGrado,
    licenciasAcumuladas: aspirante.licenciasAcumuladas || 0,
    licenciasConsecutivas: aspirante.licenciasConsecutivas || 0,
    status: aspirante.status || 'Borrador',
    progressStep: aspirante.progressStep || 1,
    paymentStatus: aspirante.paymentStatus || 'Unpaid',
    birthDate: aspirante.birthDate,
    documents: { dni: { name: '', uploaded: false }, photo: { name: '', uploaded: false }, license: { name: '', uploaded: false } },
    documentos: [],
  };
  const list = ls_get<Aspirante>(KEYS.ASPIRANTES);
  ls_set(KEYS.ASPIRANTES, [nueva, ...list.filter(a => a.id !== nueva.id)]);
  return true;
}

export async function updateAspirante(id: string, updates: Partial<Aspirante>): Promise<boolean> {
  const list = ls_get<Aspirante>(KEYS.ASPIRANTES);
  ls_set(KEYS.ASPIRANTES, list.map(a => a.id === id ? { ...a, ...updates } : a));
  return true;
}

// ==========================================
// CONVOCATORIAS
// ==========================================
export async function fetchConvocatorias(): Promise<Convocatoria[]> {
  return ls_get<Convocatoria>(KEYS.CONVOCATORIAS);
}

export async function createConvocatoria(convocatoria: Partial<Convocatoria>): Promise<boolean> {
  const nueva = {
    id: convocatoria.id || `conv-${Date.now()}`,
    titulo: convocatoria.titulo || 'Sin Título',
    fecha: convocatoria.fecha || new Date().toISOString().split('T')[0],
    sede: convocatoria.sede || '',
    gradesAdmitidos: convocatoria.gradesAdmitidos || [],
    plazoOrdinario: convocatoria.plazoOrdinario,
    estado: convocatoria.estado || 'Borrador',
    cupoMaximo: convocatoria.cupoMaximo || 40,
    inscritos: convocatoria.inscritos || 0,
    observaciones: convocatoria.observaciones || '',
  } as Convocatoria;
  const list = ls_get<Convocatoria>(KEYS.CONVOCATORIAS);
  ls_set(KEYS.CONVOCATORIAS, [...list, nueva]);
  return true;
}

export async function updateConvocatoria(id: string, updates: Partial<Convocatoria>): Promise<boolean> {
  const list = ls_get<Convocatoria>(KEYS.CONVOCATORIAS);
  ls_set(KEYS.CONVOCATORIAS, list.map(c => c.id === id ? { ...c, ...updates } : c));
  return true;
}

// ==========================================
// TRIBUNALES
// ==========================================
export async function fetchTribunals(): Promise<Tribunal[]> {
  return ls_get<Tribunal>(KEYS.TRIBUNALES);
}

export async function createTribunal(tribunal: Partial<Tribunal>): Promise<boolean> {
  const nueva: Tribunal = {
    id: tribunal.id || `trib-${Date.now()}`,
    name: tribunal.name || 'Nuevo Tribunal',
    isMain: tribunal.isMain || false,
    convocatoriaId: tribunal.convocatoriaId,
    judges: tribunal.judges || [],
  };
  const list = ls_get<Tribunal>(KEYS.TRIBUNALES);
  ls_set(KEYS.TRIBUNALES, [...list, nueva]);
  return true;
}

export async function updateTribunal(id: string, updates: Partial<Tribunal>): Promise<boolean> {
  const list = ls_get<Tribunal>(KEYS.TRIBUNALES);
  ls_set(KEYS.TRIBUNALES, list.map(t => t.id === id ? { ...t, ...updates } : t));
  return true;
}

// ==========================================
// JUDGES
// ==========================================
export async function fetchJudges(): Promise<Judge[]> {
  const local = ls_get<Judge>(KEYS.JUDGES);
  if (local.length === 0) {
    const defaults: Judge[] = [
      { id: 'j-hola', name: 'HolaSoyGerman', email: 'lionchan07@gmail.com', avatarUrl: '', rank: 'Director', active: true },
      { id: 'j-rubius', name: 'ElrubiusOMG', email: 'elviaheredia53@gmail.com', avatarUrl: '', rank: 'Juez Regional', active: true },
    ];
    ls_set(KEYS.JUDGES, defaults);
    return defaults;
  }
  return local;
}

export async function createJudge(judge: Partial<Judge>): Promise<boolean> {
  const nuevo: Judge = {
    id: judge.id || `judge-${Date.now()}`,
    name: judge.name || 'Nuevo Juez',
    email: judge.email,
    avatarUrl: judge.avatarUrl,
    rank: judge.rank || '1º Dan',
    active: judge.active !== false,
  };
  const list = ls_get<Judge>(KEYS.JUDGES);
  ls_set(KEYS.JUDGES, [...list, nuevo]);
  return true;
}

export async function updateJudge(id: string, updates: Partial<Judge>): Promise<boolean> {
  const list = ls_get<Judge>(KEYS.JUDGES);
  ls_set(KEYS.JUDGES, list.map(j => j.id === id ? { ...j, ...updates } : j));
  return true;
}
