import { z } from 'zod';

/** Las 10 competencias generales del Marco Curricular Nacional. */
export const COMPETENCIAS_MCN = [
  'Comunicación',
  'Pensamiento creativo',
  'Pensamiento crítico',
  'Pensamiento científico',
  'Pensamiento computacional',
  'Metacognitiva',
  'Intrapersonal',
  'Iniciativa y orientación a la acción',
  'Relacionamiento con los otros',
  'Ciudadanía local, global y digital',
] as const;

export const CompetenciaMCN = z.enum(COMPETENCIAS_MCN);
export type CompetenciaMCN = z.infer<typeof CompetenciaMCN>;

const CodigoCE = z.string().regex(/^CE\d+$/, 'Código de competencia específica inválido (ej.: CE1)');

/** Dónde está el dato en el PDF original, para poder verificarlo. */
const Fuente = z.object({ archivo: z.string(), paginas: z.array(z.number().int().positive()) });

export const CompetenciaEspecifica = z.object({
  codigo: CodigoCE,
  texto: z.string().min(10),
  competenciasMCN: z.array(CompetenciaMCN).min(1),
});

export const Contenido: z.ZodType<Contenido> = z.lazy(() =>
  z.object({
    id: z.string(),
    texto: z.string().min(2),
    subitems: z.array(Contenido).optional(),
  }),
);
export type Contenido = { id: string; texto: string; subitems?: Contenido[] };

export const BloqueContenidos = z.object({
  id: z.string(),
  titulo: z.string(), // p. ej. "Numeración racional"
  eje: z.string(), // p. ej. "Número"
  contenidoEstructurante: z.string(),
  ceVinculadas: z.array(CodigoCE).min(1),
  contenidos: z.array(Contenido).min(1),
});

export const CriterioLogro = z.object({
  id: z.string(),
  ce: CodigoCE,
  texto: z.string().min(10),
});

export const Grado = z.object({
  grado: z.number().int().min(1).max(9),
  bloques: z.array(BloqueContenidos).min(1),
  criteriosLogro: z.array(CriterioLogro).min(1),
  fuente: Fuente,
});

export const UnidadCurricular = z.object({
  id: z.string(),
  nombre: z.string(),
  espacio: z.string(),
  tramo: z.number().int(),
  version: z.string(),
  /** false hasta que una persona lo compare con el PDF. */
  revisado: z.boolean(),
  notasRevision: z.array(z.string()).default([]),
  fuente: Fuente,
  justificacion: z.string(),
  contenidosEstructurantes: z.array(z.string()).min(1),
  ejes: z.array(z.string()).min(1),
  competenciasEspecificas: z.array(CompetenciaEspecifica).min(1),
  grados: z.array(Grado).min(1),
  orientacionesMetodologicas: z.array(z.string()),
  metodologiasSugeridas: z.array(z.string()),
});
export type UnidadCurricular = z.infer<typeof UnidadCurricular>;
export type GradoUC = z.infer<typeof Grado>;
export type BloqueContenidos = z.infer<typeof BloqueContenidos>;
export type CriterioLogro = z.infer<typeof CriterioLogro>;

/** Chequeos que el esquema solo no cubre: referencias cruzadas e ids únicos. */
export function chequearConsistencia(uc: UnidadCurricular): string[] {
  const errores: string[] = [];
  const ces = new Set(uc.competenciasEspecificas.map((c) => c.codigo));
  const ids = new Set<string>();
  const registrar = (id: string) => {
    if (ids.has(id)) errores.push(`id repetido: ${id}`);
    ids.add(id);
  };
  const recorrer = (c: Contenido) => {
    registrar(c.id);
    c.subitems?.forEach(recorrer);
  };
  for (const g of uc.grados) {
    for (const b of g.bloques) {
      registrar(b.id);
      if (!uc.ejes.includes(b.eje)) errores.push(`${b.id}: eje "${b.eje}" no está en la lista de ejes`);
      b.ceVinculadas.forEach((ce) => ces.has(ce) || errores.push(`${b.id}: ${ce} no existe`));
      b.contenidos.forEach(recorrer);
    }
    for (const cr of g.criteriosLogro) {
      registrar(cr.id);
      if (!ces.has(cr.ce)) errores.push(`${cr.id}: ${cr.ce} no existe`);
    }
    for (const ce of ces) {
      if (!g.criteriosLogro.some((c) => c.ce === ce)) errores.push(`${g.grado}.º grado: ${ce} no tiene criterios de logro`);
    }
  }
  return errores;
}
