import { useState, type ReactNode } from 'react';
import type { UnidadCurricular } from '../datos/esquema';
import { buscarUC, claveUCGrado } from '../datos/consultas';
import { colorEspacio } from '../datos/programas';

export type Combinacion = { uc: UnidadCurricular; grado: number; clave: string };

/** Pestañas por unidad curricular y grado (en multigrado, una por cada grado). */
export function PestanasUC({
  ucIds,
  grados,
  contar,
  children,
}: {
  ucIds: string[];
  grados: number[];
  contar: (c: Combinacion) => number;
  children: (c: Combinacion) => ReactNode;
}) {
  const combinaciones: Combinacion[] = ucIds.flatMap((id) => {
    const uc = buscarUC(id);
    return uc ? grados.map((g) => ({ uc, grado: g, clave: claveUCGrado(id, g) })) : [];
  });
  const [activa, setActiva] = useState(combinaciones[0]?.clave);
  const actual = combinaciones.find((c) => c.clave === activa) ?? combinaciones[0];
  if (!actual) return null;
  return (
    <div>
      {combinaciones.length > 1 && (
        <div role="tablist" className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {combinaciones.map((c) => {
            const n = contar(c);
            return (
              <button
                key={c.clave}
                role="tab"
                type="button"
                aria-selected={c.clave === actual.clave}
                onClick={() => setActiva(c.clave)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
                  c.clave === actual.clave ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${colorEspacio(c.uc.espacio).color}`} aria-hidden />
                {c.uc.nombre}
                {grados.length > 1 && ` · ${c.grado}.º`}
                {n > 0 && <span className="rounded-full bg-blue-500 px-1.5 text-xs text-white">{n}</span>}
              </button>
            );
          })}
        </div>
      )}
      {children(actual)}
    </div>
  );
}
