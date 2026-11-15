import { cesDe, type BloqueContenidos, type Contenido, type CriterioLogro, type UnidadCurricular } from './esquema';
import { PROGRAMAS, normalizar } from './programas';

/** Raíces de palabras demasiado comunes en criterios y contenidos como para indicar el tema. */
const RAICES_VACIAS = new Set([
  'difer', 'situa', 'trave', 'parti', 'media', 'docen', 'conte', 'disti', 'forma', 'utili', 'ident', 'recon', 'reali', 'explo',
  'resol', 'probl', 'const', 'proce', 'elabo', 'compr', 'apren', 'estud', 'activ', 'propi', 'otros', 'entor', 'desar', 'parti',
  'model', 'inter', 'diver', 'traba', 'compa', 'relac', 'progr', 'gener', 'desde', 'sobre', 'entre', 'medio', 'nueva',
  'nuevo', 'segun', 'tambi', 'cuand', 'donde', 'compl', 'parte', 'comie', 'expre', 'grupo', 'perso',
]);
const raices = (t: string) =>
  new Set(
    normalizar(t)
      .split(/[^a-zñ]+/)
      .filter((w) => w.length >= 5)
      .map((w) => w.slice(0, 5))
      .filter((r) => !RAICES_VACIAS.has(r)),
  );
const textoCompleto = (c: Contenido): string => [c.texto, ...(c.profundizacion ?? []), ...(c.subitems ?? []).map(textoCompleto)].join(' ');

export type RefCriterio = { uc: UnidadCurricular; grado: number; criterio: CriterioLogro; ces: string[] };
/** Contenido de primer nivel (el que se puede seleccionar al planificar). */
export type RefContenido = { uc: UnidadCurricular; grado: number; bloque: BloqueContenidos; contenido: Contenido; ces: string[] };

const criterios = new Map<string, RefCriterio>();
const contenidos = new Map<string, RefContenido>();
/** Para cualquier id de contenido (incluidos subítems), el id del contenido de primer nivel. */
const raiz = new Map<string, string>();

const cesDeContenido = (c: Contenido, heredadas: string[]): string[] => {
  const propias = new Set(c.ceVinculadas ?? []);
  c.subitems?.forEach((s) => s.ceVinculadas?.forEach((ce) => propias.add(ce)));
  return propias.size ? [...propias] : heredadas;
};

for (const uc of PROGRAMAS) {
  for (const g of uc.grados) {
    for (const b of g.bloques) {
      for (const c of b.contenidos) {
        contenidos.set(c.id, { uc, grado: g.grado, bloque: b, contenido: c, ces: cesDeContenido(c, b.ceVinculadas) });
        const marcar = (x: Contenido) => {
          raiz.set(x.id, c.id);
          x.subitems?.forEach(marcar);
        };
        marcar(c);
      }
    }
    for (const cr of g.criteriosLogro) criterios.set(cr.id, { uc, grado: g.grado, criterio: cr, ces: cesDe(cr) });
  }
}

export const buscarCriterio = (id: string) => criterios.get(id);
export const buscarContenido = (id: string) => contenidos.get(id);
export const buscarUC = (id: string) => PROGRAMAS.find((p) => p.id === id);

/** Clave estable para agrupar por UC y grado. */
export const claveUCGrado = (ucId: string, grado: number) => `${ucId}|${grado}`;

/**
 * Contenidos sugeridos para los criterios elegidos: los que el programa asocia directamente al criterio
 * o, si no lo indica, los del mismo grado y unidad curricular que comparten alguna competencia
 * y además tratan el mismo tema (comparten palabras significativas con el criterio).
 */
export function sugerirContenidos(criterioIds: string[]): Set<string> {
  const sugeridos = new Set<string>();
  for (const id of criterioIds) {
    const ref = criterios.get(id);
    if (!ref) continue;
    if (ref.criterio.contenidos?.length) {
      ref.criterio.contenidos.forEach((c) => sugeridos.add(raiz.get(c) ?? c));
      continue;
    }
    const delCriterio = raices(ref.criterio.texto);
    for (const c of contenidos.values()) {
      if (c.uc.id !== ref.uc.id || c.grado !== ref.grado || c.bloque.transversal) continue;
      if (!c.ces.some((ce) => ref.ces.includes(ce))) continue;
      const delContenido = raices(`${c.bloque.titulo} ${textoCompleto(c.contenido)}`);
      if ([...delCriterio].some((r) => delContenido.has(r))) sugeridos.add(c.contenido.id);
    }
  }
  return sugeridos;
}

/** Competencias específicas y generales (MCN) que se movilizan con los criterios elegidos. */
export function competenciasMovilizadas(criterioIds: string[]) {
  const especificas = new Map<string, { uc: UnidadCurricular; codigo: string; texto: string }>();
  const generales = new Map<string, number>();
  for (const id of criterioIds) {
    const ref = criterios.get(id);
    if (!ref) continue;
    for (const codigo of ref.ces) {
      const ce = ref.uc.competenciasEspecificas.find((c) => c.codigo === codigo);
      if (!ce) continue;
      const clave = `${ref.uc.id}|${codigo}`;
      if (especificas.has(clave)) continue;
      especificas.set(clave, { uc: ref.uc, codigo, texto: ce.texto });
      ce.competenciasMCN.forEach((m) => generales.set(m, (generales.get(m) ?? 0) + 1));
    }
  }
  return {
    especificas: [...especificas.values()],
    generales: [...generales.entries()].sort((a, b) => b[1] - a[1]).map(([nombre]) => nombre),
  };
}

/** Descriptores iniciales de una rúbrica de 4 niveles a partir del criterio (el docente los edita). */
export function descriptoresSugeridos(texto: string, niveles: number): string[] {
  const base = texto.replace(/\.$/, '');
  const minuscula = base.charAt(0).toLowerCase() + base.slice(1);
  if (niveles !== 4) return Array.from({ length: niveles }, (_, i) => (i === niveles - 2 ? base + '.' : ''));
  return [
    `Con ayuda del docente, comienza a: ${minuscula}.`,
    `Logra parcialmente: ${minuscula}.`,
    `${base}.`,
    `${base}, con autonomía, y transfiere lo aprendido a nuevas situaciones.`,
  ];
}
