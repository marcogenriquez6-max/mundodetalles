import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface ReportePDF {
  titulo: string
  subtitulo?: string
  filtros?: string[]
  columnas: string[]
  filas: (string | number)[][]
  totales?: (string | number)[]
  nombreArchivo: string
}

const EMPRESA = 'Mundo Detalles'
const ESLOGAN = 'Sistema de Gestión de Ventas e Inventario'

/** Genera y descarga un PDF con encabezado corporativo, tabla y pie de página. */
export function generarReportePDF(reporte: ReportePDF) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 40

  doc.setFillColor(37, 99, 235)
  doc.rect(0, 0, pageWidth, 72, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(EMPRESA, marginX, 34)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(ESLOGAN, marginX, 52)

  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(reporte.titulo, marginX, 104)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  let y = 122
  doc.text(`Generado: ${new Date().toLocaleString('es-BO')}`, marginX, y)
  if (reporte.subtitulo) {
    y += 14
    doc.text(reporte.subtitulo, marginX, y)
  }
  if (reporte.filtros && reporte.filtros.length > 0) {
    y += 14
    doc.text(`Filtros: ${reporte.filtros.join('   |   ')}`, marginX, y)
  }

  autoTable(doc, {
    startY: y + 16,
    head: [reporte.columnas],
    body: reporte.filas.map((r) => r.map((c) => String(c))),
    foot: reporte.totales ? [reporte.totales.map((c) => String(c))] : undefined,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 5, textColor: [51, 65, 85] },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [226, 232, 240], textColor: [30, 41, 59], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: marginX, right: marginX },
  })

  const totalPaginas =
    typeof doc.getNumberOfPages === 'function'
      ? doc.getNumberOfPages()
      : (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
  const altura = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`${EMPRESA} - Documento generado por el sistema`, marginX, altura - 22)
    doc.text(`Página ${i} de ${totalPaginas}`, pageWidth - marginX, altura - 22, { align: 'right' })
  }

  doc.save(`${reporte.nombreArchivo}.pdf`)
}
