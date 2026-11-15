import { useRef } from 'react';
import { Documento, ESTILOS_DOCUMENTO } from '../componentes/Documento';
import { AreaTexto, Boton } from '../componentes/ui';
import { descargarWord } from '../datos/exportar';
import type { PropsPaso } from './tipos';

export function PasoRevision({ plan, cambiar, irAPaso }: PropsPaso & { irAPaso: (n: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const chequeos = [
    { ok: !!plan.titulo.trim(), texto: 'Tiene título', paso: 0 },
    { ok: plan.ucIds.length > 0, texto: 'Unidades curriculares elegidas', paso: 0 },
    { ok: plan.criterios.length > 0, texto: 'Criterios de logro', paso: 1 },
    { ok: plan.contenidos.length > 0, texto: 'Contenidos', paso: 2 },
    { ok: !!plan.evidencias.trim() || plan.instrumentos.length > 0, texto: 'Evidencias o instrumentos de evaluación', paso: 3 },
    { ok: plan.clases.length > 0, texto: 'Clases o actividades', paso: 4 },
  ];
  const completos = chequeos.filter((c) => c.ok).length;
  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <style>{ESTILOS_DOCUMENTO}</style>
      <aside className="no-imprimir h-fit space-y-4 lg:sticky lg:top-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="font-semibold text-slate-900">
            Completitud: {completos} de {chequeos.length}
          </p>
          <div className="mt-2 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(completos / chequeos.length) * 100}%` }} />
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {chequeos.map((c) => (
              <li key={c.texto}>
                {c.ok ? (
                  <span className="text-emerald-700">✔ {c.texto}</span>
                ) : (
                  <button type="button" className="text-left text-amber-700 hover:underline" onClick={() => irAPaso(c.paso)}>
                    ○ {c.texto} → completar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <Boton onClick={() => ref.current && descargarWord(ref.current, plan.titulo)}>⬇ Descargar Word</Boton>
          <Boton variante="secundario" onClick={() => window.print()}>🖨 Imprimir o guardar PDF</Boton>
        </div>
        <AreaTexto etiqueta="Observaciones" valor={plan.notas} onCambio={(v) => cambiar({ notas: v })} filas={4} />
      </aside>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 print:border-0 print:p-0 print:shadow-none">
        <Documento ref={ref} plan={plan} />
      </div>
    </div>
  );
}
