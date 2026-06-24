import { collection, addDoc, getDocs, doc, updateDoc, query, where, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Convocatoria, Tribunal, Aspirante } from "../types";

// ==========================================
// CONVOCATORIAS EN FIREBASE
// ==========================================

export async function createConvocatoria(convocatoria: Partial<Convocatoria>): Promise<Convocatoria | null> {
  try {
    console.log("Intentando guardar en Firebase...", convocatoria);
    
    const docRef = await addDoc(collection(db, "convocatorias_demo"), {
      titulo: convocatoria.titulo || 'Nueva Convocatoria',
      fecha: convocatoria.fecha || new Date().toISOString().split('T')[0],
      sede: convocatoria.sede || 'Sede Central',
      gradesAdmitidos: convocatoria.gradesAdmitidos || [],
      plazoOrdinario: convocatoria.plazoOrdinario || new Date().toISOString().split('T')[0],
      estado: convocatoria.estado || 'Borrador',
      cupoMaximo: convocatoria.cupoMaximo || 40,
      inscritos: convocatoria.inscritos || 0,
      observaciones: convocatoria.observaciones || 'Sin observaciones'
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
    const querySnapshot = await getDocs(collection(db, "convocatorias_demo"));
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
    const docRef = doc(db, "convocatorias_demo", id);
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
    const querySnapshot = await getDocs(collection(db, "aspirantes_demo"));
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
    const docRef = await addDoc(collection(db, "aspirantes_demo"), aspirante);
    return { ...aspirante, id: docRef.id } as Aspirante;
  } catch (e) {
    console.error("❌ Error guardando aspirante: ", e);
    return null;
  }
}

export async function updateAspirante(id: string, data: Partial<Aspirante>): Promise<boolean> {
  try {
    const docRef = doc(db, "aspirantes_demo", id);
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

export async function fetchJudges() {
  try {
    const querySnapshot = await getDocs(collection(db, "user_roles"));
    const judges: any[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (['juez', 'arbitro', 'medico', 'director'].includes(data.rol)) {
        judges.push({
          id: docSnap.id,
          name: data.nombre || data.email || 'Personal',
          email: data.email,
          avatarUrl: '',
          rank: data.rol === 'director' ? 'Director' : data.rol === 'medico' ? 'Médico' : data.rol === 'arbitro' ? 'Árbitro Nacional' : 'Juez Regional',
          active: true
        });
      }
    });
    return judges;
  } catch (e) {
    console.error("Error obteniendo jueces de Firebase: ", e);
    return [];
  }
}

export async function createJudge(judge: any): Promise<boolean> {
  try {
    let rol = 'juez';
    if (judge.rank === 'Director') rol = 'director';
    if (judge.rank === 'Médico') rol = 'medico';
    if (judge.rank?.includes('Árbitro')) rol = 'arbitro';

    await setDoc(doc(db, "user_roles", judge.id || judge.email || Date.now().toString()), {
      email: judge.email,
      nombre: judge.name,
      rol: rol
    });
    return true;
  } catch (e) {
    console.error("Error creando juez en Firebase: ", e);
    return false;
  }
}

export async function updateJudge(id: string, updates: any): Promise<boolean> {
  try {
    const dataToUpdate: any = {};
    if (updates.name) dataToUpdate.nombre = updates.name;
    if (updates.email) dataToUpdate.email = updates.email;
    if (updates.rank) {
        if (updates.rank === 'Director') dataToUpdate.rol = 'director';
        else if (updates.rank === 'Médico') dataToUpdate.rol = 'medico';
        else if (updates.rank?.includes('Árbitro')) dataToUpdate.rol = 'arbitro';
        else dataToUpdate.rol = 'juez';
    }
    if (Object.keys(dataToUpdate).length > 0) {
      await updateDoc(doc(db, "user_roles", id), dataToUpdate);
    }
    return true;
  } catch (e) {
    console.error("Error actualizando juez en Firebase: ", e);
    return false;
  }
}
