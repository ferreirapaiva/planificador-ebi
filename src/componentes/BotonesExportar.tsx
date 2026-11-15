import { useState, type RefObject } from 'react';
import { descargarPDF, descargarWord } from '../datos/exportar';
import { Boton } from './ui';

/** Descargar Word, descargar PDF e imprimir, como tres acciones separadas. */
export function BotonesExportar({ documento, titulo }: { documento: RefObject<HTMLDivElement | null>; titulo: string }) {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState(false);
  const pdf = async () => {
    if (!documento.current) return;
    setGenerando(true);
    setError(false);
    try {
      await descargarPDF(documento.current, titulo);
    } catch {
      setError(true);
    } finally {
      setGenerando(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <Boton onClick={() => documento.current && descargarWord(documento.current, titulo)}>⬇ Descargar Word</Boton>
      <Boton onClick={pdf} disabled={generando}>{generando ? 'Generando PDF…' : '⬇ Descargar PDF'}</Boton>
      <Boton variante="secundario" onClick={() => window.print()}>🖨 Imprimir</Boton>
      {error && <p className="text-sm text-red-700">No se pudo generar el PDF. Probá de nuevo o usá Imprimir → Guardar como PDF.</p>}
    </div>
  );
}
