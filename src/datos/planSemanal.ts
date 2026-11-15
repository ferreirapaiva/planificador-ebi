import { nuevoId, type BloqueHorario, type Clase, type DiaPlan, type PlanSemanal, type Planificacion } from './db';
import { buscarUC } from './consultas';

// ---------- Fechas (siempre en hora local, como "AAAA-MM-DD") ----------

const aIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const deIso = (s: string) => {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(a, m - 1, d);
};
export const hoyIso = () => aIso(new Date());
export const sumarDias = (iso: string, n: number) => {
  const d = deIso(iso);
  return aIso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};
/** Lunes de la semana de esa fecha (sábado y domingo pasan a la semana siguiente). */
export function lunesDe(iso: string) {
  const dia = deIso(iso).getDay();
  return sumarDias(iso, dia === 0 ? 1 : dia === 6 ? 2 : 1 - dia);
}
export const nombreDia = (iso: string, conAnio = false) => {
  const t = deIso(iso).toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long', ...(conAnio ? { year: 'numeric' } : {}) });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Fechas que abarca el plan: un día, o de lunes a viernes. */
export const fechasDel = (alcance: PlanSemanal['alcance'], fecha: string) =>
  alcance === 'dia' ? [fecha] : [0, 1, 2, 3, 4].map((n) => sumarDias(lunesDe(fecha), n));

export function tituloPlan(p: Pick<PlanSemanal, 'alcance' | 'fecha'>) {
  if (p.alcance === 'dia') return nombreDia(p.fecha, true);
  const [lunes, , , , viernes] = fechasDel('semana', p.fecha);
  const a = deIso(lunes), b = deIso(viernes);
  const mes = (d: Date) => d.toLocaleDateString('es-UY', { month: 'long' }).toLowerCase();
  return a.getMonth() === b.getMonth()
    ? `Semana del ${a.getDate()} al ${b.getDate()} de ${mes(b)} de ${b.getFullYear()}`
    : `Semana del ${a.getDate()} de ${mes(a)} al ${b.getDate()} de ${mes(b)} de ${b.getFullYear()}`;
}

/**
 * Rearma los días al cambiar la fecha o el alcance, sin perder lo planificado:
 * un día que sigue estando conserva sus bloques; si se corre la semana, cada día pasa al mismo día de la nueva.
 */
export function rearmarDias(plan: PlanSemanal, alcance: PlanSemanal['alcance'], fecha: string): DiaPlan[] {
  const fechas = fechasDel(alcance, fecha);
  return fechas.map((f, i) => {
    const mismo = plan.dias.find((d) => d.fecha === f);
    if (mismo) return mismo;
    const corrido = plan.alcance === alcance ? plan.dias[i] : undefined;
    return { fecha: f, bloques: corrido?.bloques ?? [] };
  });
}

// ---------- Horario ----------

export const sumarMinutos = (hora: string, min: number) => {
  const [h, m] = (hora || '08:00').split(':').map(Number);
  const total = (h * 60 + m + min + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/** "45 min" → 45, "1 h" → 60, "1 h 30" → 90. Si no se entiende, 45. */
export function minutosDe(duracion: string) {
  const t = duracion.toLowerCase();
  const horas = t.match(/(\d+)\s*(h|hora)/);
  const mins = t.match(/(\d+)\s*(m|min)/) ?? (horas ? t.match(/(?:h|hora)s?\s*(\d+)/) : t.match(/(\d+)/));
  const total = (horas ? Number(horas[1]) * 60 : 0) + (mins ? Number(mins[1]) : 0);
  return total > 0 && total <= 600 ? total : 45;
}

/** Hora en que empieza un bloque nuevo: cuando termina el último del día, o 08:00. */
export const proximaHora = (dia: DiaPlan) => dia.bloques.reduce((max, b) => (b.fin > max ? b.fin : max), '') || '08:00';

export const ordenarBloques = (bloques: BloqueHorario[]) => [...bloques].sort((a, b) => (a.inicio || '99').localeCompare(b.inicio || '99'));

export function bloqueVacio(dia: DiaPlan, actividad = '', minutos = 45): BloqueHorario {
  const inicio = proximaHora(dia);
  return { id: nuevoId(), inicio, fin: sumarMinutos(inicio, minutos), area: '', actividad, detalle: '', materiales: '' };
}

/** Copia una clase de una planificación como bloque del horario. */
export function bloqueDesdeClase(dia: DiaPlan, plan: Planificacion, clase: Clase): BloqueHorario {
  const inicio = proximaHora(dia);
  const momentos = [
    clase.proposito && `Propósito: ${clase.proposito}`,
    clase.inicio && `Inicio: ${clase.inicio}`,
    clase.desarrollo && `Desarrollo: ${clase.desarrollo}`,
    clase.cierre && `Cierre: ${clase.cierre}`,
  ].filter(Boolean);
  return {
    id: nuevoId(),
    inicio,
    fin: sumarMinutos(inicio, minutosDe(clase.duracion)),
    area: plan.ucIds.map((id) => buscarUC(id)?.nombre).filter(Boolean).join(' / '),
    actividad: clase.titulo,
    detalle: momentos.join('\n'),
    materiales: clase.recursos,
    origen: { planificacionId: plan.id, claseId: clase.id, titulo: plan.titulo || 'Sin título' },
  };
}

/** Clases de las planificaciones con fecha dentro del plan que todavía no están en el horario. */
export function clasesConFecha(plan: PlanSemanal, planificaciones: Planificacion[]) {
  const ya = new Set(plan.dias.flatMap((d) => d.bloques.map((b) => b.origen?.claseId)));
  const fechas = new Set(plan.dias.map((d) => d.fecha));
  return planificaciones.flatMap((p) => p.clases.filter((c) => c.fecha && fechas.has(c.fecha) && !ya.has(c.id)).map((c) => ({ plan: p, clase: c })));
}

// ---------- Materiales ----------

/**
 * Lista de materiales para preparar: junta los de cada bloque (una línea, o separados por comas o punto y coma),
 * sin repetir, indicando qué días se usan.
 */
export function materialesParaPreparar(plan: PlanSemanal) {
  const lista = new Map<string, { texto: string; dias: string[] }>();
  for (const dia of plan.dias) {
    for (const b of ordenarBloques(dia.bloques)) {
      for (const parte of b.materiales.split(/[\n;,]+/)) {
        const texto = parte.trim().replace(/^[-•·*]\s*/, '').replace(/\.$/, '');
        if (!texto) continue;
        const clave = texto.toLowerCase();
        const item = lista.get(clave) ?? { texto: texto.charAt(0).toUpperCase() + texto.slice(1), dias: [] };
        const nombre = nombreDia(dia.fecha).split(' ')[0].replace(',', '');
        if (!item.dias.includes(nombre)) item.dias.push(nombre);
        lista.set(clave, item);
      }
    }
  }
  return [...lista.values()];
}

export function planSemanalVacio(perfil: Pick<PlanSemanal, 'docente' | 'escuela' | 'grupo'>, alcance: PlanSemanal['alcance']): PlanSemanal {
  const ahora = Date.now();
  const hoy = hoyIso();
  // Viernes de tarde o fin de semana: se arma la semana que viene.
  const dia = new Date().getDay();
  const fecha = alcance === 'semana' ? lunesDe(dia === 5 ? sumarDias(hoy, 3) : hoy) : dia === 0 ? sumarDias(hoy, 1) : dia === 6 ? sumarDias(hoy, 2) : hoy;
  return {
    id: nuevoId(),
    alcance,
    fecha,
    ...perfil,
    dias: fechasDel(alcance, fecha).map((f) => ({ fecha: f, bloques: [] })),
    materiales: '',
    notas: '',
    creada: ahora,
    modificada: ahora,
  };
}
