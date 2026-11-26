import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ESPACIOS, PROGRAMAS, TRAMOS, UC_BASE, idUC } from '../datos/programas';
import { Pildora } from '../componentes/ui';

const CLAVE_TRAMO = 'programas-tramo';
const tramoGuardado = () => {
  try {
    const t = Number(localStorage.getItem(CLAVE_TRAMO));
    return TRAMOS.some((x) => x.tramo === t) ? t : 3;
  } catch {
    return 3;
  }
};

export function Programas() {
  const [tramo, setTramo] = useState(tramoGuardado);
  const elegir = (t: number) => {
    setTramo(t);
    try {
      localStorage.setItem(CLAVE_TRAMO, String(t));
    } catch {
      /* sin almacenamiento: no se recuerda */
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">Programas</h1>
        <p className="text-slate-600">Elegí el tramo y una unidad curricular para ver sus contenidos y criterios de logro.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tramo">
        {TRAMOS.map((t) => (
          <Pildora key={t.tramo} activa={tramo === t.tramo} onClick={() => elegir(t.tramo)}>
            Tramo {t.tramo} · {t.grados.map((g) => `${g}.º`).join(' y ')}
          </Pildora>
        ))}
      </div>
      {ESPACIOS.map((esp) => (
        <section key={esp.nombre}>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <span className={`h-3 w-3 rounded-full ${esp.color}`} aria-hidden /> Espacio {esp.nombre}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {UC_BASE.filter((u) => u.espacio === esp.nombre).map((u) => {
              const id = idUC(u.id, tramo);
              const cargada = PROGRAMAS.find((p) => p.id === id);
              return cargada ? (
                <Link key={id} to={`/programas/${id}`} className={`rounded-[20px] border p-4 font-bold transition hover:-translate-y-0.5 hover:shadow-suave ${esp.suave}`}>
                  {u.nombre}
                  <span className="mt-1 block text-xs font-normal opacity-75">
                    {cargada.grados.map((g) => `${g.grado}.º`).join(' y ')} · {cargada.revisado ? 'revisado' : 'en revisión'}
                  </span>
                </Link>
              ) : (
                <div key={id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-400" aria-disabled>
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
