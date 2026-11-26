import { UnidadCurricular } from './esquema';

/**
 * Programas cargados: todos los JSON de data/programas/tramo-N/. Para sumar uno nuevo alcanza con crear el archivo.
 * Los del Tramo 3 conservan su id original ("matematica"); los demás llevan el tramo ("matematica-t2"),
 * así las planificaciones ya guardadas siguen apuntando al mismo programa.
 */
const archivos = import.meta.glob('../../data/programas/*/*.json', { eager: true, import: 'default' });

export const ESPACIOS = [
  { nombre: 'Científico-Matemático', color: 'bg-sky-600', suave: 'bg-sky-50 text-sky-900 border-sky-200' },
  { nombre: 'Ciencias Sociales y Humanidades', color: 'bg-amber-600', suave: 'bg-amber-50 text-amber-900 border-amber-200' },
  { nombre: 'Creativo-Artístico', color: 'bg-fuchsia-600', suave: 'bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200' },
  { nombre: 'Comunicación', color: 'bg-emerald-600', suave: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
] as const;

/** Tramos de Educación Básica Integrada que tienen programas en la app, con sus grados. */
export const TRAMOS = [
  { tramo: 2, grados: [1, 2] },
  { tramo: 3, grados: [3, 4] },
  { tramo: 4, grados: [5, 6] },
] as const;
export const GRADOS = TRAMOS.flatMap((t) => [...t.grados]);
export const tramoDeGrado = (grado: number): number => TRAMOS.find((t) => (t.grados as readonly number[]).includes(grado))?.tramo ?? 3;
export const gradosDelTramo = (tramo: number) => [...(TRAMOS.find((t) => t.tramo === tramo)?.grados ?? [])];
/** Texto para documentos: "Tramo 3" (o "Tramos 2 y 3" si se mezclan). */
export const textoTramo = (grados: number[]) => {
  const t = [...new Set(grados.map(tramoDeGrado))].sort();
  return t.length > 1 ? `Tramos ${t.join(' y ')}` : `Tramo ${t[0] ?? 3}`;
};

/** Unidades curriculares de cada tramo, en el orden en que se muestran. */
export const UC_BASE: { id: string; nombre: string; espacio: string }[] = [
  { id: 'matematica', nombre: 'Matemática', espacio: 'Científico-Matemático' },
  { id: 'fisica-quimica', nombre: 'Física-Química', espacio: 'Científico-Matemático' },
  { id: 'biologia', nombre: 'Ciencias del Ambiente (Biología)', espacio: 'Científico-Matemático' },
  { id: 'tierra-espacio', nombre: 'Ciencias de la Tierra y el Espacio', espacio: 'Científico-Matemático' },
  { id: 'historia', nombre: 'Historia', espacio: 'Ciencias Sociales y Humanidades' },
  { id: 'geografia', nombre: 'Geografía', espacio: 'Ciencias Sociales y Humanidades' },
  { id: 'ciudadania', nombre: 'Formación para la Ciudadanía', espacio: 'Ciencias Sociales y Humanidades' },
  { id: 'artes-visuales', nombre: 'Artes Visuales y Plásticas', espacio: 'Creativo-Artístico' },
  { id: 'literatura', nombre: 'Literatura', espacio: 'Creativo-Artístico' },
  { id: 'lengua', nombre: 'Lengua Española', espacio: 'Comunicación' },
];

/** Id del programa de una unidad curricular en un tramo. */
export const idUC = (base: string, tramo: number) => (tramo === 3 ? base : `${base}-t${tramo}`);
/** Id de la unidad curricular sin el tramo ("matematica-t2" → "matematica"). */
export const baseUC = (id: string) => id.replace(/-t\d+$/, '');

const orden = (p: UnidadCurricular) => p.tramo * 100 + UC_BASE.findIndex((u) => u.id === baseUC(p.id));
export const PROGRAMAS: UnidadCurricular[] = Object.values(archivos)
  .map((p) => UnidadCurricular.parse(p))
  .sort((a, b) => orden(a) - orden(b));

export const programasDelTramo = (tramo: number) => PROGRAMAS.filter((p) => p.tramo === tramo);
/** Programas que corresponden a los grados elegidos. */
export const programasDeGrados = (grados: number[]) => {
  const tramos = new Set(grados.map(tramoDeGrado));
  return PROGRAMAS.filter((p) => tramos.has(p.tramo));
};
/** Al cambiar de grado, cada UC elegida pasa al programa del tramo nuevo (si existe). */
export const ucIdsParaGrados = (ucIds: string[], grados: number[]) => {
  const tramos = [...new Set(grados.map(tramoDeGrado))];
  const ids = new Set(PROGRAMAS.map((p) => p.id));
  return [...new Set(ucIds.flatMap((id) => tramos.map((t) => idUC(baseUC(id), t)).filter((x) => ids.has(x))))];
};

export const colorEspacio = (espacio: string) => ESPACIOS.find((e) => e.nombre === espacio) ?? ESPACIOS[0];

/** Minúsculas y sin tildes, para buscar "fraccion" y encontrar "fracción". */
export const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
