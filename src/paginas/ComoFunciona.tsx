import { Link } from 'react-router-dom';
import { Icono, type NombreIcono } from '../componentes/Iconos';
import { abrirGuia } from '../componentes/GuiaInicial';

type Seccion = { icono: NombreIcono; tile: string; titulo: string; puntos: string[]; enlaces: { to: string; texto: string }[] };

const SECCIONES: Seccion[] = [
  {
    icono: 'grupo',
    tile: 'bg-menta-500 text-white',
    titulo: 'Tus grupos',
    puntos: [
      'Cargá tus grupos (4.º A, 5.º B…) con su grado, escuela y docente.',
      'Elegí con qué grupo trabajás en la barra lateral: la app muestra solo sus planificaciones, horarios y avance.',
      'Lo que creás sale con el grupo, la escuela y la docente ya completados.',
      'Cargá la lista de alumnos una sola vez: se usa en planillas, listas de cotejo, carnés y bingo ya con los nombres, y en Mi clase.',
      'Si das clase a un solo grupo, no hace falta cargarlo.',
    ],
    enlaces: [{ to: '/grupos', texto: 'Mis grupos' }],
  },
  {
    icono: 'nueva',
    tile: 'bg-blue-600 text-white',
    titulo: 'Planificaciones',
    puntos: [
      '«Nueva planificación» es el punto de partida: elegís qué armar (unidad didáctica, proyecto, secuencia, plan anual, plan semanal o plan diario).',
      'Las unidades, proyectos y secuencias tienen un asistente paso a paso: qué querés lograr (criterios de logro), qué vas a enseñar, cómo sabrás que lo lograron y cómo lo vas a enseñar.',
      'Descargá el resultado en Word o PDF, o imprimilo.',
      'En «Mis planificaciones» las encontrás todas, con buscador.',
    ],
    enlaces: [{ to: '/nueva', texto: 'Nueva planificación' }, { to: '/mis-planificaciones', texto: 'Mis planificaciones' }],
  },
  {
    icono: 'copiar',
    tile: 'bg-coral-500 text-white',
    titulo: 'Reutilizar lo del año pasado',
    puntos: [
      'En cada planificación, plan anual u horario tocá «Reutilizar»: hacés una copia para ajustarla, o la pasás a otro grupo.',
      'En las planificaciones podés dejar las copias sin fechas para ponerlas de nuevo.',
      'En el plan anual elegís el año: se arma el calendario de ese año y se mantiene la distribución de contenidos.',
    ],
    enlaces: [{ to: '/mis-planificaciones', texto: 'Ir a mis planificaciones' }],
  },
  {
    icono: 'calendario',
    tile: 'bg-coral-500 text-white',
    titulo: 'Plan anual',
    puntos: [
      'Repartí los contenidos del programa en los meses del año, con el calendario escolar (vacaciones y efemérides).',
      'La pantalla «Cobertura» te muestra qué ya planificaste en detalle y qué te falta.',
    ],
    enlaces: [{ to: '/plan-anual', texto: 'Plan anual' }],
  },
  {
    icono: 'reloj',
    tile: 'bg-menta-500 text-white',
    titulo: 'Plan diario y semanal',
    puntos: [
      'Se crean desde «Nueva planificación» y se encuentran después en «Mis planificaciones».',
      'Armá el horario del día o de la semana trayendo las clases de tus planificaciones, o agregando actividades y rutinas.',
      'La app junta los materiales que tenés que preparar.',
      '«Horario para pegar en el aula» lo muestra en una sola hoja A4 horizontal, con colores por área, listo para imprimir.',
      'Desde cada momento podés abrir una hoja de actividades del tema.',
    ],
    enlaces: [{ to: '/nueva', texto: 'Nueva planificación' }, { to: '/plan-semanal', texto: 'Mis planes del día y la semana' }],
  },
  {
    icono: 'grafico',
    tile: 'bg-blue-600 text-white',
    titulo: 'Avance del programa',
    puntos: [
      'Marcá cada contenido como «en curso» o «trabajado» para tu grupo.',
      'Ves el porcentaje de avance de cada unidad curricular y cuántos contenidos planificaste pero todavía no diste.',
    ],
    enlaces: [{ to: '/seguimiento', texto: 'Avance del programa' }],
  },
  {
    icono: 'grupo',
    tile: 'bg-menta-500 text-white',
    titulo: 'Mi clase',
    puntos: [
      'Asistencia diaria: marcá presente, falta o falta justificada, y mirá el resumen del mes por alumno.',
      'Evaluaciones: registrá el nivel de cada alumno en cada criterio (desde una rúbrica de tus planificaciones o en blanco) y mirá quién lo logró y a quién reforzar.',
      'Informe para las familias: con la asistencia y los resultados, listo para imprimir, guardar en PDF o copiar; uno por alumno o de todo el grupo.',
      'Diario de clase: anotá lo que planeaste, lo que hiciste de verdad y lo que quedó pendiente, y pasalo al día siguiente con un toque.',
    ],
    enlaces: [{ to: '/clase', texto: 'Mi clase' }],
  },
  {
    icono: 'hoja',
    tile: 'bg-amarillo-400 text-slate-900',
    titulo: 'Hojas de actividades',
    puntos: [
      'Fichas de Matemática, Lengua y Ciencias, sopas de letras, crucigramas y más, en PDF con su hoja de respuestas.',
      'Herramientas para el aula: evaluaciones con rúbrica en una sola hoja, rúbricas y listas de cotejo, tickets de salida, planillas, registro de lectura, bingo y tarjetas.',
      'Podés pedir la ficha en nivel fácil o difícil, guardar tus fichas favoritas y poner el encabezado de tu escuela.',
    ],
    enlaces: [{ to: '/actividades', texto: 'Hojas de actividades' }],
  },
  {
    icono: 'libro',
    tile: 'bg-amarillo-400 text-slate-900',
    titulo: 'Programas',
    puntos: ['Explorá los contenidos y criterios de logro de cada unidad curricular de 1.º a 6.º, con búsqueda.'],
    enlaces: [{ to: '/programas', texto: 'Programas' }],
  },
  {
    icono: 'descargar',
    tile: 'bg-coral-500 text-white',
    titulo: 'Tus datos y la copia de seguridad',
    puntos: [
      'Todo se guarda en este navegador y funciona sin conexión; se puede instalar como aplicación.',
      'En «Respaldo y seguridad» descargás una copia con todo: planificaciones, planes, grupos y avance. Podés protegerla con contraseña.',
      'La app te recuerda hacer la copia cada cierto tiempo, y en Chrome o Edge puede guardar sola una copia por día en una carpeta que elijas (por ejemplo, la de Drive o OneDrive).',
      'Antes de restaurar, te muestra lo que tiene la copia y comprueba que no esté dañada. Con ese archivo recuperás todo o lo pasás a otro equipo.',
    ],
    enlaces: [{ to: '/respaldo', texto: 'Respaldo y seguridad' }],
  },
];

export function ComoFunciona() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">Cómo funciona</h1>
          <p className="mt-1 max-w-2xl text-slate-600">Todo lo que podés hacer con el Planificador EBI, explicado en pocas palabras.</p>
        </div>
        <button
          type="button"
          onClick={abrirGuia}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgb(91_75_245/0.28)] hover:bg-blue-700"
        >
          <Icono nombre="ayuda" tamano={18} grosor={2.4} />
          Ver la guía de primer uso
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {SECCIONES.map((s) => (
          <section key={s.titulo} className="flex flex-col rounded-[24px] bg-white p-5 shadow-suave">
            <h2 className="flex items-center gap-3 text-[19px] font-extrabold text-slate-900">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${s.tile}`}><Icono nombre={s.icono} tamano={22} grosor={2.2} /></span>
              {s.titulo}
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-700 marker:text-blue-400">
              {s.puntos.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <div className="mt-auto flex flex-wrap gap-x-5 gap-y-1 pt-4">
              {s.enlaces.map((e) => (
                <Link key={e.to} to={e.to} className="text-[15px] font-extrabold text-blue-700 hover:text-blue-900">{e.texto} →</Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
