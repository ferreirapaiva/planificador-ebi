import type { NombreIcono } from '../componentes/Iconos';
import Dexie, { type EntityTable } from 'dexie';

export type TipoPlanificacion = 'unidad' | 'proyecto' | 'secuencia';

export const TIPOS: Record<TipoPlanificacion, { nombre: string; descripcion: string; icono: NombreIcono }> = {
  unidad: { nombre: 'Unidad didáctica', descripcion: 'Un tema de una o más áreas durante algunas semanas.', icono: 'libro' },
  proyecto: { nombre: 'Proyecto', descripcion: 'Parte de una pregunta o problema y termina en un producto final. Ideal para integrar áreas.', icono: 'objetivo' },
  secuencia: { nombre: 'Secuencia didáctica', descripcion: 'Una serie de clases encadenadas para lograr criterios concretos.', icono: 'grafico' },
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
  /** Grupo de la lista de grupos (si no, solo el texto de `grupo`). */
  grupoId?: string;
  grados: number[];
  ucIds: string[];
  desde: string;
  hasta: string;
  /** Paso 2: ¿qué quiero lograr? */
  criterios: string[];
  /** Meta de aprendizaje de cada criterio (id → texto), escrita o ajustada por el docente. Si falta, se usa la sugerida. */
  metas?: Record<string, string>;
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

export type Periodo = { id: string; nombre: string; desde: string; hasta: string };
/** `feriado`: día sin clases por feriado oficial (los demás son fechas para recordar y trabajar en clase). */
export type Efemeride = { fecha: string; nombre: string; feriado?: boolean };

export type CalendarioEscolar = {
  inicio: string;
  fin: string;
  /** Vacaciones y otros períodos sin clases (editables: verificar con el calendario oficial). */
  sinClases: Periodo[];
  efemerides: Efemeride[];
};

/** Meses lectivos (marzo a diciembre). */
export const MESES_LECTIVOS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const NOMBRE_MES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export type PlanAnual = {
  id: string;
  anio: number;
  docente: string;
  escuela: string;
  grupo: string;
  grupoId?: string;
  grados: number[];
  ucIds: string[];
  calendario: CalendarioEscolar;
  /** Para cada contenido (id), los meses (3 a 12) en que se trabaja. */
  distribucion: Record<string, number[]>;
  fundamentacion: string;
  notas: string;
  paso: number;
  creada: number;
  modificada: number;
};

/** Un momento del horario: una clase de una secuencia, un área o una rutina (recreo, comedor…). */
export type BloqueHorario = {
  id: string;
  inicio: string;
  fin: string;
  area: string;
  actividad: string;
  detalle: string;
  materiales: string;
  /** Si se trajo de una planificación: de dónde viene (el texto se copia y se puede cambiar). */
  origen?: { planificacionId: string; claseId: string; titulo: string };
};

export type DiaPlan = { fecha: string; bloques: BloqueHorario[] };

export type PlanSemanal = {
  id: string;
  alcance: 'dia' | 'semana';
  /** Día elegido, o el lunes de la semana. */
  fecha: string;
  docente: string;
  escuela: string;
  grupo: string;
  grupoId?: string;
  dias: DiaPlan[];
  materiales: string;
  notas: string;
  creada: number;
  modificada: number;
};

/** Un alumno de la lista de un grupo. */
export type Alumno = {
  id: string;
  nombre: string;
  /** Lo que se quiere contar a la familia en el informe (se guarda para volver a usarlo). */
  observacion?: string;
};

/** Un grupo de la docente (4.º A, 5.º B…): reúne sus planificaciones, planes y avance del programa. */
export type Grupo = {
  id: string;
  nombre: string;
  /** Lista de alumnos: se carga una vez y se usa en planillas, listas de cotejo, carnés, bingo, asistencia y evaluaciones. */
  alumnos?: Alumno[];
  grados: number[];
  escuela: string;
  docente: string;
  creada: number;
  modificada: number;
};

/**
 * Avance del programa: qué contenidos ya se trabajaron (o se están trabajando) con cada grupo.
 * `grupoKey` es el id del grupo o "general" cuando no se usan grupos.
 */
export type Seguimiento = {
  id: string;
  grupoKey: string;
  contenidoId: string;
  ucId: string;
  estado: 'en-curso' | 'dado';
  fecha: string;
  modificada: number;
};

export type EstadoAsistencia = 'P' | 'F' | 'J';

/** Asistencia de un día: el id es «grupo|fecha». Quien no figura en `estados` no tiene nada marcado. */
export type Asistencia = {
  id: string;
  grupoKey: string;
  fecha: string;
  estados: Record<string, EstadoAsistencia>;
  modificada: number;
};

/** Registro de evaluación: criterios en columnas, alumnos en filas, y el nivel alcanzado en cada casilla. */
export type RegistroEvaluacion = {
  id: string;
  grupoKey: string;
  titulo: string;
  fecha: string;
  criterios: string[];
  niveles: string[];
  /** Primer nivel (posición en `niveles`) que cuenta como logrado. */
  logro: number;
  /** alumnoId → posición del criterio → posición del nivel. */
  resultados: Record<string, Record<number, number>>;
  /** De qué planificación viene la rúbrica, si se trajo de una. */
  planificacionId?: string;
  modificada: number;
};

/** Diario de clase de un día: lo planeado, lo que se hizo de verdad y lo que quedó pendiente. */
export type EntradaDiario = {
  id: string;
  grupoKey: string;
  fecha: string;
  planeado: string;
  hecho: string;
  pendiente: string;
  /** Lo pendiente ya se pasó al día siguiente. */
  pasado?: boolean;
  modificada: number;
};

/**
 * Proyecto de trabajo personalizado (PTP): lo que se hace con un alumno que necesita más apoyo.
 * Es autosuficiente (guarda el nombre del alumno y los puntos de su seguimiento) para poder
 * compartirlo con la docente de apoyo, que lo abre en su propia copia de la app.
 */
export type ObjetivoPTP = {
  id: string;
  /** Criterio del que sale (el mismo texto que usan los registros de evaluación). */
  criterio: string;
  /** Qué se espera lograr, en concreto. */
  texto: string;
  /** Nivel que se quiere alcanzar, de 0 (en inicio) a 1 (destacado). */
  meta: number;
  /** Nivel con el que se empezó, de 0 a 1 (null si no se conocía). */
  partida: number | null;
  revision: string;
  estado: 'en-curso' | 'logrado' | 'ajustar';
};
export type AccionPTP = { id: string; texto: string; fecha: string; hecha: boolean; responsable: string };
/** Un punto del seguimiento de un criterio: nivel de 0 a 1 en una fecha. */
export type PuntoPTP = { id: string; fecha: string; criterio: string; nivel: number; nota: string; autor: string; origen: 'manual' | 'registro' };
export type RevisionPTP = { id: string; fecha: string; nota: string; autor: string };
export type PTP = {
  id: string;
  grupoKey: string;
  alumnoId: string;
  alumnoNombre: string;
  grupoNombre: string;
  estado: 'activo' | 'cerrado';
  inicio: string;
  revisarEl: string;
  docente: string;
  apoyo: string;
  situacion: string;
  estrategias: string;
  contexto: string;
  objetivos: ObjetivoPTP[];
  apoyos: string[];
  apoyosOtros: string;
  acciones: AccionPTP[];
  familiaAcuerdos: string;
  familiaFecha: string;
  equipo: string;
  /** Lo que se cuenta a la familia en el informe sobre cómo se acompaña al alumno. */
  familiaResumen: string;
  puntos: PuntoPTP[];
  revisiones: RevisionPTP[];
  /** Asistencia por mes (se completa al compartir, para que se vea sin los registros del grupo). */
  asistenciaMensual?: { mes: string; pct: number; dias: number }[];
  creada: number;
  modificada: number;
};

export const db = new Dexie('planificador-ebi') as Dexie & {
  ptps: EntityTable<PTP, 'id'>;
  asistencia: EntityTable<Asistencia, 'id'>;
  evaluaciones: EntityTable<RegistroEvaluacion, 'id'>;
  diario: EntityTable<EntradaDiario, 'id'>;
  planificaciones: EntityTable<Planificacion, 'id'>;
  planesAnuales: EntityTable<PlanAnual, 'id'>;
  planesSemanales: EntityTable<PlanSemanal, 'id'>;
  grupos: EntityTable<Grupo, 'id'>;
  seguimiento: EntityTable<Seguimiento, 'id'>;
};

db.version(1).stores({ planificaciones: 'id, modificada, tipo' });
db.version(2).stores({ planificaciones: 'id, modificada, tipo', planesAnuales: 'id, modificada, anio' });
db.version(3).stores({ planificaciones: 'id, modificada, tipo', planesAnuales: 'id, modificada, anio', planesSemanales: 'id, modificada, fecha' });
db.version(4).stores({
  planificaciones: 'id, modificada, tipo',
  planesAnuales: 'id, modificada, anio',
  planesSemanales: 'id, modificada, fecha',
  grupos: 'id, nombre',
  seguimiento: 'id, grupoKey, ucId',
});
db.version(5).stores({
  planificaciones: 'id, modificada, tipo',
  planesAnuales: 'id, modificada, anio',
  planesSemanales: 'id, modificada, fecha',
  grupos: 'id, nombre',
  seguimiento: 'id, grupoKey, ucId',
  asistencia: 'id, grupoKey, fecha',
  evaluaciones: 'id, grupoKey, fecha',
  diario: 'id, grupoKey, fecha',
});

db.version(6).stores({
  planificaciones: 'id, modificada, tipo',
  planesAnuales: 'id, modificada, anio',
  planesSemanales: 'id, modificada, fecha',
  grupos: 'id, nombre',
  seguimiento: 'id, grupoKey, ucId',
  asistencia: 'id, grupoKey, fecha',
  evaluaciones: 'id, grupoKey, fecha',
  diario: 'id, grupoKey, fecha',
  ptps: 'id, grupoKey, alumnoId, modificada',
});

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

/**
 * Una planificación está vacía si el docente todavía no escribió ni eligió nada propio
 * (los datos recordados —docente, escuela, grupo— y el tipo o grado no cuentan).
 */
export function estaVacia(p: Planificacion) {
  const textos = [p.titulo, p.evidencias, p.preguntaGuia, p.productoFinal, p.recursos, p.diversidad, p.notas, p.desde, p.hasta];
  const listas = [p.ucIds, p.criterios, p.contenidos, p.clases, p.instrumentos, p.metodologias];
  return textos.every((t) => !t?.trim()) && listas.every((l) => !l?.length);
}

/**
 * Borra los borradores vacíos que quedaron de tocar "Nueva planificación" y salir sin escribir nada.
 * Respeta los que se tocaron en los últimos minutos (pueden estar abiertos en otra pestaña).
 */
export async function borrarBorradoresVacios(minutos = 10) {
  const limite = Date.now() - minutos * 60_000;
  const ids = (await db.planificaciones.toArray()).filter((p) => p.modificada < limite && estaVacia(p)).map((p) => p.id);
  if (ids.length) await db.planificaciones.bulkDelete(ids);
  return ids.length;
}
