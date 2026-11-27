import { Link, useNavigate } from 'react-router-dom';
import { useGrupos } from '../datos/grupos';
import { Icono } from './Iconos';

/** Elige con qué grupo se trabaja: la app muestra solo sus planificaciones, horarios y avance. */
export function SelectorGrupo({ compacto }: { compacto?: boolean }) {
  const { grupos, activo, elegir } = useGrupos();
  const navegar = useNavigate();
  if (grupos.length === 0)
    return (
      <Link
        to="/grupos"
        title={compacto ? 'Agregar mis grupos' : undefined}
        className={`no-imprimir flex min-h-11 items-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-slate-300 px-3 text-[13px] font-bold whitespace-nowrap text-slate-600 hover:border-blue-400 hover:text-blue-700 ${compacto ? 'justify-center' : ''}`}
      >
        <Icono nombre="grupo" tamano={18} className="shrink-0" />
        {compacto ? (
          <>
            <span className="sm:hidden">
              Grupos<span className="sr-only"> (agregar mis grupos)</span>
            </span>
            <span className="hidden sm:inline">Agregar mis grupos</span>
          </>
        ) : (
          'Agregar mis grupos'
        )}
      </Link>
    );
  return (
    <label className="no-imprimir block">
      <span className={`mb-1 flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.08em] text-slate-500 uppercase ${compacto ? 'sr-only' : ''}`}>
        <Icono nombre="grupo" tamano={14} /> Grupo
      </span>
      <select
        value={activo?.id ?? ''}
        onChange={(e) => (e.target.value === '__grupos' ? navegar('/grupos') : elegir(e.target.value || null))}
        aria-label="Grupo con el que trabajás"
        className="min-h-11 w-full rounded-[14px] border-[1.5px] border-slate-200 bg-white px-3 text-[15px] font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
      >
        <option value="">Todos los grupos</option>
        {grupos.map((g) => (
          <option key={g.id} value={g.id}>
            {g.nombre || 'Sin nombre'}
          </option>
        ))}
        <option value="__grupos">Administrar grupos…</option>
      </select>
    </label>
  );
}
