import { forwardRef, useRef } from 'react';
import { MESES_LECTIVOS, NOMBRE_MES, type PlanAnual } from '../datos/db';
import { buscarUC } from '../datos/consultas';
import { diasDeClase } from '../datos/calendario';
import { descargarWord } from '../datos/exportar';
import { ESTILOS_DOCUMENTO, fecha } from '../componentes/Documento';
import { AreaTexto, Boton } from '../componentes/ui';
import type { PropsAnual } from './PasoDatosAnual';

export const DocumentoAnual = forwardRef<HTMLDivElement, { plan: PlanAnual }>(function DocumentoAnual({ plan }, ref) {
  const cal = plan.calendario;
  return (
    <div ref={ref} className="documento">
      <p className="doc-tipo">Plan anual</p>
      <h1>Plan anual {plan.anio}</h1>
      <table className="doc-datos">
        <tbody>
          {plan.docente && (<tr><th>Docente</th><td>{plan.docente}</td></tr>)}
          {plan.escuela && (<tr><th>Escuela</th><td>{plan.escuela}</td></tr>)}
          {plan.grupo && (<tr><th>Grupo</th><td>{plan.grupo}</td></tr>)}
          <tr><th>Grado</th><td>{plan.grados.map((g) => `${g}.º`).join(' y ')}{plan.grados.length > 1 ? ' (multigrado)' : ''} · Tramo 3</td></tr>
          <tr><th>Año lectivo</th><td>Del {fecha(cal.inicio)} al {fecha(cal.fin)}</td></tr>
        </tbody>
      </table>

      {plan.fundamentacion && (
        <section className="doc-seccion">
          <h2>Fundamentación</h2>
          {plan.fundamentacion.split('\n').filter((l) => l.trim()).map((l, i) => <p key={i}>{l}</p>)}
        </section>
      )}

      <section className="doc-seccion">
        <h2>Calendario</h2>
        <table className="doc-tabla">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Días de clase (aprox.)</th>
              <th>Períodos sin clases y efemérides</th>
            </tr>
          </thead>
          <tbody>
            {MESES_LECTIVOS.map((m) => {
              const notas = [
                ...cal.sinClases.filter((p) => p.desde && Number(p.desde.slice(5, 7)) === m).map((p) => `${p.nombre} (${fecha(p.desde)} al ${fecha(p.hasta)})`),
                ...cal.efemerides.filter((e) => Number(e.fecha.slice(5, 7)) === m).map((e) => `${e.fecha.slice(8)}: ${e.nombre}`),
              ];
              return (
                <tr key={m}>
                  <td>{NOMBRE_MES[m]}</td>
                  <td>{diasDeClase(cal, plan.anio, m)}</td>
                  <td>{notas.join(' · ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {plan.ucIds.flatMap((ucId) => {
        const uc = buscarUC(ucId);
        if (!uc) return [];
        return plan.grados.map((grado) => {
          const g = uc.grados.find((x) => x.grado === grado);
          if (!g) return null;
          const contenidos = g.bloques.filter((b) => !b.transversal).flatMap((b) => b.contenidos);
          const transversales = g.bloques.filter((b) => b.transversal).flatMap((b) => b.contenidos);
          const sinUbicar = contenidos.filter((c) => !plan.distribucion[c.id]?.length);
          return (
            <section key={`${ucId}-${grado}`} className="doc-seccion">
              <h2>
                {uc.nombre}
                {plan.grados.length > 1 && ` · ${grado}.º grado`}
              </h2>
              <table className="doc-tabla">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>Mes</th>
                    <th>Contenidos</th>
                  </tr>
                </thead>
                <tbody>
                  {MESES_LECTIVOS.map((m) => {
                    const delMes = contenidos.filter((c) => plan.distribucion[c.id]?.includes(m));
                    return (
                      <tr key={m}>
                        <td>{NOMBRE_MES[m]}</td>
                        <td>
                          {delMes.length ? (
                            <ul>{delMes.map((c) => <li key={c.id}>{c.texto}</li>)}</ul>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {transversales.length > 0 && (
                <p><strong>A lo largo del año:</strong> {transversales.map((c) => c.texto).join(' ')}</p>
              )}
              {sinUbicar.length > 0 && (
                <p className="doc-ce">Contenidos aún sin ubicar: {sinUbicar.map((c) => c.texto.replace(/\.$/, '')).join('; ')}.</p>
              )}
            </section>
          );
        });
      })}

      {plan.notas && (
        <section className="doc-seccion">
          <h2>Observaciones</h2>
          {plan.notas.split('\n').filter((l) => l.trim()).map((l, i) => <p key={i}>{l}</p>)}
        </section>
      )}
      <p className="doc-pie">Elaborado a partir de los Programas de Educación Básica Integrada (ANEP), Tramo 3.</p>
    </div>
  );
});

export function PasoDocumentoAnual({ plan, cambiar }: PropsAnual) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <style>{ESTILOS_DOCUMENTO}</style>
      <aside className="no-imprimir h-fit space-y-3 lg:sticky lg:top-4">
        <Boton onClick={() => ref.current && descargarWord(ref.current, `plan-anual-${plan.anio}-${plan.grupo}`)}>⬇ Descargar Word</Boton>
        <Boton variante="secundario" onClick={() => window.print()}>🖨 Imprimir o guardar PDF</Boton>
        <AreaTexto etiqueta="Observaciones" valor={plan.notas} onCambio={(v) => cambiar({ notas: v })} filas={4} />
      </aside>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 print:border-0 print:p-0 print:shadow-none">
        <DocumentoAnual ref={ref} plan={plan} />
      </div>
    </div>
  );
}
