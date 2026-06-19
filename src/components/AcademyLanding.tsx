import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AcademyLandingProps {
  onGoToPortal: () => void;
  onGoToStudentPortal: () => void;
}

const toggleDarkMode = () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  window.dispatchEvent(new Event('theme_changed'));
};

const HORARIOS: Record<string, { dia: string; turnos: string[] }[]> = {
  'Karate Infantil': [
    { dia: 'Lunes',     turnos: ['16:30 – 17:30', '17:30 – 18:30'] },
    { dia: 'Miércoles', turnos: ['16:30 – 17:30', '17:30 – 18:30'] },
    { dia: 'Viernes',   turnos: ['16:30 – 17:30'] },
  ],
  'Karate Adultos': [
    { dia: 'Lunes',    turnos: ['19:00 – 20:30', '20:30 – 22:00'] },
    { dia: 'Martes',   turnos: ['19:00 – 20:30'] },
    { dia: 'Jueves',   turnos: ['19:00 – 20:30', '20:30 – 22:00'] },
    { dia: 'Sábado',   turnos: ['10:00 – 12:00'] },
  ],
  'Competición y Grados': [
    { dia: 'Martes',   turnos: ['20:30 – 22:00'] },
    { dia: 'Jueves',   turnos: ['20:30 – 22:00'] },
    { dia: 'Sábado',   turnos: ['10:00 – 13:00'] },
  ],
};

const DISCIPLINAS = [
  {
    nombre: 'Shotokan',
    icon: '🥋',
    desc: 'Uno de los estilos más extendidos del mundo. Se caracteriza por movimientos lineales, golpes directos y katas de gran amplitud. Base principal del club.',
  },
  {
    nombre: 'Goju-Ryu',
    icon: '🌀',
    desc: 'Estilo que combina técnicas duras y suaves. Sus katas incluyen respiración profunda y movimientos circulares. Ideal para desarrollar la fuerza interior.',
  },
  {
    nombre: 'Kumite Deportivo',
    icon: '⚡',
    desc: 'Combate reglamentado por la WKF. Se trabaja la velocidad de reacción, la distancia táctica y el control del punto. Base para competición oficial.',
  },
  {
    nombre: 'Kata',
    icon: '🎯',
    desc: 'Formas técnicas predefinidas que simulan combates con múltiples adversarios. Desarrollan precisión, ritmo, fuerza y expresión técnica.',
  },
  {
    nombre: 'Kihon',
    icon: '🏋️',
    desc: 'Entrenamiento básico de técnicas individuales: golpes, bloqueos y desplazamientos. Es la columna vertebral de todo el aprendizaje marcial.',
  },
  {
    nombre: 'Kobudo',
    icon: '🏹',
    desc: 'Arte marcial con armas tradicionales de Okinawa. Complementa el karate-do y añade profundidad histórica y cultural al entrenamiento.',
  },
];

export default function AcademyLanding({ onGoToPortal, onGoToStudentPortal }: AcademyLandingProps) {
  const [horarioModal, setHorarioModal] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-[#0a0a0a] text-stone-800 dark:text-stone-200 font-sans selection:bg-red-500/30">

      {/* ── Navigation Bar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#151515]/80 backdrop-blur-md border-b border-stone-200 dark:border-white/10 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-fmk.png" alt="Logo FMK" className="h-12 w-auto rounded-lg shadow-md" />
            <div>
              <h1 className="font-black text-2xl tracking-tight leading-none text-stone-900 dark:text-white">Club Karate Madrid</h1>
              <p className="text-xs uppercase tracking-widest text-red-700 font-bold">Escuela Oficial FMK</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 font-bold text-sm text-stone-500 dark:text-stone-400">
            <a href="#inicio"      className="text-base hover:text-red-700 dark:hover:text-red-500 transition-colors">Inicio</a>
            <a href="#filosofia"   className="text-base hover:text-red-700 dark:hover:text-red-500 transition-colors">Filosofía</a>
            <a href="#disciplinas" className="text-base hover:text-red-700 dark:hover:text-red-500 transition-colors">Qué practicamos</a>
            <a href="#clases"      className="text-base hover:text-red-700 dark:hover:text-red-500 transition-colors">Clases</a>
            <a href="#contacto"    className="text-base hover:text-red-700 dark:hover:text-red-500 transition-colors">Contacto</a>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={toggleDarkMode} className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/5 flex items-center justify-center text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white transition-colors" title="Cambiar Tema">
              <span className="material-symbols-outlined text-[20px]">dark_mode</span>
            </button>
            <button
              onClick={onGoToStudentPortal}
              className="bg-white hover:bg-stone-100 text-stone-900 border border-stone-200 px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
              Acceso Alumnos
            </button>
            <button
              onClick={onGoToPortal}
              className="bg-red-700 hover:bg-red-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-red-700/20 hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">login</span>
              Portal FMK
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section id="inicio" className="relative pt-20 pb-32 md:pt-32 md:pb-48 overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80"
            alt="Karate Dojo"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-900/95 via-stone-900/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <span className="inline-block py-1.5 px-4 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-sm font-bold uppercase tracking-widest mb-6">
              Inscripciones Abiertas 2026
            </span>
            <h2 className="text-5xl md:text-7xl font-black text-white leading-[1.1] tracking-tight mb-6">
              Forjando el <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300">Carácter</span> a través del Karate.
            </h2>
            <p className="text-xl md:text-2xl text-stone-300 mb-10 max-w-2xl leading-relaxed">
              Únete a una de las academias más prestigiosas de Madrid. Disciplina, respeto y superación en cada entrenamiento. Afiliados a la Federación Madrileña de Karate.
            </p>

            <div className="flex flex-wrap gap-4">
              <a href="#clases" className="bg-white text-stone-900 px-10 py-5 rounded-xl font-black text-lg shadow-xl hover:-translate-y-1 transition-transform inline-block">
                Ver Clases y Horarios
              </a>
              <a href="#disciplinas" className="bg-stone-800/50 backdrop-blur-md border border-stone-600 hover:bg-stone-700/50 text-white px-10 py-5 rounded-xl font-bold text-lg transition-all flex items-center gap-2 inline-block">
                Qué practicamos
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Filosofía / Stats ── */}
      <section id="filosofia" className="py-24 bg-white dark:bg-[#151515] relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h3 className="text-4xl md:text-5xl font-black mb-6 text-stone-900 dark:text-white">Tradición y Vanguardia en las Artes Marciales</h3>
              <p className="text-lg md:text-xl text-stone-500 dark:text-stone-400 mb-6 leading-relaxed">
                En el Club Karate Madrid, combinamos los valores tradicionales del Budo con metodologías de entrenamiento deportivo modernas. Nuestro objetivo no es solo formar campeones en el tatami, sino líderes en la vida.
              </p>
              <p className="text-lg md:text-xl text-stone-500 dark:text-stone-400 mb-8 leading-relaxed">
                Nuestros instructores son Entrenadores Nacionales y Técnicos Deportivos Superiores certificados por la FMK, asegurando la más alta calidad técnica para tu progresión de grados.
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="text-6xl font-black text-red-700">25+</h4>
                  <p className="text-base font-bold text-stone-400 uppercase tracking-widest mt-1">Años de Historia</p>
                </div>
                <div>
                  <h4 className="text-6xl font-black text-red-700">300+</h4>
                  <p className="text-base font-bold text-stone-400 uppercase tracking-widest mt-1">Alumnos Activos</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="aspect-square md:aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
                <img src="https://images.unsplash.com/photo-1544062322-8391789c5651?auto=format&fit=crop&q=80" alt="Entrenamiento" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
              </div>
              <div className="absolute -bottom-8 -left-8 bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl shadow-xl border border-stone-100 dark:border-white/5 max-w-xs">
                <div className="flex gap-2 text-amber-500 mb-2">
                  {[1,2,3,4,5].map(i => <span key={i} className="material-symbols-outlined filled text-sm">star</span>)}
                </div>
                <p className="text-base font-bold italic dark:text-stone-300">"El mejor club de Madrid. La disciplina y la calidad técnica de los profesores es excepcional."</p>
                <p className="text-sm text-stone-500 mt-2 font-bold">— Alejandro Ruiz, 1º Dan</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── QUÉ PRACTICAMOS ── */}
      <section id="disciplinas" className="py-24 bg-stone-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&q=40')] bg-cover bg-center opacity-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-widest text-red-400 font-bold">Nuestras Artes</span>
            <h3 className="text-4xl md:text-5xl font-black mt-3 mb-4">Qué Practicamos</h3>
            <p className="text-xl text-stone-400 max-w-3xl mx-auto leading-relaxed">
              En nuestro dojo cultivamos diversas disciplinas del Karate-Do y las Artes Marciales. Cada una ofrece un camino único de desarrollo técnico, físico y espiritual.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {DISCIPLINAS.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-red-500/40 rounded-2xl p-8 transition-all group cursor-default"
              >
                <div className="text-4xl mb-4">{d.icon}</div>
                <h4 className="text-2xl font-black mb-3 group-hover:text-red-400 transition-colors">{d.nombre}</h4>
                <p className="text-stone-400 text-base leading-relaxed">{d.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Clases y Horarios ── */}
      <section id="clases" className="py-24 bg-stone-50 dark:bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-black text-stone-900 dark:text-white mb-6">Nuestras Clases</h3>
            <p className="text-xl text-stone-500 dark:text-stone-400 max-w-2xl mx-auto">Adaptamos nuestros entrenamientos a todos los niveles y edades. Desde el primer día de cinturón blanco hasta la preparación para exámenes de altos grados Dan.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Karate Infantil",      desc: "Desarrollo psicomotriz, disciplina y valores a través del juego y las artes marciales.", icon: "child_care",    color: "bg-blue-500" },
              { title: "Karate Adultos",       desc: "Técnica tradicional, defensa personal y acondicionamiento físico general.",              icon: "group",         color: "bg-stone-800" },
              { title: "Competición y Grados", desc: "Preparación específica para Kumite/Kata de competición y exámenes de Cinturón Negro.",   icon: "military_tech", color: "bg-red-700" },
            ].map((clase, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className="bg-white dark:bg-[#151515] p-8 rounded-3xl shadow-lg border border-stone-100 dark:border-white/5"
              >
                <div className={`w-14 h-14 ${clase.color} text-white rounded-2xl flex items-center justify-center mb-6 shadow-md`}>
                  <span className="material-symbols-outlined text-3xl">{clase.icon}</span>
                </div>
                <h4 className="text-2xl font-black mb-3 text-stone-900 dark:text-white">{clase.title}</h4>
                <p className="text-stone-500 dark:text-stone-400 text-base leading-relaxed mb-6">{clase.desc}</p>
                <button
                  onClick={() => setHorarioModal(clase.title)}
                  className="text-base font-bold text-red-700 hover:text-red-800 dark:hover:text-red-500 flex items-center gap-1 group transition-colors"
                >
                  Ver horarios <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer / Contacto ── */}
      <footer id="contacto" className="bg-stone-900 dark:bg-black text-stone-400 py-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6 text-white">
              <img src="/logo-fmk.png" alt="Logo FMK" className="h-10 w-auto" />
              <h4 className="font-black text-xl tracking-tight">Club Karate Madrid</h4>
            </div>
            <p className="mb-6 max-w-md text-sm leading-relaxed">
              Dojo oficial reconocido por la Federación Madrileña de Karate (FMK). Excelencia en artes marciales y formación integral desde 2001.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-red-700 hover:text-white transition-colors"><span className="material-symbols-outlined text-sm">share</span></a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-red-700 hover:text-white transition-colors"><span className="material-symbols-outlined text-sm">mail</span></a>
            </div>
          </div>

          <div>
            <h5 className="text-white font-bold mb-6">Ubicación</h5>
            <ul className="space-y-4 text-sm">
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-stone-500 text-[18px]">location_on</span>
                <span>Calle del Dojo Mayor, 42<br />28012 Madrid, España</span>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-stone-500 text-[18px]">phone</span>
                <span>+34 91 123 45 67</span>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-stone-500 text-[18px]">directions_subway</span>
                <span>Metro: Sol (L1, L2, L3)</span>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="text-white font-bold mb-6">Enlaces Oficiales</h5>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-red-500 transition-colors">Federación Madrileña (FMK)</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">Real Federación Española (RFEK)</a></li>
              <li><a href="#" className="hover:text-red-500 transition-colors">Normativa de Grados</a></li>
              <li className="pt-4 flex flex-col gap-2">
                <button
                  onClick={onGoToStudentPortal}
                  className="w-full bg-white text-stone-900 hover:bg-stone-200 px-4 py-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">person</span>
                  Acceso Alumnos
                </button>
                <button
                  onClick={onGoToPortal}
                  className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">login</span>
                  Portal FMK
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-xs">
          <p>© 2026 Club Karate Madrid · <span className="text-red-400 font-bold">Elvia Heredia</span>. Todos los derechos reservados.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-white transition-colors">Aviso Legal</a>
            <a href="#" className="hover:text-white transition-colors">Política de Privacidad</a>
          </div>
        </div>
      </footer>

      {/* ── Modal Horarios ── */}
      <AnimatePresence>
        {horarioModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setHorarioModal(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header modal */}
              <div className="bg-gradient-to-r from-red-700 to-red-900 px-8 py-6 flex items-center justify-between">
                <div>
                  <p className="text-red-200 text-xs uppercase tracking-widest font-bold mb-1">Horarios</p>
                  <h3 className="text-white font-black text-2xl">{horarioModal}</h3>
                </div>
                <button
                  onClick={() => setHorarioModal(null)}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Tabla horarios */}
              <div className="p-8">
                <div className="space-y-4">
                  {(HORARIOS[horarioModal] || []).map((h, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/10">
                      <div className="w-28 flex-shrink-0">
                        <p className="font-black text-stone-800 dark:text-stone-100 text-sm">{h.dia}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {h.turnos.map((t, j) => (
                          <span key={j} className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-sm font-bold px-3 py-1 rounded-full border border-red-200 dark:border-red-700/50">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl flex gap-3">
                  <span className="material-symbols-outlined text-amber-600 text-xl flex-shrink-0">info</span>
                  <p className="text-sm text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                    Los horarios pueden variar durante períodos festivos o convocatorias de examen. Consulta siempre con recepción o a través de nuestro canal oficial.
                  </p>
                </div>

                <button
                  onClick={() => setHorarioModal(null)}
                  className="w-full mt-6 py-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-xl font-black hover:bg-red-700 dark:hover:bg-red-600 dark:hover:text-white transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
