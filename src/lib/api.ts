import { supabase } from './supabase';
import { Aspirante, Convocatoria, Judge, Tribunal } from '../types';

// --------------------------------------------------
// Helper: generic CRUD on user_roles (solo personal autorizado)
// --------------------------------------------------

async function fetchByRole<T>(role: string): Promise<T[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('*')
    .eq('role', role);
  if (error) {
    console.error(`Error fetching ${role}`, error);
    return [];
  }
  return data.map((row: any) => {
    const obj = row.data as any;
    return {
      ...obj,
      id: row.id,
      name: obj?.name || row.email || 'Usuario',
      email: row.email,
    } as T;
  });
}

async function insertWithRole(entity: any, role: string): Promise<boolean> {
  const generatedName = entity.name || entity.titulo || entity.id || Date.now().toString();
  const safeName = generatedName.toString().replace(/\s+/g, '').toLowerCase();

  const payload = {
    id: entity.id && entity.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) ? entity.id : undefined,
    email: entity.email ?? `${safeName}-${Date.now()}@${role}.local`,
    role,
    data: entity,
  };
  if (!payload.id) delete payload.id;

  const { error } = await supabase.from('user_roles').insert(payload);
  if (error) {
    console.error(`Error inserting ${role}`, error);
    return false;
  }
  return true;
}

async function updateById(id: string, updates: any, role: string): Promise<boolean> {
  const { data: current } = await supabase
    .from('user_roles')
    .select('data')
    .eq('id', id)
    .eq('role', role)
    .single();

  const mergedData = {
    ...(current?.data || {}),
    ...updates,
  };

  const { error } = await supabase
    .from('user_roles')
    .update({ data: mergedData })
    .eq('id', id)
    .eq('role', role);
  if (error) {
    console.error(`Error updating ${role}`, error);
    return false;
  }
  return true;
}

// ====================
// ASPIRANTES
// ====================
export async function fetchAspirantes(): Promise<Aspirante[]> {
  const { data, error } = await supabase.from('aspirantes').select('*');
  if (error) {
    console.error('Error fetching aspirantes', error);
    return [];
  }
  return data.map((row: any) => {
    const obj = row.data as any;
    return {
      ...obj,
      id: row.id,
      email: row.email,
      name: row.name,
      convocatoriaId: row.convocatoria_id,
      assignedTribunalId: row.assigned_tribunal_id,
      status: row.status,
    } as Aspirante;
  });
}

export async function createAspirante(aspirante: Partial<Aspirante>): Promise<boolean> {
  const payload = {
    id: aspirante.id && aspirante.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) ? aspirante.id : undefined,
    email: aspirante.email ?? `aspirante-${Date.now()}@local.test`,
    name: aspirante.name || 'Nuevo Aspirante',
    convocatoria_id: aspirante.convocatoriaId || null,
    assigned_tribunal_id: aspirante.assignedTribunalId || null,
    status: aspirante.status || 'Borrador',
    data: aspirante,
  };
  if (!payload.id) delete payload.id;

  const { error } = await supabase.from('aspirantes').insert(payload);
  if (error) {
    console.error('Error creating aspirante', error);
    return false;
  }
  return true;
}

export async function updateAspirante(id: string, updates: Partial<Aspirante>): Promise<boolean> {
  const { data: current } = await supabase.from('aspirantes').select('*').eq('id', id).single();
  
  const mergedData = { ...(current?.data || {}), ...updates };
  
  const payload: any = { data: mergedData };
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.convocatoriaId !== undefined) payload.convocatoria_id = updates.convocatoriaId;
  if (updates.assignedTribunalId !== undefined) payload.assigned_tribunal_id = updates.assignedTribunalId;
  if (updates.status !== undefined) payload.status = updates.status;

  const { error } = await supabase.from('aspirantes').update(payload).eq('id', id);
  if (error) {
    console.error('Error updating aspirante', error);
    return false;
  }
  return true;
}

// ==========================================
// CONVOCATORIAS
// ==========================================
export async function fetchConvocatorias(): Promise<Convocatoria[]> {
  const { data, error } = await supabase.from('convocatorias').select('*');
  if (error) {
    console.error('Error fetching convocatorias', error);
    return [];
  }
  return data.map((row: any) => ({
    id: row.id,
    titulo: row.titulo,
    fecha: row.fecha,
    sede: row.sede,
    gradesAdmitidos: row.grades_admitidos,
    plazoOrdinario: row.plazo_ordinario,
    estado: row.estado,
    cupoMaximo: row.cupo_maximo,
    inscritos: row.inscritos,
    observaciones: row.observaciones,
  }));
}

export async function createConvocatoria(convocatoria: Partial<Convocatoria>): Promise<Convocatoria | null> {
  // 1. NO le mandamos el 'id'. Dejamos que Supabase genere el UUID automáticamente.
  const { data, error } = await supabase.from('convocatorias').insert([{
    titulo: convocatoria.titulo || 'Sin Título',
    fecha: convocatoria.fecha || new Date().toISOString().split('T')[0],
    sede: convocatoria.sede || '',
    grades_admitidos: convocatoria.gradesAdmitidos || [],
    plazo_ordinario: convocatoria.plazoOrdinario || new Date().toISOString().split('T')[0],
    estado: convocatoria.estado || 'Borrador',
    cupo_maximo: convocatoria.cupoMaximo || 40,
    inscritos: convocatoria.inscritos || 0,
    observaciones: convocatoria.observaciones || ''
  }]).select().single(); // <--- ESTO ES LA MAGIA: Nos devuelve la fila recién creada.

  if (error) {
    console.error('Error al insertar en Supabase (Revisa la consola):', error.message);
    return null; // Cambiamos esto para devolver null si falla
  }

  // 2. Devolvemos a React el objeto con el ID real (UUID) generado por la base de datos
  return {
    id: data.id, 
    titulo: data.titulo,
    fecha: data.fecha,
    sede: data.sede,
    gradesAdmitidos: data.grades_admitidos,
    plazoOrdinario: data.plazo_ordinario,
    estado: data.estado,
    cupoMaximo: data.cupo_maximo,
    inscritos: data.inscritos,
    observaciones: data.observaciones,
  } as Convocatoria;
}

export async function updateConvocatoria(id: string, updates: Partial<Convocatoria>): Promise<boolean> {
  // Mapeamos lo que queremos actualizar
  const dbUpdates: any = {};
  if (updates.titulo !== undefined) dbUpdates.titulo = updates.titulo;
  if (updates.fecha !== undefined) dbUpdates.fecha = updates.fecha;
  if (updates.sede !== undefined) dbUpdates.sede = updates.sede;
  if (updates.gradesAdmitidos !== undefined) dbUpdates.grades_admitidos = updates.gradesAdmitidos;
  if (updates.plazoOrdinario !== undefined) dbUpdates.plazo_ordinario = updates.plazoOrdinario;
  if (updates.estado !== undefined) dbUpdates.estado = updates.estado;
  if (updates.cupoMaximo !== undefined) dbUpdates.cupo_maximo = updates.cupoMaximo;
  if (updates.inscritos !== undefined) dbUpdates.inscritos = updates.inscritos;
  if (updates.observaciones !== undefined) dbUpdates.observaciones = updates.observaciones;

  const { error } = await supabase.from('convocatorias').update(dbUpdates).eq('id', id);
  
  if (error) {
    console.error('Error al actualizar en Supabase:', error);
    return false;
  }
  return true;
}

// ====================
// TRIBUNALES
// ====================
export async function fetchTribunals(): Promise<Tribunal[]> {
  const { data, error } = await supabase.from('tribunales').select('*');
  if (error) {
    console.error('Error fetching tribunales', error);
    return [];
  }
  return data.map((row: any) => {
    const obj = row.data as any;
    return {
      ...obj,
      id: row.id,
      name: row.name,
      isMain: row.is_main,
      fecha: row.fecha,
      convocatoriaId: row.convocatoria_id,
    } as Tribunal;
  });
}

export async function createTribunal(tribunal: Partial<Tribunal>): Promise<boolean> {
  const payload = {
    id: tribunal.id && tribunal.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i) ? tribunal.id : undefined,
    name: tribunal.name || 'Tribunal Nuevo',
    convocatoria_id: tribunal.convocatoriaId || null,
    is_main: tribunal.isMain || false,
    fecha: tribunal.fecha || null,
    data: tribunal,
  };
  if (!payload.id) delete payload.id;

  const { error } = await supabase.from('tribunales').insert(payload);
  if (error) {
    console.error('Error creating tribunal', error);
    return false;
  }
  return true;
}

export async function updateTribunal(id: string, updates: Partial<Tribunal>): Promise<boolean> {
  const { data: current } = await supabase.from('tribunales').select('*').eq('id', id).single();
  const mergedData = { ...(current?.data || {}), ...updates };

  const payload: any = { data: mergedData };
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.convocatoriaId !== undefined) payload.convocatoria_id = updates.convocatoriaId;
  if (updates.isMain !== undefined) payload.is_main = updates.isMain;
  if (updates.fecha !== undefined) payload.fecha = updates.fecha;

  const { error } = await supabase.from('tribunales').update(payload).eq('id', id);
  if (error) {
    console.error('Error updating tribunal', error);
    return false;
  }
  return true;
}

export async function deleteTribunal(id: string): Promise<boolean> {
  const { error } = await supabase.from('tribunales').delete().eq('id', id);
  if (error) {
    console.error('Error deleting tribunal', error);
    return false;
  }
  return true;
}

// ====================
// JUDGES (Personal)
// ====================
export async function fetchJudges(): Promise<Judge[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('*')
    .in('role', ['juez', 'arbitro', 'medico', 'director']);
  if (error) {
    console.error('Error fetching judges', error);
    return [];
  }
  return data.map((row: any) => {
    const obj = row.data as any;
    return {
      ...obj,
      id: row.id,
      name: obj?.name || row.email || 'Personal',
      email: row.email,
    } as Judge;
  });
}

export async function createJudge(judge: Partial<Judge>): Promise<boolean> {
  let role = 'juez';
  const rank = judge.rank || '';
  if (rank === 'Director') {
    role = 'director';
  } else if (rank.toLowerCase().includes('medico') || rank.toLowerCase().includes('médico')) {
    role = 'medico';
  } else if (rank.toLowerCase().includes('arbitro') || rank.toLowerCase().includes('árbitro')) {
    role = 'arbitro';
  }
  return insertWithRole(judge, role);
}

export async function updateJudge(id: string, updates: Partial<Judge>): Promise<boolean> {
  const { data: current } = await supabase
    .from('user_roles')
    .select('role, data')
    .eq('id', id)
    .single();

  const role = current?.role || 'juez';
  const mergedData = { ...(current?.data || {}), ...updates };

  const { error } = await supabase
    .from('user_roles')
    .update({ data: mergedData })
    .eq('id', id);
  return true;
}
