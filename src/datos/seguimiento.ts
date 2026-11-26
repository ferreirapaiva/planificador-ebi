import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Grupo, type Planificacion, type Seguimiento } from './db';
import { perteneceAlGrupo } from './grupos';
import type { BloqueContenidos, Contenido, UnidadCurricular } from './esquema';
import { hoyIso } from './planSemanal';

export type EstadoSeg = Seguimiento['estado'];

/** Sin grupos (o con "todos"), el avance se lleva en un único registro general. */
export const claveGrupo = (g: Grupo | null | undefined) => g?.id ?? 'general';

/** Estado de cada contenido (por id) del grupo, siempre al día con la base de datos. */
export function useSeguimiento(grupoKey: string) {
  const filas = useLiveQuery(() => db.seguimiento.where('grupoKey').equals(grupoKey).toArray(), [grupoKey]);
  return useMemo(() => new Map((filas ?? []).map((f) => [f.contenidoId, f] as const)), [filas]);
}

export async function marcarContenidos(grupoKey: string, ucId: string, contenidoIds: string[], estado: EstadoSeg | null) {
  if (!estado) {
    await db.seguimiento.bulkDelete(contenidoIds.map((id) => `${grupoKey}|${id}`));
    return;
  }
  const ahora = Date.now(), fecha = hoyIso();
  await db.seguimiento.bulkPut(contenidoIds.map((contenidoId) => ({ id: `${grupoKey}|${contenidoId}`, grupoKey, contenidoId, ucId, estado, fecha, modificada: ahora })));
}

/** sin marcar → en curso → trabajado → sin marcar */
export const siguienteEstado = (e?: EstadoSeg): EstadoSeg | null => (!e ? 'en-curso' : e === 'en-curso' ? 'dado' : null);

export type FilaContenido = { contenido: Contenido; estado?: EstadoSeg; fecha?: string; planificadoEn: string[] };
export type FilaBloque = { bloque: BloqueContenidos; contenidos: FilaContenido[] };
export type ProgresoUC = {
  uc: UnidadCurricular;
  grado: number;
  /** Contenidos del programa (sin contar los que el programa propone abordar de forma transversal). */
  total: number;
  dados: number;
  enCurso: number;
  /** Sin marcar, pero incluidos en alguna planificación del grupo. */
  planificados: number;
  bloques: FilaBloque[];
};

/** Avance de una unidad curricular en un grado: contenidos trabajados, en curso y planificados sin dar. */
export function progresoUC(uc: UnidadCurricular, grado: number, estados: Map<string, Seguimiento>, planificaciones: Planificacion[], grupo: Grupo | null): ProgresoUC | null {
  const g = uc.grados.find((x) => x.grado === grado);
  if (!g) return null;
  const propias = planificaciones.filter((p) => perteneceAlGrupo(p, grupo) && p.grados.includes(grado) && p.ucIds.includes(uc.id));
  let total = 0, dados = 0, enCurso = 0, planificados = 0;
  const bloques = g.bloques.map((bloque) => ({
    bloque,
    contenidos: bloque.contenidos.map((contenido) => {
      const s = estados.get(contenido.id);
      const planificadoEn = propias.filter((p) => p.contenidos.includes(contenido.id)).map((p) => p.titulo || 'Sin título');
      if (!bloque.transversal) {
        total++;
        if (s?.estado === 'dado') dados++;
        else if (s?.estado === 'en-curso') enCurso++;
        else if (planificadoEn.length) planificados++;
      }
      return { contenido, estado: s?.estado, fecha: s?.fecha, planificadoEn };
    }),
  }));
  return { uc, grado, total, dados, enCurso, planificados, bloques };
}
