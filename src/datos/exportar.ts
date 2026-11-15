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
