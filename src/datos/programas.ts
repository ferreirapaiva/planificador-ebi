import { UnidadCurricular } from './esquema';
import matematica from '../../data/programas/tramo-3/matematica.json';

/** Programas cargados. Al sumar una UC nueva, agregarla acá. */
export const PROGRAMAS: UnidadCurricular[] = [matematica].map((p) => UnidadCurricular.parse(p));

export const ESPACIOS = [
  { nombre: 'Científico-Matemático', color: 'bg-sky-600', suave: 'bg-sky-50 text-sky-900 border-sky-200' },
  { nombre: 'Ciencias Sociales y Humanidades', color: 'bg-amber-600', suave: 'bg-amber-50 text-amber-900 border-amber-200' },
  { nombre: 'Creativo-Artístico', color: 'bg-fuchsia-600', suave: 'bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200' },
  { nombre: 'Comunicación', color: 'bg-emerald-600', suave: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
] as const;

/** Unidades curriculares del Tramo 3 cuyos PDF están en PROGRAMAS/ (las que aún no se cargaron figuran como pendientes). */
export const UC_TRAMO_3: { id: string; nombre: string; espacio: string }[] = [
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

export const colorEspacio = (espacio: string) => ESPACIOS.find((e) => e.nombre === espacio) ?? ESPACIOS[0];

/** Minúsculas y sin tildes, para buscar "fraccion" y encontrar "fracción". */
export const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
