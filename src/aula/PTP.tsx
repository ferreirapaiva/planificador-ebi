import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, nuevoId, type Alumno, type Grupo, type PTP, type PuntoPTP } from '../datos/db';
import { fechaCorta, useAsistencias, useRegistros } from '../datos/aula';
import { useGrupos } from '../datos/grupos';
import { hoyIso, sumarDias } from '../datos/planSemanal';
import { NecesitaClave } from '../datos/respaldo';
import {
  adaptacionesHoja, APOYOS, armarArchivoPTP, asistenciaMensual, criteriosPendientes, estadoPorCriterio, guardarAutor, importarPTP, leerArchivoPTP, leerAutor, META_POR_DEFECTO, nivelActual,
  NIVELES_PTP, nombreArchivoPTP, nombreNivel, objetivoNuevo, pendientesPTP, ptpNuevo, puntosDeRegistros, resumenObjetivos, serieDe, textoDeArchivoPTP, usePTPs,
} from '../datos/ptp';
import { Aviso, AreaTexto, Boton, Campo, Pildora } from '../componentes/ui';
import { useConfirmar } from '../componentes/Confirmar';
import { CLASE_FECHA, CLASE_SELECT } from './comun';
import { GraficoAsistencia, GraficoAvance, GraficoCriterio, LeyendaGrafico } from './GraficosPTP';
import { DOC_COMPLETO, DOC_FAMILIA, PTPDocumento, type OpcionesDocPTP } from './PTPDocumento';

const SECCIONES = [
  { id: 'resumen', nombre: 'Resumen' },
  { id: 'partida', nombre: 'Punto de partida' },
  { id: 'objetivos', nombre: 'Objetivos' },
  { id: 'apoyos', nombre: 'Apoyos' },
  { id: 'acciones', nombre: 'Acciones' },
  { id: 'familia', nombre: 'Familia y equipo' },
  { id: 'seguimiento', nombre: 'Seguimiento' },
  { id: 'compartir', nombre: 'Imprimir y compartir' },
] as const;
type Seccion = (typeof SECCIONES)[number]['id'];

const TARJETA = 'space-y-4 rounded-[24px] bg-white p-5 shadow-suave';
const METAS = [{ v: 1 / 3, t: 'En proceso' }, { v: 2 / 3, t: 'Logrado' }, { v: 1, t: 'Destacado' }];
const ESTADOS_OBJ = [{ v: 'en-curso', t: 'En curso' }, { v: 'logrado', t: 'Logrado' }, { v: 'ajustar', t: 'Hay que ajustarlo' }] as const;
const colorPartida = (n: number | null) => (n === null ? 'bg-slate-100 text-slate-600' : n < 1 / 3 ? 'bg-coral-50 text-coral-700' : n < 2 / 3 ? 'bg-amarillo-50 text-amarillo-800' : 'bg-menta-50 text-menta-700');

function descargar(texto: string, nombre: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ================= Lista de proyectos ================= */

export function ProyectoPersonalizado({ grupo, alumnos }: { grupo: Grupo | null; alumnos: Alumno[] }) {
  const [params, setParams] = useSearchParams();
  const { grupos } = useGrupos();
  const confirmar = useConfirmar();
  const todos = usePTPs();
  const registros = useRegistros(grupo?.id ?? '');
  const [msg, setMsg] = useState<{ texto: string; tono: 'exito' | 'alerta' } | null>(null);
  const [archivo, setArchivo] = useState<string | null>(null);
  const [clave, setClave] = useState('');
  const [verCerrados, setVerCerrados] = useState(false);
  const [alumnoNuevo, setAlumnoNuevo] = useState('');
  const abierto = params.get('ptp');
  const nuevoDe = params.get('nuevo');
  const abrir = (id: string | null) => setParams(id ? { ver: 'ptp', ptp: id } : { ver: 'ptp' }, { replace: true });

  const propios = useMemo(() => todos.filter((p) => (grupo && p.grupoKey === grupo.id) || p.grupoKey === 'externo'), [todos, grupo]);
  const lista = propios.filter((p) => (verCerrados ? p.estado === 'cerrado' : p.estado === 'activo')).sort((a, b) => b.modificada - a.modificada);
  const conActivo = new Set(propios.filter((p) => p.estado === 'activo').map((p) => p.alumnoId));

  const crear = async (alumno: Alumno) => {
    if (!grupo) return;
    // se leen los registros en el momento (la lista en pantalla puede no haber cargado todavía)
    const regs = await db.evaluaciones.where('grupoKey').equals(grupo.id).toArray();
    const p = ptpNuevo(grupo, alumno, criteriosPendientes(regs, alumno.id));
    await db.ptps.put(p);
    abrir(p.id);
  };
  // Desde «Evaluaciones»: ?nuevo=alumno crea (o abre) el proyecto de ese alumno.
  useEffect(() => {
    if (!nuevoDe || !grupo) return;
    const existente = propios.find((p) => p.alumnoId === nuevoDe && p.estado === 'activo');
    if (existente) abrir(existente.id);
    else {
      const al = alumnos.find((a) => a.id === nuevoDe);
      if (al) void crear(al);
      else abrir(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nuevoDe, grupo?.id]);

  const recibir = async (texto: string, claveUsada?: string) => {
    try {
      const p = await leerArchivoPTP(texto, claveUsada);
      const r = await importarPTP(p, grupos);
      setArchivo(null);
      setClave('');
      setMsg({ texto: r.accion === 'fusionado' ? `Se sumó lo nuevo al proyecto de ${r.ptp.alumnoNombre}.` : `Proyecto de ${r.ptp.alumnoNombre} agregado.`, tono: 'exito' });
      abrir(r.ptp.id);
    } catch (e) {
      if (e instanceof NecesitaClave) { setArchivo(texto); setMsg(null); }
      else setMsg({ texto: e instanceof Error ? e.message : 'No se pudo abrir el archivo.', tono: 'alerta' });
    }
  };

  if (abierto) {
    const p = todos.find((x) => x.id === abierto);
    if (p)
      return (
        <div className="space-y-5">
          {msg && <Aviso tono={msg.tono}>{msg.texto}</Aviso>}
          <Editor key={p.id} id={p.id} onVolver={() => { setMsg(null); abrir(null); }} />
        </div>
      );
  }

  const sugeridos = grupo ? alumnos.map((a) => ({ a, n: criteriosPendientes(registros, a.id).length })).filter((x) => x.n >= 2 && !conActivo.has(x.a.id)).sort((a, b) => b.n - a.n) : [];

  return (
    <div className="space-y-5">
      <Aviso tono="alerta">
        <b>Datos sensibles.</b> Un proyecto personalizado habla de un niño o una niña. Queda solo en este equipo; para compartirlo con la docente de apoyo se descarga un archivo (con contraseña si querés).
        Es tu registro de trabajo en el aula: no reemplaza el informe de un equipo técnico.
      </Aviso>

      <div className="flex flex-wrap items-center gap-3">
        <p className="m-0 mr-auto max-w-2xl text-slate-600">
          Para un alumno que necesita más apoyo: objetivos por criterio, apoyos y adaptaciones, acciones, y un seguimiento con gráficos que se completa con los registros de evaluación.
        </p>
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border-[1.5px] border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-900 hover:border-blue-300 hover:bg-blue-50">
          Abrir un proyecto recibido
          <input
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) await recibir(await f.text());
            }}
          />
        </label>
      </div>

      {msg && <Aviso tono={msg.tono}>{msg.texto}</Aviso>}
      {archivo && (
        <form className={TARJETA} onSubmit={(e) => { e.preventDefault(); void recibir(archivo, clave); }}>
          <p className="m-0 font-bold text-slate-900">Este archivo está protegido con contraseña.</p>
          <Campo etiqueta="Contraseña" tipo="password" valor={clave} onCambio={setClave} />
          <div className="flex gap-2"><Boton onClick={() => void recibir(archivo, clave)} disabled={!clave}>Abrir</Boton><Boton variante="secundario" onClick={() => { setArchivo(null); setClave(''); }}>Cancelar</Boton></div>
        </form>
      )}

      {grupo && alumnos.length > 0 && (
        <section className={TARJETA}>
          <h2 className="m-0 text-[19px] font-extrabold text-slate-900">Nuevo proyecto</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Alumno</span>
              <select value={alumnoNuevo} onChange={(e) => setAlumnoNuevo(e.target.value)} className={`mt-1 block ${CLASE_SELECT}`}>
                <option value="">Elegí un alumno…</option>
                {alumnos.map((a) => <option key={a.id} value={a.id}>{a.nombre}{conActivo.has(a.id) ? ' (ya tiene un proyecto)' : ''}</option>)}
              </select>
            </label>
            <Boton disabled={!alumnoNuevo} onClick={() => { const al = alumnos.find((a) => a.id === alumnoNuevo); if (al) void crear(al); }}>Crear el proyecto</Boton>
          </div>
          {sugeridos.length > 0 && (
            <div>
              <p className="m-0 text-sm font-bold text-slate-700">Según los registros de evaluación, estos alumnos tienen varios criterios sin lograr:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {sugeridos.map(({ a, n }) => <Boton key={a.id} variante="secundario" onClick={() => void crear(a)}>{a.nombre} · {n} criterios</Boton>)}
              </div>
            </div>
          )}
        </section>
      )}
      {!grupo && <Aviso>Elegí un grupo en la barra lateral para crear proyectos de sus alumnos. Los proyectos recibidos se pueden abrir sin grupo.</Aviso>}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Estado de los proyectos">
        <Pildora activa={!verCerrados} onClick={() => setVerCerrados(false)}>En marcha</Pildora>
        <Pildora activa={verCerrados} onClick={() => setVerCerrados(true)}>Cerrados</Pildora>
      </div>
      {lista.length === 0 ? (
        <Aviso>{verCerrados ? 'No hay proyectos cerrados.' : 'Todavía no hay proyectos en marcha. Creá uno arriba o abrí uno que te hayan enviado.'}</Aviso>
      ) : (
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
          {lista.map((p) => <TarjetaPTP key={p.id} p={p} onAbrir={() => abrir(p.id)} onEliminar={async () => { if (await confirmar({ titulo: `¿Eliminar el proyecto de ${p.alumnoNombre}?`, mensaje: 'Se borra con todo su seguimiento. Si lo compartiste, la otra copia queda como está.', aceptar: 'Eliminar', peligro: true })) await db.ptps.delete(p.id); }} />)}
        </ul>
      )}
    </div>
  );
}

function TarjetaPTP({ p, onAbrir, onEliminar }: { p: PTP; onAbrir: () => void; onEliminar: () => void }) {
  const registros = useRegistros(p.grupoKey);
  const auto = useMemo(() => (p.alumnoId ? puntosDeRegistros(registros, p.alumnoId) : []), [registros, p.alumnoId]);
  const filas = resumenObjetivos(p, auto), logrados = filas.filter((f) => f.alcanzado).length, prox = pendientesPTP(p)[0];
  return (
    <li className="flex flex-col rounded-[24px] bg-white p-5 shadow-suave">
      <p className="m-0 text-[11px] font-extrabold tracking-[0.08em] text-blue-600 uppercase">{p.grupoNombre}{p.grupoKey === 'externo' ? ' · recibido' : ''}</p>
      <h2 className="mt-1 text-[21px] font-extrabold text-slate-900">{p.alumnoNombre}</h2>
      <p className="mt-1 text-sm text-slate-600">{filas.length} {filas.length === 1 ? 'objetivo' : 'objetivos'} · {logrados} {logrados === 1 ? 'alcanzado' : 'alcanzados'}{p.apoyo ? ` · con ${p.apoyo}` : ''}</p>
      {filas.length > 0 && <div className="mt-2"><GraficoAvance ptp={p} auto={auto} /></div>}
      {prox && <p className="mt-2 text-xs font-semibold text-slate-700">Próximo: {prox.texto} · {fechaCorta(prox.fecha)}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Boton onClick={onAbrir}>Abrir</Boton>
        <Boton variante="peligro" onClick={onEliminar}>Eliminar</Boton>
      </div>
    </li>
  );
}

/* ================= Editor ================= */

function Editor({ id, onVolver }: { id: string; onVolver: () => void }) {
  const navegar = useNavigate();
  const guardada = useLiveQuery(() => db.ptps.get(id), [id]);
  const [p, setP] = useState<PTP | null>(null);
  const pRef = useRef<PTP | null>(null);
  const ultima = useRef(0);
  const temporizador = useRef(0);
  const sucio = useRef(false);
  const [seccion, setSeccion] = useState<Seccion>('resumen');
  const registros = useRegistros(guardada?.grupoKey ?? '');
  const asistencias = useAsistencias(guardada?.grupoKey ?? '');

  useEffect(() => {
    if (!guardada || guardada.modificada === ultima.current) return;
    pRef.current = guardada;
    setP(guardada);
  }, [guardada]);

  const guardarYa = async () => {
    window.clearTimeout(temporizador.current);
    if (!sucio.current || !pRef.current) return;
    sucio.current = false;
    const m = Date.now();
    ultima.current = m;
    await db.ptps.put({ ...pRef.current, modificada: m });
  };
  useEffect(() => () => { void guardarYa(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cambiar = (patch: Partial<PTP> | ((x: PTP) => Partial<PTP>)) => {
    const actual = pRef.current;
    if (!actual) return;
    const n = { ...actual, ...(typeof patch === 'function' ? patch(actual) : patch) };
    pRef.current = n;
    sucio.current = true;
    setP(n);
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => void guardarYa(), 600);
  };

  const auto = useMemo(() => (p?.alumnoId ? puntosDeRegistros(registros, p.alumnoId) : []), [registros, p?.alumnoId]);
  const estados = useMemo(() => (p?.alumnoId ? estadoPorCriterio(registros, p.alumnoId) : []), [registros, p?.alumnoId]);
  if (!p) return null;
  const meses = p.alumnoId ? asistenciaMensual(asistencias, p.alumnoId) : [];
  const asis = meses.length ? meses : p.asistenciaMensual ?? [];
  const filas = resumenObjetivos(p, auto);

  const armarHojas = (criterio?: string, objetivo?: string) => {
    const q = new URLSearchParams({ c: (criterio ?? p.objetivos[0]?.criterio ?? 'Apoyo').slice(0, 80), q: `${criterio ?? ''} ${objetivo ?? ''}`.trim().slice(0, 400), uc: '', alumno: p.alumnoNombre, nivel: 'facil', adapt: adaptacionesHoja(p.apoyos).join(',') });
    void guardarYa().then(() => navegar(`/actividades?${q}`));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <p className="m-0 text-[11px] font-extrabold tracking-[0.08em] text-blue-600 uppercase">Proyecto de trabajo personalizado · {p.grupoNombre}</p>
          <h2 className="m-0 text-[26px] font-extrabold tracking-tight text-slate-900">{p.alumnoNombre}</h2>
        </div>
        <label className="block">
          <span className="sr-only">Estado del proyecto</span>
          <select value={p.estado} onChange={(e) => cambiar({ estado: e.target.value as PTP['estado'] })} className={CLASE_SELECT} aria-label="Estado del proyecto">
            <option value="activo">En marcha</option>
            <option value="cerrado">Cerrado</option>
          </select>
        </label>
        <Boton variante="secundario" onClick={async () => { await guardarYa(); onVolver(); }}>← Todos los proyectos</Boton>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Secciones del proyecto">
        {SECCIONES.map((s) => <Pildora key={s.id} activa={s.id === seccion} onClick={() => setSeccion(s.id)}>{s.nombre}</Pildora>)}
      </div>

      {seccion === 'resumen' && (
        <div className="space-y-5">
          <section className={TARJETA}>
            <h3 className="m-0 text-[19px] font-extrabold text-slate-900">Cómo viene avanzando</h3>
            <p className="m-0 text-sm text-slate-600">{filas.length ? `${filas.filter((f) => f.alcanzado).length} de ${filas.length} ${filas.length === 1 ? 'objetivo alcanzado' : 'objetivos alcanzados'}.` : 'Todavía no hay objetivos: cargalos en «Objetivos».'} El círculo es el punto de partida, la barra es el nivel de hoy y la raya verde es la meta.</p>
            <GraficoAvance ptp={p} auto={auto} />
          </section>
          <section className={TARJETA}>
            <h3 className="m-0 text-[19px] font-extrabold text-slate-900">Asistencia</h3>
            <GraficoAsistencia meses={asis} />
          </section>
          <section className={TARJETA}>
            <h3 className="m-0 text-[19px] font-extrabold text-slate-900">Para revisar</h3>
            {pendientesPTP(p).length === 0 ? <p className="m-0 text-sm text-slate-500">No hay fechas pendientes.</p> : (
              <ul className="m-0 list-none space-y-1 p-0 text-sm text-slate-700">
                {pendientesPTP(p).map((x, i) => <li key={i}><b>{fechaCorta(x.fecha)}</b> · {x.texto}{x.fecha < hoyIso() && <span className="font-bold text-coral-700"> (vencido)</span>}</li>)}
              </ul>
            )}
          </section>
        </div>
      )}

      {seccion === 'partida' && (
        <div className="space-y-5">
          <section className={TARJETA}>
            <AreaTexto etiqueta="Situación de partida" valor={p.situacion} onCambio={(v) => cambiar({ situacion: v })} filas={4} ayuda="Qué logra hoy y qué le cuesta, en tus palabras." />
            <AreaTexto etiqueta="Lo que ya se probó" valor={p.estrategias} onCambio={(v) => cambiar({ estrategias: v })} filas={3} />
            <AreaTexto etiqueta="Contexto (opcional)" valor={p.contexto} onCambio={(v) => cambiar({ contexto: v })} filas={3} ayuda="Lectura, atención, asistencia, situación familiar… Solo si querés dejarlo anotado. No sale en el documento para la familia." />
          </section>
          <section className={TARJETA}>
            <h3 className="m-0 text-[19px] font-extrabold text-slate-900">Cómo viene hoy en cada criterio</h3>
            {estados.length === 0 ? <p className="m-0 text-sm text-slate-500">Cuando cargues resultados en «Evaluaciones», acá aparece cómo viene cada criterio.</p> : (
              <ul className="m-0 grid list-none gap-2 p-0">
                {estados.sort((a, b) => a.nivel - b.nivel).map((e) => {
                  const yaEs = p.objetivos.some((o) => o.criterio === e.criterio);
                  return (
                    <li key={e.clave} className="flex flex-wrap items-center gap-2 rounded-[14px] border-[1.5px] border-slate-200 px-3 py-2">
                      <span className="min-w-0 flex-1 basis-48 text-sm font-semibold text-slate-900">{e.criterio}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${colorPartida(e.nivel)}`}>{nombreNivel(e.nivel)}{e.logrado ? ' ✓' : ''}</span>
                      {!yaEs && !e.logrado && <Boton variante="secundario" onClick={() => cambiar((x) => ({ objetivos: [...x.objetivos, objetivoNuevo(e.criterio, e.nivel)] }))}>Agregar como objetivo</Boton>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {seccion === 'objetivos' && (
        <div className="space-y-5">
          {p.objetivos.length === 0 && <Aviso>Un objetivo sale de un criterio: qué se espera lograr con este alumno, hasta qué nivel y para cuándo.</Aviso>}
          {p.objetivos.map((o, i) => {
            const serie = serieDe(p, auto, o.criterio);
            const set = (patch: Partial<typeof o>) => cambiar((x) => ({ objetivos: x.objetivos.map((y) => (y.id === o.id ? { ...y, ...patch } : y)) }));
            return (
              <section key={o.id} className={TARJETA}>
                <div className="flex items-center gap-2">
                  <h3 className="m-0 mr-auto text-[17px] font-extrabold text-slate-900">Objetivo {i + 1}</h3>
                  <Boton variante="peligro" onClick={() => cambiar((x) => ({ objetivos: x.objetivos.filter((y) => y.id !== o.id) }))}>Quitar</Boton>
                </div>
                <Campo etiqueta="Criterio" valor={o.criterio} onCambio={(v) => set({ criterio: v })} placeholder="Ej.: Resuelve restas con canje" />
                <AreaTexto etiqueta="Qué se espera lograr" valor={o.texto} onCambio={(v) => set({ texto: v })} filas={2} placeholder="Ej.: Resuelve restas de dos cifras con canje usando material concreto" />
                <div className="flex flex-wrap items-end gap-3">
                  <label className="block">
                    <span className="text-sm font-bold text-slate-700">Meta</span>
                    <select value={String(METAS.find((m) => Math.abs(m.v - o.meta) < 1e-6)?.v ?? META_POR_DEFECTO)} onChange={(e) => set({ meta: Number(e.target.value) })} className={`mt-1 block ${CLASE_SELECT}`}>
                      {METAS.map((m) => <option key={m.t} value={String(m.v)}>{m.t}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-slate-700">Revisar el</span>
                    <input type="date" value={o.revision} onChange={(e) => set({ revision: e.target.value })} className={`mt-1 block ${CLASE_FECHA}`} />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-slate-700">Estado</span>
                    <select value={o.estado} onChange={(e) => set({ estado: e.target.value as typeof o.estado })} className={`mt-1 block ${CLASE_SELECT}`}>
                      {ESTADOS_OBJ.map((s) => <option key={s.v} value={s.v}>{s.t}</option>)}
                    </select>
                  </label>
                  <span className="pb-3 text-sm text-slate-600">{o.partida !== null && <>Partió de <b>{nombreNivel(o.partida)}</b>. </>}{nivelActual(serie) !== null && <>Hoy: <b>{nombreNivel(nivelActual(serie)!)}</b>.</>}</span>
                </div>
                <GraficoCriterio ptp={p} serie={serie} meta={o.meta} titulo={o.criterio} />
              </section>
            );
          })}
          <div className="flex flex-wrap gap-2">
            <Boton onClick={() => cambiar((x) => ({ objetivos: [...x.objetivos, objetivoNuevo()] }))}>+ Agregar un objetivo</Boton>
          </div>
          <LeyendaGrafico />
        </div>
      )}

      {seccion === 'apoyos' && (
        <section className={TARJETA}>
          <p className="m-0 text-slate-600">Marcá los apoyos y adaptaciones que se van a usar con {p.alumnoNombre}. Los del material se aplican solos al armar las hojas de apoyo.</p>
          {APOYOS.map((g) => (
            <fieldset key={g.grupo} className="m-0 border-0 p-0">
              <legend className="text-sm font-extrabold text-slate-800">{g.grupo}</legend>
              <div className="mt-1.5 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {g.items.map((a) => (
                  <label key={a.id} className="flex min-h-9 items-center gap-2 text-[15px] text-slate-800">
                    <input type="checkbox" checked={p.apoyos.includes(a.id)} onChange={(e) => cambiar((x) => ({ apoyos: e.target.checked ? [...x.apoyos, a.id] : x.apoyos.filter((i) => i !== a.id) }))} className="h-5 w-5 accent-blue-600" /> {a.texto}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <AreaTexto etiqueta="Otros apoyos" valor={p.apoyosOtros} onCambio={(v) => cambiar({ apoyosOtros: v })} filas={2} />
          <div className="flex flex-wrap items-center gap-3 rounded-[18px] bg-blue-100 p-4">
            <p className="m-0 min-w-0 flex-1 basis-64 text-sm text-blue-900"><b>Hojas de apoyo.</b> Abre el generador con el nombre de {p.alumnoNombre}, nivel fácil y la versión adaptada que marcaste, y te sugiere fichas del criterio.</p>
            {p.objetivos.length > 1 ? (
              <select aria-label="Criterio para las hojas de apoyo" defaultValue="" onChange={(e) => { const o = p.objetivos[Number(e.target.value)]; if (o) armarHojas(o.criterio, o.texto); }} className={CLASE_SELECT}>
                <option value="" disabled>Armar hojas de apoyo para…</option>
                {p.objetivos.map((o, i) => <option key={o.id} value={i}>{o.criterio || `Objetivo ${i + 1}`}</option>)}
              </select>
            ) : <Boton onClick={() => armarHojas(p.objetivos[0]?.criterio, p.objetivos[0]?.texto)}>Armar hojas de apoyo</Boton>}
          </div>
        </section>
      )}

      {seccion === 'acciones' && (
        <section className={TARJETA}>
          <p className="m-0 text-slate-600">Lo que se va a hacer, con fecha y quién lo hace.</p>
          {p.acciones.length === 0 && <p className="m-0 text-sm text-slate-500">Todavía no hay acciones.</p>}
          <ul className="m-0 grid list-none gap-3 p-0">
            {p.acciones.map((a) => {
              const set = (patch: Partial<typeof a>) => cambiar((x) => ({ acciones: x.acciones.map((y) => (y.id === a.id ? { ...y, ...patch } : y)) }));
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-[16px] border-[1.5px] border-slate-200 p-3">
                  <input type="checkbox" aria-label="Hecha" checked={a.hecha} onChange={(e) => set({ hecha: e.target.checked })} className="h-6 w-6 accent-blue-600" />
                  <input value={a.texto} onChange={(e) => set({ texto: e.target.value })} aria-label="Acción" className={`min-w-0 flex-1 basis-56 ${CLASE_FECHA}`} />
                  <input type="date" value={a.fecha} onChange={(e) => set({ fecha: e.target.value })} aria-label="Fecha" className={CLASE_FECHA} />
                  <input value={a.responsable} onChange={(e) => set({ responsable: e.target.value })} aria-label="Quién" placeholder="Quién" className={`w-36 ${CLASE_FECHA}`} />
                  <Boton variante="peligro" onClick={() => cambiar((x) => ({ acciones: x.acciones.filter((y) => y.id !== a.id) }))}>Quitar</Boton>
                </li>
              );
            })}
          </ul>
          <Boton onClick={() => cambiar((x) => ({ acciones: [...x.acciones, { id: nuevoId(), texto: '', fecha: sumarDias(hoyIso(), 7), hecha: false, responsable: '' }] }))}>+ Agregar una acción</Boton>
        </section>
      )}

      {seccion === 'familia' && (
        <section className={TARJETA}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Docente de apoyo" valor={p.apoyo} onCambio={(v) => cambiar({ apoyo: v })} placeholder="Nombre" ayuda="Sus anotaciones se distinguen con otro color en los gráficos." />
            <Campo etiqueta="Docente de aula" valor={p.docente} onCambio={(v) => cambiar({ docente: v })} />
          </div>
          <AreaTexto etiqueta="Equipo con el que se trabaja" valor={p.equipo} onCambio={(v) => cambiar({ equipo: v })} filas={2} ayuda="Dirección, equipo técnico, otros profesionales. Sin datos clínicos." />
          <AreaTexto etiqueta="Acordado con la familia" valor={p.familiaAcuerdos} onCambio={(v) => cambiar({ familiaAcuerdos: v })} filas={3} />
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Fecha de la reunión con la familia</span>
            <input type="date" value={p.familiaFecha} onChange={(e) => cambiar({ familiaFecha: e.target.value })} className={`mt-1 block ${CLASE_FECHA}`} />
          </label>
          <AreaTexto etiqueta="Cómo lo acompañamos (para el informe a las familias)" valor={p.familiaResumen} onCambio={(v) => cambiar({ familiaResumen: v })} filas={3} ayuda="Si lo completás, sale en una sección del informe de «Informe para familias». Si lo dejás vacío, se usan los objetivos." />
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Próxima revisión del proyecto</span>
            <input type="date" value={p.revisarEl} onChange={(e) => cambiar({ revisarEl: e.target.value })} className={`mt-1 block ${CLASE_FECHA}`} />
          </label>
        </section>
      )}

      {seccion === 'seguimiento' && <Seguimiento p={p} auto={auto} asis={asis} cambiar={cambiar} />}

      {seccion === 'compartir' && <Compartir p={p} auto={auto} asistencias={asistencias} registros={registros} />}
    </div>
  );
}

/* ---------- Seguimiento: puntos y revisiones ---------- */

function Seguimiento({ p, auto, asis, cambiar }: { p: PTP; auto: PuntoPTP[]; asis: { mes: string; pct: number; dias: number }[]; cambiar: (x: Partial<PTP> | ((x: PTP) => Partial<PTP>)) => void }) {
  const [criterio, setCriterio] = useState(p.objetivos[0]?.criterio ?? '');
  const [nivel, setNivel] = useState('0.6666666666666666');
  const [fecha, setFecha] = useState(hoyIso());
  const [nota, setNota] = useState('');
  const [autor, setAutor] = useState(leerAutor());
  const [rFecha, setRFecha] = useState(hoyIso());
  const [rNota, setRNota] = useState('');
  const manuales = [...p.puntos].filter((x) => x.origen === 'manual').sort((a, b) => b.fecha.localeCompare(a.fecha));
  const criterioValido = criterio || p.objetivos[0]?.criterio || '';

  return (
    <div className="space-y-5">
      <section className={TARJETA}>
        <h3 className="m-0 text-[19px] font-extrabold text-slate-900">Evolución de cada criterio</h3>
        <p className="m-0 text-sm text-slate-600">Los círculos salen de los registros de evaluación del grupo. Los rombos los anotás vos o la docente de apoyo.</p>
        {p.objetivos.length === 0 && <p className="m-0 text-sm text-slate-500">Cargá objetivos para ver su evolución.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {p.objetivos.map((o) => (
            <div key={o.id}>
              <p className="m-0 mb-1 text-sm font-bold text-slate-900">{o.criterio || 'Sin criterio'}</p>
              <GraficoCriterio ptp={p} serie={serieDe(p, auto, o.criterio)} meta={o.meta} titulo={o.criterio} />
            </div>
          ))}
        </div>
        <LeyendaGrafico />
      </section>

      <section className={TARJETA}>
        <h3 className="m-0 text-[19px] font-extrabold text-slate-900">Anotar cómo viene</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Criterio</span>
            <select value={criterioValido} onChange={(e) => setCriterio(e.target.value)} className={`mt-1 block w-full ${CLASE_SELECT}`}>
              {p.objetivos.map((o) => <option key={o.id} value={o.criterio}>{o.criterio || 'Sin criterio'}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Nivel observado</span>
            <select value={nivel} onChange={(e) => setNivel(e.target.value)} className={`mt-1 block w-full ${CLASE_SELECT}`}>
              {NIVELES_PTP.map((n, i) => <option key={n} value={String(i / 3)}>{n}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Fecha</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`mt-1 block ${CLASE_FECHA}`} />
          </label>
          <Campo etiqueta="Quién anota" valor={autor} onCambio={setAutor} ayuda="Se recuerda en este equipo. Si es la docente de apoyo, que coincida con el nombre de la pestaña «Familia y equipo»." />
        </div>
        <Campo etiqueta="Nota (opcional)" valor={nota} onCambio={setNota} placeholder="Qué pasó, qué ayudó" />
        <Boton
          disabled={!criterioValido}
          onClick={() => {
            guardarAutor(autor);
            cambiar((x) => ({ puntos: [...x.puntos, { id: nuevoId(), fecha, criterio: criterioValido, nivel: Number(nivel), nota: nota.trim(), autor: autor.trim(), origen: 'manual' }] }));
            setNota('');
          }}
        >
          Anotar
        </Boton>
        {manuales.length > 0 && (
          <ul className="m-0 grid list-none gap-1.5 p-0 text-sm">
            {manuales.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2 border-b border-slate-200 py-1.5">
                <span className="min-w-0 flex-1 basis-56"><b>{fechaCorta(m.fecha)}</b> · {m.criterio} · <b>{nombreNivel(m.nivel)}</b>{m.nota && ` · ${m.nota}`}{m.autor && <span className="text-slate-500"> ({m.autor})</span>}</span>
                <Boton variante="texto" onClick={() => cambiar((x) => ({ puntos: x.puntos.filter((y) => y.id !== m.id) }))}>Quitar</Boton>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={TARJETA}>
        <h3 className="m-0 text-[19px] font-extrabold text-slate-900">Asistencia</h3>
        <GraficoAsistencia meses={asis} />
      </section>

      <section className={TARJETA}>
        <h3 className="m-0 text-[19px] font-extrabold text-slate-900">Revisiones</h3>
        <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Fecha</span>
            <input type="date" value={rFecha} onChange={(e) => setRFecha(e.target.value)} className={`mt-1 block ${CLASE_FECHA}`} />
          </label>
          <AreaTexto etiqueta="Qué funcionó, qué ajustar, si el proyecto continúa" valor={rNota} onCambio={setRNota} filas={2} />
        </div>
        <Boton disabled={!rNota.trim()} onClick={() => { cambiar((x) => ({ revisiones: [...x.revisiones, { id: nuevoId(), fecha: rFecha, nota: rNota.trim(), autor: autor.trim() }] })); setRNota(''); }}>Agregar la revisión</Boton>
        <ul className="m-0 grid list-none gap-2 p-0 text-sm">
          {[...p.revisiones].sort((a, b) => b.fecha.localeCompare(a.fecha)).map((r) => (
            <li key={r.id} className="flex flex-wrap items-start gap-2 border-b border-slate-200 py-1.5">
              <span className="min-w-0 flex-1 basis-56 whitespace-pre-wrap"><b>{fechaCorta(r.fecha)}</b>{r.autor && <span className="text-slate-500"> · {r.autor}</span>}: {r.nota}</span>
              <Boton variante="texto" onClick={() => cambiar((x) => ({ revisiones: x.revisiones.filter((y) => y.id !== r.id) }))}>Quitar</Boton>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ---------- Imprimir y compartir ---------- */

const ETIQUETAS_DOC: [keyof OpcionesDocPTP, string][] = [
  ['situacion', 'Punto de partida'], ['estrategias', 'Lo que ya se probó'], ['contexto', 'Contexto'], ['objetivos', 'Objetivos'], ['graficos', 'Gráficos'], ['apoyos', 'Apoyos'], ['acciones', 'Acciones'], ['familia', 'Familia'], ['equipo', 'Equipo'], ['revisiones', 'Revisiones'],
];

function Compartir({ p, auto, asistencias, registros }: { p: PTP; auto: PuntoPTP[]; asistencias: ReturnType<typeof useAsistencias>; registros: ReturnType<typeof useRegistros> }) {
  const [o, setO] = useState<OpcionesDocPTP>(DOC_COMPLETO);
  const [clave, setClave] = useState('');
  const [msg, setMsg] = useState('');
  const imprimir = () => {
    document.body.classList.add('imprimir-informe');
    const fin = () => document.body.classList.remove('imprimir-informe');
    window.addEventListener('afterprint', fin, { once: true });
    window.setTimeout(() => window.print(), 150);
  };
  const doc = <PTPDocumento ptp={p} auto={auto} asistencias={asistencias} o={o} />;
  return (
    <div className="space-y-5">
      {createPortal(<div className="solo-impresion">{doc}</div>, document.body)}
      <section className={TARJETA}>
        <h3 className="m-0 text-[19px] font-extrabold text-slate-900">Documento para imprimir o guardar en PDF</h3>
        <div className="flex flex-wrap gap-2">
          <Pildora activa={JSON.stringify(o) === JSON.stringify(DOC_COMPLETO)} onClick={() => setO(DOC_COMPLETO)}>Completo (para el equipo)</Pildora>
          <Pildora activa={JSON.stringify(o) === JSON.stringify(DOC_FAMILIA)} onClick={() => setO(DOC_FAMILIA)}>Para la familia</Pildora>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {ETIQUETAS_DOC.map(([k, t]) => (
            <label key={k} className="flex min-h-9 items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={o[k]} onChange={(e) => setO({ ...o, [k]: e.target.checked })} className="h-5 w-5 accent-blue-600" /> {t}
            </label>
          ))}
        </div>
        <Boton onClick={imprimir}>Imprimir o guardar en PDF</Boton>
      </section>

      <section className={TARJETA}>
        <h3 className="m-0 text-[19px] font-extrabold text-slate-900">Compartir con la docente de apoyo</h3>
        <p className="m-0 text-sm text-slate-600">
          Se descarga un archivo con el proyecto, el nombre del alumno, los puntos del seguimiento y la asistencia. La docente de apoyo lo abre en su Planificador (Mi clase → Proyecto personalizado → «Abrir un proyecto recibido»),
          anota lo suyo y te devuelve el archivo: al abrirlo acá, se suma lo nuevo sin perder lo tuyo.
        </p>
        <Campo etiqueta="Contraseña (recomendada)" tipo="password" valor={clave} onCambio={setClave} ayuda="Protege el archivo si lo mandás por mail o por mensaje. Pasale la contraseña por otro medio." />
        <Boton
          onClick={async () => {
            const nombre = nombreArchivoPTP(p, !!clave);
            descargar(await textoDeArchivoPTP(armarArchivoPTP(p, registros, asistencias), clave || undefined), nombre);
            setMsg(`Archivo ${nombre} descargado${clave ? ' y protegido' : ' (sin contraseña)'}.`);
          }}
        >
          Descargar el archivo para compartir
        </Boton>
        {msg && <p className="m-0 text-sm font-semibold text-menta-700" role="status">{msg}</p>}
      </section>

      <div className="papel rounded-[24px] bg-white p-6 shadow-suave sm:p-8">{doc}</div>
    </div>
  );
}

