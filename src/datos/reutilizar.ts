import { calendarioPorDefecto } from './calendario';
import { db, nuevoId, type Grupo, type PlanAnual, type PlanSemanal, type Planificacion } from './db';
import { fechasDel, lunesDe, sumarDias } from './planSemanal';

type ConGrupo = { grupoId?: string; grupo: string; docente: string; escuela: string };

/** Pone el grupo de destino (y su escuela y docente, si los tiene cargados). Sin grupo de destino, deja el texto del grupo como estaba. */
function aplicarGrupo<T extends ConGrupo>(item: T, g: Grupo | null): T {
  if (!g) return item;
  return { ...item, grupoId: g.id, grupo: g.nombre, escuela: g.escuela.trim() || item.escuela, docente: g.docente.trim() || item.docente };
}
function sinGrupo<T extends ConGrupo>(item: T): T {
  const { grupoId: _id, ...resto } = item;
  return { ...resto, grupo: '' } as T;
}

export type OpcionesCopia = {
  /** Grupo de destino; sin grupo, se quita el grupo (salvo que `conservar` esté activo, cuando no se usan grupos). */
  grupo: Grupo | null;
  conservar?: boolean;
  titulo?: string;
  borrarFechas?: boolean;
  anio?: number;
  fecha?: string;
};
const destino = <T extends ConGrupo>(item: T, o: Pick<OpcionesCopia, 'grupo' | 'conservar'>): T => (o.grupo ? aplicarGrupo(item, o.grupo) : o.conservar ? item : sinGrupo(item));

/** Copia de una planificación (por ejemplo, la del año pasado) lista para ajustar. */
export async function copiarPlanificacion(p: Planificacion, o: OpcionesCopia) {
  const ahora = Date.now();
  const copia: Planificacion = {
    ...destino(structuredClone(p), o),
    id: nuevoId(),
    titulo: o.titulo ?? `${p.titulo || 'Sin título'} (copia)`,
    clases: p.clases.map((c) => ({ ...structuredClone(c), id: nuevoId(), fecha: o.borrarFechas ? '' : c.fecha })),
    desde: o.borrarFechas ? '' : p.desde,
    hasta: o.borrarFechas ? '' : p.hasta,
    paso: 0,
    creada: ahora,
    modificada: ahora,
  };
  await db.planificaciones.add(copia);
  return copia.id;
}

/** Copia de un plan anual para otro año (con el calendario de ese año) o para otro grupo. */
export async function copiarPlanAnual(p: PlanAnual, o: OpcionesCopia) {
  const ahora = Date.now();
  const anio = o.anio ?? p.anio;
  const copia: PlanAnual = {
    ...destino(structuredClone(p), o),
    id: nuevoId(),
    anio,
    calendario: anio === p.anio ? structuredClone(p.calendario) : calendarioPorDefecto(anio),
    paso: 0,
    creada: ahora,
    modificada: ahora,
  };
  await db.planesAnuales.add(copia);
  return copia.id;
}

const aMs = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
};

/** Copia de un horario del día o de la semana para otra fecha y, si se quiere, otro grupo. */
export async function copiarPlanSemanal(p: PlanSemanal, o: OpcionesCopia) {
  const ahora = Date.now();
  const nueva = o.fecha || p.fecha;
  const fecha = p.alcance === 'semana' ? lunesDe(nueva) : nueva;
  const salto = Math.round((aMs(fecha) - aMs(p.fecha)) / 86_400_000);
  const copia: PlanSemanal = {
    ...destino(structuredClone(p), o),
    id: nuevoId(),
    fecha,
    dias: p.dias.map((d) => ({ fecha: sumarDias(d.fecha, salto), bloques: d.bloques.map((b) => ({ ...structuredClone(b), id: nuevoId() })) })),
    creada: ahora,
    modificada: ahora,
  };
  // El día elegido debe estar entre las fechas del plan.
  if (p.alcance === 'dia') copia.dias = [{ fecha, bloques: copia.dias[0]?.bloques ?? [] }];
  else if (copia.dias.length !== 5) copia.dias = fechasDel('semana', fecha).map((f, i) => ({ fecha: f, bloques: copia.dias[i]?.bloques ?? [] }));
  await db.planesSemanales.add(copia);
  return copia.id;
}

/** Pasa un elemento a otro grupo sin copiarlo. */
export async function moverAGrupo(tabla: 'planificaciones' | 'planesAnuales' | 'planesSemanales', id: string, g: Grupo | null) {
  const t = db[tabla] as typeof db.planificaciones;
  const actual = await t.get(id);
  if (!actual) return;
  const nuevo = destino(actual, { grupo: g });
  await t.put({ ...nuevo, modificada: Date.now() } as Planificacion);
}
