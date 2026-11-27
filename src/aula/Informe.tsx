import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { db, type Alumno, type Asistencia, type Grupo, type PTP, type RegistroEvaluacion } from '../datos/db';
import { textoApoyo, usePTPs } from '../datos/ptp';
import { fechaCorta, fechaLarga, resumenAsistencia, useAsistencias, useRegistros } from '../datos/aula';
import { hoyIso } from '../datos/planSemanal';
import { Aviso, AreaTexto, Boton } from '../componentes/ui';
import { CLASE_FECHA, CLASE_SELECT, type ContextoClase } from './comun';

type Opciones = { desde: string; hasta: string; asistencia: boolean; registros: RegistroEvaluacion[]; conPtp: boolean; ptps: PTP[] };

/** Lo que cuenta el informe de un alumno, ya ordenado. */
function contenidoInforme(alumno: Alumno, asistencias: Asistencia[], o: Opciones) {
  const asis = resumenAsistencia(asistencias, alumno.id, o.desde, o.hasta);
  const evals = o.registros
    .filter((r) => r.fecha >= o.desde && r.fecha <= o.hasta)
    .map((r) => {
      const filas = r.criterios.flatMap((criterio, i) => {
        const v = r.resultados[alumno.id]?.[i];
        return v === undefined ? [] : [{ criterio, nivel: r.niveles[v], logrado: v >= r.logro }];
      });
      return { registro: r, filas };
    })
    .filter((e) => e.filas.length);
  const logrados = evals.flatMap((e) => e.filas.filter((f) => f.logrado).map((f) => f.criterio));
  const trabajando = evals.flatMap((e) => e.filas.filter((f) => !f.logrado).map((f) => f.criterio));
  const ptp = o.conPtp ? o.ptps.find((x) => x.alumnoId === alumno.id && x.estado === 'activo') ?? null : null;
  const acompanamiento = ptp ? (ptp.familiaResumen.trim() ? ptp.familiaResumen.trim() : ptp.objetivos.map((x) => x.texto.trim() || x.criterio).filter(Boolean).join('; ')) : '';
  const apoyos = ptp ? [...ptp.apoyos.map(textoApoyo), ...(ptp.apoyosOtros.trim() ? [ptp.apoyosOtros.trim()] : [])] : [];
  return { asis, evals, logrados, trabajando, ptp, acompanamiento, apoyos };
}

function HojaInforme({ grupo, alumno, asistencias, opciones }: { grupo: Grupo; alumno: Alumno; asistencias: Asistencia[]; opciones: Opciones }) {
  const c = contenidoInforme(alumno, asistencias, opciones);
  return (
    <article className="text-[14px] leading-relaxed text-slate-900">
      <p className="m-0 text-[11px] font-bold tracking-[0.08em] text-slate-500 uppercase">Informe para la familia</p>
      <h2 className="mt-1 text-[24px] font-extrabold text-blue-700">{alumno.nombre}</h2>
      <p className="m-0 text-slate-700">
        {[grupo.nombre, grupo.escuela, grupo.docente && `Docente: ${grupo.docente}`].filter(Boolean).join(' · ')}
        <br />
        Período: {fechaCorta(opciones.desde)} al {fechaCorta(opciones.hasta)}
      </p>

      {opciones.asistencia && c.asis.dias > 0 && (
        <section className="mt-4">
          <h3 className="m-0 border-b-2 border-blue-600 pb-1 text-[16px] font-extrabold text-blue-700">Asistencia</h3>
          <p className="mt-2">
            Vino {c.asis.presentes} de {c.asis.dias} {c.asis.dias === 1 ? 'día registrado' : 'días registrados'} ({c.asis.porcentaje} %). Faltas: {c.asis.faltas}
            {c.asis.justificadas ? `; justificadas: ${c.asis.justificadas}` : ''}.
          </p>
        </section>
      )}

      {c.evals.length > 0 && (
        <section className="mt-4">
          <h3 className="m-0 border-b-2 border-blue-600 pb-1 text-[16px] font-extrabold text-blue-700">Cómo viene trabajando</h3>
          {c.evals.map(({ registro, filas }) => (
            <div key={registro.id} className="mt-3 break-inside-avoid">
              <p className="m-0 font-bold">{registro.titulo} <span className="font-normal text-slate-500">· {fechaCorta(registro.fecha)}</span></p>
              <table className="mt-1 w-full border-collapse text-left">
                <tbody>
                  {filas.map((f, i) => (
                    <tr key={i} className="border-b border-slate-200">
                      <td className="py-1 pr-3">{f.criterio}</td>
                      <td className={`w-36 py-1 text-right font-bold ${f.logrado ? 'text-menta-700' : 'text-coral-700'}`}>{f.logrado ? '✓ ' : ''}{f.nivel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="m-0 font-bold text-menta-700">Lo que ya logra</p>
              <p className="m-0 text-slate-700">{c.logrados.length ? c.logrados.join('; ') + '.' : 'Seguimos construyendo sus logros.'}</p>
            </div>
            <div>
              <p className="m-0 font-bold text-coral-700">Lo que seguimos trabajando</p>
              <p className="m-0 text-slate-700">{c.trabajando.length ? c.trabajando.join('; ') + '.' : 'Por ahora, nada pendiente.'}</p>
            </div>
          </div>
        </section>
      )}

      {c.ptp && (c.acompanamiento || c.apoyos.length > 0) && (
        <section className="mt-4 break-inside-avoid">
          <h3 className="m-0 border-b-2 border-blue-600 pb-1 text-[16px] font-extrabold text-blue-700">Cómo lo acompañamos</h3>
          {c.acompanamiento && <p className="mt-2 mb-0 whitespace-pre-wrap">{c.acompanamiento}</p>}
          {c.apoyos.length > 0 && <p className="mt-2 mb-0"><b>Apoyos:</b> {c.apoyos.join('; ')}.</p>}
        </section>
      )}

      {c.evals.length === 0 && !(opciones.asistencia && c.asis.dias > 0) && !c.ptp && <p className="mt-4 text-slate-500">No hay datos registrados en este período.</p>}

      {alumno.observacion?.trim() && (
        <section className="mt-4">
          <h3 className="m-0 border-b-2 border-blue-600 pb-1 text-[16px] font-extrabold text-blue-700">Observaciones</h3>
          <p className="mt-2 whitespace-pre-wrap">{alumno.observacion.trim()}</p>
        </section>
      )}

      <div className="mt-10 grid grid-cols-2 gap-10 text-center text-[12px] text-slate-600">
        <div className="border-t border-slate-400 pt-1">Firma de la docente</div>
        <div className="border-t border-slate-400 pt-1">Firma de la familia</div>
      </div>
    </article>
  );
}

function textoPlano(grupo: Grupo, alumno: Alumno, asistencias: Asistencia[], o: Opciones) {
  const c = contenidoInforme(alumno, asistencias, o);
  const l = [`Informe para la familia: ${alumno.nombre}`, `${grupo.nombre}${grupo.escuela ? ' · ' + grupo.escuela : ''}`, `Período: ${fechaLarga(o.desde)} al ${fechaLarga(o.hasta)}`, ''];
  if (o.asistencia && c.asis.dias) l.push(`Asistencia: vino ${c.asis.presentes} de ${c.asis.dias} ${c.asis.dias === 1 ? 'día' : 'días'} (${c.asis.porcentaje} %). Faltas: ${c.asis.faltas}${c.asis.justificadas ? `; justificadas: ${c.asis.justificadas}` : ''}.`, '');
  for (const e of c.evals) {
    l.push(`${e.registro.titulo} (${fechaCorta(e.registro.fecha)})`);
    e.filas.forEach((f) => l.push(`- ${f.criterio}: ${f.nivel}${f.logrado ? ' ✓' : ''}`));
    l.push('');
  }
  if (c.logrados.length) l.push(`Lo que ya logra: ${c.logrados.join('; ')}.`);
  if (c.trabajando.length) l.push(`Lo que seguimos trabajando: ${c.trabajando.join('; ')}.`);
  if (c.ptp && c.acompanamiento) l.push('', `Cómo lo acompañamos: ${c.acompanamiento}`);
  if (c.apoyos.length) l.push(`Apoyos: ${c.apoyos.join('; ')}.`);
  if (alumno.observacion?.trim()) l.push('', `Observaciones: ${alumno.observacion.trim()}`);
  return l.join('\n').trim();
}

export function Informe({ grupo, alumnos }: ContextoClase & { grupo: Grupo }) {
  const asistencias = useAsistencias(grupo.id);
  const todos = useRegistros(grupo.id);
  const [alumnoId, setAlumnoId] = useState(alumnos[0]?.id ?? '');
  const [desde, setDesde] = useState(() => `${hoyIso().slice(0, 4)}-01-01`);
  const [hasta, setHasta] = useState(hoyIso);
  const [conAsistencia, setConAsistencia] = useState(true);
  const [conPtp, setConPtp] = useState(true);
  const ptps = usePTPs(grupo.id);
  const [excluidos, setExcluidos] = useState<string[]>([]);
  const [aviso, setAviso] = useState('');
  const alumno = alumnos.find((a) => a.id === alumnoId) ?? alumnos[0];
  const [obs, setObs] = useState(alumno?.observacion ?? '');
  useEffect(() => setObs(alumno?.observacion ?? ''), [alumno?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const registros = useMemo(() => todos.filter((r) => !excluidos.includes(r.id)).sort((a, b) => a.fecha.localeCompare(b.fecha)), [todos, excluidos]);
  const opciones: Opciones = { desde, hasta, asistencia: conAsistencia, registros, conPtp, ptps };
  const [imprimiendo, setImprimiendo] = useState<'uno' | 'todos' | null>(null);

  const guardarObs = async () => {
    if (!alumno || (alumno.observacion ?? '') === obs) return;
    const g = await db.grupos.get(grupo.id);
    if (!g) return;
    await db.grupos.put({ ...g, alumnos: (g.alumnos ?? []).map((a) => (a.id === alumno.id ? { ...a, observacion: obs } : a)), modificada: Date.now() });
  };
  const conObs = (a: Alumno) => (a.id === alumno?.id ? { ...a, observacion: obs } : a);

  /** Imprime solo los informes: están en una hoja fuera de la app (ver index.css). */
  const imprimir = (que: 'uno' | 'todos') => {
    void guardarObs();
    setImprimiendo(que);
    document.body.classList.add('imprimir-informe');
    const fin = () => {
      document.body.classList.remove('imprimir-informe');
      setImprimiendo(null);
    };
    window.addEventListener('afterprint', fin, { once: true });
    window.setTimeout(() => window.print(), 120);
  };

  if (!alumno) return null;
  const aImprimir = imprimiendo === 'todos' ? alumnos.map(conObs) : [conObs(alumno)];

  return (
    <div className="space-y-5">
      {createPortal(
        <div className="solo-impresion">
          {aImprimir.map((a) => (
            <div key={a.id} className="hoja-informe">
              <HojaInforme grupo={grupo} alumno={a} asistencias={asistencias} opciones={opciones} />
            </div>
          ))}
        </div>,
        document.body,
      )}

      <section className="space-y-4 rounded-[24px] bg-white p-5 shadow-suave">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Alumno</span>
            <select
              value={alumno.id}
              onChange={(e) => {
                void guardarObs();
                setAlumnoId(e.target.value);
              }}
              className={`mt-1 block ${CLASE_SELECT}`}
            >
              {alumnos.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Desde</span>
            <input type="date" value={desde} onChange={(e) => e.target.value && setDesde(e.target.value)} className={`mt-1 block ${CLASE_FECHA}`} />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Hasta</span>
            <input type="date" value={hasta} onChange={(e) => e.target.value && setHasta(e.target.value)} className={`mt-1 block ${CLASE_FECHA}`} />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={conAsistencia} onChange={(e) => setConAsistencia(e.target.checked)} className="h-5 w-5 accent-blue-600" /> Incluir asistencia
          </label>
          {ptps.some((x) => x.estado === 'activo') && (
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={conPtp} onChange={(e) => setConPtp(e.target.checked)} className="h-5 w-5 accent-blue-600" /> Incluir «Cómo lo acompañamos» (proyecto personalizado)
            </label>
          )}
        </div>
        {todos.length > 0 && (
          <fieldset className="m-0 border-0 p-0">
            <legend className="text-sm font-bold text-slate-700">Evaluaciones que se incluyen</legend>
            <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">
              {todos.map((r) => (
                <label key={r.id} className="flex min-h-9 items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={!excluidos.includes(r.id)}
                    onChange={(e) => setExcluidos((x) => (e.target.checked ? x.filter((i) => i !== r.id) : [...x, r.id]))}
                    className="h-5 w-5 accent-blue-600"
                  />
                  {r.titulo} <span className="text-slate-500">({fechaCorta(r.fecha)})</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {todos.length === 0 && <Aviso>Todavía no hay registros de evaluación: el informe va a mostrar solo la asistencia. Cargalos en la pestaña «Evaluaciones».</Aviso>}
        <div onBlur={guardarObs}>
          <AreaTexto etiqueta={`Observaciones para la familia de ${alumno.nombre}`} valor={obs} onCambio={setObs} filas={3} ayuda="Se guardan con el alumno y salen al final del informe." />
        </div>
        <div className="flex flex-wrap gap-2">
          <Boton onClick={() => imprimir('uno')}>Imprimir o guardar en PDF</Boton>
          <Boton variante="secundario" onClick={() => imprimir('todos')}>Imprimir los de todo el grupo</Boton>
          <Boton
            variante="secundario"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(textoPlano(grupo, conObs(alumno), asistencias, opciones));
                setAviso('Texto copiado: podés pegarlo en un mensaje o en un documento.');
              } catch {
                setAviso('No se pudo copiar. Probá con «Imprimir o guardar en PDF».');
              }
            }}
          >
            Copiar el texto
          </Boton>
        </div>
        {aviso && <p className="m-0 text-sm font-semibold text-menta-700" role="status">{aviso}</p>}
      </section>

      <div className="papel rounded-[24px] bg-white p-6 shadow-suave sm:p-8">
        <HojaInforme grupo={grupo} alumno={conObs(alumno)} asistencias={asistencias} opciones={opciones} />
      </div>
    </div>
  );
}
