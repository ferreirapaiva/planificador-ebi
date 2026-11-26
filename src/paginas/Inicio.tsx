import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { borrarBorradoresVacios, db, leerPerfil, NOMBRE_MES, TIPOS, type Planificacion } from '../datos/db';
import { buscarUC } from '../datos/consultas';
import { calendarioPorDefecto } from '../datos/calendario';
import { cobertura, porcentaje } from '../datos/planAnual';
import { perteneceAlGrupo, useGrupos } from '../datos/grupos';
import { PROGRAMAS } from '../datos/programas';
import { claveGrupo, progresoUC, useSeguimiento } from '../datos/seguimiento';
import { Icono, type NombreIcono } from '../componentes/Iconos';

/** Colores de cada espacio curricular para tarjetas y barras. */
const COLOR_ESPACIO: Record<string, { suave: string; texto: string; barra: string }> = {
  'Científico-Matemático': { suave: 'bg-sky-100', texto: 'text-sky-700', barra: 'bg-sky-500' },
  'Ciencias Sociales y Humanidades': { suave: 'bg-amber-100', texto: 'text-amber-800', barra: 'bg-amber-500' },
  'Creativo-Artístico': { suave: 'bg-fuchsia-100', texto: 'text-fuchsia-700', barra: 'bg-fuchsia-500' },
  Comunicación: { suave: 'bg-emerald-100', texto: 'text-emerald-700', barra: 'bg-emerald-500' },
};
const colorDe = (p: Planificacion) => COLOR_ESPACIO[buscarUC(p.ucIds[0])?.espacio ?? ''] ?? { suave: 'bg-blue-100', texto: 'text-blue-800', barra: 'bg-blue-600' };

const ACCESOS: { to: string; titulo: string; texto: string; icono: NombreIcono; fondo: string; tile: string; flecha: string; desc: string }[] = [
  { to: '/nueva', titulo: 'Nueva planificación', texto: 'Unidad, proyecto o secuencia, paso a paso.', icono: 'nueva', fondo: 'bg-blue-100', tile: 'bg-blue-600 text-white', flecha: 'text-blue-600', desc: 'text-slate-600' },
  { to: '/plan-anual', titulo: 'Plan anual', texto: 'Repartí los contenidos en el año escolar.', icono: 'calendario', fondo: 'bg-coral-50', tile: 'bg-coral-500 text-white', flecha: 'text-coral-700', desc: 'text-slate-600' },
  { to: '/mis-planificaciones', titulo: 'Mis planificaciones', texto: 'Retomá, duplicá o descargá en Word y PDF.', icono: 'carpeta', fondo: 'bg-menta-50', tile: 'bg-menta-500 text-white', flecha: 'text-menta-700', desc: 'text-slate-600' },
  { to: '/programas', titulo: 'Explorar programas', texto: 'Contenidos y criterios de 3.º y 4.º.', icono: 'libro', fondo: 'bg-amarillo-50', tile: 'bg-amarillo-400 text-slate-900', flecha: 'text-slate-900', desc: 'text-amarillo-800' },
];

const TARJETA = 'rounded-[28px] bg-white shadow-suave';

export function Inicio() {
  useEffect(() => {
    borrarBorradoresVacios();
  }, []);
  const { activo } = useGrupos();
  const todas = useLiveQuery(() => db.planificaciones.orderBy('modificada').reverse().toArray(), []);
  const planificaciones = useMemo(() => (todas ?? []).filter((p) => perteneceAlGrupo(p, activo)), [todas, activo]);
  const planAnual = useLiveQuery(() => db.planesAnuales.orderBy('modificada').reverse().filter((p) => perteneceAlGrupo(p, activo)).first(), [activo?.id, activo?.nombre]);
  const perfil = leerPerfil();
  const nombre = perfil.docente.trim().split(/\s+/)[0];
  const hoy = new Date();
  const fechaHoy = hoy.toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' });

  const cob = planAnual ? cobertura(planAnual, planificaciones) : [];
  const contenidos = cob.flatMap((c) => c.contenidos.filter((x) => !x.transversal));
  const ubicados = contenidos.filter((x) => x.meses.length).length;
  const criteriosTrabajados = new Set(planificaciones.flatMap((p) => p.criterios)).size;

  const gradoAvance = activo?.grados[0] ?? planAnual?.grados[0] ?? 3;
  const estadosAvance = useSeguimiento(claveGrupo(activo));
  const avances = PROGRAMAS.map((uc) => progresoUC(uc, gradoAvance, estadosAvance, planificaciones, activo)).filter((x): x is NonNullable<typeof x> => !!x);
  const totalProg = avances.reduce((n, a) => n + a.total, 0);
  const dadosProg = avances.reduce((n, a) => n + a.dados, 0);

  const isoHoy = hoy.toISOString().slice(0, 10);
  const calendario = planAnual?.calendario ?? calendarioPorDefecto(hoy.getMonth() >= 10 ? hoy.getFullYear() + 1 : hoy.getFullYear());
  const proximas = [
    ...calendario.efemerides.map((e) => ({ fecha: e.fecha, nombre: e.nombre })),
    ...calendario.sinClases.filter((p) => p.desde).map((p) => ({ fecha: p.desde, nombre: p.nombre })),
    ...(calendario.fin ? [{ fecha: calendario.fin, nombre: 'Fin de clases' }] : []),
  ]
    .filter((e) => e.fecha >= isoHoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 3);
  const estilosFecha = ['bg-coral-50 text-coral-700', 'bg-blue-100 text-blue-800', 'bg-menta-50 text-menta-700'];

  const resumen =
    planificaciones.length === 0
      ? 'Empezá tu primera planificación: el asistente te guía desde los criterios de logro del programa.'
      : `Tenés ${planificaciones.length} planificaci${planificaciones.length === 1 ? 'ón' : 'ones'}${
          planAnual && contenidos.length ? ` y te faltan ${contenidos.length - ubicados} contenidos por ubicar en el plan anual` : ''
        }.`;

  return (
    <div className="flex flex-col gap-7">
      {/* Bienvenida */}
      <section
        aria-label="Bienvenida"
        className="relative flex flex-wrap items-center gap-6 overflow-hidden rounded-[28px] bg-[linear-gradient(110deg,#5B4BF5_0%,#8A55FF_55%,#FF7A59_100%)] px-6 py-8 shadow-elevada sm:px-11 sm:py-10"
      >
        <div className="flex min-w-0 flex-[999_1_380px] flex-col gap-3.5">
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-extrabold tracking-[0.08em] text-white uppercase">
            <Icono nombre="calendario" tamano={14} />
            {fechaHoy} · Tramo 3
          </span>
          <h1 className="m-0 text-3xl leading-tight font-black tracking-tight text-white sm:text-[44px]">
            ¡Hola{nombre ? `, ${nombre}` : ''}! ¿Qué planificamos hoy?
          </h1>
          <p className="m-0 max-w-xl text-base leading-relaxed text-white">{resumen}</p>
          <div className="flex flex-wrap gap-3 pt-2.5">
            <Link to="/nueva" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-[22px] text-[15px] font-extrabold text-blue-800 hover:bg-blue-50">
              <Icono nombre="nueva" tamano={18} grosor={2.4} />
              Crear planificación
            </Link>
            <Link
              to="/plan-anual"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-white/60 bg-white/20 px-[22px] text-[15px] font-extrabold text-white hover:bg-white/30"
            >
              Ver mi plan anual
              <Icono nombre="flecha" tamano={18} grosor={2.4} />
            </Link>
          </div>
        </div>
        <div aria-hidden="true" className="relative hidden h-60 max-w-[380px] min-w-[280px] flex-[1_1_300px] md:block">
          <div className="absolute -top-5 right-2.5 h-[150px] w-[150px] rounded-full bg-amarillo-400" />
          <div className="absolute -bottom-[70px] -left-2.5 h-[200px] w-[200px] rounded-full border-[18px] border-white/25" />
          <div className="absolute top-2.5 left-10 h-4 w-4 rounded-full bg-coral-500" />
          <div className="absolute top-10 left-[70px] flex w-[230px] -rotate-6 flex-col gap-3 rounded-[20px] bg-white p-[18px] shadow-elevada">
            <span className="text-[11px] font-extrabold tracking-[0.08em] text-blue-600 uppercase">Criterios de logro</span>
            {[150, 120].map((w) => (
              <span key={w} className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-menta-500 text-white">
                  <Icono nombre="check" tamano={14} grosor={3} />
                </span>
                <span className="h-2.5 rounded bg-blue-100" style={{ width: w }} />
              </span>
            ))}
            <span className="flex items-center gap-2.5">
              <span className="h-5 w-5 rounded-md border-2 border-slate-200" />
              <span className="h-2.5 w-[140px] rounded bg-slate-200" />
            </span>
          </div>
          <span className="absolute right-2.5 bottom-5 text-white">
            <Icono nombre="estrella" tamano={40} />
          </span>
        </div>
      </section>

      {/* Accesos rápidos */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {ACCESOS.map((a) => (
          <Link key={a.to} to={a.to} className={`group flex flex-col gap-3.5 rounded-[28px] p-[22px] text-slate-900 transition hover:-translate-y-0.5 ${a.fondo}`}>
            <span className="flex items-center justify-between">
              <span className={`flex h-[52px] w-[52px] items-center justify-center rounded-[20px] ${a.tile}`}>
                <Icono nombre={a.icono} tamano={26} grosor={2.2} />
              </span>
              <span className={`flex h-9 w-9 items-center justify-center rounded-full bg-white transition group-hover:translate-x-0.5 ${a.flecha}`}>
                <Icono nombre="flecha" tamano={18} grosor={2.4} />
              </span>
            </span>
            <span className="text-[17px] font-extrabold">{a.titulo}</span>
            <span className={`text-[13px] leading-snug font-semibold ${a.desc}`}>{a.texto}</span>
          </Link>
        ))}
      </div>

      {/* Seguimiento */}
      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="recientes" className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="recientes" className="m-0 text-[21px] font-extrabold">Seguí donde quedaste</h2>
            {planificaciones.length > 0 && (
              <Link to="/mis-planificaciones" className="text-[15px] font-extrabold text-blue-700 hover:text-blue-900">
                Ver todas →
              </Link>
            )}
          </div>
          {planificaciones.length === 0 ? (
            <div className={`${TARJETA} flex flex-col items-start gap-3 p-6`}>
              <p className="m-0 text-[17px] font-extrabold">Todavía no hay planificaciones</p>
              <p className="m-0 text-sm text-slate-600">Cuando crees una, la vas a encontrar acá para seguir donde la dejaste.</p>
              <Link to="/nueva" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-extrabold text-white hover:bg-blue-700">
                <Icono nombre="nueva" tamano={18} grosor={2.4} />
                Crear la primera
              </Link>
            </div>
          ) : (
            <div className="grid gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
              {planificaciones.slice(0, 3).map((p) => {
                const c = colorDe(p);
                const paso = Math.min(p.paso + 1, 6);
                const pct = Math.round((paso / 6) * 100);
                return (
                  <Link key={p.id} to={`/planificacion/${p.id}`} className={`${TARJETA} flex flex-col gap-3.5 p-5 transition hover:-translate-y-0.5`}>
                    <span className="flex items-center gap-3">
                      <span className={`flex h-[46px] w-[46px] items-center justify-center rounded-[14px] ${c.suave} ${c.texto}`}>
                        <Icono nombre="libro" tamano={22} />
                      </span>
                      <span className={`text-[11px] font-extrabold tracking-[0.08em] uppercase ${c.texto}`}>
                        {TIPOS[p.tipo].nombre} · {p.grados.map((g) => `${g}.º`).join(' y ')}
                      </span>
                    </span>
                    <span className="text-[17px] leading-snug font-bold">{p.titulo || 'Sin título'}</span>
                    <span className="text-[13px] font-semibold text-slate-500">{p.ucIds.map((id) => buscarUC(id)?.nombre).join(' · ') || 'Sin unidades curriculares'}</span>
                    <span className="mt-auto flex flex-col gap-1.5">
                      <span className="flex justify-between text-[13px]">
                        <span className="font-bold text-slate-500">Paso {paso} de 6</span>
                        <span className={`font-extrabold ${c.texto}`}>{pct}%</span>
                      </span>
                      <span className="h-2 rounded-full bg-slate-100">
                        <span className={`block h-2 rounded-full ${c.barra}`} style={{ width: `${pct}%` }} />
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <aside aria-labelledby="numeros" className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <h2 id="numeros" className="m-0 text-[21px] font-extrabold">Tu año en números</h2>
          {[
            planAnual
              ? { icono: 'objetivo' as const, tile: 'bg-blue-100 text-blue-600', valor: `${porcentaje(ubicados, contenidos.length)}%`, texto: `del plan anual ${planAnual.anio} ubicado en el calendario` }
              : { icono: 'objetivo' as const, tile: 'bg-blue-100 text-blue-600', valor: '—', texto: 'todavía sin plan anual' },
            { icono: 'check' as const, tile: 'bg-menta-50 text-menta-700', valor: String(criteriosTrabajados), texto: 'criterios de logro trabajados' },
            { icono: 'grafico' as const, tile: 'bg-coral-50 text-coral-700', valor: String(planificaciones.length), texto: 'planificaciones guardadas' },
            { icono: 'grafico' as const, tile: 'bg-menta-50 text-menta-700', valor: `${porcentaje(dadosProg, totalProg)}%`, texto: `del programa de ${gradoAvance}.º trabajado${activo ? ` con ${activo.nombre}` : ''} · ver el avance`, to: '/seguimiento' },
          ].map((s) => {
            const cuerpo = (
              <>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${s.tile}`}>
                  <Icono nombre={s.icono} tamano={22} grosor={2.2} />
                </span>
                <span className="flex flex-col">
                  <span className="text-[30px] leading-tight font-extrabold">{s.valor}</span>
                  <span className="text-[13px] font-semibold text-slate-500">{s.texto}</span>
                </span>
              </>
            );
            const clase = 'flex items-center gap-3.5 rounded-[20px] bg-white px-[18px] py-4 shadow-suave';
            return 'to' in s && s.to ? (
              <Link key={s.texto} to={s.to} className={`${clase} transition hover:-translate-y-0.5`}>
                {cuerpo}
              </Link>
            ) : (
              <div key={s.texto} className={clase}>
                {cuerpo}
              </div>
            );
          })}
          {proximas.length > 0 && (
            <div className={`${TARJETA} flex flex-col gap-3.5 p-5`}>
              <h3 className="m-0 text-[17px] font-bold">Próximas fechas</h3>
              {proximas.map((e, i) => {
                const [, mes, dia] = e.fecha.split('-');
                return (
                  <div key={e.fecha + e.nombre} className="flex items-center gap-3.5">
                    <span className={`flex h-[52px] w-[52px] shrink-0 flex-col items-center justify-center rounded-[14px] ${estilosFecha[i % 3]}`}>
                      <span className="text-lg leading-none font-black">{Number(dia)}</span>
                      <span className="text-[10px] font-extrabold tracking-[0.08em] uppercase">{NOMBRE_MES[Number(mes)].slice(0, 3)}</span>
                    </span>
                    <span className="text-[15px] font-bold">{e.nombre}</span>
                  </div>
                );
              })}
              {!planAnual && <p className="m-0 text-xs text-slate-500">Fechas sugeridas. Ajustalas en tu plan anual.</p>}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
