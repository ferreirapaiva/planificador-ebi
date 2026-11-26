import { useEffect, useRef } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { db, leerPerfil, planificacionVacia, TIPOS, type TipoPlanificacion } from '../datos/db';
import { datosGrupoActivo } from '../datos/grupos';
import { Icono, type NombreIcono } from '../componentes/Iconos';

type Opcion = { to: string; titulo: string; texto: string; icono: NombreIcono; fondo: string; tile: string; flecha: string; desc: string };

const DIDACTICAS: Opcion[] = (Object.keys(TIPOS) as TipoPlanificacion[]).map((t) => ({
  to: `/nueva/${t}`,
  titulo: TIPOS[t].nombre,
  texto: TIPOS[t].descripcion,
  icono: TIPOS[t].icono,
  fondo: 'bg-blue-100',
  tile: 'bg-blue-600 text-white',
  flecha: 'text-blue-600',
  desc: 'text-slate-600',
}));

const ORGANIZAR: Opcion[] = [
  {
    to: '/nuevo-plan-anual',
    titulo: 'Plan anual',
    texto: 'Repartí los contenidos del programa en los meses del año y mirá qué te falta planificar.',
    icono: 'calendario',
    fondo: 'bg-coral-50',
    tile: 'bg-coral-500 text-white',
    flecha: 'text-coral-700',
    desc: 'text-slate-600',
  },
  {
    to: '/nuevo-plan-semanal?alcance=semana',
    titulo: 'Plan semanal',
    texto: 'El horario de la semana con las clases de tus planificaciones. Se imprime en una hoja para pegar en el aula.',
    icono: 'reloj',
    fondo: 'bg-menta-50',
    tile: 'bg-menta-500 text-white',
    flecha: 'text-menta-700',
    desc: 'text-slate-600',
  },
  {
    to: '/nuevo-plan-semanal?alcance=dia',
    titulo: 'Plan diario',
    texto: 'El horario de un día con sus momentos, materiales y rutinas.',
    icono: 'reloj',
    fondo: 'bg-amarillo-50',
    tile: 'bg-amarillo-400 text-slate-900',
    flecha: 'text-slate-900',
    desc: 'text-slate-600',
  },
];

function Tarjeta({ o }: { o: Opcion }) {
  return (
    <Link to={o.to} className={`group flex flex-col gap-3.5 rounded-[28px] p-[22px] text-slate-900 transition hover:-translate-y-0.5 ${o.fondo}`}>
      <span className="flex items-center justify-between">
        <span className={`flex h-[52px] w-[52px] items-center justify-center rounded-[20px] ${o.tile}`}>
          <Icono nombre={o.icono} tamano={26} grosor={2.2} />
        </span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-full bg-white transition group-hover:translate-x-0.5 ${o.flecha}`}>
          <Icono nombre="flecha" tamano={18} grosor={2.4} />
        </span>
      </span>
      <span className="text-[19px] font-extrabold">{o.titulo}</span>
      <span className={`text-[14px] leading-snug font-semibold ${o.desc}`}>{o.texto}</span>
    </Link>
  );
}

/** «Nueva planificación»: elegir qué se quiere armar. Las planificaciones didácticas, el plan anual y los planes del día y de la semana están todos acá. */
export function NuevaPlanificacion() {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">Nueva planificación</h1>
        <p className="mt-1 max-w-2xl text-slate-600">¿Qué querés armar? Elegí una opción y te guiamos.</p>
      </div>
      <section aria-labelledby="didacticas" className="space-y-3">
        <h2 id="didacticas" className="text-[21px] font-extrabold text-slate-900">Planificar una propuesta de enseñanza</h2>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {DIDACTICAS.map((o) => (
            <Tarjeta key={o.to} o={o} />
          ))}
        </div>
      </section>
      <section aria-labelledby="organizar" className="space-y-3">
        <h2 id="organizar" className="text-[21px] font-extrabold text-slate-900">Organizar el año, la semana o el día</h2>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {ORGANIZAR.map((o) => (
            <Tarjeta key={o.to} o={o} />
          ))}
        </div>
      </section>
      <p className="text-sm text-slate-600">
        ¿Buscás algo que ya armaste? Está en{' '}
        <Link to="/mis-planificaciones" className="font-bold text-blue-700 underline">Mis planificaciones</Link>: las unidades, los proyectos, las secuencias, los planes anuales y los
        planes del día y de la semana.
      </p>
    </div>
  );
}

/** Crea una planificación del tipo elegido (con los datos recordados y los del grupo) y abre el asistente. */
export function CrearPlanificacion() {
  const { tipo } = useParams();
  const navegar = useNavigate();
  const creada = useRef(false);
  const valido = !!tipo && tipo in TIPOS;
  useEffect(() => {
    if (!valido || creada.current) return; // StrictMode ejecuta los efectos dos veces en desarrollo
    creada.current = true;
    datosGrupoActivo().then(async (g) => {
      const p = { ...planificacionVacia(), ...leerPerfil(), ...(g ?? {}), tipo: tipo as TipoPlanificacion };
      await db.planificaciones.add(p);
      navegar(`/planificacion/${p.id}`, { replace: true });
    });
  }, [valido, tipo, navegar]);
  if (!valido) return <Navigate to="/nueva" replace />;
  return <p className="text-slate-500">Creando planificación…</p>;
}
