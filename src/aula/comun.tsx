import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Alumno, Grupo } from '../datos/db';
import { Aviso } from '../componentes/ui';

export type ContextoClase = { grupo: Grupo | null; grupoKey: string; alumnos: Alumno[] };

/** Avisa qué falta para usar la sección (grupo elegido y lista de alumnos). Devuelve null si ya se puede trabajar. */
export function FaltaLista({ grupo, alumnos }: { grupo: Grupo | null; alumnos: Alumno[] }): ReactNode {
  if (!grupo) {
    return (
      <Aviso tono="alerta">
        Elegí un grupo en la barra lateral para llevar su asistencia y sus evaluaciones. Si todavía no cargaste ninguno, hacelo en{' '}
        <Link to="/grupos" className="font-bold underline">Mis grupos</Link>.
      </Aviso>
    );
  }
  if (!alumnos.length) {
    return (
      <Aviso tono="alerta">
        El grupo {grupo.nombre} todavía no tiene lista de alumnos. Cargala una sola vez en{' '}
        <Link to="/grupos" className="font-bold underline">Mis grupos</Link> (Editar) y se usa acá y en las Hojas de actividades.
      </Aviso>
    );
  }
  return null;
}

export const CLASE_SELECT = 'min-h-11 rounded-[14px] border-[1.5px] border-slate-200 bg-white px-3 text-[15px] text-slate-900 focus:border-blue-500 focus:outline-none';
export const CLASE_FECHA = 'min-h-11 rounded-[14px] border-[1.5px] border-slate-200 bg-white px-3.5 text-[15px] text-slate-900 focus:border-blue-500 focus:outline-none';
