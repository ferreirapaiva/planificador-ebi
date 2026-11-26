import { perteneceAlGrupo, useGrupos } from '../datos/grupos';
import { Campo } from './ui';

type Datos = { grupo: string; grupoId?: string; escuela: string; docente: string };

/** Grupo de una planificación o plan: se elige de la lista de grupos o, si no hay grupos cargados, se escribe. */
export function CampoGrupo({ valor, onCambio }: { valor: Datos; onCambio: (p: Partial<Datos>) => void }) {
  const { grupos } = useGrupos();
  if (grupos.length === 0) return <Campo etiqueta="Grupo" valor={valor.grupo} onCambio={(v) => onCambio({ grupo: v, grupoId: undefined })} placeholder="Ej.: 4.º A" />;
  const actual = grupos.find((g) => perteneceAlGrupo(valor, g));
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">Grupo</span>
      <select
        value={actual?.id ?? (valor.grupo ? '__texto' : '')}
        onChange={(e) => {
          const g = grupos.find((x) => x.id === e.target.value);
          if (g) onCambio({ grupo: g.nombre, grupoId: g.id, escuela: valor.escuela || g.escuela, docente: valor.docente || g.docente });
          else if (e.target.value === '') onCambio({ grupo: '', grupoId: undefined });
        }}
        className="mt-1 w-full min-h-11 rounded-[14px] border-[1.5px] border-slate-200 bg-white px-3.5 py-2 text-[15px] text-slate-900 focus:border-blue-500 focus:outline-none"
      >
        <option value="">Sin grupo</option>
        {!actual && valor.grupo && <option value="__texto">{valor.grupo} (sin cargar en Mis grupos)</option>}
        {grupos.map((g) => (
          <option key={g.id} value={g.id}>{g.nombre}</option>
        ))}
      </select>
    </label>
  );
}
