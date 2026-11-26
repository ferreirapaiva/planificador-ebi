import { useLiveQuery } from 'dexie-react-hooks';
import { db, nuevoId, NIVELES_POR_DEFECTO, type Alumno, type Asistencia, type EntradaDiario, type EstadoAsistencia, type Grupo, type Instrumento, type Planificacion, type RegistroEvaluacion } from './db';
import { buscarCriterio } from './consultas';
import { normalizar } from './programas';
import { hoyIso, sumarDias } from './planSemanal';
import { feriadoOficial } from './calendario';

/* ---------- Lista de alumnos ---------- */

const CLAVE_ALUMNOS = 'planificador-ebi:alumnos';

/** Un nombre por renglón. Conserva el id (y las observaciones) de quien ya estaba en la lista. */
export function textoAAlumnos(texto: string, previos: Alumno[] = []): Alumno[] {
  const porNombre = new Map(previos.map((a) => [normalizar(a.nombre.trim()), a] as const));
  const vistos = new Set<string>();
  const lista: Alumno[] = [];
  for (const crudo of texto.split('\n')) {
    const nombre = crudo.replace(/^\s*(\d+\s*[.)\-–]\s*|[-•*]\s*)/, '').replace(/\s+/g, ' ').trim();
    const clave = normalizar(nombre);
    if (!nombre || vistos.has(clave)) continue;
    vistos.add(clave);
    lista.push(porNombre.get(clave) ?? { id: nuevoId(), nombre });
  }
  return lista;
}
export const alumnosATexto = (alumnos: Alumno[] = []) => alumnos.map((a) => a.nombre).join('\n');

/**
 * Deja la lista del grupo elegido donde la lee la pantalla de Hojas de actividades (otra página del mismo sitio),
 * para que planillas, listas de cotejo, carnés y bingo salgan ya con los nombres.
 */
export function publicarAlumnos(g: Grupo | null) {
  try {
    if (g?.alumnos?.length) localStorage.setItem(CLAVE_ALUMNOS, JSON.stringify({ grupo: g.nombre, nombres: g.alumnos.map((a) => a.nombre) }));
    else localStorage.removeItem(CLAVE_ALUMNOS);
  } catch {
    /* sin almacenamiento disponible: no es grave */
  }
}

/* ---------- Asistencia ---------- */

export const ETIQUETA_ASISTENCIA: Record<EstadoAsistencia, string> = { P: 'Presente', F: 'Falta', J: 'Falta justificada' };

export const idAsistencia = (grupoKey: string, fecha: string) => `${grupoKey}|${fecha}`;

export function useAsistenciaDelDia(grupoKey: string, fecha: string) {
  return useLiveQuery(() => db.asistencia.get(idAsistencia(grupoKey, fecha)), [grupoKey, fecha]);
}
export function useAsistencias(grupoKey: string) {
  return useLiveQuery(() => db.asistencia.where('grupoKey').equals(grupoKey).toArray(), [grupoKey]) ?? [];
}

export async function marcarAsistencia(grupoKey: string, fecha: string, cambios: Record<string, EstadoAsistencia | null>) {
  const id = idAsistencia(grupoKey, fecha);
  await db.transaction('rw', db.asistencia, async () => {
    const actual = (await db.asistencia.get(id)) ?? { id, grupoKey, fecha, estados: {}, modificada: 0 };
    const estados = { ...actual.estados };
    for (const [alumno, e] of Object.entries(cambios)) {
      if (e) estados[alumno] = e;
      else delete estados[alumno];
    }
    if (Object.keys(estados).length) await db.asistencia.put({ ...actual, estados, modificada: Date.now() });
    else await db.asistencia.delete(id);
  });
}

export type ResumenAsistencia = { dias: number; presentes: number; faltas: number; justificadas: number; porcentaje: number | null };

export function resumenAsistencia(asistencias: Asistencia[], alumnoId: string, desde: string, hasta: string): ResumenAsistencia {
  let presentes = 0, faltas = 0, justificadas = 0;
  for (const a of asistencias) {
    if (a.fecha < desde || a.fecha > hasta) continue;
    const e = a.estados[alumnoId];
    if (e === 'P') presentes++;
    else if (e === 'F') faltas++;
    else if (e === 'J') justificadas++;
  }
  const dias = presentes + faltas + justificadas;
  return { dias, presentes, faltas, justificadas, porcentaje: dias ? Math.round((presentes / dias) * 100) : null };
}

/* ---------- Registros de evaluación ---------- */

export function useRegistros(grupoKey: string) {
  return useLiveQuery(() => db.evaluaciones.where('grupoKey').equals(grupoKey).toArray(), [grupoKey]) ?? [];
}

export const logroPorDefecto = (niveles: string[]) => (niveles.length >= 3 ? niveles.length - 2 : Math.max(0, niveles.length - 1));

export function registroNuevo(grupoKey: string, p: Partial<RegistroEvaluacion> & { titulo: string; criterios: string[] }): RegistroEvaluacion {
  const niveles = p.niveles ?? NIVELES_POR_DEFECTO;
  return { id: nuevoId(), grupoKey, fecha: hoyIso(), niveles, logro: logroPorDefecto(niveles), resultados: {}, modificada: Date.now(), ...p };
}

/** Rúbricas (o listas de cotejo) de las planificaciones, listas para pasar a un registro. */
export function instrumentosDe(planificaciones: Planificacion[]) {
  const lista: { planificacion: Planificacion; instrumento: Instrumento }[] = [];
  for (const planificacion of planificaciones) for (const instrumento of planificacion.instrumentos) if (instrumento.filas.length) lista.push({ planificacion, instrumento });
  return lista;
}

export function registroDesdeInstrumento(grupoKey: string, planificacion: Planificacion, instrumento: Instrumento): RegistroEvaluacion {
  const criterios = instrumento.filas.map((f) => buscarCriterio(f.criterioId)?.criterio.texto ?? f.criterioId);
  // En la lista de cotejo "Sí" va primero; en el registro los niveles siempre suben de menor a mayor logro.
  const niveles = instrumento.tipo === 'lista_cotejo' ? ['No', 'Sí'] : instrumento.niveles.length ? instrumento.niveles : NIVELES_POR_DEFECTO;
  return registroNuevo(grupoKey, {
    titulo: instrumento.titulo || planificacion.titulo || 'Evaluación',
    criterios,
    niveles,
    planificacionId: planificacion.id,
  });
}

export const guardarRegistro = (r: RegistroEvaluacion) => db.evaluaciones.put({ ...r, modificada: Date.now() });

/** Cuántos alcanzaron el nivel de logro en un criterio, y quiénes todavía no (de los que ya tienen una marca). */
export function logrosDeCriterio(r: RegistroEvaluacion, alumnos: Alumno[], i: number) {
  const evaluados = alumnos.filter((a) => r.resultados[a.id]?.[i] !== undefined);
  const lograron = evaluados.filter((a) => r.resultados[a.id][i] >= r.logro);
  return { evaluados: evaluados.length, lograron, faltan: evaluados.filter((a) => r.resultados[a.id][i] < r.logro) };
}

/* ---------- Diario de clase ---------- */

export const idDiario = (grupoKey: string, fecha: string) => `${grupoKey}|${fecha}`;

export function useEntradaDiario(grupoKey: string, fecha: string) {
  return useLiveQuery(() => db.diario.get(idDiario(grupoKey, fecha)), [grupoKey, fecha]);
}
export function useDiario(grupoKey: string) {
  return useLiveQuery(() => db.diario.where('grupoKey').equals(grupoKey).toArray(), [grupoKey]) ?? [];
}

export const entradaVacia = (grupoKey: string, fecha: string): EntradaDiario => ({ id: idDiario(grupoKey, fecha), grupoKey, fecha, planeado: '', hecho: '', pendiente: '', modificada: 0 });

/** Guarda el día (si quedó vacío, lo borra). Devuelve la marca de tiempo con la que quedó guardado. */
export async function guardarEntradaDiario(e: EntradaDiario) {
  const modificada = Date.now();
  const vacia = !e.planeado.trim() && !e.hecho.trim() && !e.pendiente.trim();
  if (vacia) await db.diario.delete(e.id);
  else await db.diario.put({ ...e, modificada });
  return modificada;
}

/** El día de clase que sigue: salta fines de semana y los feriados oficiales cargados (las vacaciones no se tienen en cuenta). */
export function diaSiguiente(fecha: string) {
  let d = sumarDias(fecha, 1);
  for (let i = 0; i < 10; i++) {
    const [a, m, dd] = d.split('-').map(Number);
    const sem = new Date(a, m - 1, dd).getDay();
    if (sem === 0 || sem === 6 || feriadoOficial(d)) d = sumarDias(d, 1);
    else break;
  }
  return d;
}

export const MARCA_PENDIENTE = 'Quedó pendiente de antes:';

/** Lo que quedó pendiente se agrega a «lo planeado» del día de destino (sin repetirlo si ya está) y queda marcado como pasado. */
export async function pasarPendiente(e: EntradaDiario, destino: string) {
  const texto = e.pendiente.trim();
  if (!texto) return;
  await db.transaction('rw', db.diario, async () => {
    const id = idDiario(e.grupoKey, destino);
    const otro = (await db.diario.get(id)) ?? entradaVacia(e.grupoKey, destino);
    if (!otro.planeado.includes(texto)) {
      const bloque = `${MARCA_PENDIENTE}\n${texto}`;
      await db.diario.put({ ...otro, planeado: otro.planeado.trim() ? `${bloque}\n\n${otro.planeado}` : bloque, modificada: Date.now() });
    }
    await db.diario.put({ ...e, pasado: true, modificada: Date.now() });
  });
}

/* ---------- Fechas ---------- */

export const fechaLarga = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};
export const fechaCorta = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-UY', { day: 'numeric', month: 'short' });
};
