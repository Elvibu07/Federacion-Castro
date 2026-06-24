import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Aspirante, Tribunal, Convocatoria, Judge } from '../types';
import { UserOptions } from 'jspdf-autotable';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => void;
  lastAutoTable: { finalY: number };
}

// Format date to DD/MM/YYYY
const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const generateActaPDF = (
  aspirante: Aspirante,
  tribunal: Tribunal,
  convocatoria: Convocatoria,
  jueces: Judge[]
) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;

  // Colors
  const primaryColor: [number, number, number] = [139, 0, 0]; // Dark Red (#8b0000)
  const textColor: [number, number, number] = [40, 40, 40];
  const lightGray: [number, number, number] = [240, 240, 240];

  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('FEDERACIÓN MARCIAL DE KARATE', 105, 18, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Acta Oficial de Examen de Grado', 105, 28, { align: 'center' });

  // Document Info
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ACTA DE EVALUACIÓN FINAL', 14, 50);
  doc.setLineWidth(0.5);
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(14, 52, 196, 52);

  // Aspirante & Tribunal Data
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const startY = 60;
  const col1 = 14;
  const col2 = 100;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Aspirante:', col1, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(aspirante.name, col1 + 25, startY);

  doc.setFont('helvetica', 'bold');
  doc.text('Grado Actual:', col1, startY + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(aspirante.currentBelt, col1 + 25, startY + 8);

  doc.setFont('helvetica', 'bold');
  doc.text('Grado Solicitado:', col1, startY + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(aspirante.requestedBelt, col1 + 35, startY + 16);

  doc.setFont('helvetica', 'bold');
  doc.text('Tribunal:', col2, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(tribunal.name, col2 + 20, startY);

  doc.setFont('helvetica', 'bold');
  doc.text('Convocatoria:', col2, startY + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(convocatoria.titulo, col2 + 25, startY + 8);

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', col2, startY + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(tribunal.fecha ? formatDate(tribunal.fecha) : formatDate(new Date().toISOString()), col2 + 15, startY + 16);

  // Votos del Tribunal Table
  const tableData = [];
  const evaluacion = aspirante.evaluacion;
  
  if (evaluacion && evaluacion.votos) {
    evaluacion.votos.forEach((voto, index) => {
      const juez = jueces.find(j => j.id === voto.judgeId);
      const juezName = juez ? juez.name : `Juez ${index + 1}`;
      const resultadoComun = voto.bloqueComun?.resultado || 'N/A';
      const resultadoEspecifico = voto.bloqueEspecifico?.resultado || 'N/A';
      const resultadoFinal = voto.resultado || 'Pendiente';
      
      tableData.push([juezName, resultadoComun, resultadoEspecifico, resultadoFinal]);
    });
  }

  doc.autoTable({
    startY: startY + 25,
    head: [['Miembro del Tribunal', 'Bloque Común', 'Bloque Específico', 'Voto Final']],
    body: tableData,
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: lightGray },
    margin: { left: 14, right: 14 },
    theme: 'grid'
  });

  // Final Result Box
  const finalY = doc.lastAutoTable.finalY + 15;
  const isApto = evaluacion?.resultadoFinal === 'Apto';
  
  doc.setFillColor(isApto ? 230 : 255, isApto ? 245 : 230, isApto ? 230 : 230);
  doc.setDrawColor(isApto ? 34 : 200, isApto ? 139 : 0, isApto ? 34 : 0);
  doc.setLineWidth(1);
  doc.rect(14, finalY, 182, 20, 'FD');
  
  doc.setTextColor(isApto ? 34 : 200, isApto ? 139 : 0, isApto ? 34 : 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const resultText = isApto ? 'RESULTADO FINAL: APTO' : 'RESULTADO FINAL: NO APTO';
  doc.text(resultText, 105, finalY + 12, { align: 'center' });

  // Signatures
  const signY = finalY + 40;
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(10);
  doc.text('Firma del Director de Tribunales', 105, signY, { align: 'center' });
  doc.setLineWidth(0.5);
  doc.setDrawColor(100, 100, 100);
  doc.line(65, signY + 15, 145, signY + 15);
  
  const director = jueces.find(j => j.rank === 'Director');
  if (director) {
    doc.text(director.name, 105, signY + 20, { align: 'center' });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Documento oficial emitido por la Federación Marcial de Karate.', 105, pageHeight - 10, { align: 'center' });
  doc.text(`Identificador de Acta: ${aspirante.id.substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`, 105, pageHeight - 5, { align: 'center' });

  doc.save(`Acta_Examen_${aspirante.name.replace(/\s+/g, '_')}.pdf`);
};

export const generateDiplomaPDF = (aspirante: Aspirante) => {
  // A4 Landscape
  const doc = new jsPDF({ orientation: 'landscape' }) as jsPDFWithAutoTable;

  const width = doc.internal.pageSize.width;
  const height = doc.internal.pageSize.height;

  // Background border
  doc.setLineWidth(4);
  doc.setDrawColor(139, 0, 0); // Red
  doc.rect(10, 10, width - 20, height - 20);
  
  doc.setLineWidth(1);
  doc.setDrawColor(200, 150, 50); // Gold
  doc.rect(14, 14, width - 28, height - 28);

  // Logo / Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(139, 0, 0);
  doc.text('FEDERACIÓN MARCIAL DE KARATE', width / 2, 45, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.setTextColor(80, 80, 80);
  doc.text('Otorga el presente', width / 2, 65, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(48);
  doc.setTextColor(200, 150, 50); // Gold
  doc.text('CERTIFICADO DE GRADO', width / 2, 90, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.setTextColor(80, 80, 80);
  doc.text('A favor de:', width / 2, 110, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(40, 40, 40);
  doc.text(aspirante.name.toUpperCase(), width / 2, 125, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.setTextColor(80, 80, 80);
  doc.text(`Por haber superado satisfactoriamente los requisitos técnicos y teóricos,`, width / 2, 145, { align: 'center' });
  doc.text(`se le reconoce oficialmente el grado de:`, width / 2, 155, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(139, 0, 0);
  doc.text(aspirante.requestedBelt.toUpperCase(), width / 2, 175, { align: 'center' });

  // Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(80, 80, 80);
  const dateStr = formatDate(aspirante.evaluacion?.fechaEvaluacion || new Date().toISOString());
  doc.text(`Emitido el día ${dateStr}`, width / 2, 190, { align: 'center' });

  // Signature
  doc.setLineWidth(0.5);
  doc.setDrawColor(100, 100, 100);
  doc.line(width / 2 - 40, height - 30, width / 2 + 40, height - 30);
  
  doc.setFontSize(12);
  doc.text('Presidente / Director Técnico', width / 2, height - 20, { align: 'center' });

  // Footer ID
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Reg. ID: ${aspirante.id.substring(0, 12).toUpperCase()}`, 20, height - 15);

  doc.save(`Diploma_${aspirante.requestedBelt.replace(/\s+/g, '_')}_${aspirante.name.replace(/\s+/g, '_')}.pdf`);
};
