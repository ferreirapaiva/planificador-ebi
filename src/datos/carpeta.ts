import { armarRespaldo, archivoDeRespaldo } from './respaldo';
import { diasDesde, registrarCopia } from './copias';

/**
 * Copia automática en una carpeta elegida por la docente (por ejemplo, una sincronizada con Drive o OneDrive).
 * Usa la API de archivos del navegador (Chrome y Edge); en otros navegadores no está disponible.
 * Las copias de la carpeta no llevan contraseña: la carpeta es de la docente.
 */
type PermisoDir = { queryPermission?: (o: { mode: 'readwrite' }) => Promise<PermissionState>; requestPermission?: (o: { mode: 'readwrite' }) => Promise<PermissionState> };
type Carpeta = FileSystemDirectoryHandle & PermisoDir & { values: () => AsyncIterable<FileSystemHandle> };

declare global {
  interface Window {
    showDirectoryPicker?: (o?: { mode?: 'read' | 'readwrite'; id?: string }) => Promise<FileSystemDirectoryHandle>;
  }
}

export const carpetaDisponible = () => typeof window.showDirectoryPicker === 'function';

const BD = 'planificador-ebi-carpeta';
const ALMACEN = 'carpeta';
const CLAVE_ULTIMA_CARPETA = 'planificador-ebi:ultima-copia-carpeta';
const CONSERVAR = 10;
const PREFIJO = 'respaldo-planificador-';

function abrir(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(BD, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ALMACEN);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
/** La carpeta ya leída se recuerda en memoria: evita volver a abrir la base cada vez. */
let enMemoria: Carpeta | null | undefined;

export async function leerCarpeta(): Promise<Carpeta | null> {
  if (enMemoria !== undefined) return enMemoria;
  try {
    const db = await abrir();
    return await new Promise((res) => {
      const q = db.transaction(ALMACEN).objectStore(ALMACEN).get('actual');
      q.onsuccess = () => res((enMemoria = (q.result as Carpeta) ?? null));
      q.onerror = () => res(null);
    });
  } catch {
    return null;
  }
}
async function guardarCarpeta(h: FileSystemDirectoryHandle | null) {
  enMemoria = h as Carpeta | null;
  const db = await abrir();
  await new Promise<void>((res, rej) => {
    const t = db.transaction(ALMACEN, 'readwrite');
    if (h) t.objectStore(ALMACEN).put(h, 'actual');
    else t.objectStore(ALMACEN).delete('actual');
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
  });
}

/** Abre el selector de carpetas (hay que llamarlo desde un clic). */
export async function elegirCarpeta(): Promise<Carpeta> {
  if (!window.showDirectoryPicker) throw new Error('Este navegador no permite guardar en una carpeta. Probá con Chrome o Edge.');
  const h = (await window.showDirectoryPicker({ mode: 'readwrite', id: 'respaldo-planificador' })) as Carpeta;
  await guardarCarpeta(h);
  return h;
}
export async function quitarCarpeta() {
  await guardarCarpeta(null);
  try {
    localStorage.removeItem(CLAVE_ULTIMA_CARPETA);
  } catch {
    /* no es grave */
  }
}

/** ¿El navegador ya dejó escribir en la carpeta? Si `pedir`, muestra el aviso de permiso (solo desde un clic). */
export async function permisoCarpeta(h: Carpeta, pedir = false) {
  try {
    if ((await h.queryPermission?.({ mode: 'readwrite' })) === 'granted') return true;
    return pedir ? (await h.requestPermission?.({ mode: 'readwrite' })) === 'granted' : false;
  } catch {
    return false;
  }
}

export const ultimaCopiaCarpeta = () => {
  try {
    return localStorage.getItem(CLAVE_ULTIMA_CARPETA);
  } catch {
    return null;
  }
};

/** Guarda la copia del día en la carpeta (si ya había una de hoy, la reemplaza) y conserva solo las últimas 10. */
export async function guardarEnCarpeta(h: Carpeta) {
  const r = await armarRespaldo();
  const nombre = `${PREFIJO}${r.fecha.slice(0, 10)}.json`;
  const archivo = await h.getFileHandle(nombre, { create: true });
  const w = await archivo.createWritable();
  await w.write(await archivoDeRespaldo(r));
  await w.close();
  const nombres: string[] = [];
  for await (const e of h.values()) if (e.kind === 'file' && e.name.startsWith(PREFIJO) && e.name.endsWith('.json')) nombres.push(e.name);
  nombres.sort().reverse();
  for (const viejo of nombres.slice(CONSERVAR)) await h.removeEntry(viejo).catch(() => {});
  try {
    localStorage.setItem(CLAVE_ULTIMA_CARPETA, r.fecha);
  } catch {
    /* no es grave */
  }
  registrarCopia('carpeta', false);
  return nombre;
}

/** Al abrir la app: si hay carpeta elegida, con permiso y la última copia de la carpeta no es de hoy, guarda una. */
export async function copiaAutomatica() {
  const h = await leerCarpeta();
  if (!h || !(await permisoCarpeta(h))) return null;
  const ultima = ultimaCopiaCarpeta();
  if (ultima && diasDesde(ultima) < 1) return null;
  try {
    return await guardarEnCarpeta(h);
  } catch {
    return null;
  }
}
