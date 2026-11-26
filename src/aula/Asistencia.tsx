import { useState } from 'react';
import { marcarAsistencia, resumenAsistencia, useAsistenciaDelDia, useAsistencias, ETIQUETA_ASISTENCIA, fechaLarga } from '../datos/aula';
import type { EstadoAsistencia } from '../datos/db';
import { hoyIso, sumarDias } from '../datos/planSemanal';
import { Boton } from '../componentes/ui';
import { CLASE_FECHA, type ContextoClase } from './comun';

const ESTILOS: Record<EstadoAsistencia, { on: string; texto: string }> = {
  P: { on: 'border-menta-500 bg-menta-50 text-menta-700', texto: 'Presente' },
  F: { on: 'border-coral-500 bg-coral-50 text-coral-700', texto: 'Falta' },
  J: { on: 'border-amarillo-400 bg-amarillo-50 text-amarillo-800', texto: 'Justificada' },
};

export function Asistencia({ grupoKey, alumnos }: ContextoClase) {
  const [fecha, setFecha] = useState(hoyIso);
  const [mes, setMes] = useState(() => hoyIso().slice(0, 7));
  const dia = useAsistenciaDelDia(grupoKey, fecha);
  const todas = useAsistencias(grupoKey);
  const estados = dia?.estados ?? {};
  const cuenta = (e: EstadoAsistencia) => alumnos.filter((a) => estados[a.id] === e).length;
  const sinMarcar = alumnos.filter((a) => !estados[a.id]).length;
  const hayMes = /^\d{4}-\d{2}$/.test(mes);

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-[24px] bg-white p-5 shadow-suave">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Día</span>
            <input type="date" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} className={`mt-1 block ${CLASE_FECHA}`} />
          </label>
          <Boton variante="secundario" onClick={() => setFecha(sumarDias(fecha, -1))}>← Anterior</Boton>
          <Boton variante="secundario" onClick={() => setFecha(sumarDias(fecha, 1))}>Siguiente →</Boton>
          <Boton variante="secundario" onClick={() => setFecha(hoyIso())}>Hoy</Boton>
          <span className="ml-auto" />
          <Boton onClick={() => marcarAsistencia(grupoKey, fecha, Object.fromEntries(alumnos.filter((a) => !estados[a.id]).map((a) => [a.id, 'P' as const])))} disabled={!sinMarcar}>
            Marcar presentes a los que faltan marcar
          </Boton>
        </div>
        <p className="m-0 text-sm font-semibold capitalize text-slate-700">{fechaLarga(fecha)}</p>
        <p className="m-0 text-sm text-slate-600" aria-live="polite">
          {cuenta('P')} {cuenta('P') === 1 ? 'presente' : 'presentes'} · {cuenta('F')} {cuenta('F') === 1 ? 'falta' : 'faltas'} · {cuenta('J')} {cuenta('J') === 1 ? 'justificada' : 'justificadas'} · {sinMarcar} sin marcar
        </p>
        <ul className="m-0 grid list-none gap-2 p-0 md:grid-cols-2">
          {alumnos.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-[16px] border-[1.5px] border-slate-200 px-3 py-2">
              <span className="mr-auto min-w-0 flex-1 basis-32 text-[15px] font-semibold text-slate-900">{a.nombre}</span>
              {(Object.keys(ESTILOS) as EstadoAsistencia[]).map((e) => {
                const activo = estados[a.id] === e;
                return (
                  <button
                    key={e}
                    type="button"
                    aria-pressed={activo}
                    aria-label={`${a.nombre}: ${ETIQUETA_ASISTENCIA[e]}`}
                    onClick={() => marcarAsistencia(grupoKey, fecha, { [a.id]: activo ? null : e })}
                    className={`min-h-10 rounded-full border-[1.5px] px-3 text-sm font-bold transition ${activo ? ESTILOS[e].on : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300'}`}
                  >
                    {ESTILOS[e].texto}
                  </button>
                );
              })}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-[24px] bg-white p-5 shadow-suave">
        <div className="flex flex-wrap items-end gap-3">
          <h2 className="m-0 mr-auto text-[19px] font-extrabold text-slate-900">Resumen del mes</h2>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Mes</span>
            <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className={`mt-1 block ${CLASE_FECHA}`} />
          </label>
        </div>
        {hayMes && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-700">
                  <th className="py-2 pr-3">Alumno</th>
                  <th className="px-2 text-center">Presentes</th>
                  <th className="px-2 text-center">Faltas</th>
                  <th className="px-2 text-center">Justificadas</th>
                  <th className="px-2 text-center">Asistencia</th>
                </tr>
              </thead>
              <tbody>
                {alumnos.map((a) => {
                  const r = resumenAsistencia(todas, a.id, `${mes}-01`, `${mes}-31`);
                  return (
                    <tr key={a.id} className="border-b border-slate-200">
                      <td className="py-2 pr-3 font-semibold text-slate-900">{a.nombre}</td>
                      <td className="px-2 text-center">{r.presentes}</td>
                      <td className="px-2 text-center">{r.faltas}</td>
                      <td className="px-2 text-center">{r.justificadas}</td>
                      <td className="px-2 text-center font-bold">{r.porcentaje === null ? '—' : `${r.porcentaje} %`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!todas.some((x) => x.fecha.startsWith(mes)) && <p className="m-0 text-sm text-slate-500">Todavía no hay asistencia marcada en este mes.</p>}
      </section>
    </div>
  );
}
