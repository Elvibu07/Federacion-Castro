import React from 'react';
import { Aspirante, Tribunal, Convocatoria, Judge } from '../types';
import { generateActaPDF } from '../lib/pdfGenerator';

interface ActaImprimibleProps {
  aspirante: Aspirante;
  tribunal?: Tribunal;
  convocatoria?: Convocatoria;
  jueces: Judge[];
  onClose: () => void;
  onPrint: () => void;
}

export default function ActaImprimible({ aspirante, tribunal, convocatoria, jueces, onClose, onPrint }: ActaImprimibleProps) {
  const ev = aspirante.evaluacion;
  const isParcial = ev?.bloqueComun?.resultado === 'Apto' && (ev?.bloqueEspecifico?.resultado === 'No Apto' || ev?.resultadoFinal === 'No Apto');
  const resultadoMostrar = isParcial ? 'NO APTO (Conserva Fase Común)' : ev?.resultadoFinal || 'Pendiente';

  const handleDownloadPDF = () => {
    if (tribunal && convocatoria) {
      generateActaPDF(aspirante, tribunal, convocatoria, jueces);
    } else {
      // Fallback
      generateActaPDF(aspirante, tribunal || { id: '', name: 'Tribunal No Asignado', judges: [] } as any, convocatoria || { id: '', titulo: 'Convocatoria General', status: 'Abierta' } as any, jueces);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 print:static print:bg-transparent print:p-0 print:block">
      <div className="bg-white max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl flex flex-col relative print:max-w-none print:w-full print:max-h-none print:overflow-visible print:shadow-none print:block">
        <div className="sticky top-0 bg-stone-100 px-6 py-4 border-b flex justify-between items-center z-10 print:hidden">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <span className="material-symbols-outlined">receipt_long</span>
            Vista Previa de Acta Oficial
          </h2>
          <div className="flex gap-2">
            <button onClick={handleDownloadPDF} className="px-4 py-1.5 bg-blue-700 text-white text-sm font-bold rounded flex items-center gap-1 hover:bg-blue-800">
              <span className="material-symbols-outlined text-sm">download</span> Descargar PDF Oficial
            </button>
            <button onClick={onClose} className="px-3 py-1.5 bg-stone-200 text-stone-700 text-sm font-bold rounded hover:bg-stone-300">
              Cerrar
            </button>
          </div>
        </div>
        <div id="acta-imprimible-content" className="p-12 bg-white text-black font-serif">
          {/* Membrete */}
          <div className="text-center border-b-2 border-black pb-6 mb-8">
            <h1 className="text-2xl font-black uppercase tracking-widest mb-1">Federación Madrileña de Karate</h1>
            <p className="text-sm">Departamento Nacional de Grados</p>
            <p className="text-xs text-stone-500 mt-2">NIF: G-28751527 | C/ Alberche, 21. 28014 Madrid</p>
          </div>

          <h2 className="text-xl font-bold text-center mb-8 uppercase tracking-wide">Acta de Examen de Cinturón Negro</h2>

          {/* Datos Convocatoria */}
          <div className="mb-8 grid grid-cols-2 gap-4 text-sm border border-black p-4">
            <div><span className="font-bold">Convocatoria:</span> {convocatoria?.titulo || 'Ordinaria'}</div>
            <div><span className="font-bold">Fecha:</span> {convocatoria?.fecha || new Date().toISOString().split('T')[0]}</div>
            <div><span className="font-bold">Sede:</span> {convocatoria?.sede || 'Federación Madrileña'}</div>
            <div><span className="font-bold">Grado Solicitado:</span> {aspirante.requestedBelt}</div>
          </div>

          {/* Datos Aspirante */}
          <div className="mb-8 border border-black p-4 text-sm">
            <h3 className="font-bold uppercase border-b border-stone-300 pb-2 mb-3">Datos del Aspirante</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="font-bold">Nombre Completo:</span> {aspirante.name}</div>
              <div><span className="font-bold">Nº Licencia / DNI:</span> {aspirante.id}</div>
              <div><span className="font-bold">Club / Dojo:</span> {aspirante.club}</div>
              <div><span className="font-bold">Vía de Examen:</span> {aspirante.via || 'Ordinaria'}</div>
            </div>
          </div>

          {/* Resultado */}
          <div className="mb-12 border-2 border-black p-6 text-center bg-stone-50">
            <h3 className="font-bold uppercase mb-2 text-sm">Dictamen Final del Tribunal</h3>
            <div className={`text-3xl font-black uppercase tracking-widest ${resultadoMostrar.includes('APTO') && !resultadoMostrar.includes('NO') ? 'text-green-700' : 'text-red-700'}`}>
              {resultadoMostrar}
            </div>
            {isParcial && (
              <p className="mt-2 text-xs font-bold text-amber-700">El aspirante ha superado la Fase Común. Se conservará su calificación durante 1 año natural (RF-52).</p>
            )}
            {ev?.informeNoApto && (
              <div className="mt-4 text-left border-t pt-4">
                <span className="font-bold text-xs uppercase">Observaciones del Tribunal:</span>
                <p className="text-sm italic mt-1">{ev.informeNoApto}</p>
              </div>
            )}
          </div>

          {/* Firmas */}
          <div className="mt-16 pt-8">
            <h3 className="font-bold uppercase text-center mb-12 text-sm">Firmas del Tribunal Calificador</h3>
            <div className="flex justify-between px-8">
              {tribunal?.judges.slice(0,3).map((juez, i) => (
                <div key={i} className="text-center">
                  <div className="w-48 border-b border-black mb-2 mx-auto"></div>
                  <p className="font-bold text-sm">{juez.name}</p>
                  <p className="text-xs">{juez.rank}</p>
                  <p className="text-[10px] text-stone-500">Juez {i+1}</p>
                </div>
              ))}
            </div>
            {(!tribunal || tribunal.judges.length === 0) && (
              <div className="flex justify-between px-8">
                <div className="text-center">
                  <div className="w-48 border-b border-black mb-2 mx-auto"></div>
                  <p className="font-bold text-sm">Presidente del Tribunal</p>
                </div>
                <div className="text-center">
                  <div className="w-48 border-b border-black mb-2 mx-auto"></div>
                  <p className="font-bold text-sm">Vocal 1</p>
                </div>
                <div className="text-center">
                  <div className="w-48 border-b border-black mb-2 mx-auto"></div>
                  <p className="font-bold text-sm">Vocal 2</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-12 text-center text-[9px] text-stone-400">
            Documento generado electrónicamente por el Sistema Integrado de Gestión de Grados. Código de verificación: {btoa(aspirante.id + Date.now()).substring(0, 15)}
          </div>
        </div>
      </div>
    </div>
  );
}
