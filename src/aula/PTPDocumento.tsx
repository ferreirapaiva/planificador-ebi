import { leerPerfil, type Asistencia, type PTP, type PuntoPTP } from '../datos/db';
import { asistenciaMensual, nombreNivel, resumenObjetivos, textoApoyo } from '../datos/ptp';
import { fechaCorta, fechaLarga } from '../datos/aula';
import { GraficoAsistencia, GraficoAvance, GraficoCriterio, LeyendaGrafico } from './GraficosPTP';

export type OpcionesDocPTP = { situacion: boolean; estrategias: boolean; contexto: boolean; objetivos: boolean; graficos: boolean; apoyos: boolean; acciones: boolean; familia: boolean; equipo: boolean; revisiones: boolean };
export const DOC_COMPLETO: OpcionesDocPTP = { situacion: true, estrategias: true, contexto: true, objetivos: true, graficos: true, apoyos: true, acciones: true, familia: true, equipo: true, revisiones: true };
/** Para la familia: lo que se hace y cómo viene, sin el contexto ni las notas internas. */
export const DOC_FAMILIA: OpcionesDocPTP = { situacion: true, estrategias: false, contexto: false, objetivos: true, graficos: true, apoyos: true, acciones: true, familia: true, equipo: false, revisiones: false };

const T = 'm-0 border-b-2 border-blue-600 pb-1 text-[15px] font-extrabold text-blue-700';
const ESTADO_OBJ = { 'en-curso': 'En curso', logrado: 'Logrado', ajustar: 'A ajustar' } as const;

export function PTPDocumento({ ptp, auto, asistencias, o }: { ptp: PTP; auto: PuntoPTP[]; asistencias: Asistencia[]; o: OpcionesDocPTP }) {
  const filas = resumenObjetivos(ptp, auto);
  const meses = ptp.alumnoId ? asistenciaMensual(asistencias, ptp.alumnoId) : [];
  const asis = meses.length ? meses : ptp.asistenciaMensual ?? [];
  const escuela = leerPerfil().escuela;
  const apoyos = ptp.apoyos.map(textoApoyo);
  return (
    <article className="text-[13px] leading-relaxed text-slate-900">
      <p className="m-0 text-[11px] font-bold tracking-[0.08em] text-slate-500 uppercase">Proyecto de trabajo personalizado</p>
      <h2 className="mt-1 text-[24px] font-extrabold text-blue-700">{ptp.alumnoNombre}</h2>
      <p className="m-0 text-slate-700">
        {[ptp.grupoNombre, escuela].filter(Boolean).join(' · ')}
        <br />
        {[ptp.docente && `Docente: ${ptp.docente}`, ptp.apoyo && `Docente de apoyo: ${ptp.apoyo}`].filter(Boolean).join(' · ')}
        <br />
        Desde el {fechaLarga(ptp.inicio)}
        {ptp.revisarEl && ptp.estado === 'activo' ? ` · Próxima revisión: ${fechaCorta(ptp.revisarEl)}` : ''}
        {ptp.estado === 'cerrado' ? ' · Proyecto cerrado' : ''}
      </p>

      {o.situacion && (ptp.situacion.trim() || (o.estrategias && ptp.estrategias.trim()) || (o.contexto && ptp.contexto.trim())) && (
        <section className="mt-4 break-inside-avoid">
          <h3 className={T}>Punto de partida</h3>
          {ptp.situacion.trim() && <p className="mt-2 mb-0 whitespace-pre-wrap">{ptp.situacion.trim()}</p>}
          {o.estrategias && ptp.estrategias.trim() && <p className="mt-2 mb-0 whitespace-pre-wrap"><b>Lo que ya se probó:</b> {ptp.estrategias.trim()}</p>}
          {o.contexto && ptp.contexto.trim() && <p className="mt-2 mb-0 whitespace-pre-wrap"><b>Contexto:</b> {ptp.contexto.trim()}</p>}
        </section>
      )}

      {o.objetivos && filas.length > 0 && (
        <section className="mt-4">
          <h3 className={T}>Objetivos</h3>
          <table className="mt-2 w-full border-collapse text-left text-[12px]">
            <thead>
              <tr className="border-b-2 border-slate-300 text-slate-700">
                <th className="py-1 pr-2">Criterio y objetivo</th>
                <th className="px-2">Partió de</th>
                <th className="px-2">Hoy</th>
                <th className="px-2">Meta</th>
                <th className="px-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ o: ob, actual }) => (
                <tr key={ob.id} className="break-inside-avoid border-b border-slate-200 align-top">
                  <td className="py-1.5 pr-2"><b>{ob.criterio}</b>{ob.texto.trim() && <><br />{ob.texto.trim()}</>}</td>
                  <td className="px-2">{ob.partida === null ? '—' : nombreNivel(ob.partida)}</td>
                  <td className="px-2 font-bold">{actual === null ? '—' : nombreNivel(actual)}</td>
                  <td className="px-2">{nombreNivel(ob.meta)}</td>
                  <td className="px-2">{ESTADO_OBJ[ob.estado]}{ob.revision && ob.estado === 'en-curso' ? ` (revisión ${fechaCorta(ob.revision)})` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {o.graficos && (filas.length > 0 || asis.length > 0) && (
        <section className="mt-4 break-inside-avoid">
          <h3 className={T}>Cómo viene avanzando</h3>
          {filas.length > 0 && <div className="mt-2"><GraficoAvance ptp={ptp} auto={auto} /></div>}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {filas.slice(0, 4).map(({ o: ob, serie }) => (
              <div key={ob.id} className="break-inside-avoid">
                <p className="m-0 text-[12px] font-bold">{ob.criterio}</p>
                <GraficoCriterio ptp={ptp} serie={serie} meta={ob.meta} titulo={ob.criterio} />
              </div>
            ))}
          </div>
          <div className="mt-2"><LeyendaGrafico /></div>
          {asis.length > 0 && (
            <div className="mt-3 break-inside-avoid">
              <p className="m-0 text-[12px] font-bold">Asistencia por mes (%)</p>
              <GraficoAsistencia meses={asis} />
            </div>
          )}
        </section>
      )}

      {o.apoyos && (apoyos.length > 0 || ptp.apoyosOtros.trim()) && (
        <section className="mt-4 break-inside-avoid">
          <h3 className={T}>Apoyos y adaptaciones</h3>
          <ul className="mt-2 mb-0 list-disc pl-5">
            {apoyos.map((a) => <li key={a}>{a}</li>)}
            {ptp.apoyosOtros.trim() && <li>{ptp.apoyosOtros.trim()}</li>}
          </ul>
        </section>
      )}

      {o.acciones && ptp.acciones.length > 0 && (
        <section className="mt-4 break-inside-avoid">
          <h3 className={T}>Acciones</h3>
          <table className="mt-2 w-full border-collapse text-left text-[12px]">
            <tbody>
              {[...ptp.acciones].sort((a, b) => a.fecha.localeCompare(b.fecha)).map((a) => (
                <tr key={a.id} className="border-b border-slate-200 align-top">
                  <td className="w-6 py-1.5">{a.hecha ? '☑' : '☐'}</td>
                  <td className="py-1.5 pr-2">{a.texto}{a.responsable && <span className="text-slate-500"> · {a.responsable}</span>}</td>
                  <td className="w-24 py-1.5 text-right text-slate-600">{a.fecha ? fechaCorta(a.fecha) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {o.familia && (ptp.familiaAcuerdos.trim() || (o.equipo && ptp.equipo.trim())) && (
        <section className="mt-4 break-inside-avoid">
          <h3 className={T}>Familia{o.equipo ? ' y equipo' : ''}</h3>
          {ptp.familiaAcuerdos.trim() && <p className="mt-2 mb-0 whitespace-pre-wrap"><b>Acordado con la familia{ptp.familiaFecha ? ` (${fechaCorta(ptp.familiaFecha)})` : ''}:</b> {ptp.familiaAcuerdos.trim()}</p>}
          {o.equipo && ptp.equipo.trim() && <p className="mt-2 mb-0 whitespace-pre-wrap"><b>Equipo:</b> {ptp.equipo.trim()}</p>}
        </section>
      )}

      {o.revisiones && ptp.revisiones.length > 0 && (
        <section className="mt-4 break-inside-avoid">
          <h3 className={T}>Revisiones</h3>
          {[...ptp.revisiones].sort((a, b) => a.fecha.localeCompare(b.fecha)).map((r) => (
            <p key={r.id} className="mt-2 mb-0 whitespace-pre-wrap"><b>{fechaCorta(r.fecha)}{r.autor ? ` · ${r.autor}` : ''}:</b> {r.nota}</p>
          ))}
        </section>
      )}

      <div className="mt-10 grid grid-cols-3 gap-6 text-center text-[11px] text-slate-600">
        <div className="border-t border-slate-400 pt-1">Docente</div>
        <div className="border-t border-slate-400 pt-1">Docente de apoyo</div>
        <div className="border-t border-slate-400 pt-1">Familia</div>
      </div>
    </article>
  );
}
