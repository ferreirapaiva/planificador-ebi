import Dexie, { type EntityTable } from 'dexie';

export type TipoPlanificacion = 'unidad' | 'proyecto' | 'secuencia';

export const TIPOS: Record<TipoPlanificacion, { nombre: string; descripcion: string; icono: string }> = {
  unidad: { nombre: 'Unidad didáctica', descripcion: 'Un tema de una o más áreas durante algunas semanas.', icono: '📗' },
  proyecto: { nombre: 'Proyecto', descripcion: 'Parte de una pregunta o problema y termina en un producto final. Ideal para integrar áreas.', icono: '🚀' },
  secuencia: { nombre: 'Secuencia didáctica', descripcion: 'Una serie de clases encadenadas para lograr criterios concretos.', icono: '📝' },
};

export const NIVELES_POR_DEFECTO = ['En inicio', 'En proceso', 'Logrado', 'Destacado'];

export type FilaInstrumento = { criterioId: string; descriptores: string[] };
export type Instrumento = {
  id: string;
  tipo: 'rubrica' | 'lista_cotejo';
  titulo: string;
  /** Rúbrica: niveles de desempeño. Lista de cotejo: siempre ["Sí", "No"]. */
  niveles: string[];
  filas: FilaInstrumento[];
};

export type Clase = {
  id: string;
  titulo: string;
  fecha: string;
  duracion: string;
  proposito: string;
  inicio: string;
  desarrollo: string;
  cierre: string;
  recursos: string;
  evaluacion: string;
};

export type Planificacion = {
  id: string;
  tipo: TipoPlanificacion;
  titulo: string;
  docente: string;
  escuela: string;
  grupo: string;
  grados: number[];
  ucIds: string[];
  desde: string;
  hasta: string;
  /** Paso 2: ¿qué quiero lograr? */
  criterios: string[];
  /** Paso 3: ¿qué voy a enseñar? */
  contenidos: string[];
  /** Paso 4: ¿cómo sabré que lo lograron? */
  evidencias: string;
  instrumentos: Instrumento[];
  /** Paso 5: ¿cómo lo voy a enseñar? */
  preguntaGuia: string;
  productoFinal: string;
  metodologias: string[];
  clases: Clase[];
  recursos: string;
  diversidad: string;
  notas: string;
  paso: number;
  creada: number;
  modificada: number;
};

export const db = new Dexie('planificador-ebi') as Dexie & {
  planificaciones: EntityTable<Planificacion, 'id'>;
};

db.version(1).stores({ planificaciones: 'id, modificada, tipo' });

export const nuevoId = () => crypto.randomUUID();

export function planificacionVacia(): Planificacion {
  const ahora = Date.now();
  return {
    id: nuevoId(),
    tipo: 'unidad',
    titulo: '',
    docente: '',
    escuela: '',
    grupo: '',
    grados: [3],
    ucIds: [],
    desde: '',
    hasta: '',
    criterios: [],
    contenidos: [],
    evidencias: '',
    instrumentos: [],
    preguntaGuia: '',
    productoFinal: '',
    metodologias: [],
    clases: [],
    recursos: '',
    diversidad: '',
    notas: '',
    paso: 0,
    creada: ahora,
    modificada: ahora,
  };
}

export function claseVacia(n: number): Clase {
  return { id: nuevoId(), titulo: `Clase ${n}`, fecha: '', duracion: '', proposito: '', inicio: '', desarrollo: '', cierre: '', recursos: '', evaluacion: '' };
}

/** Datos del docente que se recuerdan para la próxima planificación (solo en este equipo). */
const CLAVE_PERFIL = 'planificador-ebi:perfil';
export function leerPerfil(): Pick<Planificacion, 'docente' | 'escuela' | 'grupo'> {
  try {
    return { docente: '', escuela: '', grupo: '', ...JSON.parse(localStorage.getItem(CLAVE_PERFIL) ?? '{}') };
  } catch {
    return { docente: '', escuela: '', grupo: '' };
  }
}
export function guardarPerfil(p: Pick<Planificacion, 'docente' | 'escuela' | 'grupo'>) {
  try {
    localStorage.setItem(CLAVE_PERFIL, JSON.stringify({ docente: p.docente, escuela: p.escuela, grupo: p.grupo }));
  } catch {
    /* sin almacenamiento disponible: no es grave */
  }
}
