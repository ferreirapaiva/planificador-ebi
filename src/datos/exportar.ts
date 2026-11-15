import { ESTILOS_DOCUMENTO } from '../componentes/Documento';

const nombreArchivo = (titulo: string) =>
  (titulo || 'planificacion')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60) || 'planificacion';

/**
 * Descarga el documento como PDF (A4), sin pasar por el diálogo de impresión.
 * La librería se carga solo cuando se usa, para no hacer más lenta la app.
 */
export async function descargarPDF(elemento: HTMLElement, titulo: string) {
  const { default: html2pdf } = await import('html2pdf.js');
  // Se arma en una variable porque los tipos de la librería no declaran "pagebreak", que sí soporta.
  const opciones = {
    margin: [15, 15, 15, 15] as [number, number, number, number],
    filename: `${nombreArchivo(titulo)}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    // Evita cortar filas de tablas, ítems y títulos entre dos páginas.
    pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'li', 'h2', 'h3', 'h4', '.doc-clase'] },
  };
  await html2pdf().set(opciones).from(elemento).save();
}

/**
 * Descarga el documento como archivo de Word (.doc). Word, LibreOffice y Google Docs abren este formato
 * (HTML con estilos) y permiten seguir editándolo.
 */
export function descargarWord(elemento: HTMLElement, titulo: string) {
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${titulo}</title>
<style>@page { size: A4; margin: 2cm; } body { margin: 0; } ${ESTILOS_DOCUMENTO}</style></head>
<body>${elemento.outerHTML}</body></html>`;
  const blob = new Blob(['﻿', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombreArchivo(titulo)}.doc`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
