import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, nuevoId, type Grupo } from './db';
import { normalizar } from './programas';
import { publicarAlumnos } from './aula';

const CLAVE_ACTIVO = 'planificador-ebi:grupo-activo';

export function leerGrupoActivoId(): string | null {
  try {
    return localStorage.getItem(CLAVE_ACTIVO) || null;
  } catch {
    return null;
  }
}
function guardarGrupoActivoId(id: string | null) {
  try {
    if (id) localStorage.setItem(CLAVE_ACTIVO, id);
    else localStorage.removeItem(CLAVE_ACTIVO);
  } catch {
    /* sin almacenamiento disponible: no es grave */
  }
}

type Contexto = { grupos: Grupo[]; activo: Grupo | null; elegir: (id: string | null) => void };
const Ctx = createContext<Contexto>({ grupos: [], activo: null, elegir: () => {} });

/** Lista de grupos y grupo elegido en la barra lateral (null = todos). El elegido se recuerda en este equipo. */
export function GruposProvider({ children }: { children: ReactNode }) {
  const lista = useLiveQuery(() => db.grupos.orderBy('nombre').toArray(), []);
  const [id, setId] = useState<string | null>(leerGrupoActivoId);
  const grupos = useMemo(() => lista ?? [], [lista]);
  const activo = useMemo(() => grupos.find((g) => g.id === id) ?? null, [grupos, id]);
  // La lista del grupo en uso (o del único grupo) queda a mano de las Hojas de actividades.
  const paraHojas = activo ?? (lista && grupos.length === 1 ? grupos[0] : null);
  useEffect(() => {
    if (lista) publicarAlumnos(paraHojas);
  }, [lista, paraHojas]);
  const elegir = useCallback((nuevo: string | null) => {
    setId(nuevo);
    guardarGrupoActivoId(nuevo);
  }, []);
  const valor = useMemo(() => ({ grupos, activo, elegir }), [grupos, activo, elegir]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useGrupos = () => useContext(Ctx);

/**
 * ¿El elemento es del grupo? Sin grupo elegido, todo se muestra. Lo anterior a los grupos (sin `grupoId`)
 * se reconoce por el texto del grupo: "4.º A" coincide con el grupo llamado 4.º A.
 */
export function perteneceAlGrupo(item: { grupoId?: string; grupo: string }, g: Grupo | null) {
  if (!g) return true;
  if (item.grupoId) return item.grupoId === g.id;
  return !!item.grupo.trim() && normalizar(item.grupo.trim()) === normalizar(g.nombre.trim());
}

export type DatosGrupo = { grupoId: string; grupo: string; grados: number[]; escuela?: string; docente?: string };

export const datosDeGrupo = (g: Grupo): DatosGrupo => ({
  grupoId: g.id,
  grupo: g.nombre,
  grados: g.grados,
  ...(g.escuela.trim() ? { escuela: g.escuela } : {}),
  ...(g.docente.trim() ? { docente: g.docente } : {}),
});

/** Datos del grupo elegido, para que lo nuevo que se crea ya salga con su grupo, escuela y docente. */
export async function datosGrupoActivo(): Promise<DatosGrupo | null> {
  const id = leerGrupoActivoId();
  const g = id ? await db.grupos.get(id) : undefined;
  return g ? datosDeGrupo(g) : null;
}

export function grupoNuevo(perfil: { docente: string; escuela: string }): Grupo {
  const ahora = Date.now();
  return { id: nuevoId(), nombre: '', grados: [3], escuela: perfil.escuela, docente: perfil.docente, creada: ahora, modificada: ahora };
}

/** El grupo elegido en la barra lateral, o null si se trabaja con todos. */
export async function leerGrupoActivo(): Promise<Grupo | null> {
  const id = leerGrupoActivoId();
  return (id ? await db.grupos.get(id) : undefined) ?? null;
}
