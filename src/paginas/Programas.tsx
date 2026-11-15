import { Link } from 'react-router-dom';
import { ESPACIOS, PROGRAMAS, UC_TRAMO_3 } from '../datos/programas';

export function Programas() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Programas — Tramo 3</h1>
        <p className="text-slate-600">Elegí una unidad curricular para ver sus contenidos y criterios de logro.</p>
      </div>
      {ESPACIOS.map((esp) => (
        <section key={esp.nombre}>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <span className={`h-3 w-3 rounded-full ${esp.color}`} aria-hidden /> Espacio {esp.nombre}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {UC_TRAMO_3.filter((u) => u.espacio === esp.nombre).map((u) => {
              const cargada = PROGRAMAS.find((p) => p.id === u.id);
              return cargada ? (
                <Link key={u.id} to={`/programas/${u.id}`} className={`rounded-xl border p-4 font-medium hover:shadow-md ${esp.suave}`}>
                  {u.nombre}
                  <span className="mt-1 block text-xs font-normal opacity-75">
                    {cargada.grados.map((g) => `${g.grado}.º`).join(' y ')} · {cargada.revisado ? 'revisado' : 'en revisión'}
                  </span>
                </Link>
              ) : (
                <div key={u.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-400" aria-disabled>
                  {u.nombre}
                  <span className="mt-1 block text-xs">Pendiente de carga</span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
