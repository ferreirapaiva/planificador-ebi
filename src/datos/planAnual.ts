import { calendarioPorDefecto } from './calendario';
import { claveUCGrado, buscarUC } from './consultas';
import { nuevoId, type PlanAnual, type Planificacion } from './db';
import type { Contenido, CriterioLogro, UnidadCurricular } from './esquema';
import { PROGRAMAS } from './programas';

/** El plan anual por defecto: el año lectivo que viene si ya pasó octubre, si no el actual. */
export function planAnualVacio(perfil: Pick<PlanAnual, 'docente' | 'escuela' | 'grupo'>): PlanAnual {
  const hoy = new Date();
  const anio = hoy.getMonth() >= 9 ? hoy.getFullYear() + 1 : hoy.getFullYear();
  const ahora = Date.now();
  return {
    id: nuevoId(),
    anio,
    ...perfil,
    grados: [3],
    ucIds: PROGRAMAS.map((p) => p.id),
    calendario: calendarioPorDefecto(anio),
    distribucion: {},
    fundamentacion: '',
    notas: '',
    paso: 0,
    creada: ahora,
    modificada: ahora,
  };
}

/** ¿La planificación corresponde al año y grados del plan anual? Si no tiene fecha, se considera del año. */
export const planificacionDelPlan = (p: Planificacion, plan: PlanAnual) =>
  p.grados.some((g) => plan.grados.includes(g)) && (!p.desde || Number(p.desde.slice(0, 4)) === plan.anio);

export type EstadoContenido = {
  contenido: Contenido;
  bloque: string;
  transversal: boolean;
  meses: number[];
  /** Títulos de las planificaciones (unidades, proyectos, secuencias) que lo incluyen. */
  en: string[];
};

export type CoberturaUC = {
  uc: UnidadCurricular;
  grado: number;
  clave: string;
  contenidos: EstadoContenido[];
  criterios: { criterio: CriterioLogro; en: string[] }[];
};

/** Estado de cada contenido y criterio del plan: si está distribuido en el año y si ya se planificó en detalle. */
export function cobertura(plan: PlanAnual, planificaciones: Planificacion[]): CoberturaUC[] {
  const propias = planificaciones.filter((p) => planificacionDelPlan(p, plan));
  const titulo = (p: Planificacion) => p.titulo || 'Sin título';
  return plan.ucIds.flatMap((ucId) => {
    const uc = buscarUC(ucId);
    if (!uc) return [];
    return plan.grados.flatMap((grado) => {
      const g = uc.grados.find((x) => x.grado === grado);
      if (!g) return [];
      return [
        {
          uc,
          grado,
          clave: claveUCGrado(ucId, grado),
          contenidos: g.bloques.flatMap((b) =>
            b.contenidos.map((c) => ({
              contenido: c,
              bloque: b.titulo,
              transversal: !!b.transversal,
              meses: plan.distribucion[c.id] ?? [],
              en: propias.filter((p) => p.contenidos.includes(c.id)).map(titulo),
            })),
          ),
          criterios: g.criteriosLogro.map((cr) => ({ criterio: cr, en: propias.filter((p) => p.criterios.includes(cr.id)).map(titulo) })),
        },
      ];
    });
  });
}

export const porcentaje = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
