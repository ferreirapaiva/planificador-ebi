import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, leerPerfil, nuevoId, planificacionVacia, TIPOS, type Planificacion } from '../datos/db';
import { buscarUC } from '../datos/consultas';
import { normalizar } from '../datos/programas';
import { Boton } from '../componentes/ui';
import { useConfirmar } from '../componentes/Confirmar';

const cuando = (ms: number) =>
  new Date(ms).toLocaleDateString('es-UY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Crea una planificación vacía (con los datos del docente recordados) y abre el asistente. */
export function NuevaPlanificacion() {
  const navegar = useNavigate();
  const creada = useRef(false);
  useEffect(() => {
    if (creada.current) return; // StrictMode ejecuta los efectos dos veces en desarrollo
    creada.current = true;
    const p = { ...planificacionVacia(), ...leerPerfil() };
    db.planificaciones.add(p).then(() => navegar(`/planificacion/${p.id}`, { replace: true }));
  }, [navegar]);
  return <p className="text-slate-500">Creando planificación…</p>;
}

function Tarjeta({ p }: { p: Planificacion }) {
  const navegar = useNavigate();
  const confirmar = useConfirmar();
  const duplicar = async () => {
    const ahora = Date.now();
    const copia: Planificacion = { ...structuredClone(p), id: nuevoId(), titulo: `${p.titulo || 'Sin título'} (copia)`, creada: ahora, modificada: ahora, paso: 0 };
    await db.planificaciones.add(copia);
    navegar(`/planificacion/${copia.id}`);
  };
  const borrar = async () => {
    const ok = await confirmar({
      titulo: `¿Eliminar «${p.titulo || 'Sin título'}»?`,
      mensaje: 'Se borra de este equipo y no se puede deshacer.',
      aceptar: 'Eliminar',
      peligro: true,
    });
    if (ok) await db.planificaciones.delete(p.id);
  };
  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {TIPOS[p.tipo].icono} {TIPOS[p.tipo].nombre} · {p.grados.map((g) => `${g}.º`).join(' y ')}
      </p>
      <Link to={`/planificacion/${p.id}`} className="mt-1 text-lg font-semibold text-slate-900 hover:text-blue-700">
        {p.titulo || 'Sin título'}
      </Link>
      <p className="mt-1 text-sm text-slate-600">{p.ucIds.map((id) => buscarUC(id)?.nombre).join(', ') || 'Sin unidades curriculares'}</p>
      <p className="mt-1 text-xs text-slate-500">
        {p.criterios.length} criterios · {p.contenidos.length} contenidos · {p.clases.length} clases
      </p>
      <p className="mt-auto pt-3 text-xs text-slate-400">Modificada: {cuando(p.modificada)}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Boton onClick={() => navegar(`/planificacion/${p.id}`)}>Abrir</Boton>
        <Boton variante="secundario" onClick={duplicar}>Duplicar</Boton>
        <Boton variante="peligro" onClick={borrar}>Eliminar</Boton>
      </div>
    </article>
  );
}

function PlanesAnuales() {
  const planes = useLiveQuery(() => db.planesAnuales.orderBy('modificada').reverse().toArray(), []);
  const navegar = useNavigate();
  const confirmar = useConfirmar();
  if (!planes) return null;
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-lg font-semibold text-slate-900">Planes anuales</h2>
        <Link to="/nuevo-plan-anual" className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50">
          + Nuevo plan anual
        </Link>
      </div>
      {planes.length === 0 ? (
        <p className="text-sm text-slate-600">Todavía no tenés un plan anual. Te ayuda a repartir los contenidos en el año y a ver qué te falta planificar.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {planes.map((p) => {
            const ubicados = Object.values(p.distribucion).filter((m) => m.length).length;
            return (
              <article key={p.id} className="flex flex-col rounded-xl border border-blue-200 bg-blue-50/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">📅 Plan anual · {p.grados.map((g) => `${g}.º`).join(' y ')}</p>
                <Link to={`/plan-anual/${p.id}`} className="mt-1 text-lg font-semibold text-slate-900 hover:text-blue-700">
                  {p.anio}
                  {p.grupo && ` · ${p.grupo}`}
                </Link>
                <p className="text-sm text-slate-600">{p.ucIds.length} unidades curriculares · {ubicados} contenidos ubicados</p>
                <p className="mt-auto pt-3 text-xs text-slate-400">Modificado: {cuando(p.modificada)}</p>
                <div className="mt-2 flex gap-2">
                  <Boton onClick={() => navegar(`/plan-anual/${p.id}`)}>Abrir</Boton>
                  <Boton
                    variante="peligro"
                    onClick={async () => {
                      const ok = await confirmar({
                        titulo: `¿Eliminar el plan anual ${p.anio}${p.grupo ? ` de ${p.grupo}` : ''}?`,
                        mensaje: 'Se borra de este equipo y no se puede deshacer. Tus unidades, proyectos y secuencias no se borran.',
                        aceptar: 'Eliminar',
                        peligro: true,
                      });
                      if (ok) await db.planesAnuales.delete(p.id);
                    }}
                  >
                    Eliminar
                  </Boton>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function MisPlanificaciones() {
  const lista = useLiveQuery(() => db.planificaciones.orderBy('modificada').reverse().toArray(), []);
  const [texto, setTexto] = useState('');
  if (!lista) return <p className="text-slate-500">Cargando…</p>;
  const q = normalizar(texto.trim());
  const visibles = lista.filter((p) => !q || normalizar(`${p.titulo} ${p.ucIds.map((id) => buscarUC(id)?.nombre).join(' ')}`).includes(q));
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Mis planificaciones</h1>
      <PlanesAnuales />
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
        <h2 className="mr-auto text-lg font-semibold text-slate-900">Unidades, proyectos y secuencias</h2>
        {lista.length > 0 && (
          <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar…" aria-label="Buscar planificación" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        )}
        <Link to="/nueva" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Nueva planificación
        </Link>
      </div>
      {lista.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-slate-900">Todavía no tenés planificaciones</p>
          <p className="mt-1 text-slate-600">Creá la primera: el asistente te guía paso a paso desde los criterios de logro del programa.</p>
          <Link to="/nueva" className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
            Empezar
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((p) => (
            <Tarjeta key={p.id} p={p} />
          ))}
        </div>
      )}
      <p className="text-xs text-slate-500">Las planificaciones se guardan en este navegador y en este equipo.</p>
    </div>
  );
}
