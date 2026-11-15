import { NIVELES_POR_DEFECTO, nuevoId, type Instrumento } from '../datos/db';
import { buscarCriterio, descriptoresSugeridos } from '../datos/consultas';
import { AreaTexto, Aviso, Boton } from '../componentes/ui';
import type { PropsPaso } from './tipos';

const SUGERENCIAS_EVIDENCIAS = [
  'Producciones escritas',
  'Exposición oral',
  'Registro de experimentos',
  'Portafolio',
  'Maqueta o modelo',
  'Mapa o representación gráfica',
  'Autoevaluación',
  'Coevaluación entre pares',
  'Observación en clase',
  'Producto final del proyecto',
];

function crearInstrumento(tipo: Instrumento['tipo'], criterios: string[]): Instrumento {
  const niveles = tipo === 'rubrica' ? [...NIVELES_POR_DEFECTO] : ['Sí', 'No'];
  return {
    id: nuevoId(),
    tipo,
    titulo: tipo === 'rubrica' ? 'Rúbrica' : 'Lista de cotejo',
    niveles,
    filas: criterios.map((id) => ({
      criterioId: id,
      descriptores: tipo === 'rubrica' ? descriptoresSugeridos(buscarCriterio(id)?.criterio.texto ?? '', niveles.length) : [],
    })),
  };
}

function EditorInstrumento({ ins, onCambio, onBorrar }: { ins: Instrumento; onCambio: (i: Instrumento) => void; onBorrar: () => void }) {
  const esRubrica = ins.tipo === 'rubrica';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={ins.titulo}
          onChange={(e) => onCambio({ ...ins, titulo: e.target.value })}
          aria-label="Título del instrumento"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 font-semibold"
        />
        <Boton variante="peligro" onClick={onBorrar}>Eliminar</Boton>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-slate-200 bg-slate-50 p-2 text-left">Criterio de logro</th>
              {ins.niveles.map((n, i) => (
                <th key={i} className="border border-slate-200 bg-slate-50 p-1">
                  {esRubrica ? (
                    <input
                      value={n}
                      aria-label={`Nombre del nivel ${i + 1}`}
                      onChange={(e) => onCambio({ ...ins, niveles: ins.niveles.map((x, j) => (j === i ? e.target.value : x)) })}
                      className="w-full rounded border border-transparent bg-transparent px-1 text-center font-semibold hover:border-slate-300"
                    />
                  ) : (
                    n
                  )}
                </th>
              ))}
              <th className="w-8 border border-slate-200 bg-slate-50" aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {ins.filas.map((f, fi) => (
              <tr key={f.criterioId}>
                <td className="w-1/4 border border-slate-200 p-2 align-top text-slate-700">{buscarCriterio(f.criterioId)?.criterio.texto}</td>
                {ins.niveles.map((_, ni) => (
                  <td key={ni} className="border border-slate-200 p-1 align-top">
                    {esRubrica ? (
                      <textarea
                        rows={4}
                        value={f.descriptores[ni] ?? ''}
                        aria-label={`Descriptor nivel ${ni + 1}`}
                        onChange={(e) =>
                          onCambio({
                            ...ins,
                            filas: ins.filas.map((x, j) =>
                              j === fi ? { ...x, descriptores: ins.niveles.map((__, k) => (k === ni ? e.target.value : x.descriptores[k] ?? '')) } : x,
                            ),
                          })
                        }
                        className="w-full resize-y rounded border border-transparent p-1 text-xs hover:border-slate-300 focus:border-blue-400"
                      />
                    ) : (
                      <span className="block text-center text-slate-300">☐</span>
                    )}
                  </td>
                ))}
                <td className="border border-slate-200 text-center align-top">
                  <button
                    type="button"
                    title="Quitar fila"
                    aria-label="Quitar fila"
                    className="p-1 text-slate-400 hover:text-red-600"
                    onClick={() => onCambio({ ...ins, filas: ins.filas.filter((_, j) => j !== fi) })}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {esRubrica && <p className="mt-2 text-xs text-slate-500">Los descriptores son una sugerencia a partir del criterio: editalos para tu grupo.</p>}
    </div>
  );
}

export function PasoEvaluacion({ plan, cambiar }: PropsPaso) {
  const agregarEvidencia = (e: string) => cambiar({ evidencias: plan.evidencias ? `${plan.evidencias.trim()}\n${e}` : e });
  return (
    <div className="space-y-6">
      <Aviso>Definí qué evidencias te van a mostrar que tus estudiantes alcanzaron los criterios, y con qué instrumentos las vas a valorar.</Aviso>
      <section>
        <AreaTexto
          etiqueta="Evidencias de aprendizaje"
          ayuda="¿Qué van a producir o hacer tus estudiantes para mostrar lo que aprendieron?"
          valor={plan.evidencias}
          onCambio={(v) => cambiar({ evidencias: v })}
          filas={4}
        />
        <div className="mt-2 flex flex-wrap gap-1">
          {SUGERENCIAS_EVIDENCIAS.map((e) => (
            <button key={e} type="button" onClick={() => agregarEvidencia(e)} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-200">
              + {e}
            </button>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="font-semibold text-slate-900">Instrumentos de evaluación</h3>
        {plan.criterios.length === 0 ? (
          <Aviso tono="alerta">Elegí criterios de logro en el paso 2 para generar instrumentos.</Aviso>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Boton onClick={() => cambiar({ instrumentos: [...plan.instrumentos, crearInstrumento('rubrica', plan.criterios)] })}>
              + Rúbrica con mis {plan.criterios.length} criterios
            </Boton>
            <Boton variante="secundario" onClick={() => cambiar({ instrumentos: [...plan.instrumentos, crearInstrumento('lista_cotejo', plan.criterios)] })}>
              + Lista de cotejo
            </Boton>
          </div>
        )}
        {plan.instrumentos.map((ins) => (
          <EditorInstrumento
            key={ins.id}
            ins={ins}
            onCambio={(nuevo) => cambiar({ instrumentos: plan.instrumentos.map((x) => (x.id === ins.id ? nuevo : x)) })}
            onBorrar={() => cambiar({ instrumentos: plan.instrumentos.filter((x) => x.id !== ins.id) })}
          />
        ))}
      </section>
    </div>
  );
}
