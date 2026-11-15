import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { db, guardarPerfil, TIPOS, type Planificacion } from '../datos/db';
import { buscarContenido, buscarCriterio } from '../datos/consultas';
import { Boton } from '../componentes/ui';
import { PasoDatos } from '../asistente/PasoDatos';
import { PasoLogros } from '../asistente/PasoLogros';
import { PasoContenidos } from '../asistente/PasoContenidos';
import { PasoEvaluacion } from '../asistente/PasoEvaluacion';
import { PasoEnsenanza } from '../asistente/PasoEnsenanza';
import { PasoRevision } from '../asistente/PasoRevision';

const PASOS = [
  { titulo: 'Datos generales', pregunta: '¿Qué, para quién y cuándo?' },
  { titulo: 'Logros', pregunta: '¿Qué quiero que logren?' },
  { titulo: 'Contenidos', pregunta: '¿Qué voy a enseñar?' },
  { titulo: 'Evaluación', pregunta: '¿Cómo sabré que lo lograron?' },
  { titulo: 'Enseñanza', pregunta: '¿Cómo lo voy a enseñar?' },
  { titulo: 'Revisión', pregunta: 'Revisá, descargá o imprimí' },
];

/** Quita criterios y contenidos que ya no corresponden a las UC o grados elegidos. */
function depurar(p: Planificacion): Planificacion {
  const vale = (r?: { uc: { id: string }; grado: number }) => !!r && p.ucIds.includes(r.uc.id) && p.grados.includes(r.grado);
  const criterios = p.criterios.filter((id) => vale(buscarCriterio(id)));
  return {
    ...p,
    criterios,
    contenidos: p.contenidos.filter((id) => vale(buscarContenido(id))),
    instrumentos: p.instrumentos.map((i) => ({ ...i, filas: i.filas.filter((f) => criterios.includes(f.criterioId)) })),
  };
}

export function Asistente() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [plan, setPlan] = useState<Planificacion | null | undefined>(undefined);
  const [estado, setEstado] = useState<'guardado' | 'guardando'>('guardado');
  const temporizador = useRef<number | undefined>(undefined);
  const arriba = useRef<HTMLDivElement>(null);
  /** Solo se guarda después de que el docente cambia algo (abrir no guarda ni pisa sus datos recordados). */
  const editado = useRef(false);

  useEffect(() => {
    editado.current = false;
    db.planificaciones.get(id!).then((p) => setPlan(p ?? null));
  }, [id]);

  // Guardado automático, medio segundo después del último cambio.
  useEffect(() => {
    if (!plan || !editado.current) return;
    setEstado('guardando');
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(async () => {
      await db.planificaciones.put(plan);
      guardarPerfil(plan);
      setEstado('guardado');
    }, 500);
    return () => window.clearTimeout(temporizador.current);
  }, [plan]);

  if (plan === undefined) return <p className="text-slate-500">Cargando…</p>;
  if (plan === null)
    return (
      <p>
        No encontramos esa planificación. <Link className="text-blue-700 underline" to="/mis-planificaciones">Ver mis planificaciones</Link>
      </p>
    );

  const cambiar = (parcial: Partial<Planificacion>) => {
    editado.current = true;
    setPlan((p) => {
      if (!p) return p;
      const nuevo = { ...p, ...parcial, modificada: Date.now() };
      return 'ucIds' in parcial || 'grados' in parcial ? depurar(nuevo) : nuevo;
    });
  };
  const irAPaso = (n: number) => {
    cambiar({ paso: n });
    arriba.current?.scrollIntoView({ behavior: 'smooth' });
  };
  const paso = plan.paso;
  const puedeAvanzar = paso !== 0 || plan.ucIds.length > 0;
  const props = { plan, cambiar };

  return (
    <div ref={arriba} className="space-y-6">
      <header className="no-imprimir flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{TIPOS[plan.tipo].nombre}</p>
          <h1 className="text-2xl font-bold text-slate-900">{plan.titulo || 'Nueva planificación'}</h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs ${estado === 'guardado' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`} aria-live="polite">
          {estado === 'guardado' ? '✔ Guardado en este equipo' : 'Guardando…'}
        </span>
      </header>

      <nav aria-label="Pasos" className="no-imprimir">
        <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {PASOS.map((p, i) => (
            <li key={p.titulo}>
              <button
                type="button"
                onClick={() => (i === 0 || plan.ucIds.length > 0) && irAPaso(i)}
                aria-current={i === paso ? 'step' : undefined}
                className={`w-full rounded-lg border-t-4 px-2 py-2 text-left text-xs transition ${
                  i === paso ? 'border-blue-600 bg-white shadow-sm' : i < paso ? 'border-emerald-500 bg-white/60' : 'border-slate-200 bg-white/40'
                }`}
              >
                <span className="block font-semibold text-slate-900">
                  {i + 1}. {p.titulo}
                </span>
                <span className="hidden text-slate-500 md:block">{p.pregunta}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-6 print:border-0 print:bg-white print:p-0">
        <h2 className="no-imprimir mb-4 text-xl font-semibold text-slate-900">{PASOS[paso].pregunta}</h2>
        {paso === 0 && <PasoDatos {...props} />}
        {paso === 1 && <PasoLogros {...props} />}
        {paso === 2 && <PasoContenidos {...props} />}
        {paso === 3 && <PasoEvaluacion {...props} />}
        {paso === 4 && <PasoEnsenanza {...props} />}
        {paso === 5 && <PasoRevision {...props} irAPaso={irAPaso} />}
      </section>

      <footer className="no-imprimir flex flex-wrap items-center justify-between gap-2">
        <Boton variante="secundario" onClick={() => (paso === 0 ? navegar('/mis-planificaciones') : irAPaso(paso - 1))}>
          ← {paso === 0 ? 'Mis planificaciones' : 'Anterior'}
        </Boton>
        {!puedeAvanzar && <span className="text-sm text-amber-700">Elegí al menos una unidad curricular para seguir.</span>}
        {paso < PASOS.length - 1 && (
          <Boton disabled={!puedeAvanzar} onClick={() => irAPaso(paso + 1)}>
            Siguiente: {PASOS[paso + 1].titulo} →
          </Boton>
        )}
      </footer>
    </div>
  );
}
