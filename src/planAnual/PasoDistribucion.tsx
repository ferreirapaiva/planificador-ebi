import { diasDeClase, efemeridesDelMes, periodosDelMes } from '../datos/calendario';
import { MESES_LECTIVOS, NOMBRE_MES } from '../datos/db';
import { buscarContenido } from '../datos/consultas';
import { PestanasUC, type Combinacion } from '../asistente/PestanasUC';
import { Aviso } from '../componentes/ui';
import type { PropsAnual } from './PasoDatosAnual';

const inicial = (m: number) => NOMBRE_MES[m].slice(0, 3);

function ResumenMeses({ plan }: PropsAnual) {
  const porMes = (m: number) => Object.entries(plan.distribucion).filter(([id, meses]) => meses.includes(m) && buscarContenido(id)).length;
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[720px] grid-cols-10 gap-1.5">
        {MESES_LECTIVOS.map((m) => {
          const efem = efemeridesDelMes(plan.calendario, m);
          const periodos = periodosDelMes(plan.calendario, plan.anio, m);
          const n = porMes(m);
          return (
            <div key={m} className="rounded-lg border border-slate-200 bg-white p-2 text-xs">
              <p className="font-semibold text-slate-900">{NOMBRE_MES[m]}</p>
              <p className="text-slate-500">≈ {diasDeClase(plan.calendario, plan.anio, m)} días de clase</p>
              <p className={`mt-1 font-medium ${n ? 'text-blue-700' : 'text-slate-400'}`}>{n} contenido{n === 1 ? '' : 's'}</p>
              {periodos.map((p) => (
                <p key={p.id} className="mt-1 rounded bg-amber-50 px-1 text-amber-800">{p.nombre}</p>
              ))}
              {efem.length > 0 && (
                <p className="mt-1 text-slate-500" title={efem.map((e) => `${e.fecha.slice(8)}: ${e.nombre}`).join('\n')}>
                  📅 {efem.length} efeméride{efem.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SelectorMeses({ meses, onCambio }: { meses: number[]; onCambio: (m: number[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Meses">
      {MESES_LECTIVOS.map((m) => {
        const activo = meses.includes(m);
        return (
          <button
            key={m}
            type="button"
            aria-pressed={activo}
            title={NOMBRE_MES[m]}
            onClick={() => onCambio(activo ? meses.filter((x) => x !== m) : [...meses, m].sort((a, b) => a - b))}
            className={`w-10 rounded px-1 py-0.5 text-xs font-medium ${activo ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            {inicial(m)}
          </button>
        );
      })}
    </div>
  );
}

function ListaDistribucion({ plan, cambiar, combinacion }: PropsAnual & { combinacion: Combinacion }) {
  const g = combinacion.uc.grados.find((x) => x.grado === combinacion.grado);
  if (!g) return <p className="text-sm text-slate-500">Este programa no tiene {combinacion.grado}.º grado.</p>;
  const setMeses = (ids: string[], meses: number[]) => {
    const d = { ...plan.distribucion };
    ids.forEach((id) => (meses.length ? (d[id] = meses) : delete d[id]));
    cambiar({ distribucion: d });
  };
  const total = g.bloques.filter((b) => !b.transversal).flatMap((b) => b.contenidos);
  const sinMes = total.filter((c) => !plan.distribucion[c.id]?.length).length;
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        {total.length - sinMes} de {total.length} contenidos ubicados en el año
        {sinMes > 0 && <span className="text-amber-700"> · faltan {sinMes}</span>}
      </p>
      {g.bloques.map((b) => {
        const ids = b.contenidos.map((c) => c.id);
        return (
          <div key={b.id} className="rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
              <p className="mr-auto text-sm font-semibold uppercase tracking-wide text-slate-700">
                {b.titulo}
                {b.transversal && <span className="ml-2 rounded bg-amber-100 px-1.5 text-[10px] text-amber-800">transversal</span>}
              </p>
              <label className="text-xs text-slate-500">
                Todo el bloque en{' '}
                <select
                  value=""
                  onChange={(e) => e.target.value && setMeses(ids, e.target.value === 'todo' ? MESES_LECTIVOS : [Number(e.target.value)])}
                  className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs"
                >
                  <option value="">elegir…</option>
                  {MESES_LECTIVOS.map((m) => (
                    <option key={m} value={m}>{NOMBRE_MES[m]}</option>
                  ))}
                  <option value="todo">Todo el año</option>
                </select>
              </label>
            </div>
            <ul className="divide-y divide-slate-100">
              {b.contenidos.map((c) => (
                <li key={c.id} className="grid gap-2 p-3 lg:grid-cols-[1fr_auto] lg:items-center">
                  <span className="text-sm text-slate-800">
                    {c.texto}
                    {c.subitems && <span className="block text-xs text-slate-500">{c.subitems.map((s) => s.texto).join(' · ')}</span>}
                  </span>
                  <SelectorMeses meses={plan.distribucion[c.id] ?? []} onCambio={(m) => setMeses([c.id], m)} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function PasoDistribucion(props: PropsAnual) {
  const { plan } = props;
  return (
    <div className="space-y-5">
      <Aviso>
        Ubicá cada contenido en los meses en que lo vas a trabajar (podés marcar varios). Arriba ves cuántos días de clase tiene cada mes y
        cuántos contenidos le asignaste.
      </Aviso>
      <ResumenMeses {...props} />
      {plan.ucIds.length === 0 ? (
        <Aviso tono="alerta">Elegí al menos una unidad curricular en el paso anterior.</Aviso>
      ) : (
        <PestanasUC
          ucIds={plan.ucIds}
          grados={plan.grados}
          contar={(c) => {
            const g = c.uc.grados.find((x) => x.grado === c.grado);
            return g ? g.bloques.flatMap((b) => b.contenidos).filter((x) => plan.distribucion[x.id]?.length).length : 0;
          }}
        >
          {(c) => <ListaDistribucion key={c.clave} combinacion={c} {...props} />}
        </PestanasUC>
      )}
    </div>
  );
}
