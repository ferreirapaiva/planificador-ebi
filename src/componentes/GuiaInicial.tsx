import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icono, type NombreIcono } from './Iconos';

const CLAVE = 'planificador-ebi:guia-vista';
const EVENTO = 'planificador-ebi:abrir-guia';

/** Abre la guía de primer uso (por ejemplo, desde «Cómo funciona»). */
export const abrirGuia = () => window.dispatchEvent(new Event(EVENTO));

type Paso = { icono: NombreIcono; color: string; titulo: string; texto: string; enlace?: { to: string; texto: string } };

export const PASOS_GUIA: Paso[] = [
  {
    icono: 'check',
    color: 'bg-blue-600 text-white',
    titulo: 'Te damos la bienvenida',
    texto: 'El Planificador EBI te ayuda a planificar con los programas del Tramo 3, organizar la semana y preparar el material. En un minuto te mostramos lo principal.',
  },
  {
    icono: 'grupo',
    color: 'bg-menta-500 text-white',
    titulo: 'Elegí tu grupo',
    texto: 'Cargá tus grupos (4.º A, 5.º B…) y elegí con cuál trabajás: cada uno tiene sus planificaciones, horarios y avance del programa. Si das clase a un solo grupo, podés saltear este paso.',
    enlace: { to: '/grupos', texto: 'Cargar mis grupos' },
  },
  {
    icono: 'nueva',
    color: 'bg-coral-500 text-white',
    titulo: 'Planificá',
    texto: 'En «Nueva planificación» un asistente te guía paso a paso desde los criterios de logro del programa. En «Plan anual» repartís los contenidos en el año. Y podés copiar la planificación del año pasado y ajustarla.',
    enlace: { to: '/nueva', texto: 'Crear una planificación' },
  },
  {
    icono: 'reloj',
    color: 'bg-menta-500 text-white',
    titulo: 'Organizá la semana',
    texto: 'En «Plan diario y semanal» armás el horario con las clases de tus planificaciones. Después lo imprimís en una sola hoja, listo para pegar en el aula.',
    enlace: { to: '/plan-semanal', texto: 'Armar un horario' },
  },
  {
    icono: 'hoja',
    color: 'bg-amarillo-400 text-slate-900',
    titulo: 'Preparate el material',
    texto: '«Hojas de actividades» genera fichas, evaluaciones con rúbrica, tickets de salida, bingos y más, en PDF listos para imprimir y con su hoja de respuestas.',
    enlace: { to: '/actividades', texto: 'Ver las hojas de actividades' },
  },
  {
    icono: 'grafico',
    color: 'bg-blue-600 text-white',
    titulo: 'Seguí el avance',
    texto: 'En «Avance del programa» marcás qué contenidos ya trabajaste con cada grupo y ves cuánto del programa llevás en cada unidad curricular.',
    enlace: { to: '/seguimiento', texto: 'Ver el avance' },
  },
  {
    icono: 'descargar',
    color: 'bg-coral-500 text-white',
    titulo: 'Tus datos quedan en este equipo',
    texto: 'La app funciona sin conexión y guarda todo en este navegador. En «Respaldo y seguridad» descargás una copia (con contraseña, si querés) o elegís una carpeta para que se guarde sola. Cuando quieras repasar esto, abrí «Cómo funciona».',
    enlace: { to: '/respaldo', texto: 'Ir a Respaldo y seguridad' },
  },
];

/** Recorrido corto la primera vez que se abre la app. Se puede saltear y volver a ver desde «Cómo funciona». */
export function GuiaInicial() {
  const [abierta, setAbierta] = useState(() => {
    try {
      return !localStorage.getItem(CLAVE);
    } catch {
      return false;
    }
  });
  const [i, setI] = useState(0);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const abrir = () => {
      setI(0);
      setAbierta(true);
    };
    window.addEventListener(EVENTO, abrir);
    return () => window.removeEventListener(EVENTO, abrir);
  }, []);

  const cerrar = () => {
    try {
      localStorage.setItem(CLAVE, '1');
    } catch {
      /* sin almacenamiento: la guía volverá a aparecer, no es grave */
    }
    setAbierta(false);
  };

  useEffect(() => {
    if (!abierta) return;
    boton.current?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, PASOS_GUIA.length - 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [abierta, i]);

  if (!abierta) return null;
  const paso = PASOS_GUIA[i];
  const ultimo = i === PASOS_GUIA.length - 1;
  return (
    <div className="no-imprimir fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="guia-titulo" className="w-full max-w-lg rounded-[28px] bg-white p-7 shadow-elevada sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-[11px] font-extrabold tracking-[0.08em] text-blue-600 uppercase">
            Guía de primer uso · {i + 1} de {PASOS_GUIA.length}
          </p>
          <button type="button" onClick={cerrar} className="rounded-full px-3 py-1.5 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            Saltar
          </button>
        </div>
        <span className={`mt-5 flex h-16 w-16 items-center justify-center rounded-[22px] ${paso.color}`}>
          <Icono nombre={paso.icono} tamano={32} grosor={2.2} />
        </span>
        <h2 id="guia-titulo" className="mt-4 text-[26px] leading-tight font-extrabold tracking-tight text-slate-900">{paso.titulo}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{paso.texto}</p>
        {paso.enlace && (
          <Link
            to={paso.enlace.to}
            onClick={cerrar}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-slate-200 bg-white px-5 text-sm font-extrabold text-blue-800 hover:border-blue-300 hover:bg-blue-50"
          >
            {paso.enlace.texto}
            <Icono nombre="flecha" tamano={18} grosor={2.4} />
          </Link>
        )}
        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden="true">
            {PASOS_GUIA.map((_, n) => (
              <span key={n} className={`h-2 rounded-full transition-all ${n === i ? 'w-6 bg-blue-600' : 'w-2 bg-slate-200'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {i > 0 && (
              <button type="button" onClick={() => setI(i - 1)} className="min-h-11 rounded-full border-[1.5px] border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-900 hover:bg-slate-50">
                Anterior
              </button>
            )}
            <button
              ref={boton}
              type="button"
              onClick={() => (ultimo ? cerrar() : setI(i + 1))}
              className="min-h-11 rounded-full bg-blue-600 px-5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgb(91_75_245/0.28)] hover:bg-blue-700"
            >
              {ultimo ? 'Empezar' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
