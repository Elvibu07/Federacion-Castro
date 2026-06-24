import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDgN_GOhhl_O9poq6olgI9BbH3YbvhizKM",
  authDomain: "fmk-elviaheredia-2c0d3.firebaseapp.com",
  projectId: "fmk-elviaheredia-2c0d3",
  storageBucket: "fmk-elviaheredia-2c0d3.firebasestorage.app",
  messagingSenderId: "304112930620",
  appId: "1:304112930620:web:6bffba96376687304e1839"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Simple UUID generator
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

async function seedData() {
  try {
    console.log("Iniciando inyección de datos de prueba...");

    // 1. Obtener jueces existentes o crear mock
    const judgesSnapshot = await getDocs(collection(db, "judges"));
    let juezPrueba: any = null;
    let arbitroPrueba: any = null;
    
    if (!judgesSnapshot.empty) {
      const judges = judgesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      juezPrueba = judges.find((j: any) => j.rank === 'Juez Nacional') || judges[0];
      arbitroPrueba = judges.find((j: any) => j.rank === 'Árbitro Nacional') || judges.find((j: any) => j.id !== juezPrueba.id) || judges[0];
    } else {
      console.log("No hay jueces en la BD. Por favor, crea un juez desde el portal primero.");
      // We will just use a mock judge format
      juezPrueba = {
        id: "mock-juez-id",
        name: "Juez Automático",
        email: "juez@fmk.com",
        rank: "Juez Nacional",
        avatarUrl: "https://i.pravatar.cc/150?u=juez",
        active: true
      };
      arbitroPrueba = {
        id: "mock-arbitro-id",
        name: "Árbitro Automático",
        email: "arbitro@fmk.com",
        rank: "Árbitro Nacional",
        avatarUrl: "https://i.pravatar.cc/150?u=arbitro",
        active: true
      };
    }

    // 2. Convocatoria
    const convId = generateUUID();
    console.log("Creando Convocatoria...");
    await addDoc(collection(db, 'convocatorias'), {
      id: convId,
      titulo: 'Convocatoria Test Mágico',
      fecha: new Date().toISOString(),
      fechaLimite: new Date(Date.now() + 864000000).toISOString(),
      sede: 'Dojo Pruebas Central',
      grados: ['Cinturón Negro', '1º Dan', '2º Dan'],
      vias: ['Vía Ordinaria', 'Vía Méritos Deportivos'],
      estado: 'Abierta',
      descripcion: 'Generada automáticamente para pruebas desde script.'
    });

    // 3. Tribunal
    const tribId = generateUUID();
    console.log("Creando Tribunal (Mesa)...");
    await addDoc(collection(db, 'tribunals'), {
      id: tribId,
      name: 'Mesa 1 - Especial Test',
      fecha: new Date().toISOString(),
      convocatoriaId: convId,
      judges: [juezPrueba],
      arbitros: [arbitroPrueba]
    });

    // 4. Aspirante
    const aspId = generateUUID();
    console.log("Creando Aspirante (Goku)...");
    await addDoc(collection(db, 'aspirantes'), {
      id: aspId,
      name: 'Goku Son (Test)',
      email: 'goku@capsulecorp.com',
      club: 'Kame House Dojo',
      currentBelt: 'Cinturón Marrón',
      requestedBelt: 'Cinturón Negro',
      via: 'Vía Ordinaria',
      status: 'En evaluación',
      paymentStatus: 'Paid',
      assignedTribunalId: tribId,
      convocatoriaId: convId,
      documentos: [
        { id: '1', nombre: 'DNI', tipo: 'DNI', url: 'https://ejemplo.com/dni.jpg', estado: 'Aprobado', fechaSubida: new Date().toISOString() },
        { id: '2', nombre: 'Permiso', tipo: 'PermisoPaterno', url: 'https://ejemplo.com/perm.pdf', estado: 'Aprobado', fechaSubida: new Date().toISOString() }
      ]
    });

    console.log("✅ Datos inyectados exitosamente.");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error inyectando datos:", error);
    process.exit(1);
  }
}

seedData();
