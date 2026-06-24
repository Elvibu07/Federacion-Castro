import { collection, addDoc, getDocs, doc, updateDoc, query, where, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Convocatoria, Tribunal, Aspirante } from "../types";

// ==========================================
// CONVOCATORIAS EN FIREBASE
// ==========================================

export async function createConvocatoria(convocatoria: Partial<Convocatoria>): Promise<Convocatoria | null> {
  try {
    console.log("Intentando guardar en Firebase...", convocatoria);
    
    const docRef = await addDoc(collection(db, "convocatorias"), {
      titulo: convocatoria.titulo || 'Nueva Convocatoria',
      fecha: convocatoria.fecha || new Date().toISOString().split('T')[0],
      sede: convocatoria.sede || 'Sede Central',
      gradesAdmitidos: convocatoria.gradesAdmitidos || [],
      plazoOrdinario: convocatoria.plazoOrdinario || new Date().toISOString().split('T')[0],
      estado: convocatoria.estado || 'Borrador',
      cupoMaximo: convocatoria.cupoMaximo || 40,
      inscritos: convocatoria.inscritos || 0,
      observaciones: convocatoria.observaciones || 'Sin observaciones',
      juecesAsignados: convocatoria.juecesAsignados || [], 
      arbitrosAsignados: convocatoria.arbitrosAsignados || []
    });

    console.log("✅ ¡Guardado con éxito! ID:", docRef.id);
    return { ...convocatoria, id: docRef.id } as Convocatoria;
  } catch (e) {
    console.error("❌ Error guardando convocatoria en Firebase: ", e);
    return null;
  }
}

export async function fetchConvocatorias(): Promise<Convocatoria[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "convocatorias"));
    const convocatorias: Convocatoria[] = [];
    
    querySnapshot.forEach((docSnap) => {
      convocatorias.push({ id: docSnap.id, ...docSnap.data() } as Convocatoria);
    });
    
    return convocatorias;
  } catch (e) {
    console.error("❌ Error obteniendo convocatorias: ", e);
    return [];
  }
}

export async function updateConvocatoria(id: string, data: Partial<Convocatoria>): Promise<boolean> {
  try {
    const docRef = doc(db, "convocatorias", id);
    await updateDoc(docRef, data);
    return true;
  } catch (e) {
    console.error("❌ Error actualizando convocatoria en Firebase: ", e);
    return false;
  }
}

// ==========================================
// ASPIRANTES
// ==========================================

export async function fetchAspirantes(): Promise<Aspirante[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "aspirantes"));
    const aspirantes: Aspirante[] = [];
    
    querySnapshot.forEach((docSnap) => {
      aspirantes.push({ id: docSnap.id, ...docSnap.data() } as Aspirante);
    });
    
    return aspirantes;
  } catch (e) {
    console.error("❌ Error obteniendo aspirantes: ", e);
    return [];
  }
}

export async function createAspirante(aspirante: Partial<Aspirante>): Promise<Aspirante | null> {
  try {
    const docRef = await addDoc(collection(db, "aspirantes"), aspirante);
    return { ...aspirante, id: docRef.id } as Aspirante;
  } catch (e) {
    console.error("❌ Error guardando aspirante: ", e);
    return null;
  }
}

export async function updateAspirante(id: string, data: Partial<Aspirante>): Promise<boolean> {
  try {
    const docRef = doc(db, "aspirantes", id);
    await updateDoc(docRef, data);
    return true;
  } catch (e) {
    console.error("❌ Error actualizando aspirante: ", e);
    return false;
  }
}

// ==========================================
// TRIBUNALES (JUECES Y ARBITROS)
// ==========================================

export async function fetchTribunals(): Promise<Tribunal[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "tribunales"));
    const tribunales: Tribunal[] = [];
    
    querySnapshot.forEach((docSnap) => {
      tribunales.push({ id: docSnap.id, ...docSnap.data() } as Tribunal);
    });
    
    return tribunales;
  } catch (e) {
    console.error("❌ Error obteniendo tribunales: ", e);
    return [];
  }
}

export async function createTribunal(tribunal: Partial<Tribunal>): Promise<Tribunal | null> {
  try {
    const docRef = await addDoc(collection(db, "tribunales"), tribunal);
    return { ...tribunal, id: docRef.id } as Tribunal;
  } catch (e) {
    console.error("❌ Error guardando tribunal: ", e);
    return null;
  }
}

export async function updateTribunal(id: string, updates: Partial<Tribunal>): Promise<boolean> {
  try {
    const docRef = doc(db, "tribunales", id);
    await updateDoc(docRef, updates);
    return true;
  } catch (e) {
    console.error("❌ Error actualizando tribunal en Firebase: ", e);
    return false;
  }
}

export async function deleteTribunal(id: string): Promise<boolean> {
  try {
    const docRef = doc(db, "tribunales", id);
    await deleteDoc(docRef);
    return true;
  } catch (e) {
    console.error("❌ Error eliminando tribunal en Firebase: ", e);
    return false;
  }
}

export async function fetchJudges(): Promise<Tribunal[]> {
  const allTribunales = await fetchTribunals();
  return allTribunales.filter(t => t.rol === 'juez');
}

export async function createJudge(judge: Partial<Tribunal>): Promise<boolean> {
  try {
    await createTribunal({ ...judge, rol: 'juez' });
    return true;
  } catch (e) {
    return false;
  }
}

export async function updateJudge(id: string, updates: Partial<Tribunal>): Promise<boolean> {
  return updateTribunal(id, updates);
}
