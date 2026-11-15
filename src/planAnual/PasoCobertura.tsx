import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db, NOMBRE_MES } from '../datos/db';
import { cobertura, porcentaje, type CoberturaUC } from '../datos/planAnual';
import { colorEspacio } from '../datos/programas';
import { Aviso, Pildora } from '../componentes/ui';
import type { PropsAnual } from './PasoDatosAnual';

function Barra({ etiqueta, n, total, color }: { etiqueta: string; n: number; total: number; color: string }) {
  const p = porcentaje(n, total);
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-600">
        <span>{etiqueta}</span>
        <span>
          {n}/{total} · {p}%
        </span>
      </div>
      <div className="mt-0.5 h-2 rounded-full bg-slate-100" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={etiqueta}>
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

const Semaforo = ({ estado }: { estado: 'verde' | 'amarillo' | 'gris' }) => (
  <span
    aria-hidden
    className={`mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${estado === 'verde' ? 'bg-emerald-500' : estado === 'amarillo' ? 'bg-amber-400' : 'bg-slate-300'}`}
  />
);

function TarjetaUC({ c, soloPendientes, multigrado }: { c: CoberturaUC; soloPendientes: boolean; multigrado: boolean }) {
  const [abierta, setAbierta] = useState(false);
  const contenidos = c.contenidos.filter((x) => !x.transversal);
  const ubicados = contenidos.filter((x) => x.meses.length).length;
  const detallados = contenidos.filter((x) => x.en.length).length;
  const criteriosTrabajados = c.criterios.filter((x) => x.en.length).length;
  const visibles = soloPendientes ? contenidos.filter((x) => !x.en.length) : contenidos;
  const pendientes = c.criterios.filter((x) => !x.en.length);
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
        <span className={`h-2.5 w-2.5 rounded-full ${colorEspacio(c.uc.espacio).color}`} aria-hidden />
        {c.uc.nombre}
        {multigrado && <span className="text-sm font-normal text-slate-500">· {c.grado}.º</span>}
      </h4>
      <div className="space-y-2">
        <Barra etiqueta="Contenidos ubicados en el año" n={ubicados} total={contenidos.length} color="bg-amber-400" />
        <Barra etiqueta="Contenidos planificados en detalle" n={detallados} total={contenidos.length} color="bg-emerald-500" />
        <Barra etiqueta="Criterios de logro trabajados" n={criteriosTrabajados} total={c.criterios.length} color="bg-blue-500" />
      </div>
      <button type="button" onClick={() => setAbierta(!abierta)} aria-expanded={abierta} className="mt-3 text-sm font-medium text-blue-700 hover:underline">
        {abierta ? 'Ocultar detalle' : 'Ver detalle'}
      </button>
      {abierta && (
        <div className="mt-3 space-y-4">
          <ul className="space-y-1.5 text-sm">
            {visibles.map((x) => (
              <li key={x.contenido.id} className="flex gap-2">
                <Semaforo estado={x.en.length ? 'verde' : x.meses.length ? 'amarillo' : 'gris'} />
                <span>
                  {x.contenido.texto}
                  <span className="block text-xs text-slate-500">
                    {x.meses.length > 0 && `${x.meses.map((m) => NOMBRE_MES[m].slice(0, 3)).join(', ')}`}
                    {x.en.length > 0 && ` · en: ${x.en.join(', ')}`}
                    {!x.meses.length && !x.en.length && 'Sin planificar'}
                  </span>
                </span>
              </li>
            ))}
            {visibles.length === 0 && <li className="text-slate-500">¡Todo planificado en detalle!</li>}
          </ul>
          {pendientes.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm font-medium text-slate-700">Criterios de logro sin trabajar ({pendientes.length})</summary>
              <ul className="ml-5 mt-1 list-disc text-sm text-slate-600">
                {pendientes.map((x) => (
                  <li key={x.criterio.id}>{x.criterio.texto}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </article>
  );
}

export function PasoCobertura({ plan }: PropsAnual) {
  const planificaciones = useLiveQuery(() => db.planificaciones.toArray(), []);
  const [soloPendientes, setSoloPendientes] = useState(false);
  if (!planificaciones) return <p className="text-slate-500">Cargando…</p>;
  const datos = cobertura(plan, planificaciones);
  const contenidos = datos.flatMap((d) => d.contenidos.filter((x) => !x.transversal));
  const criterios = datos.flatMap((d) => d.criterios);
  return (
    <div className="space-y-5">
      <Aviso>
        El mapa cruza tu plan anual con las unidades, proyectos y secuencias de {plan.grados.map((g) => `${g}.º`).join(' y ')} del {plan.anio}{' '}
        (o sin fecha). <span className="ml-1 inline-flex items-center gap-1"><Semaforo estado="verde" /> planificado en detalle</span>
        <span className="ml-2 inline-flex items-center gap-1"><Semaforo estado="amarillo" /> solo en el plan anual</span>
        <span className="ml-2 inline-flex items-center gap-1"><Semaforo estado="gris" /> sin planificar</span>
      </Aviso>
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <Barra etiqueta="Contenidos ubicados en el año" n={contenidos.filter((x) => x.meses.length).length} total={contenidos.length} color="bg-amber-400" />
        <Barra etiqueta="Contenidos planificados en detalle" n={contenidos.filter((x) => x.en.length).length} total={contenidos.length} color="bg-emerald-500" />
        <Barra etiqueta="Criterios de logro trabajados" n={criterios.filter((x) => x.en.length).length} total={criterios.length} color="bg-blue-500" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Pildora activa={!soloPendientes} onClick={() => setSoloPendientes(false)}>Todos los contenidos</Pildora>
        <Pildora activa={soloPendientes} onClick={() => setSoloPendientes(true)}>Solo pendientes</Pildora>
        <Link to="/nueva" className="ml-auto text-sm font-medium text-blue-700 hover:underline">+ Nueva unidad, proyecto o secuencia</Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {datos.map((c) => (
          <TarjetaUC key={c.clave} c={c} soloPendientes={soloPendientes} multigrado={plan.grados.length > 1} />
        ))}
      </div>
    </div>
  );
}
