import { db, type PlanAnual, type PlanSemanal, type Planificacion } from './db';

type Respaldo = {
  app: 'planificador-ebi';
  version: 1;
  fecha: string;
  planificaciones: Planificacion[];
  planesAnuales: PlanAnual[];
  /** Desde que existen los planes diarios y semanales (los respaldos anteriores no lo tienen). */
  planesSemanales?: PlanSemanal[];
};

/** Descarga un archivo .json con todas las planificaciones y planes anuales de este navegador. */
export async function descargarRespaldo() {
  const datos: Respaldo = {
    app: 'planificador-ebi',
    version: 1,
    fecha: new Date().toISOString(),
    planificaciones: await db.planificaciones.toArray(),
    planesAnuales: await db.planesAnuales.toArray(),
    planesSemanales: await db.planesSemanales.toArray(),
  };
  const blob = new Blob([JSON.stringify(datos, null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `respaldo-planificador-${datos.fecha.slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { planificaciones: datos.planificaciones.length, planesAnuales: datos.planesAnuales.length, planesSemanales: datos.planesSemanales?.length ?? 0 };
}

/**
 * Restaura un respaldo. No borra nada: agrega lo que falta y, si una planificación ya existe,
 * se queda con la versión modificada más recientemente.
 */
export async function restaurarRespaldo(archivo: File) {
  let datos: Respaldo;
  try {
    datos = JSON.parse(await archivo.text());
  } catch {
    throw new Error('El archivo no es un respaldo válido.');
  }
  if (datos?.app !== 'planificador-ebi' || !Array.isArray(datos.planificaciones) || !Array.isArray(datos.planesAnuales)) {
    throw new Error('El archivo no es un respaldo del Planificador EBI.');
  }
  let agregadas = 0;
  let actualizadas = 0;
  await db.transaction('rw', db.planificaciones, db.planesAnuales, db.planesSemanales, async () => {
    for (const [tabla, items] of [
      [db.planificaciones, datos.planificaciones],
      [db.planesAnuales, datos.planesAnuales],
      [db.planesSemanales, Array.isArray(datos.planesSemanales) ? datos.planesSemanales : []],
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
