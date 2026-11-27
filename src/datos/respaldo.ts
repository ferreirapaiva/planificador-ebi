import { db, type PTP, type Asistencia, type EntradaDiario, type Grupo, type RegistroEvaluacion, type PlanAnual, type PlanSemanal, type Planificacion, type Seguimiento } from './db';
import { registrarCopia } from './copias';

export type Respaldo = {
  app: 'planificador-ebi';
  /** 1: sin verificación. 2: con huella (SHA-256) para comprobar que el archivo no se dañó. */
  version: 1 | 2;
  fecha: string;
  huella?: string;
  planificaciones: Planificacion[];
  planesAnuales: PlanAnual[];
  /** Desde que existen los planes diarios y semanales (los respaldos anteriores no lo tienen). */
  planesSemanales?: PlanSemanal[];
  /** Desde que existen los grupos y el avance del programa. */
  grupos?: Grupo[];
  seguimiento?: Seguimiento[];
  /** Desde que existen la asistencia, los registros de evaluación y el diario de clase. */
  asistencia?: Asistencia[];
  evaluaciones?: RegistroEvaluacion[];
  diario?: EntradaDiario[];
  /** Desde que existen los proyectos de trabajo personalizados. */
  ptps?: PTP[];
};

/** Copia protegida con contraseña: AES-GCM de 256 bits con la clave derivada por PBKDF2. */
type Cifrado = { app: 'planificador-ebi'; cifrado: true; version: 2; kdf: 'PBKDF2-SHA256'; iteraciones: number; sal: string; iv: string; datos: string };

const ITERACIONES = 310_000;
const aBase64 = (u: Uint8Array) => {
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
};
const deBase64 = (t: string) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));

async function sha256(texto: string) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)));
  return [...h].map((b) => b.toString(16).padStart(2, '0')).join('');
}
type ParaHuella = Pick<Respaldo, 'planificaciones' | 'planesAnuales' | 'planesSemanales' | 'grupos' | 'seguimiento' | 'asistencia' | 'evaluaciones' | 'diario' | 'ptps'>;
/** Los respaldos anteriores no traen asistencia, evaluaciones ni diario: su huella se calculó sin ellos y se sigue verificando igual. */
const textoDeHuella = (r: ParaHuella) => {
  const base = [r.planificaciones, r.planesAnuales, r.planesSemanales ?? [], r.grupos ?? [], r.seguimiento ?? []];
  const aula = r.asistencia || r.evaluaciones || r.diario ? [...base, r.asistencia ?? [], r.evaluaciones ?? [], r.diario ?? []] : base;
  return JSON.stringify(r.ptps ? [...aula, r.ptps] : aula);
};

async function claveDe(clave: string, sal: Uint8Array, iteraciones: number) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal as BufferSource, iterations: iteraciones, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function cifrar(texto: string, clave: string): Promise<Cifrado> {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await claveDe(clave, sal, ITERACIONES);
  const datos = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(texto)));
  return { app: 'planificador-ebi', cifrado: true, version: 2, kdf: 'PBKDF2-SHA256', iteraciones: ITERACIONES, sal: aBase64(sal), iv: aBase64(iv), datos: aBase64(datos) };
}

async function descifrar(c: Cifrado, clave: string) {
  try {
    const k = await claveDe(clave, deBase64(c.sal), c.iteraciones);
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64(c.iv) as BufferSource }, k, deBase64(c.datos) as BufferSource));
  } catch {
    throw new Error('La contraseña no es correcta, o el archivo está dañado.');
  }
}

/** Junta todo lo que hay en este navegador, con su huella para poder verificarlo después. */
export async function armarRespaldo(): Promise<Respaldo> {
  const [planificaciones, planesAnuales, planesSemanales, grupos, seguimiento, asistencia, evaluaciones, diario, ptps] = await Promise.all([
    db.planificaciones.toArray(),
    db.planesAnuales.toArray(),
    db.planesSemanales.toArray(),
    db.grupos.toArray(),
    db.seguimiento.toArray(),
    db.asistencia.toArray(),
    db.evaluaciones.toArray(),
    db.diario.toArray(),
    db.ptps.toArray(),
  ]);
  const base = { planificaciones, planesAnuales, planesSemanales, grupos, seguimiento, asistencia, evaluaciones, diario, ptps };
  return { app: 'planificador-ebi', version: 2, fecha: new Date().toISOString(), huella: await sha256(textoDeHuella(base)), ...base };
}

export const nombreArchivo = (fecha: string, protegido: boolean) => `respaldo-planificador-${fecha.slice(0, 10)}${protegido ? '-protegido' : ''}.json`;

/** El contenido del archivo: texto plano o, con contraseña, cifrado. */
export async function archivoDeRespaldo(r: Respaldo, clave?: string) {
  const texto = JSON.stringify(r, null, 1);
  return clave ? JSON.stringify(await cifrar(texto, clave)) : texto;
}

export const resumenDe = (r: Respaldo) => ({
  planificaciones: r.planificaciones.length,
  planesAnuales: r.planesAnuales.length,
  planesSemanales: r.planesSemanales?.length ?? 0,
  grupos: r.grupos?.length ?? 0,
  seguimiento: r.seguimiento?.length ?? 0,
  alumnos: (r.grupos ?? []).reduce((n, g) => n + (g.alumnos?.length ?? 0), 0),
  asistencia: r.asistencia?.length ?? 0,
  evaluaciones: r.evaluaciones?.length ?? 0,
  diario: r.diario?.length ?? 0,
  ptps: r.ptps?.length ?? 0,
});
export type Resumen = ReturnType<typeof resumenDe>;
const cuenta = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
export const textoDeResumen = (n: Resumen) =>
  [
    cuenta(n.planificaciones, 'planificación', 'planificaciones'),
    cuenta(n.planesAnuales, 'plan anual', 'planes anuales'),
    cuenta(n.planesSemanales, 'plan del día o la semana', 'planes del día o la semana'),
    cuenta(n.grupos, 'grupo', 'grupos'),
    `${cuenta(n.seguimiento, 'contenido', 'contenidos')} con avance marcado`,
    ...(n.alumnos ? [cuenta(n.alumnos, 'alumno', 'alumnos')] : []),
    ...(n.asistencia ? [cuenta(n.asistencia, 'día de asistencia', 'días de asistencia')] : []),
    ...(n.evaluaciones ? [cuenta(n.evaluaciones, 'registro de evaluación', 'registros de evaluación')] : []),
    ...(n.diario ? [cuenta(n.diario, 'día del diario de clase', 'días del diario de clase')] : []),
    ...(n.ptps ? [cuenta(n.ptps, 'proyecto de trabajo personalizado', 'proyectos de trabajo personalizados')] : []),
  ].join(', ');

/** Descarga un archivo .json con todo lo de este navegador; con contraseña, queda protegido. */
export async function descargarRespaldo(clave?: string) {
  const r = await armarRespaldo();
  const blob = new Blob([await archivoDeRespaldo(r, clave)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo(r.fecha, !!clave);
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  registrarCopia('descarga', !!clave);
  return resumenDe(r);
}

/** El archivo pide una contraseña para abrirse. */
export class NecesitaClave extends Error {
  constructor() {
    super('Este archivo está protegido con contraseña.');
  }
}

/** Lee y comprueba un archivo de respaldo (sin tocar nada). Si está protegido, hace falta la contraseña. */
export async function leerRespaldo(archivo: File, clave?: string): Promise<Respaldo> {
  let crudo: unknown;
  try {
    crudo = JSON.parse(await archivo.text());
  } catch {
    throw new Error('El archivo no es un respaldo válido.');
  }
  let datos = crudo as Respaldo & Partial<Cifrado>;
  if (datos?.app === 'planificador-ebi' && datos.cifrado) {
    if (!clave) throw new NecesitaClave();
    try {
      datos = JSON.parse(await descifrar(datos as Cifrado, clave));
    } catch (e) {
      throw e instanceof SyntaxError ? new Error('El archivo está dañado.') : e;
    }
  }
  if (datos?.app !== 'planificador-ebi' || !Array.isArray(datos.planificaciones) || !Array.isArray(datos.planesAnuales)) {
    throw new Error('El archivo no es un respaldo del Planificador EBI.');
  }
  if (datos.huella && datos.huella !== (await sha256(textoDeHuella(datos)))) {
    throw new Error('El archivo está dañado o fue modificado: no coincide con su verificación. Probá con otra copia.');
  }
  return datos;
}

/**
 * Restaura un respaldo. No borra nada: agrega lo que falta y, si algo ya existe,
 * se queda con la versión modificada más recientemente.
 */
export async function restaurarDatos(datos: Respaldo) {
  let agregadas = 0;
  let actualizadas = 0;
  await db.transaction('rw', [db.planificaciones, db.planesAnuales, db.planesSemanales, db.grupos, db.seguimiento, db.asistencia, db.evaluaciones, db.diario, db.ptps], async () => {
    for (const [tabla, items] of [
      [db.planificaciones, datos.planificaciones],
      [db.planesAnuales, datos.planesAnuales],
      [db.planesSemanales, Array.isArray(datos.planesSemanales) ? datos.planesSemanales : []],
      [db.grupos, Array.isArray(datos.grupos) ? datos.grupos : []],
      [db.seguimiento, Array.isArray(datos.seguimiento) ? datos.seguimiento : []],
      [db.asistencia, Array.isArray(datos.asistencia) ? datos.asistencia : []],
      [db.evaluaciones, Array.isArray(datos.evaluaciones) ? datos.evaluaciones : []],
      [db.diario, Array.isArray(datos.diario) ? datos.diario : []],
      [db.ptps, Array.isArray(datos.ptps) ? datos.ptps : []],
    ] as const) {
      for (const item of items as { id: string; modificada: number }[]) {
        if (!item?.id) continue;
        const actual = await (tabla as typeof db.planificaciones).get(item.id);
        if (!actual) agregadas++;
        else if (actual.modificada < item.modificada) actualizadas++;
        else continue;
        await (tabla as typeof db.planificaciones).put(item as Planificacion);
      }
    }
  });
  return { agregadas, actualizadas };
}

/** Cifra y descifra cualquier texto con contraseña (para compartir un proyecto personalizado de forma segura). */
export const cifrarTexto = cifrar;
export const descifrarTexto = descifrar;
export type TextoCifrado = Cifrado;
