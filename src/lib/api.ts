import { supabase } from './supabase';
import { Aspirante, Convocatoria, Judge, Tribunal, Documento } from '../types';

// ==========================================
// ASPIRANTES
// ==========================================
export async function fetchAspirantes(): Promise<Aspirante[]> {
  const { data, error } = await supabase.from('aspirantes').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching aspirantes:', error);
    return [];
  }
  // Transform from snake_case database rows to camelCase frontend models
  return data.map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
    club: row.club || '',
    estilo: row.estilo as any,
    avatarUrl: row.avatar_url,
    currentBelt: row.current_belt || '',
    requestedBelt: row.requested_belt || '',
    fechaUltimoGrado: row.fecha_ultimo_grado,
    licenciasAcumuladas: row.licencias_acumuladas,
    licenciasConsecutivas: row.licencias_consecutivas,
    status: row.status as any,
    progressStep: row.progress_step,
    convocatoriaId: row.convocatoria_id,
    via: row.via as any,
    avalTecnico: row.aval_tecnico,
    avalAceptado: row.aval_aceptado,
    paymentStatus: row.payment_status as any,
    correctionReason: row.correction_reason,
    assignedTribunalId: row.assigned_tribunal_id,
    birthDate: row.birth_date,
    // Add default empty structure for nested properties so components don't crash
    documents: {
      dni: { name: '', uploaded: false },
      photo: { name: '', uploaded: false },
      license: { name: '', uploaded: false },
    },
    documentos: [],
  }));
}

export async function createAspirante(aspirante: Partial<Aspirante>): Promise<boolean> {
  const payload = {
    id: aspirante.id,
    name: aspirante.name,
    email: aspirante.email,
    club: aspirante.club,
    estilo: aspirante.estilo,
    avatar_url: aspirante.avatarUrl,
    current_belt: aspirante.currentBelt,
    requested_belt: aspirante.requestedBelt,
    fecha_ultimo_grado: aspirante.fechaUltimoGrado,
    licencias_acumuladas: aspirante.licenciasAcumuladas || 0,
    licencias_consecutivas: aspirante.licenciasConsecutivas || 0,
    status: aspirante.status || 'Borrador',
    progress_step: aspirante.progressStep || 1,
    payment_status: aspirante.paymentStatus || 'Unpaid',
    birth_date: aspirante.birthDate
  };

  const { error } = await supabase.from('aspirantes').insert([payload]);
  if (error) {
    console.error('Error creating aspirante:', error);
    return false;
  }
  return true;
}

export async function updateAspirante(id: string, updates: Partial<Aspirante>): Promise<boolean> {
  // Map camelCase to snake_case
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.club !== undefined) payload.club = updates.club;
  if (updates.estilo !== undefined) payload.estilo = updates.estilo;
  if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
  if (updates.currentBelt !== undefined) payload.current_belt = updates.currentBelt;
  if (updates.requestedBelt !== undefined) payload.requested_belt = updates.requestedBelt;
  if (updates.fechaUltimoGrado !== undefined) payload.fecha_ultimo_grado = updates.fechaUltimoGrado;
  if (updates.licenciasAcumuladas !== undefined) payload.licencias_acumuladas = updates.licenciasAcumuladas;
  if (updates.licenciasConsecutivas !== undefined) payload.licencias_consecutivas = updates.licenciasConsecutivas;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.progressStep !== undefined) payload.progress_step = updates.progressStep;
  if (updates.convocatoriaId !== undefined) payload.convocatoria_id = updates.convocatoriaId;
  if (updates.via !== undefined) payload.via = updates.via;
  if (updates.avalTecnico !== undefined) payload.aval_tecnico = updates.avalTecnico;
  if (updates.avalAceptado !== undefined) payload.aval_aceptado = updates.avalAceptado;
  if (updates.paymentStatus !== undefined) payload.payment_status = updates.paymentStatus;
  if (updates.correctionReason !== undefined) payload.correction_reason = updates.correctionReason;
  if (updates.assignedTribunalId !== undefined) payload.assigned_tribunal_id = updates.assignedTribunalId;

  const { error } = await supabase.from('aspirantes').update(payload).eq('id', id);
  if (error) {
    console.error('Error updating aspirante:', error);
    return false;
  }
  return true;
}

// ==========================================
// CONVOCATORIAS
// ==========================================
export async function fetchConvocatorias(): Promise<Convocatoria[]> {
  const { data, error } = await supabase.from('convocatorias').select('*').order('fecha', { ascending: true });
  if (error) {
    console.error('Error fetching convocatorias:', error);
    return [];
  }
  return data.map(row => ({
    id: row.id,
    titulo: row.titulo,
    fecha: row.fecha,
    sede: row.sede,
    gradesAdmitidos: row.grades_admitidos || [],
    plazoOrdinario: row.plazo_ordinario,
    estado: row.estado as any,
    cupoMaximo: row.cupo_maximo,
    inscritos: row.inscritos,
    observaciones: row.observaciones
  }));
}

export async function updateConvocatoria(id: string, updates: Partial<Convocatoria>): Promise<boolean> {
  const payload: any = {};
  if (updates.estado !== undefined) payload.estado = updates.estado;
  if (updates.inscritos !== undefined) payload.inscritos = updates.inscritos;

  const { error } = await supabase.from('convocatorias').update(payload).eq('id', id);
  if (error) {
    console.error('Error updating convocatoria:', error);
    return false;
  }
  return true;
}

// ==========================================
// TRIBUNALES
// ==========================================
export async function fetchTribunals(): Promise<Tribunal[]> {
  const { data, error } = await supabase.from('tribunales').select('*');
  if (error) {
    console.error('Error fetching tribunales:', error);
    return [];
  }
  return data.map(row => ({
    id: row.id,
    name: row.name,
    isMain: row.is_main,
    convocatoriaId: row.convocatoria_id,
    judges: [] // Future implementation: join table for judges assigned to tribunals
  }));
}

export async function updateTribunal(id: string, updates: Partial<Tribunal>): Promise<boolean> {
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.isMain !== undefined) payload.is_main = updates.isMain;
  if (updates.convocatoriaId !== undefined) payload.convocatoria_id = updates.convocatoriaId;

  const { error } = await supabase.from('tribunales').update(payload).eq('id', id);
  if (error) {
    console.error('Error updating tribunal:', error);
    return false;
  }
  return true;
}

export async function createTribunal(tribunal: Partial<Tribunal>): Promise<boolean> {
  const payload = {
    id: tribunal.id,
    name: tribunal.name,
    is_main: tribunal.isMain || false,
    convocatoria_id: tribunal.convocatoriaId
  };

  const { error } = await supabase.from('tribunales').insert([payload]);
  if (error) {
    console.error('Error creating tribunal:', error);
    return false;
  }
  return true;
}

// ==========================================
// JUDGES
// ==========================================
export async function fetchJudges(): Promise<Judge[]> {
  const { data, error } = await supabase.from('judges').select('*');
  if (error) {
    console.error('Error fetching judges:', error);
    return [];
  }
  return data.map(row => ({
    id: row.id,
    name: row.name,
    avatarUrl: row.avatar_url,
    rank: row.rank,
    email: row.email,
    active: row.active
  }));
}

export async function updateJudge(id: string, updates: Partial<Judge>): Promise<boolean> {
  const payload: any = {};
  if (updates.active !== undefined) payload.active = updates.active;
  if (updates.rank !== undefined) payload.rank = updates.rank;

  const { error } = await supabase.from('judges').update(payload).eq('id', id);
  if (error) {
    console.error('Error updating judge:', error);
    return false;
  }
  return true;
}
