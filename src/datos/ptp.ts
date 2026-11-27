import { useLiveQuery } from 'dexie-react-hooks';
import { db, leerPerfil, nuevoId, type Alumno, type Asistencia, type Grupo, type ObjetivoPTP, type PTP, type PuntoPTP, type RegistroEvaluacion } from './db';
import { normalizar } from './programas';
import { hoyIso, sumarDias } from './planSemanal';
import { cifrarTexto, descifrarTexto, NecesitaClave, type TextoCifrado } from './respaldo';

/* ---------- Niveles y criterios ---------- */

export const NIVELES_PTP = ['En inicio', 'En proceso', 'Logrado', 'Destacado'];
export const META_POR_DEFECTO = 2 / 3;
/** El nivel de los registros (de 0 a su último nivel) pasa a una escala común de 0 a 1. */
export const nivelNorm = (r: RegistroEvaluacion, v: number) => (r.niveles.length > 1 ? v / (r.niveles.length - 1) : v);
export const nombreNivel = (n: number) => NIVELES_PTP[Math.max(0, Math.min(3, Math.round(n * 3)))];
export const claveCriterio = (t: string) => normalizar(t.trim()).replace(/\s+/g, ' ');

export type EstadoCriterio = { criterio: string; clave: string; nivel: number; logrado: boolean; fecha: string; registro: string };

/** Todos los puntos del alumno que salen de los registros de evaluación. */
export function puntosDeRegistros(registros: RegistroEvaluacion[], alumnoId: string): PuntoPTP[] {
  const out: PuntoPTP[] = [];
  for (const r of registros) {
    const res = r.resultados[alumnoId];
    if (!res) continue;
    r.criterios.forEach((criterio, i) => {
      if (res[i] === undefined) return;
      out.push({ id: `reg|${r.id}|${i}`, fecha: r.fecha, criterio, nivel: nivelNorm(r, res[i]), nota: r.titulo, autor: 'Registro de evaluación', origen: 'registro' });
    });
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Cómo viene el alumno en cada criterio, según el registro más reciente que lo evaluó. */
export function estadoPorCriterio(registros: RegistroEvaluacion[], alumnoId: string): EstadoCriterio[] {
  const mapa = new Map<string, EstadoCriterio>();
  for (const r of [...registros].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const res = r.resultados[alumnoId];
    if (!res) continue;
    r.criterios.forEach((criterio, i) => {
      if (res[i] === undefined) return;
      mapa.set(claveCriterio(criterio), { criterio, clave: claveCriterio(criterio), nivel: nivelNorm(r, res[i]), logrado: res[i] >= r.logro, fecha: r.fecha, registro: r.titulo });
    });
  }
  return [...mapa.values()];
}
export const criteriosPendientes = (registros: RegistroEvaluacion[], alumnoId: string) => estadoPorCriterio(registros, alumnoId).filter((e) => !e.logrado).sort((a, b) => a.nivel - b.nivel);

/** Los puntos de un criterio: los de los registros del grupo y los anotados a mano (o recibidos), en orden de fecha. */
export function serieDe(p: PTP, auto: PuntoPTP[], criterio: string): PuntoPTP[] {
  const k = claveCriterio(criterio);
  const delRegistro = auto.filter((x) => claveCriterio(x.criterio) === k);
  const propios = p.puntos.filter((x) => claveCriterio(x.criterio) === k && !(x.origen === 'registro' && delRegistro.length));
  return [...delRegistro, ...propios].sort((a, b) => a.fecha.localeCompare(b.fecha));
}
export const nivelActual = (serie: PuntoPTP[]) => (serie.length ? serie[serie.length - 1].nivel : null);

/* ---------- Apoyos y adaptaciones ---------- */

export const APOYOS: { grupo: string; items: { id: string; texto: string }[] }[] = [
  { grupo: 'Del material', items: [
    { id: 'letra-grande', texto: 'Letra grande' }, { id: 'letras-separadas', texto: 'Letras más separadas (ayuda en la dislexia)' },
    { id: 'blanco-negro', texto: 'Blanco y negro, sin colores' }, { id: 'mas-espacio', texto: 'Más espacio para escribir' }, { id: 'consignas-cortas', texto: 'Consignas más cortas y claras' } ] },
  { grupo: 'De la tarea', items: [
    { id: 'menos-ejercicios', texto: 'Menos ejercicios por hoja' }, { id: 'mas-tiempo', texto: 'Más tiempo para terminar' }, { id: 'una-consigna', texto: 'Una consigna por vez' },
    { id: 'material-concreto', texto: 'Material concreto (regletas, tarjetas, fichas)' }, { id: 'ejemplos', texto: 'Ejemplos resueltos como guía' } ] },
  { grupo: 'De la evaluación', items: [
    { id: 'eval-oral', texto: 'Evaluación oral o con apoyo de lectura' }, { id: 'eval-dos', texto: 'Evaluación en dos momentos' }, { id: 'eval-tiempo', texto: 'Más tiempo en la evaluación' } ] },
  { grupo: 'Del aula', items: [
    { id: 'lugar', texto: 'Lugar cerca de la maestra' }, { id: 'companero', texto: 'Compañero o compañera de apoyo' }, { id: 'pausas', texto: 'Pausas cortas' }, { id: 'agenda', texto: 'Agenda visual de la jornada' } ] },
];
export const textoApoyo = (id: string) => APOYOS.flatMap((g) => g.items).find((i) => i.id === id)?.texto ?? id;
/** Los apoyos del material que el generador de hojas sabe aplicar. */
export const adaptacionesHoja = (apoyos: string[]) => [apoyos.includes('letra-grande') && 'letra', apoyos.includes('letras-separadas') && 'disl', apoyos.includes('blanco-negro') && 'bn'].filter(Boolean) as string[];

/* ---------- Crear y consultar ---------- */

const AUTOR = 'planificador-ebi:autor-ptp';
export const leerAutor = () => {
  try { return localStorage.getItem(AUTOR) || leerPerfil().docente || ''; } catch { return ''; }
};
export const guardarAutor = (a: string) => {
  try { localStorage.setItem(AUTOR, a); } catch { /* sin almacenamiento */ }
};

export function objetivoNuevo(criterio = '', partida: number | null = null): ObjetivoPTP {
  return { id: nuevoId(), criterio, texto: '', meta: META_POR_DEFECTO, partida, revision: sumarDias(hoyIso(), 35), estado: 'en-curso' };
}

export function ptpNuevo(grupo: Grupo, alumno: Alumno, pendientes: EstadoCriterio[] = []): PTP {
  const ahora = Date.now();
  return {
    id: nuevoId(), grupoKey: grupo.id, alumnoId: alumno.id, alumnoNombre: alumno.nombre, grupoNombre: grupo.nombre, estado: 'activo', inicio: hoyIso(), revisarEl: sumarDias(hoyIso(), 35),
    docente: grupo.docente || leerPerfil().docente, apoyo: '', situacion: '', estrategias: '', contexto: '',
    objetivos: pendientes.slice(0, 3).map((e) => objetivoNuevo(e.criterio, e.nivel)), apoyos: [], apoyosOtros: '', acciones: [], familiaAcuerdos: '', familiaFecha: '', equipo: '', familiaResumen: '',
    puntos: [], revisiones: [], creada: ahora, modificada: ahora,
  };
}

export const usePTPs = (grupoKey?: string) =>
  useLiveQuery(() => (grupoKey ? db.ptps.where('grupoKey').equals(grupoKey).toArray() : db.ptps.toArray()), [grupoKey]) ?? [];

/** Asistencia del alumno mes a mes. */
export function asistenciaMensual(asistencias: Asistencia[], alumnoId: string) {
  const meses = new Map<string, { p: number; d: number }>();
  for (const a of asistencias) {
    const e = a.estados[alumnoId];
    if (!e) continue;
    const m = a.fecha.slice(0, 7), x = meses.get(m) ?? { p: 0, d: 0 };
    x.d++;
    if (e === 'P') x.p++;
    meses.set(m, x);
  }
  return [...meses.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([mes, x]) => ({ mes, dias: x.d, pct: Math.round((x.p / x.d) * 100) }));
}

export const resumenObjetivos = (p: PTP, auto: PuntoPTP[]) =>
  p.objetivos.map((o) => {
    const serie = serieDe(p, auto, o.criterio), actual = nivelActual(serie);
    return { o, serie, actual, alcanzado: actual !== null && actual >= o.meta - 1e-9 };
  });

/** Fechas que hay que mirar: revisión del proyecto, de cada objetivo y acciones sin hacer. */
export function pendientesPTP(p: PTP) {
  if (p.estado !== 'activo') return [];
  const l: { fecha: string; texto: string }[] = [];
  if (p.revisarEl) l.push({ fecha: p.revisarEl, texto: 'Revisar el proyecto' });
  p.objetivos.filter((o) => o.estado === 'en-curso' && o.revision).forEach((o) => l.push({ fecha: o.revision, texto: `Revisar el objetivo «${o.criterio.slice(0, 60)}»` }));
  p.acciones.filter((a) => !a.hecha && a.fecha).forEach((a) => l.push({ fecha: a.fecha, texto: a.texto }));
  return l.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/* ---------- Compartir con la docente de apoyo ---------- */

type Archivo = { app: 'planificador-ebi'; tipo: 'ptp'; version: 1; fecha: string; ptp: PTP };

/** El archivo lleva todo lo necesario para verlo sin el grupo: nombre del alumno, puntos de los registros y asistencia. */
export function armarArchivoPTP(p: PTP, registros: RegistroEvaluacion[], asistencias: Asistencia[]): Archivo {
  const auto = puntosDeRegistros(registros, p.alumnoId);
  const horneados = [...p.puntos.filter((x) => x.origen !== 'registro'), ...auto];
  const meses = asistenciaMensual(asistencias, p.alumnoId);
  return { app: 'planificador-ebi', tipo: 'ptp', version: 1, fecha: new Date().toISOString(), ptp: { ...p, puntos: horneados, asistenciaMensual: meses.length ? meses : p.asistenciaMensual } };
}
export const nombreArchivoPTP = (p: PTP, protegido: boolean) => `ptp-${normalizar(p.alumnoNombre).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'alumno'}-${hoyIso()}${protegido ? '-protegido' : ''}.json`;

export async function textoDeArchivoPTP(a: Archivo, clave?: string) {
  const t = JSON.stringify(a);
  return clave ? JSON.stringify(await cifrarTexto(t, clave)) : t;
}

export async function leerArchivoPTP(texto: string, clave?: string): Promise<PTP> {
  let crudo: unknown;
  try { crudo = JSON.parse(texto); } catch { throw new Error('El archivo no es un proyecto personalizado válido.'); }
  const c = crudo as Partial<TextoCifrado> & Partial<Archivo>;
  let a = c as Partial<Archivo>;
  if (c?.app === 'planificador-ebi' && c.cifrado) {
    if (!clave) throw new NecesitaClave();
    try { a = JSON.parse(await descifrarTexto(c as TextoCifrado, clave)); } catch (e) { throw e instanceof SyntaxError ? new Error('El archivo está dañado.') : e; }
  }
  if (a?.app !== 'planificador-ebi' || a.tipo !== 'ptp' || !a.ptp?.id || !Array.isArray(a.ptp.objetivos)) throw new Error('El archivo no es un proyecto de trabajo personalizado del Planificador EBI.');
  const base = ptpNuevo({ id: '', nombre: '', grados: [], escuela: '', docente: '', creada: 0, modificada: 0 }, { id: '', nombre: '' });
  return { ...base, ...a.ptp, objetivos: a.ptp.objetivos ?? [], acciones: a.ptp.acciones ?? [], puntos: a.ptp.puntos ?? [], revisiones: a.ptp.revisiones ?? [], apoyos: a.ptp.apoyos ?? [] };
}

const unirPorId = <T extends { id: string }>(local: T[], recibido: T[], recibidoGana: boolean) => {
  const m = new Map(local.map((x) => [x.id, x] as const));
  for (const x of recibido) if (!m.has(x.id) || recibidoGana) m.set(x.id, x);
  return [...m.values()];
};

/** Junta lo que anotó la otra docente con lo propio: los renglones nuevos se suman; en lo que cambió en los dos lados gana lo más reciente. */
export function fusionarPTP(local: PTP, recibido: PTP): PTP {
  const gana = recibido.modificada > local.modificada, base = gana ? recibido : local;
  return {
    ...base, id: local.id, grupoKey: local.grupoKey, alumnoId: local.alumnoId,
    objetivos: unirPorId(local.objetivos, recibido.objetivos, gana), acciones: unirPorId(local.acciones, recibido.acciones, gana),
    puntos: unirPorId(local.puntos, recibido.puntos, gana), revisiones: unirPorId(local.revisiones, recibido.revisiones, gana),
    apoyos: [...new Set([...local.apoyos, ...recibido.apoyos])], asistenciaMensual: recibido.asistenciaMensual ?? local.asistenciaMensual,
    modificada: Math.max(local.modificada, recibido.modificada),
  };
}

/** Guarda un proyecto recibido: si ya está, lo fusiona; si no, lo agrega (al grupo y alumno de esta copia, si coinciden por nombre). */
export async function importarPTP(r: PTP, grupos: Grupo[]) {
  const actual = await db.ptps.get(r.id);
  if (actual) {
    const f = fusionarPTP(actual, r);
    await db.ptps.put(f);
    return { accion: 'fusionado' as const, ptp: f };
  }
  const g = grupos.find((x) => normalizar(x.nombre.trim()) === normalizar(r.grupoNombre.trim()));
  const al = g?.alumnos?.find((x) => normalizar(x.nombre.trim()) === normalizar(r.alumnoNombre.trim()));
  const nuevo: PTP = { ...r, grupoKey: g && al ? g.id : 'externo', alumnoId: g && al ? al.id : '' };
  await db.ptps.put(nuevo);
  return { accion: 'nuevo' as const, ptp: nuevo };
}
