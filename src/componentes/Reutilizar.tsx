import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlanAnual, PlanSemanal, Planificacion } from '../datos/db';
import { perteneceAlGrupo, useGrupos } from '../datos/grupos';
import { sumarDias } from '../datos/planSemanal';
import { copiarPlanAnual, copiarPlanificacion, copiarPlanSemanal, moverAGrupo } from '../datos/reutilizar';
import { Campo } from './ui';

type Props =
  | { tipo: 'planificacion'; item: Planificacion; onCerrar: () => void }
  | { tipo: 'anual'; item: PlanAnual; onCerrar: () => void }
  | { tipo: 'semanal'; item: PlanSemanal; onCerrar: () => void };

const CAMPO = 'mt-1 w-full min-h-11 rounded-[14px] border-[1.5px] border-slate-200 bg-white px-3.5 py-2 text-[15px] text-slate-900 focus:border-blue-500 focus:outline-none';

function Opcion({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      className={`min-h-11 flex-1 rounded-[14px] px-3.5 py-2 text-left text-sm font-bold transition ${
        activa ? 'border-2 border-blue-600 bg-blue-100 text-blue-900' : 'border-[1.5px] border-slate-200 bg-white text-slate-700 hover:border-blue-300'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Reutilizar una planificación, un plan anual o un horario: hacer una copia (por ejemplo, la del año pasado)
 * para ajustarla, o pasarlo de un grupo a otro.
 */
export function DialogoReutilizar(props: Props) {
  const { tipo, item, onCerrar } = props;
  const { grupos } = useGrupos();
  const navegar = useNavigate();
  const delItem = grupos.find((g) => perteneceAlGrupo(item, g));
  const [destino, setDestino] = useState(delItem?.id ?? '');
  const [modo, setModo] = useState<'copia' | 'mover'>('copia');
  const [titulo, setTitulo] = useState(tipo === 'planificacion' ? `${item.titulo || 'Sin título'} (copia)` : '');
  const [borrarFechas, setBorrarFechas] = useState(true);
  const [anio, setAnio] = useState(tipo === 'anual' ? String(item.anio + 1) : '');
  const [fecha, setFecha] = useState(tipo === 'semanal' ? sumarDias(item.fecha, item.alcance === 'dia' ? 1 : 7) : '');
  const [trabajando, setTrabajando] = useState(false);
  const primero = useRef<HTMLDivElement>(null);

  useEffect(() => {
    primero.current?.querySelector<HTMLElement>('input,select,button')?.focus();
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onCerrar]);

  const grupo = grupos.find((g) => g.id === destino) ?? null;
  const gradosItem = tipo === 'semanal' ? null : item.grados;
  const otroGrado = !!grupo && !!gradosItem && gradosItem.join() !== grupo.grados.join();
  const nombreTipo = tipo === 'planificacion' ? 'esta planificación' : tipo === 'anual' ? 'este plan anual' : 'este horario';

  const hacer = async () => {
    setTrabajando(true);
    try {
      if (modo === 'mover') {
        await moverAGrupo(tipo === 'planificacion' ? 'planificaciones' : tipo === 'anual' ? 'planesAnuales' : 'planesSemanales', item.id, grupo);
        onCerrar();
        return;
      }
      const base = { grupo, conservar: grupos.length === 0 };
      if (tipo === 'planificacion') navegar(`/planificacion/${await copiarPlanificacion(item, { ...base, titulo: titulo.trim() || undefined, borrarFechas })}`);
      else if (tipo === 'anual') navegar(`/plan-anual/${await copiarPlanAnual(item, { ...base, anio: Number(anio) || item.anio + 1 })}`);
      else navegar(`/plan-semanal/${await copiarPlanSemanal(item, { ...base, fecha: fecha || item.fecha })}`);
      onCerrar();
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <div className="no-imprimir fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onCerrar}>
      <div
        ref={primero}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reutilizar-titulo"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white p-7 shadow-elevada"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="reutilizar-titulo" className="text-[21px] font-extrabold text-slate-900">Reutilizar {nombreTipo}</h2>
        <p className="mt-1 text-sm text-slate-600">
          Hacé una copia para ajustarla (por ejemplo, la del año pasado){grupos.length > 0 ? ' o pasala a otro grupo' : ''}. La original no cambia.
        </p>

        {grupos.length > 0 && (
          <div className="mt-5 space-y-4">
            <div className="flex gap-2" role="group" aria-label="Qué querés hacer">
              <Opcion activa={modo === 'copia'} onClick={() => setModo('copia')}>Hacer una copia</Opcion>
              <Opcion activa={modo === 'mover'} onClick={() => setModo('mover')}>Pasarla a otro grupo (sin copiar)</Opcion>
            </div>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">{modo === 'mover' ? 'Grupo de destino' : 'Para el grupo'}</span>
              <select value={destino} onChange={(e) => setDestino(e.target.value)} className={CAMPO}>
                <option value="">Sin grupo</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>{g.nombre || 'Sin nombre'}</option>
                ))}
              </select>
            </label>
            {otroGrado && (
              <p className="rounded-[14px] bg-amarillo-50 px-3.5 py-2.5 text-sm text-amarillo-800">
                Este grupo es de {grupo!.grados.map((g) => `${g}.º`).join(' y ')}. Los criterios y contenidos de los programas cambian con el grado: revisalos después.
              </p>
            )}
          </div>
        )}

        {modo === 'copia' && (
          <div className="mt-5 space-y-4">
            {tipo === 'planificacion' && (
              <>
                <Campo etiqueta="Título de la copia" valor={titulo} onCambio={setTitulo} />
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={borrarFechas} onChange={(e) => setBorrarFechas(e.target.checked)} className="mt-0.5 h-5 w-5 accent-blue-600" />
                  <span className="text-sm text-slate-700">
                    <strong>Dejar sin fechas</strong> las clases y el período, para ponerlas de nuevo
                  </span>
                </label>
              </>
            )}
            {tipo === 'anual' && (
              <label className="block">
                <span className="text-sm font-bold text-slate-700">Año lectivo de la copia</span>
                <input type="number" min={2024} max={2100} value={anio} onChange={(e) => setAnio(e.target.value)} className={CAMPO} />
                <span className="mt-1 block text-xs text-slate-500">Si cambia el año, se arma el calendario sugerido de ese año; la distribución de contenidos se mantiene.</span>
              </label>
            )}
            {tipo === 'semanal' && <Campo etiqueta={item.alcance === 'dia' ? 'Día de la copia' : 'Semana de la copia (cualquier día)'} tipo="date" valor={fecha} onCambio={setFecha} />}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="min-h-11 rounded-full border-[1.5px] border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-900 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            type="button"
            onClick={hacer}
            disabled={trabajando}
            className="min-h-11 rounded-full bg-blue-600 px-5 text-sm font-extrabold text-white hover:bg-blue-700 disabled:bg-blue-300"
          >
            {modo === 'mover' ? 'Pasar al grupo' : 'Crear la copia'}
          </button>
        </div>
      </div>
    </div>
  );
}
