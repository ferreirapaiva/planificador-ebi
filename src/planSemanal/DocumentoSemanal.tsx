import { forwardRef } from 'react';
import type { PlanSemanal } from '../datos/db';
import { materialesParaPreparar, nombreDia, ordenarBloques, tituloPlan } from '../datos/planSemanal';

const Lineas = ({ texto }: { texto: string }) => (
  <>
    {texto
      .split('\n')
      .filter((l) => l.trim())
      .map((l, i) => (
        <p key={i}>{l}</p>
      ))}
  </>
);

/** El plan diario o semanal como documento: vista previa, impresión, Word y PDF. */
export const DocumentoSemanal = forwardRef<HTMLDivElement, { plan: PlanSemanal; avisos?: Record<string, string[]> }>(function DocumentoSemanal({ plan, avisos = {} }, ref) {
  const materiales = materialesParaPreparar(plan);
  const semana = plan.alcance === 'semana';
  return (
    <div ref={ref} className="documento">
      <p className="doc-tipo">{semana ? 'Plan semanal' : 'Plan diario'}</p>
      <h1>{tituloPlan(plan)}</h1>
      {(plan.docente || plan.escuela || plan.grupo) && (
        <table className="doc-datos">
          <tbody>
            {plan.docente && (<tr><th>Docente</th><td>{plan.docente}</td></tr>)}
            {plan.escuela && (<tr><th>Escuela</th><td>{plan.escuela}</td></tr>)}
            {plan.grupo && (<tr><th>Grupo</th><td>{plan.grupo}</td></tr>)}
          </tbody>
        </table>
      )}

      {plan.dias.map((dia) => (
        <section key={dia.fecha} className="doc-seccion">
          {semana && <h2>{nombreDia(dia.fecha)}</h2>}
          {avisos[dia.fecha]?.length ? <p className="doc-ce">{avisos[dia.fecha].join(' · ')}</p> : null}
          {dia.bloques.length === 0 ? (
            <p className="doc-ce">Sin actividades planificadas.</p>
          ) : (
            <table className="doc-tabla">
              <thead>
                <tr>
                  <th style={{ width: '13%' }}>Horario</th>
                  <th style={{ width: '18%' }}>Área</th>
                  <th>Actividad</th>
                  <th style={{ width: '22%' }}>Materiales</th>
                </tr>
              </thead>
              <tbody>
                {ordenarBloques(dia.bloques).map((b) => (
                  <tr key={b.id}>
                    <td>{[b.inicio, b.fin].filter(Boolean).join(' – ')}</td>
                    <td>{b.area}</td>
                    <td>
                      {b.actividad && <p><strong>{b.actividad}</strong></p>}
                      <Lineas texto={b.detalle} />
                      {b.origen && <p className="doc-ce">De: {b.origen.titulo}</p>}
                    </td>
                    <td><Lineas texto={b.materiales} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}

      {(materiales.length > 0 || plan.materiales) && (
        <section className="doc-seccion">
          <h2>Materiales para preparar</h2>
          {materiales.length > 0 && (
            <ul>
              {materiales.map((m) => (
                <li key={m.texto}>
                  ☐ {m.texto}
                  {semana && <span className="doc-ce"> ({m.dias.join(', ')})</span>}
                </li>
              ))}
            </ul>
          )}
          {plan.materiales && <Lineas texto={plan.materiales} />}
        </section>
      )}

      {plan.notas && (
        <section className="doc-seccion">
          <h2>Observaciones</h2>
          <Lineas texto={plan.notas} />
        </section>
      )}
    </div>
  );
});
