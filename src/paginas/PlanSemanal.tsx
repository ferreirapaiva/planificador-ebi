import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, guardarPerfil, leerPerfil, type BloqueHorario, type DiaPlan, type PlanSemanal, type Planificacion } from '../datos/db';
import {
  bloqueDesdeClase,
  bloqueVacio,
  clasesConFecha,
  fechasDel,
  materialesParaPreparar,
  nombreDia,
  ordenarBloques,
  planSemanalVacio,
  rearmarDias,
  sumarDias,
  tituloPlan,
} from '../datos/planSemanal';
import { calendarioPorDefecto } from '../datos/calendario';
import { UC_TRAMO_3 } from '../datos/programas';
import { fecha as fechaCorta, ESTILOS_DOCUMENTO } from '../componentes/Documento';
import { AreaTexto, Aviso, Boton, Campo, Pildora } from '../componentes/ui';
import { BotonesExportar } from '../componentes/BotonesExportar';
import { useConfirmar } from '../componentes/Confirmar';
import { Icono } from '../componentes/Iconos';
import { DocumentoSemanal } from '../planSemanal/DocumentoSemanal';

const cuando = (ms: number) => new Date(ms).toLocaleDateString('es-UY', { day: 'numeric', month: 'short', year: 'numeric' });
const diaCorto = (iso: string) => nombreDia(iso).split(' ').slice(0, 2).join(' ').replace(',', '');

/** Rutinas que se agregan con un clic. */
const RUTINAS: { nombre: string; minutos: number }[] = [
  { nombre: 'Recreo', minutos: 15 },
  { nombre: 'Comedor', minutos: 30 },
  { nombre: 'Educación Física', minutos: 45 },
  { nombre: 'Inglés', minutos: 45 },
];

/** Crea un plan (de un día o de la semana) con los datos recordados del docente y lo abre. */
export function NuevoPlanSemanal() {
  const navegar = useNavigate();
  const [parametros] = useSearchParams();
  const creado = useRef(false);
  useEffect(() => {
    if (creado.current) return;
    creado.current = true;
    const p = planSemanalVacio(leerPerfil(), parametros.get('alcance') === 'dia' ? 'dia' : 'semana');
    db.planesSemanales.add(p).then(() => navegar(`/plan-semanal/${p.id}`, { replace: true }));
  }, [navegar, parametros]);
  return <p className="text-slate-500">Creando plan…</p>;
}

/** Tarjetas de los planes diarios y semanales guardados (se usa en su página y en Mis planificaciones). */
export function ListaPlanesSemanales({ limite }: { limite?: number }) {
  const planes = useLiveQuery(() => db.planesSemanales.orderBy('fecha').reverse().toArray(), []);
  const navegar = useNavigate();
  const confirmar = useConfirmar();
  if (!planes) return null;
  if (planes.length === 0)
    return <p className="text-sm text-slate-600">Todavía no armaste ningún plan del día o de la semana.</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {planes.slice(0, limite).map((p) => {
        const bloques = p.dias.reduce((n, d) => n + d.bloques.length, 0);
        return (
          <article key={p.id} className="flex flex-col rounded-[24px] bg-menta-50 p-5">
            <p className="m-0 flex items-center gap-2 text-[11px] font-extrabold tracking-[0.08em] text-menta-700 uppercase">
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white text-menta-700">
                <Icono nombre="reloj" tamano={18} />
              </span>
              {p.alcance === 'dia' ? 'Plan diario' : 'Plan semanal'}
              {p.grupo && ` · ${p.grupo}`}
            </p>
            <Link to={`/plan-semanal/${p.id}`} className="mt-2 text-lg leading-snug font-extrabold text-slate-900 hover:text-blue-700">
              {tituloPlan(p)}
            </Link>
            <p className="mt-1 text-sm text-slate-600">
              {bloques} {bloques === 1 ? 'momento' : 'momentos'} en el horario · {materialesParaPreparar(p).length} materiales
            </p>
            <p className="mt-auto pt-3 text-xs text-slate-400">Modificado: {cuando(p.modificada)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Boton onClick={() => navegar(`/plan-semanal/${p.id}`)}>Abrir</Boton>
              <Boton
                variante="secundario"
                onClick={async () => {
                  // Duplicar: el mismo horario para el día o la semana siguiente.
                  const ahora = Date.now();
                  const salto = p.alcance === 'dia' ? 1 : 7;
                  const copia: PlanSemanal = {
                    ...structuredClone(p),
                    id: crypto.randomUUID(),
                    fecha: sumarDias(p.fecha, salto),
                    dias: p.dias.map((d) => ({ fecha: sumarDias(d.fecha, salto), bloques: d.bloques.map((b) => ({ ...b, id: crypto.randomUUID() })) })),
                    creada: ahora,
                    modificada: ahora,
                  };
                  await db.planesSemanales.add(copia);
                  navegar(`/plan-semanal/${copia.id}`);
                }}
                title={p.alcance === 'dia' ? 'Copia este horario para el día siguiente' : 'Copia este horario para la semana siguiente'}
              >
                Reusar {p.alcance === 'dia' ? 'mañana' : 'la semana que viene'}
              </Boton>
              <Boton
                variante="peligro"
                onClick={async () => {
                  const ok = await confirmar({
                    titulo: `¿Eliminar el plan «${tituloPlan(p)}»?`,
                    mensaje: 'Se borra de este equipo y no se puede deshacer. Las clases de tus planificaciones no se borran.',
                    aceptar: 'Eliminar',
                    peligro: true,
                  });
                  if (ok) await db.planesSemanales.delete(p.id);
                }}
              >
                Eliminar
              </Boton>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function PlanesSemanales() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">Plan diario y semanal</h1>
          <p className="mt-1 max-w-2xl text-slate-600">
            Armá el horario del día o de la semana con las clases de tus secuencias, unidades y proyectos. Cada momento lleva su horario y sus
            materiales, y la app junta todo lo que tenés que preparar.
          </p>
        </div>
        <Link to="/nuevo-plan-semanal?alcance=dia" className="inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-900 hover:border-blue-300 hover:bg-blue-50">
          <Icono nombre="nueva" tamano={18} grosor={2.4} />
          Plan del día
        </Link>
        <Link to="/nuevo-plan-semanal?alcance=semana" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgb(91_75_245/0.28)] hover:bg-blue-700">
          <Icono nombre="nueva" tamano={18} grosor={2.4} />
          Plan de la semana
        </Link>
      </div>
      <ListaPlanesSemanales />
    </div>
  );
}

function EditorBloque({ bloque, onCambio, onBorrar }: { bloque: BloqueHorario; onCambio: (b: BloqueHorario) => void; onBorrar: () => void }) {
  const set = (k: keyof BloqueHorario) => (v: string) => onCambio({ ...bloque, [k]: v });
  return (
    <div className="rounded-[20px] border-[1.5px] border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-end gap-2">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Desde</span>
            <input type="time" value={bloque.inicio} onChange={(e) => set('inicio')(e.target.value)} className="mt-1 block min-h-11 rounded-[14px] border-[1.5px] border-slate-200 px-3 text-[15px] focus:border-blue-500 focus:outline-none" />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Hasta</span>
            <input type="time" value={bloque.fin} onChange={(e) => set('fin')(e.target.value)} className="mt-1 block min-h-11 rounded-[14px] border-[1.5px] border-slate-200 px-3 text-[15px] focus:border-blue-500 focus:outline-none" />
          </label>
        </div>
        <label className="block min-w-40 flex-1">
          <span className="text-sm font-bold text-slate-700">Área</span>
          <input
            list="areas-ebi"
            value={bloque.area}
            onChange={(e) => set('area')(e.target.value)}
            placeholder="Ej.: Matemática"
            className="mt-1 block min-h-11 w-full rounded-[14px] border-[1.5px] border-slate-200 px-3.5 text-[15px] focus:border-blue-500 focus:outline-none"
          />
        </label>
        <div className="min-w-48 flex-[2]">
          <Campo etiqueta="Actividad" valor={bloque.actividad} onCambio={set('actividad')} placeholder="Ej.: ¿Cuánto mide el patio?" />
        </div>
        <button type="button" onClick={onBorrar} aria-label="Quitar este momento del horario" title="Quitar" className="mb-1 flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600">
          ✕
        </button>
      </div>
      {bloque.origen && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-blue-700">
          <Icono nombre="libro" tamano={14} />
          De la planificación{' '}
          <Link to={`/planificacion/${bloque.origen.planificacionId}`} className="underline hover:text-blue-900">
            {bloque.origen.titulo}
          </Link>
        </p>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr]">
        <AreaTexto etiqueta="Qué se hace" valor={bloque.detalle} onCambio={set('detalle')} filas={3} placeholder="Consigna, momentos, agrupamiento…" />
        <AreaTexto etiqueta="Materiales" valor={bloque.materiales} onCambio={set('materiales')} filas={3} placeholder="Uno por línea o separados por coma" />
      </div>
      {(bloque.actividad.trim() || bloque.detalle.trim()) && (
        <div className="mt-3">
          <Link
            to={`/actividades?${new URLSearchParams({ q: `${bloque.actividad} ${bloque.detalle}`.trim().slice(0, 400), c: bloque.actividad.trim().slice(0, 80), uc: bloque.area })}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-900 hover:border-blue-300 hover:bg-blue-50"
          >
            <Icono nombre="hoja" tamano={18} grosor={2.2} />
            Hoja de actividades para este momento
          </Link>
        </div>
      )}
    </div>
  );
}

/** Lista de clases de las planificaciones para traer al día elegido. */
function ElegirClase({ dia, planificaciones, enUso, onElegir, onCerrar }: { dia: DiaPlan; planificaciones: Planificacion[]; enUso: Set<string>; onElegir: (p: Planificacion, c: Planificacion['clases'][number]) => void; onCerrar: () => void }) {
  const conClases = planificaciones.filter((p) => p.clases.length > 0);
  return (
    <div className="rounded-[20px] border-2 border-blue-600 bg-blue-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="font-extrabold text-slate-900">Traer una clase para el {diaCorto(dia.fecha).toLowerCase()}</h4>
        <Boton variante="texto" onClick={onCerrar}>Cerrar</Boton>
      </div>
      {conClases.length === 0 ? (
        <p className="text-sm text-slate-700">
          Tus planificaciones todavía no tienen clases. Agregalas en el paso «Enseñanza» del asistente.{' '}
          <Link to="/mis-planificaciones" className="font-bold text-blue-700 underline">Ir a mis planificaciones</Link>
        </p>
      ) : (
        <div className="max-h-[26rem] space-y-4 overflow-y-auto pr-1">
          {conClases.map((p) => (
            <div key={p.id}>
              <p className="mb-1.5 text-xs font-extrabold tracking-[0.06em] text-blue-800 uppercase">{p.titulo || 'Sin título'}</p>
              <div className="flex flex-col gap-1.5">
                {p.clases.map((c, i) => {
                  const usada = enUso.has(c.id);
                  const deHoy = c.fecha === dia.fecha;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onElegir(p, c)}
                      className="flex flex-wrap items-center gap-2 rounded-[14px] bg-white px-3.5 py-2.5 text-left text-[15px] ring-1 ring-slate-200 hover:ring-2 hover:ring-blue-400"
                    >
                      <span className="font-bold text-slate-900">
                        {i + 1}. {c.titulo || `Clase ${i + 1}`}
                      </span>
                      {c.duracion && <span className="text-sm text-slate-500">{c.duracion}</span>}
                      {c.fecha && <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${deHoy ? 'bg-menta-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{deHoy ? 'Es de este día' : fechaCorta(c.fecha)}</span>}
                      {usada && <span className="rounded-full bg-amarillo-50 px-2 py-0.5 text-xs font-bold text-amarillo-800">Ya está en el horario</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EditorPlanSemanal() {
  const { id } = useParams();
  const [plan, setPlan] = useState<PlanSemanal | null | undefined>(undefined);
  const [estado, setEstado] = useState<'guardado' | 'guardando'>('guardado');
  const [vista, setVista] = useState<'armar' | 'documento'>('armar');
  const [diaSel, setDiaSel] = useState(0);
  const [eligiendo, setEligiendo] = useState(false);
  const temporizador = useRef<number | undefined>(undefined);
  const documento = useRef<HTMLDivElement>(null);
  const editado = useRef(false);
  const planificaciones = useLiveQuery(() => db.planificaciones.orderBy('modificada').reverse().toArray(), []) ?? [];
  const anio = Number((plan?.fecha ?? '').slice(0, 4)) || new Date().getFullYear();
  const planAnual = useLiveQuery(() => db.planesAnuales.where('anio').equals(anio).last(), [anio]);

  useEffect(() => {
    editado.current = false;
    setDiaSel(0);
    db.planesSemanales.get(id!).then((p) => setPlan(p ?? null));
  }, [id]);

  useEffect(() => {
    if (!plan || !editado.current) return;
    setEstado('guardando');
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(async () => {
      await db.planesSemanales.put(plan);
      guardarPerfil(plan);
      setEstado('guardado');
    }, 500);
    return () => window.clearTimeout(temporizador.current);
  }, [plan]);

  /** Vacaciones y efemérides de cada día, del plan anual de ese año (o del calendario sugerido). */
  const avisos = useMemo(() => {
    const r: Record<string, string[]> = {};
    if (!plan) return r;
    const cal = planAnual?.calendario ?? calendarioPorDefecto(anio);
    for (const d of plan.dias) {
      r[d.fecha] = [
        ...cal.sinClases.filter((p) => p.desde && p.desde <= d.fecha && d.fecha <= (p.hasta || p.desde)).map((p) => `Sin clases: ${p.nombre}`),
        ...cal.efemerides.filter((e) => e.fecha === d.fecha).map((e) => e.nombre),
      ];
    }
    return r;
  }, [plan, planAnual, anio]);

  if (plan === undefined) return <p className="text-slate-500">Cargando…</p>;
  if (plan === null)
    return (
      <p>
        No encontramos ese plan. <Link className="text-blue-700 underline" to="/plan-semanal">Ver mis planes del día y de la semana</Link>
      </p>
    );

  const cambiar = (parcial: Partial<PlanSemanal>) => {
    editado.current = true;
    setPlan((p) => (p ? { ...p, ...parcial, modificada: Date.now() } : p));
  };
  const cambiarFecha = (alcance: PlanSemanal['alcance'], fecha: string) => {
    if (!fecha) return;
    const dias = rearmarDias(plan, alcance, fecha);
    cambiar({ alcance, fecha: alcance === 'semana' ? fechasDel('semana', fecha)[0] : fecha, dias });
    setDiaSel((i) => Math.min(i, dias.length - 1));
  };
  const cambiarDia = (i: number, bloques: BloqueHorario[]) => cambiar({ dias: plan.dias.map((d, j) => (j === i ? { ...d, bloques } : d)) });

  const dia = plan.dias[Math.min(diaSel, plan.dias.length - 1)];
  const iDia = plan.dias.indexOf(dia);
  const enUso = new Set(plan.dias.flatMap((d) => d.bloques.map((b) => b.origen?.claseId).filter((x): x is string => !!x)));
  const pendientes = clasesConFecha(plan, planificaciones);
  const ubicarPendientes = () => {
    const dias = plan.dias.map((d) => {
      let actual = d;
      for (const { plan: p, clase } of pendientes.filter((x) => x.clase.fecha === d.fecha)) {
        actual = { ...actual, bloques: [...actual.bloques, bloqueDesdeClase(actual, p, clase)] };
      }
      return actual;
    });
    cambiar({ dias });
  };
  const materiales = materialesParaPreparar(plan);

  return (
    <div className="space-y-6">
      <datalist id="areas-ebi">
        {UC_TRAMO_3.map((u) => (
          <option key={u.id} value={u.nombre} />
        ))}
      </datalist>

      <header className="no-imprimir flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="m-0 text-[11px] font-extrabold tracking-[0.08em] text-menta-700 uppercase">
            {plan.alcance === 'dia' ? 'Plan diario' : 'Plan semanal'}
            {plan.grupo && ` · ${plan.grupo}`}
          </p>
          <h1 className="m-0 text-[30px] font-extrabold tracking-tight text-slate-900">{tituloPlan(plan)}</h1>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-extrabold ${estado === 'guardado' ? 'bg-menta-50 text-menta-700' : 'bg-slate-100 text-slate-500'}`} aria-live="polite">
          {estado === 'guardado' && <Icono nombre="check" tamano={16} grosor={2.6} />}
          {estado === 'guardado' ? 'Guardado en este equipo' : 'Guardando…'}
        </span>
      </header>

      <div className="no-imprimir flex gap-2" role="group" aria-label="Vista">
        <Pildora activa={vista === 'armar'} onClick={() => setVista('armar')}>Armar el horario</Pildora>
        <Pildora activa={vista === 'documento'} onClick={() => setVista('documento')}>Ver documento y descargar</Pildora>
      </div>

      {vista === 'documento' ? (
        <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
          <style>{ESTILOS_DOCUMENTO}</style>
          <aside className="no-imprimir h-fit space-y-3 lg:sticky lg:top-4">
            <BotonesExportar documento={documento} titulo={`${plan.alcance === 'dia' ? 'plan-diario' : 'plan-semanal'}-${plan.fecha}-${plan.grupo}`} />
            <AreaTexto etiqueta="Observaciones" valor={plan.notas} onCambio={(v) => cambiar({ notas: v })} filas={4} />
          </aside>
          <div className="rounded-[20px] border-[1.5px] border-slate-200 bg-white p-6 shadow-sm sm:p-10 print:border-0 print:p-0 print:shadow-none">
            <DocumentoSemanal ref={documento} plan={plan} avisos={avisos} />
          </div>
        </div>
      ) : (
        <>
          {/* Datos */}
          <section className="rounded-[28px] bg-white p-5 shadow-suave sm:p-7">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <span className="text-sm font-bold text-slate-700">¿Qué querés armar?</span>
                <div className="mt-1 flex gap-2">
                  <Pildora activa={plan.alcance === 'dia'} onClick={() => cambiarFecha('dia', plan.alcance === 'dia' ? plan.fecha : dia.fecha)}>Un día</Pildora>
                  <Pildora activa={plan.alcance === 'semana'} onClick={() => cambiarFecha('semana', plan.fecha)}>Una semana</Pildora>
                </div>
              </div>
              <div className="flex items-end gap-1.5">
                <button
                  type="button"
                  aria-label={plan.alcance === 'dia' ? 'Día anterior' : 'Semana anterior'}
                  onClick={() => cambiarFecha(plan.alcance, sumarDias(plan.fecha, plan.alcance === 'dia' ? -1 : -7))}
                  className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <Icono nombre="atras" tamano={18} />
                </button>
                <Campo etiqueta={plan.alcance === 'dia' ? 'Día' : 'Cualquier día de la semana'} tipo="date" valor={plan.fecha} onCambio={(v) => cambiarFecha(plan.alcance, v)} />
                <button
                  type="button"
                  aria-label={plan.alcance === 'dia' ? 'Día siguiente' : 'Semana siguiente'}
                  onClick={() => cambiarFecha(plan.alcance, sumarDias(plan.fecha, plan.alcance === 'dia' ? 1 : 7))}
                  className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <Icono nombre="flecha" tamano={18} />
                </button>
              </div>
              <div className="min-w-32 flex-1">
                <Campo etiqueta="Grupo" valor={plan.grupo} onCambio={(v) => cambiar({ grupo: v })} placeholder="Ej.: 3.º A" />
              </div>
              <div className="min-w-40 flex-1">
                <Campo etiqueta="Docente" valor={plan.docente} onCambio={(v) => cambiar({ docente: v })} />
              </div>
              <div className="min-w-40 flex-1">
                <Campo etiqueta="Escuela" valor={plan.escuela} onCambio={(v) => cambiar({ escuela: v })} />
              </div>
            </div>
          </section>

          {pendientes.length > 0 && (
            <Aviso tono="exito">
              <span className="flex flex-wrap items-center gap-3">
                <span className="flex-1">
                  {pendientes.length === 1 ? 'Hay 1 clase' : `Hay ${pendientes.length} clases`} de tus planificaciones con fecha en {plan.alcance === 'dia' ? 'este día' : 'esta semana'}:{' '}
                  <strong>{pendientes.map((x) => x.clase.titulo).join(', ')}</strong>.
                </span>
                <Boton onClick={ubicarPendientes}>Ubicarlas en el horario</Boton>
              </span>
            </Aviso>
          )}

          {/* Días */}
          <section className="rounded-[28px] bg-white p-5 shadow-suave sm:p-7">
            {plan.alcance === 'semana' && (
              <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Días de la semana">
                {plan.dias.map((d, i) => (
                  <button
                    key={d.fecha}
                    type="button"
                    role="tab"
                    aria-selected={i === iDia}
                    onClick={() => {
                      setDiaSel(i);
                      setEligiendo(false);
                    }}
                    className={`flex min-w-[6.5rem] shrink-0 flex-col items-start rounded-[16px] px-3.5 py-2.5 text-left transition ${
                      i === iDia ? 'bg-blue-600 text-white shadow-suave' : 'bg-slate-50 text-slate-700 hover:bg-blue-50'
                    }`}
                  >
                    <span className="text-sm font-extrabold">{diaCorto(d.fecha)}</span>
                    <span className={`text-xs font-semibold ${i === iDia ? 'text-white/85' : 'text-slate-500'}`}>
                      {avisos[d.fecha]?.some((a) => a.startsWith('Sin clases')) ? 'Sin clases' : `${d.bloques.length} ${d.bloques.length === 1 ? 'momento' : 'momentos'}`}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2 className="mr-auto text-[21px] font-extrabold text-slate-900">{nombreDia(dia.fecha)}</h2>
              {avisos[dia.fecha]?.map((a) => (
                <span key={a} className={`rounded-full px-3 py-1 text-xs font-bold ${a.startsWith('Sin clases') ? 'bg-amarillo-50 text-amarillo-800' : 'bg-coral-50 text-coral-700'}`}>
                  {a}
                </span>
              ))}
            </div>

            <div className="space-y-3">
              {dia.bloques.length === 0 && !eligiendo && (
                <Aviso>Empezá trayendo una clase de una de tus planificaciones, o agregá una nueva actividad. El horario se ordena solo por hora.</Aviso>
              )}
              {ordenarBloques(dia.bloques).map((b) => (
                <EditorBloque
                  key={b.id}
                  bloque={b}
                  onCambio={(nuevo) => cambiarDia(iDia, dia.bloques.map((x) => (x.id === b.id ? nuevo : x)))}
                  onBorrar={() => cambiarDia(iDia, dia.bloques.filter((x) => x.id !== b.id))}
                />
              ))}
              {eligiendo && (
                <ElegirClase
                  dia={dia}
                  planificaciones={planificaciones}
                  enUso={enUso}
                  onCerrar={() => setEligiendo(false)}
                  onElegir={(p, c) => {
                    cambiarDia(iDia, [...dia.bloques, bloqueDesdeClase(dia, p, c)]);
                    setEligiendo(false);
                  }}
                />
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Boton onClick={() => setEligiendo(true)}>
                <Icono nombre="libro" tamano={18} />
                Traer una clase
              </Boton>
              <Boton variante="secundario" onClick={() => cambiarDia(iDia, [...dia.bloques, bloqueVacio(dia)])}>
                <Icono nombre="nueva" tamano={18} grosor={2.4} />
                Nueva actividad
              </Boton>
              <span className="ml-1 text-sm font-semibold text-slate-500">Rutinas:</span>
              {RUTINAS.map((r) => (
                <Pildora key={r.nombre} activa={false} onClick={() => cambiarDia(iDia, [...dia.bloques, bloqueVacio(dia, r.nombre, r.minutos)])}>
                  + {r.nombre}
                </Pildora>
              ))}
            </div>

            {plan.alcance === 'semana' && iDia > 0 && dia.bloques.length === 0 && plan.dias[iDia - 1].bloques.length > 0 && (
              <p className="mt-3 text-sm text-slate-600">
                ¿Mismo horario que el día anterior?{' '}
                <Boton
                  variante="texto"
                  onClick={() => cambiarDia(iDia, plan.dias[iDia - 1].bloques.filter((b) => !b.origen).map((b) => ({ ...b, id: crypto.randomUUID() })))}
                >
                  Copiar las rutinas y actividades
                </Boton>
              </p>
            )}
          </section>

          {/* Materiales */}
          <section className="grid gap-5 rounded-[28px] bg-white p-5 shadow-suave sm:p-7 lg:grid-cols-2">
            <div>
              <h2 className="text-[21px] font-extrabold text-slate-900">Materiales para preparar</h2>
              <p className="mt-1 text-sm text-slate-600">Se juntan solos a partir de los materiales de cada momento.</p>
              {materiales.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Todavía no hay materiales cargados.</p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {materiales.map((m) => (
                    <li key={m.texto} className="flex items-baseline gap-2 text-[15px]">
                      <span className="text-menta-700"><Icono nombre="check" tamano={16} grosor={2.6} /></span>
                      <span className="font-semibold text-slate-900">{m.texto}</span>
                      {plan.alcance === 'semana' && <span className="text-xs text-slate-500">{m.dias.join(', ')}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="space-y-3">
              <AreaTexto etiqueta="Otros materiales o tareas para preparar" valor={plan.materiales} onCambio={(v) => cambiar({ materiales: v })} filas={3} placeholder="Ej.: fotocopiar la ficha, pedir la sala de informática…" />
              <AreaTexto etiqueta="Observaciones" valor={plan.notas} onCambio={(v) => cambiar({ notas: v })} filas={3} />
            </div>
          </section>

          <footer className="flex flex-wrap justify-between gap-2">
            <Link to="/plan-semanal" className="inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-900 hover:bg-blue-50">
              <Icono nombre="atras" tamano={18} grosor={2.4} />
              Mis planes del día y la semana
            </Link>
            <Boton onClick={() => { setVista('documento'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              Ver documento y descargar
              <Icono nombre="flecha" tamano={18} grosor={2.4} />
            </Boton>
          </footer>
        </>
      )}
    </div>
  );
}
