import { forwardRef, type ReactNode } from 'react';
import { TIPOS, type Planificacion } from '../datos/db';
import { buscarContenido, buscarCriterio, buscarUC, competenciasMovilizadas } from '../datos/consultas';

export const fecha = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');

/** Agrupa ids (criterios o contenidos) por "UC · grado", en el orden de las UC de la planificación. */
function agrupar<T>(plan: Planificacion, ids: string[], buscar: (id: string) => { uc: { id: string; nombre: string }; grado: number } | undefined, mapear: (id: string) => T) {
  const grupos: { titulo: string; items: T[] }[] = [];
  for (const ucId of plan.ucIds) {
    for (const g of plan.grados) {
      const items = ids.filter((id) => {
        const r = buscar(id);
        return r?.uc.id === ucId && r.grado === g;
      });
      if (items.length) {
        const nombre = buscarUC(ucId)?.nombre ?? ucId;
        grupos.push({ titulo: plan.grados.length > 1 ? `${nombre} · ${g}.º grado` : nombre, items: items.map(mapear) });
      }
    }
  }
  return grupos;
}

const Seccion = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <section className="doc-seccion">
    <h2>{titulo}</h2>
    {children}
  </section>
);

const Parrafos = ({ texto }: { texto: string }) => (
  <>
    {texto
      .split('\n')
      .filter((l) => l.trim())
      .map((l, i) => (
        <p key={i}>{l}</p>
      ))}
  </>
);

/** La planificación como documento: se usa en la vista previa, al imprimir y al descargar en Word. */
export const Documento = forwardRef<HTMLDivElement, { plan: Planificacion }>(function Documento({ plan }, ref) {
  const mov = competenciasMovilizadas(plan.criterios);
  const criterios = agrupar(plan, plan.criterios, buscarCriterio, (id) => buscarCriterio(id)!);
  const contenidos = agrupar(plan, plan.contenidos, buscarContenido, (id) => buscarContenido(id)!);
  const ucs = plan.ucIds.map((id) => buscarUC(id)?.nombre).filter(Boolean).join(', ');
  const periodo = plan.desde || plan.hasta ? `${fecha(plan.desde) || '…'} al ${fecha(plan.hasta) || '…'}` : '';

  return (
    <div ref={ref} className="documento">
      <p className="doc-tipo">{TIPOS[plan.tipo].nombre}</p>
      <h1>{plan.titulo || 'Sin título'}</h1>
      <table className="doc-datos">
        <tbody>
          {plan.docente && (<tr><th>Docente</th><td>{plan.docente}</td></tr>)}
          {plan.escuela && (<tr><th>Escuela</th><td>{plan.escuela}</td></tr>)}
          {plan.grupo && (<tr><th>Grupo</th><td>{plan.grupo}</td></tr>)}
          <tr><th>Grado</th><td>{plan.grados.map((g) => `${g}.º`).join(' y ')}{plan.grados.length > 1 ? ' (multigrado)' : ''} · Tramo 3</td></tr>
          {ucs && (<tr><th>Unidades curriculares</th><td>{ucs}</td></tr>)}
          {periodo && (<tr><th>Período</th><td>{periodo}</td></tr>)}
        </tbody>
      </table>

      {(plan.preguntaGuia || plan.productoFinal) && (
        <Seccion titulo={plan.tipo === 'proyecto' ? 'Pregunta guía y producto final' : 'Situación de partida'}>
          {plan.preguntaGuia && (<><h3>{plan.tipo === 'proyecto' ? 'Pregunta o problema' : 'Situación inicial'}</h3><Parrafos texto={plan.preguntaGuia} /></>)}
          {plan.productoFinal && (<><h3>Producto final</h3><Parrafos texto={plan.productoFinal} /></>)}
        </Seccion>
      )}

      {mov.especificas.length > 0 && (
        <Seccion titulo="Competencias">
          <h3>Competencias específicas</h3>
          <ul>
            {mov.especificas.map((e) => (
              <li key={e.uc.id + e.codigo}>
                <strong>{e.codigo}</strong> ({e.uc.nombre}). {e.texto}
              </li>
            ))}
          </ul>
          <h3>Competencias generales del MCN a las que contribuye</h3>
          <p>{mov.generales.join(' · ')}</p>
        </Seccion>
      )}

      {criterios.length > 0 && (
        <Seccion titulo="Criterios de logro">
          {criterios.map((g) => (
            <div key={g.titulo}>
              <h3>{g.titulo}</h3>
              <ul>
                {g.items.map((r) => (
                  <li key={r.criterio.id}>
                    {r.criterio.texto} <span className="doc-ce">({r.ces.join(', ')})</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Seccion>
      )}

      {contenidos.length > 0 && (
        <Seccion titulo="Contenidos">
          {contenidos.map((g) => (
            <div key={g.titulo}>
              <h3>{g.titulo}</h3>
              <ul>
                {g.items.map((r) => (
                  <li key={r.contenido.id}>
                    {r.contenido.texto}
                    {r.contenido.subitems && (
                      <ul>
                        {r.contenido.subitems.map((s) => (
                          <li key={s.id}>{s.texto}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Seccion>
      )}

      {plan.metodologias.length > 0 && (
        <Seccion titulo="Metodologías">
          <p>{plan.metodologias.join(' · ')}</p>
        </Seccion>
      )}

      {plan.clases.length > 0 && (
        <Seccion titulo="Secuencia de actividades">
          {plan.clases.map((c, i) => (
            <div key={c.id} className="doc-clase">
              <h3>
                {i + 1}. {c.titulo}
                {(c.fecha || c.duracion) && <span className="doc-ce"> — {[fecha(c.fecha), c.duracion].filter(Boolean).join(' · ')}</span>}
              </h3>
              {c.proposito && (<p><strong>Propósito:</strong> {c.proposito}</p>)}
              {c.inicio && (<><h4>Inicio</h4><Parrafos texto={c.inicio} /></>)}
              {c.desarrollo && (<><h4>Desarrollo</h4><Parrafos texto={c.desarrollo} /></>)}
              {c.cierre && (<><h4>Cierre</h4><Parrafos texto={c.cierre} /></>)}
              {c.recursos && (<p><strong>Recursos:</strong> {c.recursos}</p>)}
              {c.evaluacion && (<p><strong>Evaluación:</strong> {c.evaluacion}</p>)}
            </div>
          ))}
        </Seccion>
      )}

      {(plan.evidencias || plan.instrumentos.length > 0) && (
        <Seccion titulo="Evaluación">
          {plan.evidencias && (<><h3>Evidencias de aprendizaje</h3><Parrafos texto={plan.evidencias} /></>)}
          {plan.instrumentos.map((ins) => (
            <div key={ins.id}>
              <h3>{ins.titulo}</h3>
              <table className="doc-tabla">
                <thead>
                  <tr>
                    <th>Criterio de logro</th>
                    {ins.niveles.map((n, i) => (<th key={i}>{n}</th>))}
                  </tr>
                </thead>
                <tbody>
                  {ins.filas.map((f) => (
                    <tr key={f.criterioId}>
                      <td>{buscarCriterio(f.criterioId)?.criterio.texto}</td>
                      {ins.niveles.map((_, i) => (<td key={i}>{ins.tipo === 'rubrica' ? f.descriptores[i] : ''}</td>))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </Seccion>
      )}

      {plan.recursos && (<Seccion titulo="Recursos y materiales"><Parrafos texto={plan.recursos} /></Seccion>)}
      {plan.diversidad && (<Seccion titulo="Atención a la diversidad"><Parrafos texto={plan.diversidad} /></Seccion>)}
      {plan.notas && (<Seccion titulo="Observaciones"><Parrafos texto={plan.notas} /></Seccion>)}

      <p className="doc-pie">Elaborado a partir de los Programas de Educación Básica Integrada (ANEP), Tramo 3.</p>
    </div>
  );
});

/** Estilos del documento: se usan en pantalla, al imprimir y dentro del archivo de Word. */
export const ESTILOS_DOCUMENTO = `
.documento { font-family: Calibri, Arial, sans-serif; color: #1f2937; font-size: 11pt; line-height: 1.45; }
.documento h1 { font-size: 20pt; margin: 0 0 8pt; color: #3B2DB8; }
.documento h2 { font-size: 13pt; margin: 16pt 0 6pt; padding-bottom: 3pt; border-bottom: 2px solid #5B4BF5; color: #3B2DB8; }
.documento h3 { font-size: 11pt; margin: 10pt 0 4pt; }
.documento h4 { font-size: 10.5pt; margin: 6pt 0 2pt; color: #374151; }
.documento p { margin: 0 0 5pt; }
.documento ul { margin: 0 0 6pt 18pt; padding: 0; }
.documento li { margin-bottom: 2pt; }
.documento .doc-tipo { text-transform: uppercase; letter-spacing: .08em; font-size: 9pt; color: #6b7280; margin: 0; }
.documento .doc-ce { color: #6b7280; font-size: 9.5pt; font-weight: normal; }
.documento table { border-collapse: collapse; width: 100%; margin-bottom: 8pt; }
.documento .doc-datos th { text-align: left; width: 32%; background: #EEEBFF; }
.documento th, .documento td { border: 1px solid #cbd5e1; padding: 4pt 6pt; vertical-align: top; font-size: 10pt; }
.documento .doc-tabla th { background: #EEEBFF; }
.documento .doc-clase { margin-bottom: 8pt; padding-left: 8pt; border-left: 3px solid #DCD6FF; }
.documento .doc-pie { margin-top: 18pt; font-size: 8.5pt; color: #9ca3af; }
`;
